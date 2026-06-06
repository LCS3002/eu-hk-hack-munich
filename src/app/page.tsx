'use client'

import { useState, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { SCENARIOS } from '@/lib/fixtures'
import type { TradeScenario, UploadedDocs } from '@/lib/types'
import DemoControls from '@/components/dashboard/DemoControls'
import JourneyConsole from '@/components/dashboard/JourneyConsole'
import UploadPanel from '@/components/dashboard/UploadPanel'

const FaanSailHero = dynamic(() => import('@/components/hero/FaanSailHero'), { ssr: false })

type Mode = 'landing' | 'dashboard'

const UPLOAD_SCENARIO_ID = 'TRD-UPLOAD'

export default function Page() {
  const [mode, setMode]                 = useState<Mode>('landing')
  const [activeId, setActiveId]         = useState<string | null>(null)
  const [runKey, setRunKey]             = useState(0)
  const [showUpload, setShowUpload]     = useState(false)
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocs | null>(null)

  const scenario: TradeScenario | null =
    activeId && activeId !== UPLOAD_SCENARIO_ID
      ? SCENARIOS[activeId] ?? null
      : null

  // Bumping runKey remounts JourneyConsole so each run starts clean and re-streams.
  const runScenario = useCallback((id: string) => {
    setRunKey(k => k + 1)
    setUploadedDocs(null)
    setActiveId(id)
  }, [])

  const reset = useCallback(() => {
    setRunKey(k => k + 1)
    setActiveId(null)
    setUploadedDocs(null)
  }, [])

  const handleUploadSubmit = useCallback((docs: UploadedDocs) => {
    setShowUpload(false)
    setUploadedDocs(docs)
    setRunKey(k => k + 1)
    setActiveId(UPLOAD_SCENARIO_ID)
  }, [])

  if (mode === 'landing') {
    return <FaanSailHero onEnter={() => setMode('dashboard')} />
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-base)', color: 'var(--text-1)', overflow: 'hidden' }}>
      {/* Upload modal */}
      {showUpload && (
        <UploadPanel
          onSubmit={handleUploadSubmit}
          onClose={() => setShowUpload(false)}
        />
      )}

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
        <div style={{ marginLeft: 'auto' }}>
          <DemoControls
            onRun={runScenario}
            onReset={reset}
            onUpload={() => setShowUpload(true)}
            activeId={activeId}
          />
        </div>
      </header>

      {/* The globe settlement console fills the rest */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
        <JourneyConsole
          key={runKey}
          scenarioId={activeId}
          scenario={scenario}
          uploadedDocs={uploadedDocs}
          onUpload={() => setShowUpload(true)}
        />
      </div>
    </div>
  )
}
