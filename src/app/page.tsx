'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { SCENARIOS } from '@/lib/fixtures'
import type { ProofOfTradeResult, PassportStatus, TradeScenario } from '@/lib/types'
import DemoControls from '@/components/dashboard/DemoControls'
import VerdictStream from '@/components/dashboard/VerdictStream'
import TradePanel from '@/components/dashboard/TradePanel'
import SettlementTimeline from '@/components/dashboard/SettlementTimeline'
import TreasuryPanel from '@/components/dashboard/TreasuryPanel'
import ReconciliationPanel from '@/components/dashboard/ReconciliationPanel'

const FaanSailHero = dynamic(() => import('@/components/hero/FaanSailHero'), { ssr: false })

type Mode = 'landing' | 'dashboard'
type TxInfo = { hash: string; status: PassportStatus; chain: string; explorerUrl: string | null }

export default function Page() {
  const [mode, setMode]         = useState<Mode>('landing')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [result, setResult]     = useState<ProofOfTradeResult | null>(null)
  const [tx, setTx]             = useState<TxInfo | null>(null)
  const [status, setStatus]     = useState<PassportStatus | 'IDLE'>('IDLE')
  const [running, setRunning]   = useState(false)
  const [elapsedMs, setElapsed] = useState<number | null>(null)
  const startRef = useRef<number | null>(null)

  const scenario: TradeScenario | null = activeId ? SCENARIOS[activeId] ?? null : null

  const runScenario = useCallback((id: string) => {
    startRef.current = Date.now()
    setResult(null)
    setTx(null)
    setElapsed(null)
    setStatus('VERIFYING')
    setRunning(true)
    setActiveId(id)
  }, [])

  const reset = useCallback(() => {
    startRef.current = null
    setActiveId(null)
    setResult(null)
    setTx(null)
    setElapsed(null)
    setStatus('IDLE')
    setRunning(false)
  }, [])

  if (mode === 'landing') {
    return <FaanSailHero onEnter={() => setMode('dashboard')} />
  }

  const txForPanels = tx ? { hash: tx.hash, status: tx.status, explorerUrl: tx.explorerUrl } : null

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', color: 'var(--text-1)', overflow: 'hidden' }}>
      {/* Header */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '0 20px', height: 56, borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
        <span style={{ fontFamily: 'var(--font-hero)', fontWeight: 700, fontSize: 18, letterSpacing: '0.04em', color: 'var(--text-1)' }}>FAANSAIL</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.14em', textTransform: 'uppercase' }}>
          Payment infrastructure · Africa–China · via Hong Kong
        </span>
        <div style={{ marginLeft: 'auto' }}>
          <DemoControls onRun={runScenario} onReset={reset} running={running} activeId={activeId} />
        </div>
      </header>

      {/* Body: what's verified | compliance verdict | liquidity + reconciliation */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '330px 1fr 360px', minHeight: 0 }}>
        <div style={{ borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--bg-surface)' }}>
          <TradePanel scenario={scenario} />
        </div>

        <div style={{ minHeight: 0, minWidth: 0, overflowY: 'auto' }}>
          <VerdictStream
            scenarioId={activeId}
            onResult={(r) => setResult(r)}
            onTx={(t) => {
              setTx(t)
              setStatus(t.status)
              setRunning(false)
              setElapsed(startRef.current ? Date.now() - startRef.current : null)
            }}
            onStatus={(s) => { setStatus(s); if (s === 'SETTLED' || s === 'BLOCKED' || s === 'IDLE') setRunning(false) }}
          />
        </div>

        <div style={{ borderLeft: '1px solid var(--border)', overflowY: 'auto', background: 'var(--bg-surface)', display: 'flex', flexDirection: 'column' }}>
          <TreasuryPanel scenario={scenario} status={status} elapsedMs={elapsedMs} />
          <div style={{ borderTop: '1px solid var(--border)' }} />
          <ReconciliationPanel scenario={scenario} result={result} tx={txForPanels} />
        </div>
      </div>

      {/* Settlement lifecycle */}
      <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <SettlementTimeline status={status} />
      </div>
    </div>
  )
}
