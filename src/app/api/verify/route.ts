// Harbour — AI gate (api/verify)
// POST { scenarioId } → Server-Sent Events stream of VerifyEvent.
//
// The model performs CROSS-DOCUMENT CONSISTENCY analysis (invoice vs bill of
// lading vs supplier history), streams its prose reasoning as {type:'text'},
// then ends with a single machine-readable VERDICT_JSON line (which is NOT
// streamed — it is buffered, extracted and parsed). We then settle on-chain and
// emit a {type:'tx'} event. Every stage is wrapped so the stream always reaches
// {type:'done'} with a usable verdict, falling back to the fixture on any error.

import { SCENARIOS, CLEAN_TRADE } from '@/lib/fixtures'
import { settleOnChain } from '@/lib/chain'
import type {
  VerifyEvent,
  ProofOfTradeResult,
  TradeScenario,
  Verdict,
  UploadedDocs,
} from '@/lib/types'

const VERDICT_MARKER = 'VERDICT_JSON:'

// Used for fixture scenarios — supplier history is provided as structured JSON.
const SYSTEM_PROMPT = `You are a trade-finance compliance analyst at a bank reviewing a single shipment before its payment is released from escrow. Your job is CROSS-DOCUMENT CONSISTENCY ONLY — you compare the invoice, the bill of lading, and the supplier's payment history against each other. You do NOT assess sanctions, geopolitics, or the goods themselves in isolation.

Check exactly these five things:
(a) Quantity match — does the invoice quantity equal the bill of lading quantity?
(b) Declared value vs the supplier's 12-month average declared value — a value materially above the historical average for the same goods is an over-invoicing / trade-based-money-laundering signal.
(c) HS-code consistency — does the HS code agree across the invoice and bill of lading and fit the goods description?
(d) Beneficiary account vs the known account in supplier history — a changed beneficiary account that has not been verified is a high-risk capital-flight / fraud signal.
(e) Ship date vs payment terms — does the bill of lading ship date fall within the window required by the invoice payment terms?

Write your reasoning in clear prose: walk document-by-document through the five checks, citing the specific numbers/values, and reach a recommendation. Block if there are material inconsistencies (especially over-invoicing or an unverified beneficiary change); clear if every check passes.

After your prose, end your message with EXACTLY one final line, and nothing after it:
VERDICT_JSON: {"verdict":"CLEAR"|"BLOCK","riskScore":<integer 0-100>,"flags":[<short human-readable strings>]}

The riskScore is 0-100 (low = safe). flags is an array of short strings naming each red flag (empty array if clean). Output the VERDICT_JSON line as raw JSON on a single line — do not wrap it in code fences.`

// Used for uploaded documents — no external supplier history, so checks are
// adapted to work from the documents alone.
const UPLOAD_SYSTEM_PROMPT = `You are a trade-finance compliance analyst at a bank reviewing two uploaded trade documents (a commercial invoice and a bill of lading) before releasing payment from escrow. You have NO external supplier history — all red flags must be identified from the documents themselves.

Read both documents carefully and check ALL of the following:

(a) QUANTITY MATCH — Does the invoice quantity equal the bill of lading quantity? Any discrepancy is a red flag. Note the exact figures from each document.

(b) PRICE / VALUE ANOMALY — Is the declared unit price plausible for the goods described and their HS code? Look for unusually high unit prices, vague line-item descriptions that inflate value, or any "surcharges" that appear to pad the declared value without clear justification.

(c) HS CODE CONSISTENCY — Does the HS code match across both documents and correctly describe the goods?

(d) BENEFICIARY ACCOUNT CHANGE — Does the invoice contain any notice of a bank account or payment routing change (e.g. "please note our new bank", "effective this invoice", "new beneficiary", "previous account no longer active")? An unverified mid-shipment beneficiary change is a high-risk fraud and capital-flight indicator. Look carefully — these notices are often buried in the invoice body.

(e) SHIP DATE vs PAYMENT TERMS — Does the bill of lading ship date fall within the window required by the invoice payment terms? Extract both dates explicitly.

(f) INTERNAL CONSISTENCY — Are there any other discrepancies between the two documents (consignee name, port, goods description, HS code)?

(g) EXCEPTION CLAUSES — Does the bill of lading contain any exception notes, short-shipment notices, or damage clauses? These must be flagged.

Be suspicious. Real trade-based money laundering relies on analysts missing details. Cite exact numbers and exact text from the documents for every finding.

BLOCK if ANY of the following is true:
- Quantity on invoice ≠ quantity on BoL
- Unit price appears anomalous or value is padded with vague surcharges
- Any beneficiary account change notice appears anywhere in the invoice
- Ship date is outside the payment terms window
- BoL contains a short-shipment or exception note

CLEAR only if every single check passes with no red flags.

After your prose reasoning, end with EXACTLY one line:
VERDICT_JSON: {"verdict":"CLEAR"|"BLOCK","riskScore":<integer 0-100>,"flags":[<short strings, one per red flag>]}

riskScore: 0=clean, 100=extremely high risk. flags is empty array only if fully clean. Output raw JSON, no code fences.`

