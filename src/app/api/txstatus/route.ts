// FaanSail — on-chain finality read-back
// GET /api/txstatus?hash=0x… → { mined, blockNumber, success }
// Reads the receipt from the same RPC the settlement used, so the console can
// show "Confirmed on-chain · block N" once the optimistic tx actually mines.
// Pure read; never throws — returns mined:false on any problem.

import { JsonRpcProvider } from 'ethers'

// Node runtime for ethers; force-dynamic so Vercel never caches the receipt poll.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const DEFAULT_RPC_URL = 'http://127.0.0.1:8545'

export async function GET(req: Request) {
  const empty = { mined: false, blockNumber: null as number | null, success: false }
  const hash = new URL(req.url).searchParams.get('hash')
  if (!hash || !/^0x[0-9a-fA-F]{64}$/.test(hash)) {
    return Response.json(empty)
  }
  try {
    const provider = new JsonRpcProvider(process.env.RPC_URL || DEFAULT_RPC_URL)
    const receipt = await provider.getTransactionReceipt(hash)
    if (!receipt || receipt.blockNumber == null) return Response.json(empty)
    return Response.json({
      mined: true,
      blockNumber: receipt.blockNumber,
      success: receipt.status === 1,
    })
  } catch {
    return Response.json(empty)
  }
}
