'use client'

// FaanSail — DemoControls (compact, horizontal — lives in the slim header)
//   "Clean trade"     → TRD-CLEAN  (AI clears, escrow settles, green)
//   "Over-invoiced"   → TRD-DIRTY  (AI blocks, escrow refuses, red)
//   "Reset"           → clears the console
// Light theme; references the documented var(--…) tokens (see lib/types.ts).
// Border sides are set individually (not the `border` shorthand) so toggling the
// active state never clobbers borderLeft — avoids React's style-rerender warning.

import { CLEAN_TRADE, DIRTY_TRADE } from '@/lib/fixtures'

interface DemoControlsProps {
  onRun: (scenarioId: string) => void
  onReset: () => void
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
    label: 'Clean trade',
    sub: `$${CLEAN_TRADE.amount.toLocaleString('en-US')}`,
    tone: 'clean',
  },
  {
    id: DIRTY_TRADE.id, // 'TRD-DIRTY'
    label: 'Over-invoiced',
    sub: `$${DIRTY_TRADE.amount.toLocaleString('en-US')}`,
    tone: 'dirty',
  },
]

export default function DemoControls({ onRun, onReset, activeId }: DemoControlsProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 8.5,
          fontWeight: 600,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: 'var(--text-3)',
          marginRight: 2,
          whiteSpace: 'nowrap',
        }}
      >
        Settle a trade
      </span>

      {BUTTONS.map((b) => {
        const isActive = activeId === b.id
        const accent = b.tone === 'dirty' ? 'var(--blocked)' : 'var(--cleared)'
        const edge = isActive ? 'var(--accent)' : 'var(--border)'
        return (
          <button
            key={b.id}
            onClick={() => onRun(b.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              padding: '7px 12px',
              background: isActive ? 'var(--accent-soft)' : 'var(--bg-surface)',
              borderTop: `1px solid ${edge}`,
              borderRight: `1px solid ${edge}`,
              borderBottom: `1px solid ${edge}`,
              borderLeft: `2px solid ${accent}`,
              borderRadius: 'var(--panel-radius)',
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
              transition: 'border-color 0.2s ease, background 0.2s ease',
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: accent, flexShrink: 0 }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
              {b.label}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
              {b.sub}
            </span>
          </button>
        )
      })}

      <button
        onClick={onReset}
        aria-label="Reset console"
        style={{
          padding: '7px 11px',
          background: 'transparent',
          borderTop: '1px solid var(--border)',
          borderRight: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          borderLeft: '1px solid var(--border)',
          borderRadius: 'var(--panel-radius)',
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--text-3)',
          whiteSpace: 'nowrap',
        }}
      >
        Reset
      </button>
    </div>
  )
}
