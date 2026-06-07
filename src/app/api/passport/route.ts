// FaanSail — regulator read-back
// GET /api/passport?ref=<invoiceRef> → the on-chain TradePassport, read straight
// from the escrow contract. This is the "regulator reads the same ledger" proof:
// the trade data + compliance status the chain actually holds, fetched live, so
// reconciliation is demonstrated rather than claimed. Pure read; never throws.

import { JsonRpcProvider, Contract, encodeBytes32String, decodeBytes32String } from 'ethers'
import { TRADE_ESCROW_ABI, USDC_DECIMALS, STATUS_BY_INDEX } from '@/lib/types'

// Node runtime for ethers; force-dynamic so Vercel never caches the read-back.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_RPC_URL = 'http://127.0.0.1:8545'
const ZERO = '0x0000000000000000000000000000000000000000'

function safeDecode(b: string): string {
  try {
    return decodeBytes32String(b)
  } catch {
    return ''
  }
}

export async function GET(req: Request) {
  const empty = { found: false }
  const ref = new URL(req.url).searchParams.get('ref')
  const escrowAddress = process.env.ESCROW_ADDRESS
  if (!ref || !escrowAddress) return Response.json(empty)
  try {
    const provider = new JsonRpcProvider(process.env.RPC_URL || DEFAULT_RPC_URL)
    const escrow = new Contract(escrowAddress, TRADE_ESCROW_ABI, provider)
    const refBytes = encodeBytes32String(ref.slice(0, 31))
    // getPassport → (hsCode, declaredValue, quantity, buyer, supplier, amount, status)
    const p = await escrow.getPassport(refBytes)
    const buyer = p[3] as string
    if (!buyer || buyer === ZERO) return Response.json(empty)
    return Response.json({
      found: true,
      hsCode: safeDecode(p[0]),
      declaredValue: Number(p[1]),
      quantity: Number(p[2]),
      buyer,
      supplier: p[4] as string,
      amount: Number(p[5]) / 10 ** USDC_DECIMALS,
      status: STATUS_BY_INDEX[Number(p[6])] ?? 'VERIFYING',
    })
  } catch {
    return Response.json(empty)
  }
}
