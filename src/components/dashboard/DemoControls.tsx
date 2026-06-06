'use client'

// Harbour — DemoControls
// The three demo triggers that drive the live settlement console:
//   "Clean trade"            → TRD-CLEAN  (AI clears, escrow settles, green)
//   "Over-invoiced shipment" → TRD-DIRTY  (AI blocks, escrow refuses, red)
//   "Reset"                  → clears all downstream state
// Light theme; references the documented var(--…) tokens (see lib/types.ts).

import { CLEAN_TRADE, DIRTY_TRADE } from '@/lib/fixtures'

interface DemoControlsProps {
  onRun: (scenarioId: string) => void
  onReset: () => void
  running: boolean
  activeId?: string | null
}

interface TradeButton {
  id: string
  label: string
  sub: string
  tone: 'clean' | 'dirty'
}

const BUTTONS: TradeButton[] = [
  {
    id: CLEAN_TRADE.id, // 'TRD-CLEAN'
    label: CLEAN_TRADE.label, // 'Clean trade'
    sub: `${CLEAN_TRADE.invoice.invoiceRef} · $${CLEAN_TRADE.amount.toLocaleString()}`,
    tone: 'clean',
  },
  {
    id: DIRTY_TRADE.id, // 'TRD-DIRTY'
    label: DIRTY_TRADE.label, // 'Over-invoiced shipment'
    sub: `${DIRTY_TRADE.invoice.invoiceRef} · $${DIRTY_TRADE.amount.toLocaleString()}`,
    tone: 'dirty',
  },
]

export default function DemoControls({
  onRun,
  onReset,
  running,
  activeId,
}: DemoControlsProps) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--panel-radius)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 14px',
          borderBottom: '1px solid var(--border)',
          fontFamily: 'var(--font-ui)',
          fontSize: 9,
          fontWeight: 600,
          color: 'var(--text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.18em',
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: running ? 'var(--accent)' : 'var(--text-3)',
            animation: running ? 'pulse-dot 1.4s ease-in-out infinite' : 'none',
            flexShrink: 0,
          }}
        />
        <span>Demo Control</span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.06em',
            color: running ? 'var(--accent)' : 'var(--text-3)',
          }}
        >
          {running ? 'RUNNING' : 'READY'}
        </span>
      </div>

      {/* Trade trigger buttons */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: 14,
        }}
      >
        {BUTTONS.map((b) => {
          const isActive = activeId === b.id
          const accent = b.tone === 'dirty' ? 'var(--blocked)' : 'var(--cleared)'
          return (
            <button
              key={b.id}
              onClick={() => onRun(b.id)}
              disabled={running}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 3,
                textAlign: 'left',
                padding: '11px 13px',
                background: isActive ? 'var(--accent-soft)' : 'var(--bg-base)',
                border: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                borderLeft: `2px solid ${accent}`,
                borderRadius: 'var(--panel-radius)',
                cursor: running ? 'not-allowed' : 'pointer',
                opacity: running && !isActive ? 0.5 : 1,
                transition: 'border-color 0.2s ease, background 0.2s ease, opacity 0.2s ease',
                fontFamily: 'var(--font-ui)',
                width: '100%',
              }}
            >
              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--text-1)',
                  letterSpacing: '-0.01em',
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: accent,
                    flexShrink: 0,
                  }}
                />
                {b.label}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  color: 'var(--text-2)',
                  letterSpacing: '0.02em',
                  paddingLeft: 15,
                }}
              >
                {b.sub}
              </span>
            </button>
          )
        })}

        {/* Reset */}
        <button
          onClick={onReset}
          disabled={running}
          style={{
            marginTop: 2,
            padding: '8px 13px',
            background: 'transparent',
            border: '1px solid var(--border)',
            borderRadius: 'var(--panel-radius)',
            cursor: running ? 'not-allowed' : 'pointer',
            opacity: running ? 0.5 : 1,
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--text-2)',
            transition: 'color 0.2s ease, border-color 0.2s ease',
          }}
        >
          Reset
        </button>
      </div>
    </div>
  )
}
