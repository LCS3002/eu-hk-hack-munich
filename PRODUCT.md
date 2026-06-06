# Harbour

> **Compliance-native settlement for cross-border trade.** An AI proof-of-trade gate reads the trade documents, binds them into a tokenized settlement, and releases the payment on-chain **only when the trade clears** — verify, settle, and *refuse*, in one atomic event.

---

## 1. Elevator
Everyone in cross-border payments competes on *cheaper* and *faster*. Harbour doesn't. We attack the layer **underneath** the payment: the trade behind it is never verified, reconciliation takes days, and compliance can't see the goods. Harbour fuses **verify → settle → reconcile** into a single programmable event — an AI gate checks the invoice and bill of lading, a tokenized **trade passport** carries that data on-chain, and an escrow releases the stablecoin to the supplier *only if the trade clears*. The bad trade is blocked before a cent moves; the good one settles and reconciles itself, because the trade record and the payment are one object.

## 2. The problem
Cross-border B2B settlement is still 3–5 days at ~6.3% all-in, and it leaks in three places at once:
- **Liquidity** trapped in pre-funding (≈$1M per $10M/month of flow at a 3-day delay).
- **Reconciliation** — matching payments to invoices across currencies/entities takes days and errors survive to close.
- **Compliance** — screening is inconsistent and *nobody verifies the trade itself*, so over-invoicing / trade-based money laundering / capital flight walks straight through.

The symptom everyone treats: speed and cost. The cause nobody fixes: the payment, the trade, and the books live in three systems owned by three parties at three times.

## 3. How it works
```
Buyer initiates payment against an invoice
      │
      ▼
AI proof-of-trade gate  ── reads invoice + bill of lading, scores risk, returns a verdict
      │
      ▼
Trade Passport (tokenized data) + Escrow lock   →  status: VERIFYING
      │
      ├─ CLEAR  →  approveAndRelease()  →  stablecoin to supplier   →  SETTLED
      └─ BLOCK  →  reject(reason)       →  funds held               →  BLOCKED
      │
      ▼
Both ledgers + a regulator node reconcile off the same on-chain event — nothing to match
```
Four states, on-chain: **Locked → Verified → Settled | Blocked.**

## 4. The core: tokenized trade data + AI analysis  ← *this is the product*
The differentiator is **not the coin — it's the data.** Each settlement binds a **Trade Passport**:
```
TradePassport { invoiceRef, hsCode, declaredValue, quantity, buyer, supplier,
                status, riskScore, flags[] }
```
The AI gate runs **cross-document consistency** — the robust checks, not price-guessing:
- invoice quantity vs bill-of-lading quantity
- beneficiary bank-account change vs supplier history
- ship date vs payment terms
- HS-code / declared-value sanity

It streams its reasoning live, then emits a structured verdict that **gates the on-chain release.** The passport is what both counterparties' ledgers and the regulator reconcile against — so reconciliation is free and the audit trail is native.

> **Positioning (important):** this is **ONE lane** — tokenized trade-data + AI analysis. The stablecoin is the rail, named in a single breath and never a second "lane." See §5 and §14.

## 5. The settlement rail (plumbing — say it once, move on)
Settles on a **stablecoin** (mock USDC in the demo; in production an HKMA-licensed HKD stablecoin or USDC). It is **rail-agnostic** — the same architecture settles on tokenized HKD deposits (Project Ensemble) tomorrow. We **hold no currency and take no FX risk.** That's the whole rail story; the product is the data layer above it.

## 6. Architecture & stack
- **Frontend:** Next 15 / React 19 / React-Three-Fiber / Framer / Tailwind v4 (recycled + re-skinned from the Meridian project).
- **AI gate:** Next API route, Server-Sent Events, `@anthropic-ai/sdk`, model `claude-sonnet-4-6`; graceful fixture fallback when no API key.
- **Contracts:** Solidity — `MockUSDC` (mintable ERC-20) + `TradeEscrow` (passport + `deposit` / `approveAndRelease` / `reject`, `onlyOracle`-gated). Hardhat → **local node first, then Sepolia**.
- **Bridge:** `ethers` v6; the backend "compliance oracle" wallet calls release/reject after the verdict → the AI decision is enforced *on-chain* (load-bearing, not decorative).

## 7. The demo (two runs, same system)
1. **Clean trade** → reasoning streams → **CLEARED** → escrow releases → SETTLED → ledgers + regulator reconcile → real tx link.
2. **Over-invoiced / quantity-mismatch trade** → AI **BLOCKS** → escrow holds → regulator logs it.

Same system, two outcomes, real logic. The *refuse* is the moment — and on a calm white UI, it lands.

