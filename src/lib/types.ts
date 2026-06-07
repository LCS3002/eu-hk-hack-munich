// ════════════════════════════════════════════════════════════════════════
// Harbour — FROZEN SHARED INTERFACES
// Contract (Solidity), proof-of-trade gate (api/verify), chain bridge (lib/chain) and UI
// all build against these. Do not change a signature without updating all four.
// ════════════════════════════════════════════════════════════════════════

export type Corridor = 'AFRICA_CHINA' | 'EU_HK'
export type Verdict = 'CLEAR' | 'BLOCK'
export type ChainMode = 'local' | 'sepolia' | 'mock'

// ─── Trade documents ────────────────────────────────────────────────────
export interface Invoice {
  invoiceRef: string          // "INV-2026-0473" — primary key across the system
  hsCode: string              // Harmonized System code, e.g. "8542.31"
  goodsDescription: string
  quantity: number            // declared units
  unitPrice: number           // USD per unit
  declaredValue: number       // USD (should ≈ quantity * unitPrice)
  buyerName: string
  buyerCountry: string
  supplierName: string
  supplierCountry: string
  beneficiaryBank: string     // bank named on the invoice
  beneficiaryAccount: string  // masked, e.g. "****8842"
  paymentTerms: string        // "Net 30 — ship on/before 2026-06-20"
  invoiceDate: string         // ISO
}

export interface BillOfLading {
  blRef: string
  vessel: string
  portOfLoading: string
  portOfDischarge: string
  hsCode: string
  goodsDescription: string
  quantity: number            // units actually shipped (cross-check vs invoice)
  grossWeightKg: number
  shipDate: string            // ISO (cross-check vs paymentTerms)
  consignee: string
}

export interface SupplierHistory {
  knownBeneficiaryAccount: string  // the account we have paid before
  priorShipments: number
  avgDeclaredValue: number          // USD
}

// ─── AI proof-of-trade output ───────────────────────────────────────────
export interface CrossDocCheck {
  name: string                // "Quantity match" | "Beneficiary account" | ...
  status: 'PASS' | 'FAIL'
  detail: string
}

export interface ProofOfTradeResult {
  verdict: Verdict
  riskScore: number           // 0-100
  flags: string[]             // human-readable risk flags
  checks: CrossDocCheck[]
}

// ─── A complete demo scenario ───────────────────────────────────────────
export interface TradeScenario {
  id: string
  label: string               // "Clean trade" | "Over-invoiced shipment"
  corridor: Corridor
  expectedVerdict: Verdict    // drives the fixture fallback + demo expectation
  amount: number              // settlement amount, USDC human value (e.g. 46000)
  invoice: Invoice
  billOfLading: BillOfLading
  supplierHistory: SupplierHistory
  fixtureReasoning: string    // streamed when no ANTHROPIC_API_KEY
  fixtureResult: ProofOfTradeResult
}

// ─── SSE stream: api/verify → VerdictStream ─────────────────────────────
export type VerifyEvent =
  | { type: 'text'; text: string }                  // streamed reasoning token
  | { type: 'verdict'; result: ProofOfTradeResult } // final structured verdict
  | { type: 'tx'; hash: string; status: PassportStatus; chain: ChainMode; explorerUrl: string | null; ref?: string }
  | { type: 'error'; message: string }
  | { type: 'done' }

// ─── On-chain passport status (mirrors TradeEscrow.Status enum order) ────
export type PassportStatus = 'VERIFYING' | 'CLEARED' | 'SETTLED' | 'BLOCKED'
export const STATUS_BY_INDEX: Record<number, PassportStatus> = {
  0: 'VERIFYING', 1: 'CLEARED', 2: 'SETTLED', 3: 'BLOCKED',
}

// ════════════════════════════════════════════════════════════════════════
// FROZEN TradeEscrow ABI — Solidity MUST match these signatures exactly.
//   enum Status { VERIFYING, CLEARED, SETTLED, BLOCKED }
//   onlyOracle gates approveAndRelease + reject (the compliance wallet).
//   bytes32 invoiceRef/hsCode are ethers.encodeBytes32String(string).
//   amounts are USDC base units (6 decimals).
// ════════════════════════════════════════════════════════════════════════
export const TRADE_ESCROW_ABI = [
  'function deposit(bytes32 invoiceRef, bytes32 hsCode, uint256 declaredValue, uint256 quantity, address supplier, uint256 amount) external',
  'function approveAndRelease(bytes32 invoiceRef, uint16 riskScore) external',
  'function reject(bytes32 invoiceRef, string reason) external',
  'function getPassport(bytes32 invoiceRef) external view returns (bytes32 hsCode, uint256 declaredValue, uint256 quantity, address buyer, address supplier, uint256 amount, uint8 status)',
  'event Locked(bytes32 indexed invoiceRef, bytes32 hsCode, uint256 declaredValue, uint256 quantity, address buyer, address supplier, uint256 amount)',
  'event Settled(bytes32 indexed invoiceRef, uint16 riskScore, uint256 amount)',
  'event Blocked(bytes32 indexed invoiceRef, string reason)',
] as const

export const MOCK_USDC_ABI = [
  'function mint(address to, uint256 amount) external',
  'function approve(address spender, uint256 amount) external returns (bool)',
  'function balanceOf(address account) external view returns (uint256)',
  'function allowance(address owner, address spender) external view returns (uint256)',
  'function decimals() external view returns (uint8)',
] as const

export const USDC_DECIMALS = 6

// ════════════════════════════════════════════════════════════════════════
// FROZEN design tokens (CSS custom properties live in globals.css :root).
// White/grey/off-white base × HSBC-style red. Components reference var(--x).
//   --bg-base #fafafa  --bg-surface #fff  --bg-sunken #f4f4f5
//   --border rgba(0,0,0,.08)  --border-strong rgba(0,0,0,.14)
//   --text-1 #1a1a1a  --text-2 #595959  --text-3 #9a9a9a
//   --accent #c1121f (HSBC red — signature + active)   --accent-soft rgba(193,18,31,.08)
//   --cleared #15803d (VERIFIED/SETTLED green)          --blocked #c1121f (escalated red)
//   fonts: --font-ui Inter · --font-mono JetBrains Mono · --font-hero Chakra Petch
//   --panel-radius 0 (sharp corners)
// ════════════════════════════════════════════════════════════════════════
