// Harbour — demo fixtures
// Two trade scenarios on the Africa→China-via-HK corridor: one clean, one dirty.
// The dirty one carries cross-document inconsistencies the AI gate detects and
// the escrow refuses. Used by api/verify (input + fixture fallback) and the UI.

import type { TradeScenario, Corridor } from './types'

export const CLEAN_TRADE: TradeScenario = {
  id: 'TRD-CLEAN',
  label: 'Clean trade',
  corridor: 'AFRICA_CHINA',
  expectedVerdict: 'CLEAR',
  amount: 46000,
  invoice: {
    invoiceRef: 'INV-2026-0473',
    hsCode: '8542.31',
    goodsDescription: 'Power management ICs (semiconductors)',
    quantity: 5000,
    unitPrice: 9.2,
    declaredValue: 46000,
    buyerName: 'Adeyemi Components Ltd',
    buyerCountry: 'Nigeria',
    supplierName: 'Shenzhen Brightway Electronics Co.',
    supplierCountry: 'China',
    beneficiaryBank: 'HSBC Hong Kong',
    beneficiaryAccount: '****8842',
    paymentTerms: 'Net 30 — ship on/before 2026-06-20',
    invoiceDate: '2026-06-05',
  },
  billOfLading: {
    blRef: 'BL-SZ-558217',
    vessel: 'OOCL SHENZHEN',
    portOfLoading: 'Shekou, Shenzhen (CNSHK)',
    portOfDischarge: 'Apapa, Lagos (NGLOS)',
    hsCode: '8542.31',
    goodsDescription: 'Power management ICs (semiconductors)',
    quantity: 5000,
    grossWeightKg: 1180,
    shipDate: '2026-06-18',
    consignee: 'Adeyemi Components Ltd',
  },
  supplierHistory: {
    knownBeneficiaryAccount: '****8842',
    priorShipments: 11,
    avgDeclaredValue: 44200,
  },
  fixtureReasoning:
    'Reading invoice INV-2026-0473 against bill of lading BL-SZ-558217.\n' +
    'Quantity: invoice 5,000 units, BoL 5,000 units — match.\n' +
    'Declared value: 5,000 × $9.20 = $46,000 — consistent with line items, and within 4% of the supplier 12-month average ($44,200).\n' +
    'HS code 8542.31 matches across both documents and fits the goods description (semiconductors).\n' +
    'Beneficiary account ****8842 (HSBC Hong Kong) matches the account paid across 11 prior shipments — no change.\n' +
    'Ship date 2026-06-18 is within the Net-30 / ship-by 2026-06-20 window.\n' +
    'All cross-document checks pass. No trade-based money-laundering indicators. Recommending release.',
  fixtureResult: {
    verdict: 'CLEAR',
    riskScore: 8,
    flags: [],
    checks: [
      { name: 'Quantity match', status: 'PASS', detail: 'Invoice 5,000 = BoL 5,000' },
      { name: 'Value consistency', status: 'PASS', detail: '$46,000 within 4% of supplier average' },
      { name: 'HS code', status: 'PASS', detail: '8542.31 consistent, fits goods' },
      { name: 'Beneficiary account', status: 'PASS', detail: '****8842 matches 11 prior shipments' },
      { name: 'Ship date vs terms', status: 'PASS', detail: 'Shipped 2026-06-18, deadline 2026-06-20' },
    ],
  },
}

