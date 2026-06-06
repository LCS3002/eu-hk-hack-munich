'use client'

import { useTranslations } from 'next-intl'
import type { TradeScenario, ProofOfTradeResult, PassportStatus } from '@/lib/types'

interface RegulatorTx { hash: string; status: PassportStatus; explorerUrl: string | null }
interface RegulatorViewProps { scenario: TradeScenario | null; result: ProofOfTradeResult | null; tx: RegulatorTx | null }

function truncHash(hash: string): string {
  if (hash.length <= 18) return hash
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`
}

export default function RegulatorView({ scenario, result, tx }: RegulatorViewProps) {
  const t = useTranslations('regulator')
  const cleared = result?.verdict === 'CLEAR'
  const status: PassportStatus | 'PENDING' = tx?.status ?? (result ? (cleared ? 'CLEARED' : 'BLOCKED') : 'PENDING')
  const statusColor = status === 'SETTLED' || status === 'CLEARED' ? 'var(--cleared)' : status === 'BLOCKED' ? 'var(--blocked)' : 'var(--text-3)'

  return (
    <div style={{ background: 'var(--bg-surface)', border: '1px solid var(--border)', borderRadius: 'var(--panel-radius)', display: 'flex', flexDirection: 'column', minHeight: 0, height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-ui)', fontSize: 9, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.18em', flexShrink: 0 }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: result ? statusColor : 'var(--text-3)', flexShrink: 0 }} />
        <span>{t('title')}</span>
        <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '0.06em', color: 'var(--text-3)' }}>{t('readOnly').toUpperCase()}</span>
      </div>

      {!scenario && !result ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', textAlign: 'center' }}>
          <span style={{ fontSize: 22, opacity: 0.5 }}>⛓</span>
          {t('noPassport')}
        </div>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <Label>{t('tradePassport')}</Label>
            <div style={{ marginTop: 8, background: 'var(--bg-sunken)', borderTop: '1px solid var(--border)', borderRight: '1px solid var(--border)', borderBottom: '1px solid var(--border)', borderLeft: `2px solid ${statusColor}`, borderRadius: 'var(--panel-radius)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <Row k="invoiceRef" v={scenario?.invoice.invoiceRef ?? '—'} />
              <Row k="hsCode" v={scenario?.invoice.hsCode ?? '—'} />
              <Row k="declaredValue" v={scenario ? `$${scenario.invoice.declaredValue.toLocaleString()}` : '—'} />
              <Row k="quantity" v={scenario ? scenario.invoice.quantity.toLocaleString() : '—'} />
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 2, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
                <span style={keyStyle}>status</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', color: statusColor }}>{status}</span>
              </div>
            </div>
          </div>

          {result && (
            <div>
              <Label>{t('aiVerdict')}</Label>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: cleared ? 'rgba(21,128,61,0.08)' : 'var(--accent-soft)', border: `1px solid ${cleared ? 'var(--cleared)' : 'var(--blocked)'}`, borderRadius: 'var(--panel-radius)' }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, letterSpacing: '0.04em', color: cleared ? 'var(--cleared)' : 'var(--blocked)' }}>
                  {cleared ? t('cleared').toUpperCase() : t('blocked').toUpperCase()}
                </span>
                <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)' }}>risk {result.riskScore}</span>
              </div>
              {result.flags.length > 0 && (
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {result.flags.map((f, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-2)', lineHeight: 1.45 }}>
                      <span style={{ color: 'var(--blocked)', flexShrink: 0 }}>▲</span>{f}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {tx && (
            <div>
              <Label>{t('settlementTx')}</Label>
              <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', background: 'var(--bg-sunken)', border: '1px solid var(--border)', borderRadius: 'var(--panel-radius)' }}>
                <span title={tx.hash} style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-1)', letterSpacing: '0.02em', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {truncHash(tx.hash)}
                </span>
                {tx.explorerUrl && (
                  <a href={tx.explorerUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--accent)', textDecoration: 'none', borderBottom: '1px solid var(--accent)', whiteSpace: 'nowrap' }}>
                    {t('viewOnEtherscan')}
                  </a>
                )}
              </div>
            </div>
          )}

          <div style={{ marginTop: 'auto', paddingTop: 10, borderTop: '1px solid var(--border)', fontFamily: 'var(--font-mono)', fontSize: 9, color: 'var(--text-3)', letterSpacing: '0.04em', lineHeight: 1.5 }}>
            Audit trail reconciled from a single on-chain event — buyer, supplier and regulator read the same record.
          </div>
        </div>
      )}
    </div>
  )
}

const keyStyle: React.CSSProperties = { fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.04em', flexShrink: 0 }
function Label({ children }: { children: React.ReactNode }) {
  return <span style={{ fontFamily: 'var(--font-mono)', fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-3)' }}>{children}</span>
}
function Row({ k, v }: { k: string; v: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
      <span style={keyStyle}>{k}</span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 500, color: 'var(--text-1)', textAlign: 'right', letterSpacing: '0.02em' }}>{v}</span>
    </div>
  )
}
