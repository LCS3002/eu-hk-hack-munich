# FaanSail — Filming run-of-show + scripts

Two 2-minute videos. Below are **word-for-word scripts** with inline **[stage
directions]** timed to the current UI, so you can read straight through while you
drive the demo. (Longer-form positioning + Q&A armour live in [`PITCH.md`](./PITCH.md).)

## Setup (once, before recording)
- Run the **production** build (no dev overlays): `npm run build && npm start` → `http://localhost:3000`.
- **Warm-up settle first:** run one Clean trade and let it finish **before** recording — the first settle after idle re-mints test USDC (~15s); every settle after is fast. Don't record the warm-up.
- Fullscreen (F11), ~110% zoom, bookmarks hidden. Keep a `sepolia.etherscan.io` tab handy.
- Pace ≈ 145 words/min. Each script is ~290 words → ~2:00 with the demo pauses. Breathe; let the rail animate.

## What's on screen
Header pills **Clean trade $46,000 · Over-invoiced $74,000**; the **phase rail** (Trade → AI gate → Escrow → Release → Settled) lights up live; the **globe** bleeds behind; end states are green **PAYMENT COMPLETE** (money flow + liquidity + **Regulator view · read from chain**) or red **Refused — funds held**.

---

## SCRIPT 1 — Business pitch (2:00)

**[0:00 — Landing page on screen, globe + FAANSAIL]**
"Trillions in cross-border trade between Africa and China clear through Hong Kong. And every one of those payments leaks money in three places at once.

**[0:15]**
Settlement takes three to five days, at over six percent all-in. For a fintech moving ten million a month, around a million in capital sits frozen — pre-funded, just waiting. Reconciliation is days of manual matching. And compliance only checks the names on the payment — never the trade itself. So over-invoicing and capital flight walk straight through.

**[0:40 — click ENTER CONSOLE]**
FaanSail fixes all three. It's compliance-native settlement infrastructure: an AI gate verifies the actual trade — the invoice against the bill of lading — and *only then* does the money move, in seconds, on a stablecoin rail.

**[1:00 — console idle, globe]**
And it runs on the exact rail Hong Kong just licensed — the Stablecoins Ordinance, Project Ensemble. Hong Kong is where this corridor closes.

**[1:15 — click "Clean trade"; let the rail run to PAYMENT COMPLETE]**
Watch a real one. A clean trade: the gate clears it, the money moves buyer → escrow → supplier, settled in eighteen seconds on a public blockchain — and the capital that used to sit frozen for three days is freed today.

**[1:45 — click "Over-invoiced"; the gate turns red, "Refused"]**
Now a suspicious one — over-invoiced, beneficiary changed. The gate refuses it. The money never leaves; it's held in escrow.

**[1:55]**
Everyone else just moves money cheaper. We make settlement *verify the trade, free the capital, and reconcile itself.* That's the rail the corridor's fintechs license. FaanSail."

---

## SCRIPT 2 — Technical pitch (2:00)

**[0:00 — console]**
"Three things normally happen in three separate systems, at three different times: the money moves, the trade is verified, the books are reconciled. FaanSail collapses them into one event. Here's how.

**[0:20 — click "Clean trade"; point at the AI gate node + the compliance card]**
First, compliance — and this is *not* a single AI call. It's a deterministic rules engine. Five cross-document checks — quantity, declared value against the supplier's history, HS code, beneficiary account, ship date — computed from the trade data into a risk score and a verdict of record. Claude only reads the documents and writes the explanation. It does not decide.

**[0:45 — rail advances: Escrow "$46k locked" → Release "→ supplier"]**
That verdict gates the settlement on-chain. A Solidity escrow holds the stablecoin; `approveAndRelease` and `reject` are `onlyOracle` — so the verdict is what moves the money. The refusal is enforced by code, not advisory.

**[1:05 — on PAYMENT COMPLETE, click Etherscan ↗ on the tx, then the TradeEscrow contract]**
And it's real. Deployed to Sepolia, verified contract source, real mined transactions — here's the settlement, here's the escrow.

**[1:30 — point at "Regulator view · read from chain"]**
Here's the part that matters: the regulator reads the trade and the verdict *back* from the same contract. One record — buyer, supplier, regulator — zero reconciliation breaks. And because the engine is open and deterministic, anyone re-runs the compliance against this on-chain passport and gets the same answer. Verifiable compliance.

**[1:50]**
On liquidity we're honest — we take no FX risk; faster settlement just compresses the pre-funding window. The mechanism is real, live on a public testnet, built for the regulated rail Hong Kong just shipped. That's FaanSail."

---

## The refused beat (your differentiator — make it land)
On **Over-invoiced**, the **AI gate** node turns red (`risk 100`), **Release** shows ✕, the card reads **Refused — funds held in escrow**, and the **Regulator view shows status BLOCKED** (read live from chain). The refusal verdict appears in a few seconds — you don't need to wait for the full on-chain reject to say the line:
> *"Show me another rail that refuses a settlement because the documents don't match."*

## Gotchas
- If a settle ever shows chain `mock` (RPC hiccup), re-run — it self-heals.
- The oracle wallet auto-tops-up test USDC, so settles won't fail mid-shoot (the warm-up absorbs the one slow mint).
- Live addresses + verified-contract links are in [`README.md`](./README.md) › *Live on Sepolia* if you show the repo on camera.