## 8. Corridor
- **Primary:** Africa → China **via Hong Kong** — the liquidity + reconciliation pain a panel juror (Michele Fung / Unlimit) flagged directly; HK is the structural hub (mBridge, CNH).
- **Toggle:** EU ↔ HK — corridor-agnostic expansion + event-theme fit. Architecture identical; only fixtures + map arcs change.

## 9. Why now — regulatory tailwind
- HK **Stablecoins Ordinance** in force since Aug 2025.
- First issuer licenses (~March 2026) to **HSBC** and **Anchorpoint** (Standard Chartered-led).
- **Project Ensemble / EnsembleTX** live through 2026 — the production settlement rail.
- StanChart's CEO: stablecoins/tokenized deposits "lay the foundation for a new era of **digital trade settlement**." The banks are building our rail and saying our thesis out loud.

## 10. Differentiation (honest)
- **vs Circle's AI escrow** (closest, 2026): they verify generic *work/agreement* data; we verify *trade legitimacy* (HS code, declared value, TBML flags) with a regulator node. Different risk, different buyer.
- **vs AML screeners** (Elliptic, Chainalysis, Napier): they **flag**; we **act** — the verdict gates an atomic settlement that refuses.
- **vs the dead consortiums** (we.trade, Marco Polo, TradeLens, Contour): they needed heavy multi-bank coordination and died on cold-start; we're lightweight, single-fintech, on the stablecoin rail.
- **The honest line:** the *mechanism* is now commoditized (there's even an ERC for programmable AI escrow). We win on the **fusion + the live refuse + timeliness**, not on novelty — and we say so.

## 11. FX / liquidity stance (Q&A armor)
We hold no currency and take no FX risk; a licensed partner provides liquidity; instant compliance-clearing shrinks the pre-fund window. **Reject the bond-yield reserve** answer — it's circular (an EM currency's T-bill yield ≈ its own depreciation; the reserve is denominated in the melting asset). The sound answer is **short-hold + dynamic-spread hedging**. (Only bites on the Africa corridor; EUR/HKD/RMB don't melt.)

## 12. What's real vs simulated
- **Real:** the escrow contract + conditional release/refuse on a testnet (real tx, Etherscan-verifiable); the AI cross-document verdict; reconciliation from on-chain events.
- **Simulated (and labelled):** the fiat on/off ramps (local-currency → token, token → RMB), and the settlement asset is mock USDC on testnet. The architecture is identical to production.

## 13. Brand & UI
**White / grey / off-white base × HSBC-style red signature accent.** The red evokes the HK institutional rail HSBC is literally building (and reads auspicious/HK); used with discipline — sparingly as accent, and for the **BLOCKED** state — while **green** marks **CLEARED / SETTLED**, on lots of calm white so the refuse pops. Type: **Inter** (UI), **JetBrains Mono** (data, hashes, coords), **Chakra Petch** (wordmark). Aesthetic: institutional **settlement console** — sharp panels, mono micro-labels, and the recycled animated hero (ported 1:1, inverted to light).

## 14. The pitch
**Business (2 min):** open on a human (an SME's payment about to leave) → the three-way leak → what we do (verify + settle + *refuse* in one event) → why HK (the rail HK just licensed) → the refuse demo.
**Technical (2 min):** architecture (AI gate → passport → escrow) → the on-chain refuse → reconcile from one event → GitHub walkthrough → real Etherscan link.

**The 4-line validation (operator-to-operator, e.g. for Michele):**
1. We bind invoice + HS code into the settlement and escrow it; it releases only on an AI-compliance pass — verify, settle, and refuse in one atomic event.
2. Payment + receipt + audit collapse into one object; both books and a regulator node reconcile off the `Settled` event — nothing to match.
3. We hold no currency and take no FX risk; clearing compliance instantly compresses the pre-fund window.
4. It's live on testnet — real escrow, AI gate gating `release()`, Etherscan-verifiable — on the Africa-China corridor.

**Cautions:** mention Michele/Unlimit ≤2× and frame the pain as universal; keep **ONE lane** (the data), never two parallel options.

## 15. Status & roadmap
- **Now:** plan approved, design locked, Meridian frontend ready to recycle — *no Harbour code yet*.
- **Next:** P0 scaffold → P1 (contract · AI gate · light frontend) → **P2 end-to-end on local chain** → P3 Sepolia + fallback video → P4 polish + pitch.
- **By noon:** working demo + GitHub repo + 2-min business video + 2-min tech video.
- **Prereqs** (non-blocking for local): `ANTHROPIC_API_KEY` (else fixture fallback); later a Sepolia throwaway key + RPC + faucet ETH.
