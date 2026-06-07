// FaanSail — proof-of-trade gate (api/verify)
// POST { scenarioId } → Server-Sent Events stream of VerifyEvent.
//
// FULLY DETERMINISTIC. The verdict of record is computed by the rules engine
// (lib/compliance) — there is NO model in the decision path. We stream a
// human-readable explanation that is GENERATED FROM the engine's own checks (so
// the words can never drift from the math), emit the structured verdict, settle
// on-chain (release on CLEAR / refuse on BLOCK), and emit the tx. Every stage is
// guarded so the stream always reaches {type:'done'}.

import { SCENARIOS, CLEAN_TRADE } from '@/lib/fixtures'
import { settleOnChain } from '@/lib/chain'
import { runCompliance, explainCompliance } from '@/lib/compliance'
import type { VerifyEvent, ProofOfTradeResult, TradeScenario } from '@/lib/types'

// ethers needs the Node runtime (not edge); force-dynamic so the SSE stream is
// never cached; allow up to 60s so the two Sepolia txs + confirmations finish
// inside the request even on a slow block (matters on Vercel — locally it's moot).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request) {
  const encoder = new TextEncoder()

  // Resolve the scenario up front (default to the clean trade).
  let scenarioId: string | undefined
  try {
    scenarioId = ((await req.json()) as { scenarioId?: string })?.scenarioId
  } catch {
    scenarioId = undefined
  }
  const scenario: TradeScenario = (scenarioId && SCENARIOS[scenarioId]) || CLEAN_TRADE

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      // If the client disconnects mid-stream, enqueue throws — latch `closed`
      // so later stages quietly no-op instead of erroring.
      let closed = false
      const emit = (event: VerifyEvent) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          closed = true
        }
      }

      // 1) Deterministic verdict of record — computed from the trade data.
      const result: ProofOfTradeResult = runCompliance(scenario)

      // 2) Stream the explanation, generated from the engine's checks (no model).
      try {
        await streamReasoning(explainCompliance(scenario, result), emit)
      } catch {
        /* never block the verdict on the typewriter */
      }

      // 3) Structured verdict.
      emit({ type: 'verdict', result })

      // 4) Settle on-chain (or mock) per the verdict, then emit the tx.
      try {
        const tx = await settleOnChain(scenario, result.verdict)
        emit({
          type: 'tx',
          hash: tx.hash,
          status: tx.status,
          chain: tx.chain,
          explorerUrl: tx.explorerUrl,
          ref: tx.onchainRef,
        })
      } catch {
        // settleOnChain self-heals to a mock tx, but guard anyway.
        emit({
          type: 'tx',
          hash:
            '0x' +
            Array.from({ length: 64 }, () =>
              '0123456789abcdef'[Math.floor(Math.random() * 16)]
            ).join(''),
          status: result.verdict === 'CLEAR' ? 'SETTLED' : 'BLOCKED',
          chain: 'mock',
          explorerUrl: null,
        })
      }

      // 5) Done.
      emit({ type: 'done' })
      try {
        if (!closed) controller.close()
      } catch {
        /* already closed by a client disconnect */
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

/** Replay the deterministic explanation in small chunks (typewriter feel). */
async function streamReasoning(
  text: string,
  emit: (event: VerifyEvent) => void
): Promise<void> {
  const CHUNK = 4
  for (let i = 0; i < text.length; i += CHUNK) {
    await new Promise((r) => setTimeout(r, 12))
    emit({ type: 'text', text: text.slice(i, i + CHUNK) })
  }
}
