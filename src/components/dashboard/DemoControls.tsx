'use client'

import { useTranslations } from 'next-intl'
import { CLEAN_TRADE, DIRTY_TRADE } from '@/lib/fixtures'

interface DemoControlsProps {
  onRun: (scenarioId: string) => void
  onReset: () => void
  running: boolean
  activeId?: string | null
}

export default function DemoControls({ onRun, onReset, running, activeId }: DemoControlsProps) {
  const t = useTranslations('demo')

  const BUTTONS = [
    { id: CLEAN_TRADE.id, label: t('cleanTrade'), sub: `${CLEAN_TRADE.invoice.invoiceRef} · $${CLEAN_TRADE.amount.toLocaleString('en-US')}`, tone: 'clean' as const },
    { id: DIRTY_TRADE.id, label: t('dirtyTrade'), sub: `${DIRTY_TRADE.invoice.invoiceRef} · $${DIRTY_TRADE.amount.toLocaleString('en-US')}`, tone: 'dirty' as const },
  ]

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--panel-radius)', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.18em' }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: running ? 'var(--accent)' : 'var(--text-3)', animation: running ? 'pulse-dot 1.4s ease-in-out infinite' : 'none', flexShrink: 0 }} />
        <span>{t('title')}</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em', color: running ? 'var(--accent)' : 'var(--text-3)' }}>
          {running ? t('running') : t('ready')}
        </span>
      </div>

      {/* Trade trigger buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 14 }}>
        {BUTTONS.map((b) => {
          const isActive = activeId === b.id
          const accent = b.tone === 'dirty' ? 'var(--blocked)' : 'var(--cleared)'
          return (
            <button
              key={b.id}
              onClick={() => onRun(b.id)}
              disabled={running}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 3, textAlign: 'left', padding: '11px 13px',
                background: isActive ? 'var(--accent-soft)' : 'var(--bg-base)',
                borderTop: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                borderRight: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                borderBottom: `1px solid ${isActive ? 'var(--accent)' : 'var(--border)'}`,
                borderLeft: `2px solid ${accent}`,
                borderRadius: 'var(--panel-radius)', cursor: running ? 'not-allowed' : 'pointer',
                opacity: running && !isActive ? 0.5 : 1,
                transition: 'border-color 0.2s ease, background 0.2s ease, opacity 0.2s ease',
                fontFamily: 'var(--font-ui)', width: '100%',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                {b.label}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.02em', paddingLeft: 15 }}>
                {b.sub}
              </span>
            </button>
          )
        })}

        <button
          onClick={onReset}
          disabled={running}
          style={{
            marginTop: 2, padding: '8px 13px', background: 'transparent', border: '1px solid var(--border)',
            borderRadius: 'var(--panel-radius)', cursor: running ? 'not-allowed' : 'pointer',
            opacity: running ? 0.5 : 1, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 600,
            letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-2)',
            transition: 'color 0.2s ease, border-color 0.2s ease',
          }}
        >
          {t('reset')}
        </button>
      </div>
    </div>
  )
}