export const DIRTY_TRADE: TradeScenario = {
  id: 'TRD-DIRTY',
  label: 'Over-invoiced shipment',
  corridor: 'AFRICA_CHINA',
  expectedVerdict: 'BLOCK',
  amount: 74000,
  invoice: {
    invoiceRef: 'INV-2026-0489',
    hsCode: '8542.31',
    goodsDescription: 'Power management ICs (semiconductors)',
    quantity: 5000,
    unitPrice: 14.8,
    declaredValue: 74000,
    buyerName: 'Adeyemi Components Ltd',
    buyerCountry: 'Nigeria',
    supplierName: 'Shenzhen Brightway Electronics Co.',
    supplierCountry: 'China',
    beneficiaryBank: 'Eastern Trust Bank',
    beneficiaryAccount: '****1190',
    paymentTerms: 'Net 30 — ship on/before 2026-06-20',
    invoiceDate: '2026-06-06',
  },
  billOfLading: {
    blRef: 'BL-SZ-559034',
    vessel: 'OOCL SHENZHEN',
    portOfLoading: 'Shekou, Shenzhen (CNSHK)',
    portOfDischarge: 'Apapa, Lagos (NGLOS)',
    hsCode: '8542.31',
    goodsDescription: 'Power management ICs (semiconductors)',
    quantity: 4800,
    grossWeightKg: 1132,
    shipDate: '2026-06-27',
    consignee: 'Adeyemi Components Ltd',
  },
  supplierHistory: {
    knownBeneficiaryAccount: '****8842',
    priorShipments: 11,
    avgDeclaredValue: 44200,
  },
  fixtureReasoning:
    'Reading invoice INV-2026-0489 against bill of lading BL-SZ-559034.\n' +
    'Quantity mismatch: invoice declares 5,000 units, BoL ships 4,800 — 200 units unaccounted for.\n' +
    'Value anomaly: invoice $74,000 ($14.80/unit) is 67% above the supplier 12-month average ($44,200) for the same HS code and goods — classic over-invoicing signature.\n' +
    'Beneficiary account changed: invoice routes to ****1190 (Eastern Trust Bank), but 11 prior shipments paid ****8842 (HSBC Hong Kong). Unverified beneficiary change.\n' +
    'Ship date 2026-06-27 violates the ship-by 2026-06-20 payment term.\n' +
    'Four independent red flags including an over-invoicing + beneficiary-change pattern consistent with trade-based money laundering / capital flight. Refusing settlement; holding funds in escrow for review.',
  fixtureResult: {
    verdict: 'BLOCK',
    riskScore: 86,
    flags: [
      'Quantity mismatch (invoice 5,000 vs BoL 4,800)',
      'Over-invoicing: 67% above supplier average for same goods',
      'Unverified beneficiary account change (****8842 → ****1190)',
      'Ship date violates payment terms',
    ],
    checks: [
      { name: 'Quantity match', status: 'FAIL', detail: 'Invoice 5,000 ≠ BoL 4,800' },
      { name: 'Value consistency', status: 'FAIL', detail: '$74,000 is 67% over supplier average' },
      { name: 'HS code', status: 'PASS', detail: '8542.31 consistent' },
      { name: 'Beneficiary account', status: 'FAIL', detail: '****1190 differs from known ****8842' },
      { name: 'Ship date vs terms', status: 'FAIL', detail: 'Shipped 2026-06-27, deadline 2026-06-20' },
    ],
  },
}

export const SCENARIOS: Record<string, TradeScenario> = {
  [CLEAN_TRADE.id]: CLEAN_TRADE,
  [DIRTY_TRADE.id]: DIRTY_TRADE,
}

// ─── Corridor map waypoints (lat/lon) for CorridorMap ───────────────────
export const CORRIDORS: Record<Corridor, {
  label: string
  origin: { name: string; code: string; lat: number; lon: number }
  hub: { name: string; code: string; lat: number; lon: number }
  destination: { name: string; code: string; lat: number; lon: number }
}> = {
  AFRICA_CHINA: {
    label: 'Africa → China · via Hong Kong',
    origin: { name: 'Shenzhen', code: 'CNSHK', lat: 22.48, lon: 113.91 },
    hub: { name: 'Hong Kong', code: 'HKHKG', lat: 22.30, lon: 114.17 },
    destination: { name: 'Lagos', code: 'NGLOS', lat: 6.45, lon: 3.38 },
  },
  EU_HK: {
    label: 'EU ↔ Hong Kong',
    origin: { name: 'Hong Kong', code: 'HKHKG', lat: 22.30, lon: 114.17 },
    hub: { name: 'Hong Kong', code: 'HKHKG', lat: 22.30, lon: 114.17 },
    destination: { name: 'Rotterdam', code: 'NLRTM', lat: 51.95, lon: 4.14 },
  },
}