/** Build a usable result from a parsed model verdict, keeping fixture checks. */
function buildResult(
  scenario: TradeScenario,
  parsed: { verdict: Verdict; riskScore: number; flags: string[] } | null
): ProofOfTradeResult {
  if (!parsed) return scenario.fixtureResult
  return {
    verdict: parsed.verdict,
    riskScore: parsed.riskScore,
    flags: parsed.flags,
    // The structured cross-doc checks always come from the fixture — they are
    // the deterministic table the UI renders; the model supplies the headline.
    checks: scenario.fixtureResult.checks,
  }
}

/** Extract + validate the JSON object following the VERDICT_MARKER. */
function parseVerdict(
  tail: string
): { verdict: Verdict; riskScore: number; flags: string[] } | null {
  try {
    const idx = tail.lastIndexOf(VERDICT_MARKER)
    const after = idx >= 0 ? tail.slice(idx + VERDICT_MARKER.length) : tail
    const start = after.indexOf('{')
    const end = after.lastIndexOf('}')
    if (start < 0 || end < start) return null
    const obj = JSON.parse(after.slice(start, end + 1)) as {
      verdict?: unknown
      riskScore?: unknown
      flags?: unknown
    }
    const verdict = obj.verdict === 'BLOCK' ? 'BLOCK' : obj.verdict === 'CLEAR' ? 'CLEAR' : null
    if (!verdict) return null
    const riskScore =
      typeof obj.riskScore === 'number' && Number.isFinite(obj.riskScore)
        ? Math.max(0, Math.min(100, Math.round(obj.riskScore)))
        : null
    if (riskScore === null) return null
    const flags = Array.isArray(obj.flags)
      ? obj.flags.filter((f): f is string => typeof f === 'string')
      : []
    return { verdict, riskScore, flags }
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const encoder = new TextEncoder()

  // Parse the body — either { scenarioId } or { uploadedDocs }.
  let scenarioId: string | undefined
  let uploadedDocs: UploadedDocs | undefined
  try {
    const body = (await req.json()) as { scenarioId?: string; uploadedDocs?: UploadedDocs }
    scenarioId = body?.scenarioId
    uploadedDocs = body?.uploadedDocs
  } catch {
    scenarioId = undefined
  }

  // Resolve the scenario (used as fallback + for on-chain settlement metadata).
  const scenario: TradeScenario =
    (scenarioId && SCENARIOS[scenarioId]) || CLEAN_TRADE

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let closed = false
      const emit = (event: VerifyEvent) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`))
        } catch {
          closed = true
        }
      }

      let result: ProofOfTradeResult = scenario.fixtureResult

      // ── Stage 1: reasoning + verdict ────────────────────────────────────
      try {
        const apiKey = process.env.HARBOUR_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY
        if (apiKey && uploadedDocs) {
          // Uploaded documents — use Claude Vision / text analysis on raw docs.
          result = await streamWithUploadedDocs(apiKey, uploadedDocs, emit)
        } else if (apiKey) {
          result = await streamWithAnthropic(apiKey, scenario, emit)
        } else {
          await streamFixtureReasoning(scenario.fixtureReasoning, emit)
          result = scenario.fixtureResult
        }
      } catch (err) {
        console.error('[verify] live reasoning failed, using fixture:', err)
        try {
          await streamFixtureReasoning(scenario.fixtureReasoning, emit)
        } catch {
          /* ignore */
        }
        result = scenario.fixtureResult
      }

      // ── Stage 2: emit structured verdict ────────────────────────────────
      try {
        emit({ type: 'verdict', result })
      } catch {
        // ignore — best effort
      }

      // ── Stage 3: settle on-chain (or mock) and emit the tx ──────────────
      try {
        const tx = await settleOnChain(scenario, result.verdict)
        emit({
          type: 'tx',
          hash: tx.hash,
          status: tx.status,
          chain: tx.chain,
          explorerUrl: tx.explorerUrl,
        })
      } catch {
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

      // ── Stage 4: done ───────────────────────────────────────────────────
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
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}

/**
 * Stream the model's reasoning, holding back the VERDICT_JSON line, then parse
 * the buffered verdict. Returns the final ProofOfTradeResult (fixture on parse
 * failure). Throws only on a hard SDK/transport error so the caller can fall
 * back to the fixture.
 */
async function streamWithAnthropic(
  apiKey: string,
  scenario: TradeScenario,
  emit: (event: VerifyEvent) => void
): Promise<ProofOfTradeResult> {
  // Dynamic import to avoid build-time issues if the SDK isn't installed.
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey })

  const userContent = JSON.stringify({
    invoice: scenario.invoice,
    billOfLading: scenario.billOfLading,
    supplierHistory: scenario.supplierHistory,
  })

  const mStream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 900,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userContent }],
  })

  // We emit text up to (but not including) any VERDICT_JSON marker. Because
  // tokens arrive in arbitrary chunks, the marker may straddle a boundary, so
  // we keep a small holdback of the trailing characters that could be the
  // start of the marker and only flush them once they prove not to be.
  let full = '' // everything received so far (for verdict extraction)
  let emittedLen = 0 // how many chars of `full` we have already streamed out
  let markerHit = false // once true we stop streaming entirely

  /** Length of the longest suffix of `s` that is a prefix of VERDICT_MARKER. */
  const partialMarkerSuffix = (s: string): number => {
    const max = Math.min(s.length, VERDICT_MARKER.length - 1)
    for (let k = max; k > 0; k--) {
      if (VERDICT_MARKER.startsWith(s.slice(s.length - k))) return k
    }
    return 0
  }

  for await (const event of mStream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      full += event.delta.text
      if (markerHit) continue

      const markerIdx = full.indexOf(VERDICT_MARKER)
      if (markerIdx >= 0) {
        // The marker has fully arrived — flush everything before it, then stop.
        if (markerIdx > emittedLen) {
          emit({ type: 'text', text: full.slice(emittedLen, markerIdx) })
        }
        emittedLen = markerIdx
        markerHit = true
        continue
      }

      // No full marker yet: safe to emit up to the last position that cannot be
      // the beginning of a (split) marker, holding back a possible prefix tail.
      const hold = partialMarkerSuffix(full)
      const safeEnd = full.length - hold
      if (safeEnd > emittedLen) {
        emit({ type: 'text', text: full.slice(emittedLen, safeEnd) })
        emittedLen = safeEnd
      }
    }
  }

  const parsed = parseVerdict(full)
  return buildResult(scenario, parsed)
}

/**
 * Stream analysis of real uploaded trade documents (invoice + bill of lading).
 * Images go through Claude Vision; text files go as plain text content.
 * Falls back to a minimal fixture result on any parse failure.
 */
async function streamWithUploadedDocs(
  apiKey: string,
  docs: UploadedDocs,
  emit: (event: VerifyEvent) => void
): Promise<ProofOfTradeResult> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey })

  // Build the message content — one block per document, typed correctly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const content: any[] = []

  const preamble = [
    `You are receiving two trade documents for cross-document compliance analysis. Please examine them carefully.`,
    docs.buyerName ? `Buyer: ${docs.buyerName}` : '',
    docs.supplierName ? `Supplier: ${docs.supplierName}` : '',
    docs.amount ? `Declared settlement amount: USD ${docs.amount.toLocaleString()}` : '',
  ].filter(Boolean).join('\n')

  content.push({ type: 'text', text: preamble })

  /** Append one document (invoice or BoL) as the appropriate content block. */
  function pushDoc(doc: UploadedDocs['invoice'], label: string) {
    content.push({ type: 'text', text: `\nDOCUMENT — ${label} (${doc.name}):` })
    if (doc.mediaType === 'pdf') {
      // Native PDF support — Claude reads the full document including layout
      content.push({
        type: 'document',
        source: { type: 'base64', media_type: 'application/pdf', data: doc.content },
      })
    } else if (doc.mediaType === 'image') {
      const ext = doc.name.toLowerCase()
      const media_type = ext.endsWith('.png') ? 'image/png'
        : ext.endsWith('.webp') ? 'image/webp'
        : 'image/jpeg'
      content.push({
        type: 'image',
        source: { type: 'base64', media_type, data: doc.content },
      })
    } else {
      // Plain text / CSV
      content.push({ type: 'text', text: doc.content })
    }
  }

  pushDoc(docs.invoice, 'INVOICE')
  pushDoc(docs.billOfLading, 'BILL OF LADING')

  const mStream = client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 1400,
    system: UPLOAD_SYSTEM_PROMPT,
    messages: [{ role: 'user', content }],
  })

  let full = ''
  let emittedLen = 0
  let markerHit = false

  const partialMarkerSuffix = (s: string): number => {
    const max = Math.min(s.length, VERDICT_MARKER.length - 1)
    for (let k = max; k > 0; k--) {
      if (VERDICT_MARKER.startsWith(s.slice(s.length - k))) return k
    }
    return 0
  }

  for await (const event of mStream) {
    if (
      event.type === 'content_block_delta' &&
      event.delta.type === 'text_delta'
    ) {
      full += event.delta.text
      if (markerHit) continue

      const markerIdx = full.indexOf(VERDICT_MARKER)
      if (markerIdx >= 0) {
        if (markerIdx > emittedLen) {
          emit({ type: 'text', text: full.slice(emittedLen, markerIdx) })
        }
        emittedLen = markerIdx
        markerHit = true
        continue
      }

      const hold = partialMarkerSuffix(full)
      const safeEnd = full.length - hold
      if (safeEnd > emittedLen) {
        emit({ type: 'text', text: full.slice(emittedLen, safeEnd) })
        emittedLen = safeEnd
      }
    }
  }

  const parsed = parseVerdict(full)
  if (!parsed) {
    // Return a generic result if verdict parsing fails
    return CLEAN_TRADE.fixtureResult
  }
  return {
    verdict: parsed.verdict,
    riskScore: parsed.riskScore,
    flags: parsed.flags,
    checks: [],  // No structured fixture checks for uploaded docs — AI provides prose only
  }
}

/** No API key: replay the fixture reasoning in small chunks (Meridian-style). */
async function streamFixtureReasoning(
  reasoning: string,
  emit: (event: VerifyEvent) => void
): Promise<void> {
  const CHUNK = 4
  for (let i = 0; i < reasoning.length; i += CHUNK) {
    await new Promise((r) => setTimeout(r, 14))
    emit({ type: 'text', text: reasoning.slice(i, i + CHUNK) })
  }
}
