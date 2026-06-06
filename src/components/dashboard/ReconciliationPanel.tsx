'use client'

import { useTranslations } from 'next-intl'
import type { TradeScenario, ProofOfTradeResult, PassportStatus } from '@/lib/types'

interface ReconciliationTx {
  hash: string
  status: PassportStatus
  explorerUrl: string | null
}

interface ReconciliationPanelProps {
  scenario: TradeScenario | null
  result: ProofOfTradeResult | null
  tx: ReconciliationTx | null
}

function truncHash(hash: string): string {
  if (hash.length <= 18) return hash
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`
}

export default function ReconciliationPanel({ tx }: ReconciliationPanelProps) {
  const t = useTranslations('reconciliation')
  const hasEvent = tx !== null
  const blocked  = tx?.status === 'BLOCKED'
  const settled  = tx?.status === 'SETTLED'

  const headerColor = blocked ? 'var(--blocked)' : settled ? 'var(--cleared)' : 'var(--text-3)'
  const headerLabel = blocked ? t('escalated').toUpperCase() : settled ? t('matched').toUpperCase() : t('pending').toUpperCase()

  const PARTIES = [
    { key: 'buyer',     name: t('buyerLedger'),     system: t('buyerSystem') },
    { key: 'supplier',  name: t('supplierLedger'),  system: t('supplierSystem') },
    { key: 'regulator', name: t('regulatorNode'),   system: t('regulatorSystem') },
  ]

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--panel-radius)', display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.18em', flexShrink: 0 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: headerColor, flexShrink: 0 }} />
        <span>{t('title')}</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em', color: headerColor }}>{headerLabel}</span>
      </div>

      {/* Headline */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
          {blocked
            ? <>{t('headline')} <span style={{ color: 'var(--blocked)' }}>{t('fundsHeld')}</span></>
            : <>{t('headline')} <span style={{ color: settled ? 'var(--cleared)' : 'var(--text-1)' }}>{t('zeroBreaks')}</span></>
          }
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.55 }}>
          {blocked ? t('blockedDesc') : t('legacyDesc')}
        </div>
      </div>

      {/* Ledger rows */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PARTIES.map((party) => (
          <LedgerRow key={party.key} partyKey={party.key} name={party.name} system={party.system} tx={tx} />
        ))}

        {!hasEvent && (
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center' }}>
            <span style={{ fontSize: 18, opacity: 0.5 }}>⇄</span>
            {t('awaitingEvent')}
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.03em', lineHeight: 1.6 }}>
          {blocked ? t('footnoteBlocked') : hasEvent ? t('footnoteSettled') : t('footnotePending')}
        </div>
      </div>
    </div>
  )
}

function LedgerRow({ partyKey, name, system, tx }: { partyKey: string; name: string; system: string; tx: ReconciliationTx | null }) {
  const t = useTranslations('reconciliation')
  const blocked  = tx?.status === 'BLOCKED'
  const hasEvent = tx !== null

  let rowColor: string, rowLabel: string, rowIcon: string
  if (!hasEvent) {
    rowColor = 'var(--text-3)'; rowLabel = t('statusPending'); rowIcon = ''
  } else if (blocked) {
    rowColor = 'var(--blocked)'
    rowLabel = partyKey === 'regulator' ? t('escalated') : partyKey === 'supplier' ? t('statusBlocked') : t('statusHeld')
    rowIcon = '▲'
  } else {
    rowColor = 'var(--cleared)'; rowLabel = t('statusMatched'); rowIcon = '✓'
  }

  return (
    <div style={{ background: 'var(--bg-sunken)', borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', borderLeft: `2px solid ${hasEvent ? rowColor : 'var(--border-strong)'}`, borderRadius: 'var(--panel-radius)', padding: '10px 12px', transition: 'border-color 0.3s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.04em' }}>{system}</span>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: rowColor, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {rowLabel} {rowIcon && <span style={{ fontSize: 11 }}>{rowIcon}</span>}
        </span>
      </div>
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
          {blocked ? t('blockedTx') : t('settlementTx')}
        </span>
        {hasEvent ? (
          tx!.explorerUrl ? (
            <a href={tx!.explorerUrl} target="_blank" rel="noopener noreferrer" title={tx!.hash} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.02em', textDecoration: 'none', borderBottom: '1px solid var(--accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
              {truncHash(tx!.hash)}
            </a>
          ) : (
            <span title={tx!.hash} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-1)', letterSpacing: '0.02em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
              {truncHash(tx!.hash)}
            </span>
          )
        ) : (
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.06em' }}>—</span>
        )}
      </div>
    </div>
  )
}
