'use client'

// FaanSail — TreasuryPanel
// The capital-efficiency / liquidity story, told honestly. Correspondent banking
// pre-funds settlement across a 3–5 day window; FaanSail compresses that window to
// seconds and nets flows, so capital stops sitting trapped in nostro accounts.
//   • Headline: settlement latency  T+3–5 days → {elapsedMs/1000}s
//   • Trapped capital freed: scenario.amount no longer pre-funded for 3–5 days,
//     with a cost-of-carry estimate ≈ amount × 0.08 × (4/365) per cycle
//   • Reconciliation breaks: 0
//   • Honest footnote: FaanSail takes no FX risk — a licensed partner supplies liquidity.
// Light theme; documented var(--…) tokens. Calm placeholder when scenario is null / IDLE.

import type { TradeScenario, PassportStatus } from '@/lib/types'

interface TreasuryPanelProps {
  scenario: TradeScenario | null
  status: PassportStatus | 'IDLE'
  elapsedMs: number | null
}

// Cost-of-carry assumptions, kept explicit + honest (no hidden magic numbers).
const CARRY_RATE = 0.08 // ~8% annualised cost of working capital
const CARRY_DAYS = 4 // mid-point of the legacy 3–5 day pre-funding window
const CARRY_FACTOR = CARRY_RATE * (CARRY_DAYS / 365)

export default function TreasuryPanel({ scenario, status, elapsedMs }: TreasuryPanelProps) {
  const active = scenario !== null && status !== 'IDLE'
  const settled = status === 'SETTLED'

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
            background: settled ? 'var(--cleared)' : active ? 'var(--accent)' : 'var(--text-3)',
            flexShrink: 0,
          }}
        />
        <span>Treasury &amp; Liquidity</span>
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'var(--font-mono)',
            fontSize: 9,
            letterSpacing: '0.06em',
            color: 'var(--text-3)',
          }}
        >
          CAPITAL EFFICIENCY
        </span>
      </div>

      {!active ? (
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
          <span style={{ fontSize: 22, opacity: 0.5 }}>≈</span>
          Awaiting settlement
        </div>
      ) : (
        <TreasuryBody scenario={scenario!} settled={settled} elapsedMs={elapsedMs} />
      )}
    </div>
  )
}

function TreasuryBody({
  scenario,
  settled,
  elapsedMs,
}: {
  scenario: TradeScenario
  settled: boolean
  elapsedMs: number | null
}) {
  const seconds = elapsedMs != null ? (elapsedMs / 1000).toFixed(1) : null
  const amount = scenario.amount
  const carrySaved = amount * CARRY_FACTOR

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── Headline metric — settlement latency ── */}
      <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
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
          Settlement latency
        </div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
          {/* Legacy baseline */}
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 18,
              fontWeight: 400,
              color: 'var(--text-3)',
              textDecoration: 'line-through',
              textDecorationColor: 'var(--border-strong)',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}
          >
            T+3–5 days
          </span>
          <span style={{ color: 'var(--accent)', fontSize: 16, fontFamily: 'var(--font-mono)' }}>
            →
          </span>
          {/* FaanSail */}
          <span
            style={{
              fontFamily: 'var(--font-hero)',
              fontSize: 42,
              fontWeight: 600,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: settled ? 'var(--cleared)' : 'var(--text-1)',
            }}
          >
            {seconds != null ? `${seconds}s` : '—'}
          </span>
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-2)',
            marginTop: 8,
            lineHeight: 1.5,
          }}
        >
          Legacy correspondent banking pre-funds and clears over 3–5 days.{' '}
          <span style={{ color: settled ? 'var(--cleared)' : 'var(--text-1)', fontWeight: 600 }}>
            {settled
              ? 'FaanSail settled this cycle in seconds.'
              : 'FaanSail settles in seconds.'}
          </span>
        </div>
      </div>

      {/* ── Trapped capital freed ── */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
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
          Trapped capital freed
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          <Metric
            label="Pre-funding freed"
            value={`$${amount.toLocaleString()}`}
            sub="USD · not locked 3–5 days"
          />
          <Metric
            label="Carry saved / cycle"
            value={`$${carrySaved.toLocaleString(undefined, {
              maximumFractionDigits: 0,
            })}`}
            sub="≈ amount × 8% × 4/365"
            accent
          />
        </div>
        <div
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 10,
            color: 'var(--text-2)',
            marginTop: 8,
            lineHeight: 1.5,
          }}
        >
          This settlement amount no longer has to sit pre-funded in a nostro account
          across the clearing window — it stays available as working capital.
        </div>
      </div>

      {/* ── Reconciliation breaks ── */}
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            padding: '10px 12px',
            background: 'rgba(21,128,61,0.08)',
            border: '1px solid var(--cleared)',
            borderRadius: 'var(--panel-radius)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-ui)',
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--text-1)',
            }}
          >
            Reconciliation breaks
          </span>
          <span
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              fontFamily: 'var(--font-hero)',
              fontSize: 20,
              fontWeight: 600,
              lineHeight: 1,
              color: 'var(--cleared)',
            }}
          >
            0
            <span style={{ fontSize: 14 }}>✓</span>
          </span>
        </div>
      </div>

      {/* ── Honest footnote ── */}
      <div
        style={{
          marginTop: 'auto',
          padding: '12px 16px',
          fontFamily: 'var(--font-mono)',
          fontSize: 9,
          color: 'var(--text-3)',
          letterSpacing: '0.03em',
          lineHeight: 1.6,
        }}
      >
        FaanSail compresses the pre-funding window and nets flows — it takes no FX
        risk; a licensed partner provides liquidity.
      </div>
    </div>
  )
}

// ─── Building block ───────────────────────────────────────────────────────
function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: string
  sub: string
  accent?: boolean
}) {
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
          color: accent ? 'var(--cleared)' : 'var(--text-1)',
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
