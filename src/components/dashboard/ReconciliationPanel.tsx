'use client'

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

interface Party {
  key: string
  name: string
  system: string
}

const PARTIES: Party[] = [
  { key: 'buyer',    name: 'Buyer ledger',    system: 'Importer ERP / AP' },
  { key: 'supplier', name: 'Supplier ledger', system: 'Exporter AR' },
  { key: 'regulator',name: 'Regulator node',  system: 'Supervisory read' },
]

export default function ReconciliationPanel({ tx }: ReconciliationPanelProps) {
  const hasEvent = tx !== null
  const blocked  = tx?.status === 'BLOCKED'
  const settled  = tx?.status === 'SETTLED'

  // Header dot + label depend on outcome
  const headerColor = blocked ? 'var(--blocked)' : settled ? 'var(--cleared)' : 'var(--text-3)'
  const headerLabel = blocked ? 'ESCALATED' : settled ? 'MATCHED' : 'PENDING'

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--panel-radius)',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        height: '100%',
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
          flexShrink: 0,
        }}
      >
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: headerColor, flexShrink: 0 }} />
        <span>Reconciliation</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em', color: headerColor }}>
          {headerLabel}
        </span>
      </div>

      {/* Headline */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontFamily: 'var(--font-ui)', fontSize: 16, fontWeight: 600, color: 'var(--text-1)', letterSpacing: '-0.01em', lineHeight: 1.25 }}>
          {blocked
            ? <>One event. Three parties. <span style={{ color: 'var(--blocked)' }}>Funds held.</span></>
            : <>One event. Three parties. <span style={{ color: settled ? 'var(--cleared)' : 'var(--text-1)' }}>Zero breaks.</span></>
          }
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.55 }}>
          {blocked
            ? 'Trade blocked by compliance gate — funds remain locked in escrow, all parties notified from the same event.'
            : 'Legacy: days of manual matching across separate systems. FaanSail: automatic, from the single settlement event.'}
        </div>
      </div>

      {/* Ledger rows */}
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {PARTIES.map((party) => (
          <LedgerRow key={party.key} party={party} tx={tx} />
        ))}

        {!hasEvent && (
          <div style={{ marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 14, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center' }}>
            <span style={{ fontSize: 18, opacity: 0.5 }}>⇄</span>
            Awaiting settlement event
          </div>
        )}

        <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.03em', lineHeight: 1.6 }}>
          {blocked
            ? 'Funds held in escrow — compliance officer review required before release.'
            : hasEvent
              ? 'All three parties reconciled off one on-chain event — the same tx hash, no break to investigate.'
              : 'When the settlement event lands, every ledger reconciles to the same on-chain tx hash.'}
        </div>
      </div>
    </div>
  )
}

function LedgerRow({ party, tx }: { party: Party; tx: ReconciliationTx | null }) {
  const blocked  = tx?.status === 'BLOCKED'
  const hasEvent = tx !== null

  // Per-party label + colour depends on outcome
  let rowColor: string
  let rowLabel: string
  let rowIcon: string

  if (!hasEvent) {
    rowColor = 'var(--text-3)'
    rowLabel = 'pending'
    rowIcon  = ''
  } else if (blocked) {
    // Buyer: funds held. Supplier: payment blocked. Regulator: escalated.
    rowColor = 'var(--blocked)'
    rowLabel = party.key === 'regulator' ? 'escalated' : party.key === 'supplier' ? 'blocked' : 'held'
    rowIcon  = '▲'
  } else {
    rowColor = 'var(--cleared)'
    rowLabel = 'matched'
    rowIcon  = '✓'
  }

  return (
    <div
      style={{
        background: 'var(--bg-sunken)',
        borderTop: '1px solid var(--border)',
        borderRight: '1px solid var(--border)',
        borderBottom: '1px solid var(--border)',
        borderLeft: `2px solid ${hasEvent ? rowColor : 'var(--border-strong)'}`,
        borderRadius: 'var(--panel-radius)',
        padding: '10px 12px',
        transition: 'border-color 0.3s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2, minWidth: 0 }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>{party.name}</span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.04em' }}>{party.system}</span>
        </div>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: rowColor, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {rowLabel} {rowIcon && <span style={{ fontSize: 11 }}>{rowIcon}</span>}
        </span>
      </div>

      {/* Shared tx hash */}
      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 8, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.08em', flexShrink: 0 }}>
          {blocked ? 'Blocked tx' : 'Settlement tx'}
        </span>
        {hasEvent ? (
          tx!.explorerUrl ? (
            <a href={tx!.explorerUrl} target="_blank" rel="noopener noreferrer" title={tx!.hash}
              style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--accent)', letterSpacing: '0.02em', textDecoration: 'none', borderBottom: '1px solid var(--accent)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>
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
