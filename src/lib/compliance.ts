// FaanSail — deterministic trade-finance compliance engine.
//
// This is the REAL compliance logic: auditable rules computed directly from the
// structured trade data (invoice, bill of lading, supplier history). It is
// deterministic and reproducible — anyone, including a regulator, can re-run it
// against the on-chain passport and get the same verdict. This is the verdict OF
// RECORD that gates settlement.
//
// The LLM (api/verify) is layered ON TOP as an assist only: in production it
// extracts these structured fields from raw PDF/EDI documents and writes the
// human-readable explanation. It does NOT decide. Compliance is rules, not a
// single model call.

import type { TradeScenario, ProofOfTradeResult, CrossDocCheck, Verdict } from './types'

// A declared value may exceed the supplier's 12-month average by this much before
// it reads as over-invoicing / trade-based money laundering.
export const VALUE_TOLERANCE = 0.1
// riskScore at or above this blocks settlement; below it clears.
export const BLOCK_THRESHOLD = 45

const fmt = (n: number) => n.toLocaleString('en-US')
const pct = (r: number) => `${Math.round(r * 100)}%`

/** Pull a ship-by date (YYYY-MM-DD) out of free-text payment terms, if present. */
function shipByDate(paymentTerms: string): string | null {
  const m = paymentTerms.match(/(\d{4}-\d{2}-\d{2})/)
  return m ? m[1] : null
}

/**
 * Run the five cross-document checks deterministically and derive the verdict +
 * risk score from the data alone. No model, no fixtures — pure, auditable rules.
 */
export function runCompliance(scenario: TradeScenario): ProofOfTradeResult {
  const inv = scenario.invoice
  const bol = scenario.billOfLading
  const hist = scenario.supplierHistory

  const checks: CrossDocCheck[] = []
  const flags: string[] = []
  let risk = 0

  // 1 — Quantity: invoice vs bill of lading.
  const qtyMatch = inv.quantity === bol.quantity
  checks.push({
    name: 'Quantity match',
    status: qtyMatch ? 'PASS' : 'FAIL',
    detail: qtyMatch
      ? `Invoice ${fmt(inv.quantity)} = BoL ${fmt(bol.quantity)}`
      : `Invoice ${fmt(inv.quantity)} ≠ BoL ${fmt(bol.quantity)}`,
  })
  if (!qtyMatch) {
    risk += 20
    flags.push(`Quantity mismatch (invoice ${fmt(inv.quantity)} vs BoL ${fmt(bol.quantity)})`)
  }

  // 2 — Declared value vs the supplier's 12-month average (over-invoicing / TBML).
  const ratio = hist.avgDeclaredValue > 0 ? inv.declaredValue / hist.avgDeclaredValue : 1
  const overPct = Math.max(0, ratio - 1)
  const valueOk = overPct <= VALUE_TOLERANCE
  checks.push({
    name: 'Value consistency',
    status: valueOk ? 'PASS' : 'FAIL',
    detail: valueOk
      ? `$${fmt(inv.declaredValue)} within ${pct(VALUE_TOLERANCE)} of supplier average`
      : `$${fmt(inv.declaredValue)} is ${pct(overPct)} above supplier average $${fmt(hist.avgDeclaredValue)}`,
  })
  // a small contribution even within tolerance, scaling with how far over.
  risk += Math.round(Math.min(0.12, overPct) * 40)
  if (!valueOk) {
    risk += 22 + Math.round(Math.min(0.5, overPct) * 24)
    flags.push(`Over-invoicing: ${pct(overPct)} above supplier average for the same goods`)
  }

  // 3 — HS code: invoice vs bill of lading.
  const hsOk = inv.hsCode === bol.hsCode
  checks.push({
    name: 'HS code',
    status: hsOk ? 'PASS' : 'FAIL',
    detail: hsOk ? `${inv.hsCode} consistent across documents` : `${inv.hsCode} ≠ ${bol.hsCode}`,
  })
  if (!hsOk) {
    risk += 15
    flags.push(`HS code mismatch (${inv.hsCode} vs ${bol.hsCode})`)
  }

  // 4 — Beneficiary account vs the account paid on prior shipments (capital flight / fraud).
  const benOk = inv.beneficiaryAccount === hist.knownBeneficiaryAccount
  checks.push({
    name: 'Beneficiary account',
    status: benOk ? 'PASS' : 'FAIL',
    detail: benOk
      ? `${inv.beneficiaryAccount} matches ${hist.priorShipments} prior shipments`
      : `${inv.beneficiaryAccount} differs from known ${hist.knownBeneficiaryAccount}`,
  })
  if (!benOk) {
    risk += 40
    flags.push(`Unverified beneficiary-account change (${hist.knownBeneficiaryAccount} → ${inv.beneficiaryAccount})`)
  }

  // 5 — Ship date vs payment terms.
  const deadline = shipByDate(inv.paymentTerms)
  const dateOk = !deadline || bol.shipDate <= deadline
  checks.push({
    name: 'Ship date vs terms',
    status: dateOk ? 'PASS' : 'FAIL',
    detail: deadline
      ? dateOk
        ? `Shipped ${bol.shipDate}, deadline ${deadline}`
        : `Shipped ${bol.shipDate}, past deadline ${deadline}`
      : `Shipped ${bol.shipDate}`,
  })
  if (!dateOk) {
    risk += 10
    flags.push('Ship date violates payment terms')
  }

  const riskScore = Math.max(0, Math.min(100, Math.round(risk)))
  const verdict: Verdict = riskScore >= BLOCK_THRESHOLD ? 'BLOCK' : 'CLEAR'
  return { verdict, riskScore, flags, checks }
}
