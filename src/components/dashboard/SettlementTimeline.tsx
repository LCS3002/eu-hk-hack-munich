'use client'

import { useTranslations } from 'next-intl'
import type { PassportStatus } from '@/lib/types'

interface SettlementTimelineProps {
  status: PassportStatus | 'IDLE'
}

type StepKey = 'LOCKED' | 'VERIFYING' | 'SETTLED'
type StepState = 'done' | 'active' | 'pending'

export default function SettlementTimeline({ status }: SettlementTimelineProps) {
  const t = useTranslations('timeline')
  const blocked = status === 'BLOCKED'

  const STEPS: { key: StepKey; label: string; code: string }[] = [
    { key: 'LOCKED',    label: t('locked'),    code: '01' },
    { key: 'VERIFYING', label: t('verifying'), code: '02' },
    { key: 'SETTLED',   label: t('settled'),   code: '03' },
  ]

  const progressIndex = ((): number => {
    switch (status) {
      case 'IDLE':      return 0
      case 'VERIFYING': return 1
      case 'CLEARED':   return 1
      case 'SETTLED':
      case 'BLOCKED':   return 2
      default:          return 0
    }
  })()

  const finalReached = status === 'SETTLED' || status === 'BLOCKED'

  const stateFor = (idx: number): StepState => {
    if (idx < progressIndex) return 'done'
    if (idx === progressIndex) {
      if (idx === 2 && !finalReached) return 'pending'
      return 'active'
    }
    return 'pending'
  }

  const terminalColor = blocked ? 'var(--blocked)' : 'var(--cleared)'
  const terminalLabel = blocked ? t('blocked') : t('settled')

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--panel-radius)', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 0 }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginRight: 18, whiteSpace: 'nowrap', flexShrink: 0 }}>
        {t('title')}
      </span>

      {STEPS.map((step, idx) => {
        const isTerminal = step.key === 'SETTLED'
        const st = stateFor(idx)

        let color = 'var(--text-3)'
        if (st === 'active') color = isTerminal ? terminalColor : 'var(--accent)'
        else if (st === 'done') color = 'var(--cleared)'

        const label = isTerminal ? terminalLabel : step.label
        const showConnector = idx > 0
        const connectorActive = idx <= progressIndex
        const connectorColor = isTerminal && finalReached ? terminalColor : connectorActive ? 'var(--accent)' : 'var(--border-strong)'

        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            {showConnector && (
              <div style={{ flex: 1, height: 2, background: connectorColor, margin: '0 8px', transition: 'background 0.3s ease', minWidth: 16 }} />
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{
                width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
                background: st === 'pending' ? 'transparent' : color,
                border: `2px solid ${st === 'pending' ? 'var(--border-strong)' : color}`,
                boxShadow: st === 'active' ? `0 0 0 4px ${haloFor(color)}` : 'none',
                animation: st === 'active' && !isTerminal ? 'pulse-dot 1.4s ease-in-out infinite' : 'none',
                transition: 'background 0.3s ease, border-color 0.3s ease',
              }} />
              <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.1 }}>
                <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: st === 'pending' ? 400 : 600, color: st === 'pending' ? 'var(--text-3)' : 'var(--text-1)', whiteSpace: 'nowrap' }}>
                  {label}
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, letterSpacing: '0.1em', color: st === 'pending' ? 'var(--text-3)' : color }}>
                  {step.code}
                </span>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function haloFor(color: string): string {
  if (color === 'var(--cleared)') return 'rgba(21,128,61,0.12)'
  return 'var(--accent-soft)'
}
