'use client'

// FaanSail — DemoControls (compact, horizontal — lives in the slim header)
//   "Clean trade"   → TRD-CLEAN  (AI clears, escrow settles, green)
//   "Over-invoiced" → TRD-DIRTY  (AI blocks, escrow refuses, red)
//   "↺"             → resets the console
// Light theme; references the documented var(--…) tokens (see lib/types.ts).

import { CLEAN_TRADE, DIRTY_TRADE } from '@/lib/fixtures'

interface DemoControlsProps {
  onRun: (scenarioId: string) => void
  onReset: () => void
  onUpload: () => void
  activeId?: string | null
}

interface TradeButton {
  id: string
  label: string
  sub: string
  tone: 'clean' | 'dirty'
  glyph: string
}

const BUTTONS: TradeButton[] = [
  {
    id: CLEAN_TRADE.id, // 'TRD-CLEAN'
    label: 'Clean trade',
    sub: `$${CLEAN_TRADE.amount.toLocaleString('en-US')}`,
    tone: 'clean',
    glyph: '✓',
  },
  {
    id: DIRTY_TRADE.id, // 'TRD-DIRTY'
    label: 'Over-invoiced',
    sub: `$${DIRTY_TRADE.amount.toLocaleString('en-US')}`,
    tone: 'dirty',
    glyph: '!',
  },
]

export default function DemoControls({ onRun, onReset, onUpload, activeId }: DemoControlsProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <style>{`
        .fs-pill { transition: border-color .18s ease, background .18s ease, transform .12s ease, box-shadow .18s ease; }
        .fs-pill:hover { background: var(--bg-sunken); transform: translateY(-1px); box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
        .fs-reset { transition: color .18s ease, border-color .18s ease, transform .12s ease; }
        .fs-reset:hover { color: var(--text-1); border-color: var(--border-strong); transform: rotate(-40deg); }
        .fs-upload { transition: border-color .18s ease, background .18s ease, color .18s ease, transform .12s ease; }
        .fs-upload:hover { background: var(--accent); color: #fff; border-color: var(--accent); transform: translateY(-1px); }
      `}</style>

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
        Try a trade
      </span>

      {BUTTONS.map((b) => {
        const isActive = activeId === b.id
        const accent = b.tone === 'dirty' ? 'var(--blocked)' : 'var(--cleared)'
        const edge = isActive ? 'var(--accent)' : 'var(--border)'
        return (
          <button
            key={b.id}
            className="fs-pill"
            onClick={() => onRun(b.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '6px 12px 6px 7px',
              background: isActive ? 'var(--accent-soft)' : 'var(--bg-surface)',
              borderTop: `1px solid ${edge}`,
              borderRight: `1px solid ${edge}`,
              borderBottom: `1px solid ${edge}`,
              borderLeft: `1px solid ${edge}`,
              borderRadius: 7,
              cursor: 'pointer',
              fontFamily: 'var(--font-ui)',
            }}
          >
            <span
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: accent,
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 700,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              {b.glyph}
            </span>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
              {b.label}
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 600, color: 'var(--text-2)', whiteSpace: 'nowrap' }}>
              {b.sub}
            </span>
          </button>
        )
      })}

      {/* Upload your own trade docs */}
      <button
        className="fs-upload"
        onClick={onUpload}
        title="Upload your own invoice + bill of lading"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 11px',
          background: 'var(--bg-surface)',
          border: '1px solid var(--accent)',
          borderRadius: 7,
          cursor: 'pointer',
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          fontWeight: 700,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          color: 'var(--accent)',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: 12, lineHeight: 1 }}>↑</span>
        Upload
      </button>

      <button
        className="fs-reset"
        onClick={onReset}
        aria-label="Reset console"
        title="Reset"
        style={{
          width: 30,
          height: 30,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'transparent',
          border: '1px solid var(--border)',
          borderRadius: 7,
          cursor: 'pointer',
          color: 'var(--text-3)',
          fontSize: 15,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ↺
      </button>
    </div>
  )
}
