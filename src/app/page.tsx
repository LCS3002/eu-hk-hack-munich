'use client'

import { useState, useCallback, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { SCENARIOS } from '@/lib/fixtures'
import type { TradeScenario } from '@/lib/types'
import DemoControls from '@/components/dashboard/DemoControls'
import JourneyConsole from '@/components/dashboard/JourneyConsole'

const FaanSailHero = dynamic(() => import('@/components/hero/FaanSailHero'), { ssr: false })

type Mode = 'landing' | 'dashboard'

export default function Page() {
  const [mode, setMode]         = useState<Mode>('landing')
  const [activeId, setActiveId] = useState<string | null>(null)
  const [runKey, setRunKey]     = useState(0)
  const [showOverview, setShowOverview] = useState(false)

  const scenario: TradeScenario | null = activeId ? SCENARIOS[activeId] ?? null : null

  // Bumping runKey remounts JourneyConsole so each run starts clean and re-streams.
  const runScenario = useCallback((id: string) => {
    setRunKey(k => k + 1)
    setActiveId(id)
  }, [])

  const reset = useCallback(() => {
    setRunKey(k => k + 1)
    setActiveId(null)
  }, [])

  if (mode === 'landing') {
    return <FaanSailHero onEnter={() => setMode('dashboard')} />
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', color: 'var(--text-1)', overflow: 'hidden' }}>
      {/* Slim header bar — logo + wordmark left, compact trade controls right */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 13,
          padding: '0 22px',
          height: 58,
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-surface)',
          flexShrink: 0,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="FaanSail" width={34} height={34} style={{ display: 'block', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontFamily: 'var(--font-hero), system-ui, sans-serif', fontWeight: 700, fontSize: 18, letterSpacing: '0.01em', color: 'var(--text-1)', lineHeight: 1 }}>FAANSAIL</span>
          <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 8.5, color: 'var(--text-3)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Hong Kong settlement corridor</span>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            type="button"
            onClick={() => setShowOverview(true)}
            style={{
              fontFamily: 'var(--font-mono), monospace', fontSize: 10.5, fontWeight: 700,
              letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-2)',
              background: 'var(--bg-surface)', border: '1px solid var(--border-strong, rgba(0,0,0,0.14))',
              borderRadius: 6, padding: '8px 14px', cursor: 'pointer',
            }}
          >
            Tech overview
          </button>
          <DemoControls onRun={runScenario} onReset={reset} activeId={activeId} />
        </div>
      </header>

      {/* The globe settlement console fills the rest */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <JourneyConsole key={runKey} scenarioId={activeId} scenario={scenario} />
      </div>

      {showOverview && <TechOverview onClose={() => setShowOverview(false)} />}
    </div>
  )
}

const REPO_URL = 'https://github.com/LCS3002/eu-hk-hack-munich'
const ETHERSCAN = 'https://sepolia.etherscan.io/address/0x9527bAc8dDf0A3d3B42Af0F0C11F48fe1253540E#code'

// A clean, click-to-open product + tech overview: the master diagram, the stack,
// and the four things that make FaanSail novel. Pairs with the live demo.
function TechOverview({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const novel: [string, string][] = [
    ['Verifies the trade, not just the parties', 'invoice vs. bill of lading, declared value vs. supplier history, beneficiary-account changes — the over-invoicing party-screening misses.'],
    ['It can say no', 'the over-invoiced trade is refused before a cent moves — release() is onlyOracle-gated by the verdict. Most tools flag; ours acts, atomically.'],
    ['One on-chain event', 'buyer, supplier and regulator reconcile off the same Settled record. Zero breaks.'],
    ['Verifiable compliance', 'the verdict is a deterministic rules engine — a regulator re-runs it against the on-chain passport and gets the same answer. No model in the decision path.'],
  ]

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(20,20,22,0.55)',
        backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 20px', overflowY: 'auto',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 1020, background: 'var(--bg-base)', borderRadius: 14,
          border: '1px solid var(--border)', boxShadow: '0 24px 70px rgba(0,0,0,0.30)', padding: '34px 38px 40px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.22em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 8 }}>
              Tech overview
            </div>
            <h2 style={{ fontFamily: 'var(--font-hero), system-ui, sans-serif', fontSize: 30, fontWeight: 700, letterSpacing: '-0.02em', margin: 0, color: 'var(--text-1)' }}>
              Proof-of-trade-gated settlement
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6, margin: '10px 0 0', maxWidth: 640 }}>
              A deterministic gate verifies the real trade, a smart-contract escrow enforces the verdict, and one on-chain event settles and reconciles it — live on Sepolia.
            </p>
          </div>
          <button
            type="button" onClick={onClose}
            style={{ flexShrink: 0, width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--border-strong, rgba(0,0,0,0.14))', background: 'var(--bg-surface)', color: 'var(--text-2)', fontSize: 17, cursor: 'pointer', lineHeight: 1 }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Master diagram */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/overview.svg" alt="Problem → FaanSail → result" style={{ width: '100%', height: 'auto', margin: '26px 0 30px', borderRadius: 10 }} />

        {/* The stack */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 30, alignItems: 'start' }}>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 14 }}>
              The stack, end to end
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/architecture.svg" alt="Console → compliance gate → chain bridge → Sepolia → reconciliation" style={{ width: '100%', height: 'auto' }} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9.5, fontWeight: 700, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: 14 }}>
              Why it&apos;s novel
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {novel.map(([t, d]) => (
                <div key={t}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-1)', marginBottom: 3 }}>{t}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--text-2)', lineHeight: 1.55 }}>{d}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer links */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 32, paddingTop: 22, borderTop: '1px solid var(--border)' }}>
          <a href={ETHERSCAN} target="_blank" rel="noopener noreferrer" style={ovLink('var(--cleared, #15803d)')}>Verified contracts on Etherscan ↗</a>
          <a href={REPO_URL} target="_blank" rel="noopener noreferrer" style={ovLink('var(--text-2)')}>GitHub repo ↗</a>
          <a href="/pitch" style={ovLink('var(--accent)')}>Business pitch →</a>
        </div>
      </div>
    </div>
  )
}

function ovLink(color: string): React.CSSProperties {
  return {
    fontFamily: 'var(--font-mono), monospace', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em',
    textTransform: 'uppercase', color, textDecoration: 'none',
    border: '1px solid var(--border-strong, rgba(0,0,0,0.14))', borderRadius: 6, padding: '9px 14px',
  }
}
