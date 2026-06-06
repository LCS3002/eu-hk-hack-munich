'use client'

import { useTranslations } from 'next-intl'
import type { TradeScenario, PassportStatus } from '@/lib/types'

interface TreasuryPanelProps {
  scenario: TradeScenario | null
  status: PassportStatus | 'IDLE'
  elapsedMs: number | null
}

const CARRY_RATE = 0.08
const CARRY_DAYS = 4
const CARRY_FACTOR = CARRY_RATE * (CARRY_DAYS / 365)

export default function TreasuryPanel({ scenario, status, elapsedMs }: TreasuryPanelProps) {
  const t = useTranslations('treasury')
  const active = scenario !== null && status !== 'IDLE'
  const settled = status === 'SETTLED'

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--panel-radius)', display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.18em', flexShrink: 0 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: settled ? 'var(--cleared)' : active ? 'var(--accent)' : 'var(--text-3)', flexShrink: 0 }} />
        <span>{t('title')}</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em', color: 'var(--text-3)' }}>{t('capitalEfficiency')}</span>
      </div>

      {!active ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center' }}>
          <span style={{ fontSize: 22, opacity: 0.5 }}>≈</span>
          {t('awaiting')}
        </div>
      ) : (
        <TreasuryBody scenario={scenario!} settled={settled} elapsedMs={elapsedMs} />
      )}
    </div>
  )
}

function TreasuryBody({ scenario, settled, elapsedMs }: { scenario: TradeScenario; settled: boolean; elapsedMs: number | null }) {
  const t = useTranslations('treasury')
  const seconds = elapsedMs != null ? (elapsedMs / 1000).toFixed(1) : null
  const amount = scenario.amount
  const carrySaved = amount * CARRY_FACTOR

  return (
    <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
      {/* Settlement latency */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>
          {t('settlementLatency')}
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 18, fontWeight: 400, color: 'var(--text-3)', textDecoration: 'line-through', textDecorationColor: 'var(--border-strong)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
            {t('legacyWindow')}
          </span>
          <span style={{ color: 'var(--accent)', fontSize: 16, fontFamily: 'var(--font-mono)' }}>→</span>
          <span style={{ fontFamily: 'var(--font-hero)', fontSize: 42, fontWeight: 600, lineHeight: 1, letterSpacing: '-0.02em', color: settled ? 'var(--cleared)' : 'var(--text-1)' }}>
            {seconds != null ? `${seconds}s` : '—'}
          </span>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)', marginTop: 8, lineHeight: 1.5 }}>
          {t('legacyDesc')}{' '}
          <span style={{ color: settled ? 'var(--cleared)' : 'var(--text-1)', fontWeight: 600 }}>
            {settled ? t('settledCopy') : t('settlesCopy')}
          </span>
        </div>
      </div>

      {/* Trapped capital freed */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginBottom: 8 }}>
          {t('trappedCapital')}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Metric label={t('prefundingFreed')} value={`$${amount.toLocaleString()}`} sub={t('prefundingSub')} />
          <Metric label={t('carrySaved')} value={`$${carrySaved.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} sub={t('carrySub')} accent />
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)', marginTop: 8, lineHeight: 1.5 }}>
          {t('trappedDesc')}
        </div>
      </div>

      {/* Reconciliation breaks */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '10px 12px', background: 'rgba(21,128,61,0.08)', border: '1px solid var(--cleared)', borderRadius: 'var(--panel-radius)' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 500, color: 'var(--text-1)' }}>
            {t('reconcBreaks')}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontFamily: 'var(--font-hero)', fontSize: 20, fontWeight: 600, lineHeight: 1, color: 'var(--cleared)' }}>
            0 <span style={{ fontSize: 14 }}>✓</span>
          </span>
        </div>
      </div>

      {/* Footnote */}
      <div style={{ marginTop: 'auto', padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.03em', lineHeight: 1.6 }}>
        {t('footnote')}
      </div>
    </div>
  )
}

function Metric({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div style={{ background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 'var(--panel-radius)', padding: '10px 12px' }}>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{label}</div>
      <div style={{ fontFamily: 'var(--font-ui)', fontSize: 22, fontWeight: 300, lineHeight: 1, letterSpacing: '-0.02em', color: accent ? 'var(--cleared)' : 'var(--text-1)' }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>{sub}</div>
    </div>
  )
}
