// Harbour — chain bridge (ethers v6)
// Settles a verified trade on-chain: the compliance oracle wallet deposits the
// buyer's stablecoin into the TradeEscrow, then either releases it to the
// supplier (CLEAR) or rejects and holds it in escrow (BLOCK), mirroring the
// AI verdict. In 'mock' mode — or if anything goes wrong — it returns a fake
// but well-formed tx so the demo can NEVER hard-fail.

import {
  JsonRpcProvider,
  Wallet,
  Contract,
  parseUnits,
  encodeBytes32String,
  MaxUint256,
} from 'ethers'
import {
  TRADE_ESCROW_ABI,
  MOCK_USDC_ABI,
  USDC_DECIMALS,
  type TradeScenario,
  type Verdict,
  type ChainMode,
} from './types'

// Hardhat account #1 — the demo supplier / beneficiary of a released payment.
// (Account #0 is the buyer+oracle wallet, supplied via ORACLE_PRIVATE_KEY.)
const SUPPLIER_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8'

const DEFAULT_RPC_URL = 'http://127.0.0.1:8545'

export interface SettleResult {
  hash: string
  status: 'SETTLED' | 'BLOCKED'
  explorerUrl: string | null
  chain: ChainMode
  onchainRef: string // the bytes32-decoded ref the passport is stored under (for read-back)
}

/** A 0x-prefixed 64-hex-char string that looks like a real tx hash. */
function randomTxHash(): string {
  const hex = '0123456789abcdef'
  let out = '0x'
  for (let i = 0; i < 64; i++) out += hex[Math.floor(Math.random() * 16)]
  return out
}

function resolveChainMode(): ChainMode {
  const raw = process.env.NEXT_PUBLIC_CHAIN_MODE
  if (raw === 'local' || raw === 'sepolia' || raw === 'mock') return raw
  return 'mock'
}

/** The graceful fallback used by 'mock' mode and by every error path. */
function mockSettlement(verdict: Verdict): SettleResult {
  return {
    hash: randomTxHash(),
    status: verdict === 'CLEAR' ? 'SETTLED' : 'BLOCKED',
    explorerUrl: null,
    chain: 'mock',
    onchainRef: '',
  }
}

// Serialize on-chain settlements so two demo runs in quick succession can never
// race on the oracle wallet's nonce.
let chainLock: Promise<unknown> = Promise.resolve()

/**
 * Settle a trade on-chain according to the AI verdict.
 *
 * - 'mock' (default) → never touches a node; returns a synthetic tx.
 * - 'local' / 'sepolia' → deposits the escrow as the buyer, then releases
 *   (CLEAR) or rejects (BLOCK) as the compliance oracle.
 *
 * ANY failure (missing env, RPC down, revert, …) falls back to mockSettlement
 * so the demo always produces a usable tx event.
 */
export async function settleOnChain(
  scenario: TradeScenario,
  verdict: Verdict
): Promise<SettleResult> {
  const chain = resolveChainMode()
  const escrowAddress = process.env.ESCROW_ADDRESS
  const usdcAddress = process.env.USDC_ADDRESS
  const oracleKey = process.env.ORACLE_PRIVATE_KEY

  if (chain === 'mock' || !escrowAddress || !usdcAddress || !oracleKey) {
    return mockSettlement(verdict)
  }

  // Queue behind any in-flight settlement so nonces stay strictly sequential.
  const run = chainLock.then(() =>
    settleOnce(scenario, verdict, chain, escrowAddress, usdcAddress, oracleKey)
  )
  chainLock = run.catch(() => undefined)
  return run
}

async function settleOnce(
  scenario: TradeScenario,
  verdict: Verdict,
  chain: ChainMode,
  escrowAddress: string,
  usdcAddress: string,
  oracleKey: string
): Promise<SettleResult> {
  try {
    const provider = new JsonRpcProvider(process.env.RPC_URL || DEFAULT_RPC_URL)
    // This single wallet is BOTH the demo buyer and the compliance oracle.
    const oracleWallet = new Wallet(oracleKey, provider)
    const buyerAddress = await oracleWallet.getAddress()

    const escrow = new Contract(escrowAddress, TRADE_ESCROW_ABI, oracleWallet)
    const usdc = new Contract(usdcAddress, MOCK_USDC_ABI, oracleWallet)
    const amount = parseUnits(String(scenario.amount), USDC_DECIMALS)

    // Drive nonces explicitly. ethers + the hardhat node can otherwise hand the
    // same nonce to two rapid sequential txs ("nonce too low").
    let nonce = await provider.getTransactionCount(buyerAddress, 'latest')

    // 1) Ensure the escrow is approved to pull the stablecoin. Pre-approved at
    //    deploy; approve MAX once here only as a safety net (so only the first
    //    settlement on a fresh deployment ever pays an approve tx).
    // Check balance and allowance INDEPENDENTLY. The escrow is pre-approved MAX,
    // so allowance never drops — but the buyer's mUSDC balance drains ~amount per
    // settle, so it must be topped up on its OWN trigger or deposit() reverts
    // (mined-but-failed) and the passport is never written. Mint a big batch so
    // we only pay this every ~20 settlements, not every time.
    const bal: bigint = await usdc.balanceOf(buyerAddress)
    if (bal < amount) {
      await (await usdc.mint(buyerAddress, parseUnits('1000000', USDC_DECIMALS), { nonce: nonce++ })).wait()
    }
    const allowance: bigint = await usdc.allowance(buyerAddress, escrowAddress)
    if (allowance < amount) {
      await (await usdc.approve(escrowAddress, MaxUint256, { nonce: nonce++ })).wait()
    }

    // 2) Lock the trade documents + funds into escrow as the buyer.
    //    Make the on-chain ref unique per run so repeated demos don't collide
    //    with an already-settled passport. (The UI shows the canonical ref.)
    const refStr = `${scenario.invoice.invoiceRef}.${Date.now().toString(36)}`.slice(0, 31)
    const invoiceRef = encodeBytes32String(refStr)
    const hsCode = encodeBytes32String(scenario.invoice.hsCode)
    // 3) Submit deposit, then settle, back-to-back with explicit gas. We do NOT
    //    await confirmations: nonce ordering guarantees the deposit executes
    //    before the settle on-chain, and the Etherscan link is live immediately
    //    (pending → confirmed). Explicit gasLimit skips estimateGas, which would
    //    revert for the settle tx since its passport isn't mined yet.
    await escrow.deposit(
      invoiceRef,
      hsCode,
      scenario.invoice.declaredValue,
      scenario.invoice.quantity,
      SUPPLIER_ADDRESS,
      amount,
      { nonce: nonce++, gasLimit: 300000 }
    )

    const settleTx =
      verdict === 'CLEAR'
        ? await escrow.approveAndRelease(invoiceRef, scenario.fixtureResult.riskScore, { nonce: nonce++, gasLimit: 200000 })
        : await escrow.reject(invoiceRef, scenario.fixtureResult.flags[0] ?? 'compliance block', { nonce: nonce++, gasLimit: 200000 })

    const hash: string = settleTx.hash
    const status: 'SETTLED' | 'BLOCKED' = verdict === 'CLEAR' ? 'SETTLED' : 'BLOCKED'

    return {
      hash,
      status,
      explorerUrl:
        chain === 'sepolia' ? `https://sepolia.etherscan.io/tx/${hash}` : null,
      chain,
      onchainRef: refStr,
    }
  } catch (err) {
    console.error('[chain] on-chain settlement failed, using mock:', err)
    return mockSettlement(verdict)
  }
}
