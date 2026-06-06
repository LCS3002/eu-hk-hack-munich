'use client'

import { useState, useCallback } from 'react'
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
      {/* Top bar — sizes to its content (no fixed height) so the controls never clip */}
      <header style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '9px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-surface)', flexShrink: 0 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="FaanSail" width={40} height={40} style={{ display: 'block', flexShrink: 0 }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          <span style={{ fontFamily: 'var(--font-hero), system-ui, sans-serif', fontWeight: 700, fontSize: 19, letterSpacing: '0.01em', color: 'var(--text-1)', lineHeight: 1 }}>FAANSAIL</span>
          <span style={{ fontFamily: 'var(--font-mono), monospace', fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.16em', textTransform: 'uppercase' }}>Hong Kong settlement corridor</span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <DemoControls onRun={runScenario} onReset={reset} running={false} activeId={activeId} />
        </div>
      </header>

      {/* The money-journey console fills the rest */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <JourneyConsole key={runKey} scenarioId={activeId} scenario={scenario} />
      </div>
    </div>
  )
}
