'use client'

// Harbour — TradePanel
// The "what's being verified" panel (left rail). Lays out the invoice + bill of
// lading the AI gate reconciles: invoice ref, buyer→supplier, HS code, quantity,
// declared value, beneficiary bank + account, payment terms, and a BoL summary.
// Light theme; documented var(--…) tokens. Calm placeholder when scenario null.

import type { TradeScenario } from '@/lib/types'

interface TradePanelProps {
  scenario: TradeScenario | null
}

export default function TradePanel({ scenario }: TradePanelProps) {
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
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: scenario ? 'var(--accent)' : 'var(--text-3)',
            flexShrink: 0,
          }}
        />
        <span>Trade Documents</span>
        {scenario && (
          <span
            style={{
              marginLeft: 'auto',
              fontFamily: 'var(--font-mono)',
              fontSize: 9,
              letterSpacing: '0.06em',
              color: 'var(--text-2)',
            }}
          >
            {scenario.invoice.invoiceRef}
          </span>
        )}
      </div>

      {/* Body */}
      {!scenario ? (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 10,
            padding: 20,
            color: 'var(--text-3)',
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            textAlign: 'center',
          }}
        >
          <span style={{ fontSize: 22, opacity: 0.5 }}>▤</span>
          No trade loaded
        </div>
      ) : (
        <div
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <TradeBody scenario={scenario} />
        </div>
      )}
    </div>
  )
}

function TradeBody({ scenario }: { scenario: TradeScenario }) {
  const inv = scenario.invoice
  const bol = scenario.billOfLading

  return (
    <>
      {/* Title + corridor */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
        <div
          style={{
            fontFamily: 'var(--font-ui)',
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-1)',
            letterSpacing: '-0.01em',
            lineHeight: 1.25,
          }}
        >
          {inv.goodsDescription}
        </div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 6,
            fontFamily: 'var(--font-mono)',
            fontSize: 11,
            color: 'var(--text-2)',
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{inv.buyerName}</span>
          <span style={{ color: 'var(--accent)' }}>→</span>
          <span style={{ fontWeight: 600, color: 'var(--text-1)' }}>{inv.supplierName}</span>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-3)',
            marginTop: 3,
          }}
        >
          {inv.buyerCountry} → {inv.supplierCountry}
        </div>
      </div>

      {/* Metric grid — declared value + quantity */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Metric
            label="Declared value"
            value={`$${inv.declaredValue.toLocaleString()}`}
            sub={`USD · $${inv.unitPrice}/unit`}
          />
          <Metric
            label="Quantity"
            value={inv.quantity.toLocaleString()}
            sub="units (invoice)"
          />
        </div>
      </div>

      {/* Invoice fields */}
      <Section label="Invoice">
        <Row k="Invoice ref" v={inv.invoiceRef} mono />
        <Row k="HS code" v={inv.hsCode} mono />
        <Row k="Invoice date" v={inv.invoiceDate} mono />
        <Row k="Beneficiary bank" v={inv.beneficiaryBank} />
        <Row k="Beneficiary account" v={inv.beneficiaryAccount} mono />
        <Row k="Payment terms" v={inv.paymentTerms} />
      </Section>

      {/* Bill of lading */}
      <Section label="Bill of lading" last>
        <Row k="BoL ref" v={bol.blRef} mono />
        <Row k="Vessel" v={bol.vessel} />
        <Row k="Port of loading" v={bol.portOfLoading} />
        <Row k="Port of discharge" v={bol.portOfDischarge} />
        <Row k="BoL quantity" v={`${bol.quantity.toLocaleString()} units`} mono />
        <Row k="Gross weight" v={`${bol.grossWeightKg.toLocaleString()} kg`} mono />
        <Row k="Ship date" v={bol.shipDate} mono />
      </Section>
    </>
  )
}

// ─── Building blocks ──────────────────────────────────────────────────────
function Metric({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div
      style={{
        background: 'var(--bg-sunken)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--panel-radius)',
        padding: '10px 12px',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 22,
          fontWeight: 300,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: 'var(--text-1)',
        }}
      >
        {value}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 10,
          color: 'var(--text-3)',
          marginTop: 4,
        }}
      >
        {sub}
      </div>
    </div>
  )
}

function Section({
  label,
  children,
  last,
}: {
  label: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div
      style={{
        padding: '12px 16px',
        borderBottom: last ? 'none' : '1px solid var(--border)',
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          fontWeight: 600,
          color: 'var(--text-3)',
          textTransform: 'uppercase',
          letterSpacing: '0.14em',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>
    </div>
  )
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        gap: 12,
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-ui)',
          fontSize: 11,
          color: 'var(--text-3)',
          flexShrink: 0,
        }}
      >
        {k}
      </span>
      <span
        style={{
          fontFamily: mono ? 'var(--font-mono)' : 'var(--font-ui)',
          fontSize: mono ? 11 : 12,
          fontWeight: mono ? 400 : 500,
          color: 'var(--text-1)',
          textAlign: 'right',
          letterSpacing: mono ? '0.02em' : 'normal',
        }}
      >
        {v}
      </span>
    </div>
  )
}
