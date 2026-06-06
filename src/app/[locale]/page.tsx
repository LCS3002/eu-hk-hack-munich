'use client'

import { useState, useCallback, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations, useLocale } from 'next-intl'
import { useRouter, usePathname } from 'next/navigation'
import { SCENARIOS } from '@/lib/fixtures'
import type { ProofOfTradeResult, PassportStatus, TradeScenario } from '@/lib/types'
import DemoControls from '@/components/dashboard/DemoControls'
import VerdictStream from '@/components/dashboard/VerdictStream'
import TradePanel from '@/components/dashboard/TradePanel'
import SettlementTimeline from '@/components/dashboard/SettlementTimeline'
import TreasuryPanel from '@/components/dashboard/TreasuryPanel'
import ReconciliationPanel from '@/components/dashboard/ReconciliationPanel'
import RegulatorView from '@/components/dashboard/RegulatorView'

const FaanSailHero = dynamic(() => import('@/components/hero/FaanSailHero'), { ssr: false })

type Mode = 'landing' | 'dashboard'
type TxInfo = { hash: string; status: PassportStatus; chain: string; explorerUrl: string | null }

function LocaleSwitcher() {
  const locale = useLocale()
  const router = useRouter()
  const pathname = usePathname()

  const switchTo = (next: string) => {
    // Replace the locale segment in the current path
    const segments = pathname.split('/')
    segments[1] = next
    router.push(segments.join('/'))
  }

  return (
    <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
      {(['en', 'zh-HK'] as const).map((l) => (
        <button
          key={l}
          onClick={() => switchTo(l)}
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            fontWeight: locale === l ? 700 : 400,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: locale === l ? 'var(--text-1)' : 'var(--text-3)',
            background: locale === l ? 'var(--bg-sunken)' : 'transparent',
            borderTop: '1px solid var(--border)',
            borderRight: '1px solid var(--border)',
            borderBottom: '1px solid var(--border)',
            borderLeft: '1px solid var(--border)',
            borderRadius: 2,
            padding: '3px 8px',
            cursor: 'pointer',
            transition: 'color 0.15s, background 0.15s',
          }}
        >
          {l === 'en' ? 'EN' : '繁中'}
        </button>
      ))}
    </div>
  )
}

export default function Page() {
  const t = useTranslations('header')
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
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="FaanSail" width={40} height={40} style={{ display: 'block', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontFamily: 'var(--font-hero), system-ui, sans-serif', fontWeight: 700, fontSize: 19, letterSpacing: '0.01em', color: 'var(--text-1)', lineHeight: 1 }}>FAANSAIL</span>
          <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>{t('subtitle')}</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <LocaleSwitcher />
          <DemoControls onRun={runScenario} onReset={reset} running={running} activeId={activeId} />
        </div>
      </header>

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
          <div style={{ borderTop: '1px solid var(--border)' }} />
          <RegulatorView scenario={scenario} result={result} tx={txForPanels} />
        </div>
      </div>

      <div style={{ flexShrink: 0, borderTop: '1px solid var(--border)', background: 'var(--bg-surface)' }}>
        <SettlementTimeline status={status} />
      </div>
    </div>
  )
}
