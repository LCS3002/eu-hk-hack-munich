# FaanSail — Pitch

## Business pitch (2 min)

**Hook (15s).** Cross-border B2B trade between Africa and China clears through Hong Kong — and it leaks money in three places at once. Any corridor fintech will tell you the two words that keep them up at night: **liquidity and reconciliation**. And underneath both, nobody actually verifies the trade.

**Problem (25s).** Today: 3–5 days to settle, ~6.3% all-in. ~$1M of a fintech's capital sits **trapped**, pre-funded, for every $10M/month of flow. Reconciliation is days of manual matching across separate systems. And compliance is applied to the payment, never the *trade* — so over-invoicing and capital flight walk straight through.

**What FaanSail is (35s).** FaanSail is the **payment infrastructure fintechs run on**. A deterministic compliance gate verifies the real trade — the invoice against the bill of lading — and only then does settlement clear, in **seconds**, on a stablecoin rail. The bad trade is **refused before a cent moves**. The good one **settles and reconciles itself** from one event — so the capital that used to sit trapped for a week is freed, and there's nothing left to match.

**Why Hong Kong (15s).** This runs on the rail HK just licensed — the Stablecoins Ordinance, HSBC and Standard Chartered's licences, Project Ensemble. The corridor closes here.

**Demo line + close (30s).** Watch it: a clean trade clears in seconds and the supplier is paid; an over-invoiced one is refused and the funds are held — live, on a public testnet, verifiable on Etherscan. *Everyone moves money cheaper. We make settlement verify the trade, free the capital, and reconcile itself — the layer the corridor's fintechs license.*

## Technical pitch (2 min)

**The spine (20s).** Three things normally happen in three systems at three times: the money moves, the trade is verified, the books are matched. We collapse them into one event.

**Architecture (40s).**
- **Proof-of-trade gate** — a **deterministic rules engine** (`lib/compliance.ts`) runs *cross-document consistency*: invoice qty vs. bill-of-lading qty, declared value vs. the supplier's history (over-invoicing), beneficiary-account changes, ship date vs. terms → a structured **verdict of record**. No model decides; even the streamed explanation is generated from the checks.
- **On-chain escrow** — a Solidity `TradeEscrow` holds the stablecoin with the trade passport (invoice ref + HS code) bound in. `approveAndRelease` / `reject` are `onlyOracle` — the verdict is what gates the on-chain settlement. *The refusal is enforced, not advisory.*
- **Reconciliation** — buyer, supplier, and a regulator node all read the same `Settled` event. One source of truth, zero breaks.

**Real, not staged (30s).** Deployed to **Sepolia** — real transactions, verified contracts, real Etherscan links. Contract tests pass (SETTLE releases to the supplier; BLOCK holds the funds). The compliance is a **deterministic engine** — not canned, not a model. Stack: Next 15 / React 19, Solidity + Hardhat, ethers v6.

**Liquidity, honestly (20s).** Instant compliance-cleared settlement compresses the pre-funding window, so a fintech's trapped capital is freed and flows net down. We take **no FX risk** — a licensed partner provides liquidity. We make the problem smaller; we don't pretend to erase it.

**Close (10s).** The real mechanism, running live on a public testnet, architected to drop onto the regulated rail HK just built.

## The 4-line validation (operator-to-operator)
1. We bind the invoice + HS code into the settlement and escrow it; it releases **only** on a deterministic compliance pass — verify, settle, and refuse in one atomic event.
2. Payment + receipt + audit collapse into one object; both ledgers and a regulator node reconcile off the `Settled` event — nothing to match.
3. Instant compliance-cleared settlement compresses the pre-funding window → trapped capital freed; we take no FX risk, a licensed partner provides liquidity.
4. It's live on a public testnet — real escrow, the deterministic verdict gating `release()`, Etherscan-verifiable — on the Africa–China corridor.

## Differentiators (Q&A armour)
- **vs. AI-compliance agents / screeners (Elliptic, Chainalysis, Cleareye):** they *flag*; we *act* — the verdict gates an atomic settlement that refuses.
- **vs. Circle's AI escrow:** they verify generic *agreement* data; we verify *trade legitimacy* (HS code, declared value, TBML flags) with a regulator node — different risk, different buyer.
- **vs. the dead consortiums (we.trade, Marco Polo, TradeLens):** they died on multi-bank cold-start; we're lightweight, single-fintech, on the stablecoin rail.
- **Honest line:** the mechanism is commoditised; we win on the *fusion + the live refuse + the timing*, not on inventing it.

## Likely judge questions
- *"How is liquidity actually fixed?"* → We don't create FX liquidity. We compress the pre-funding window and net flows, so partners pre-fund less. A licensed partner takes the brief FX hold. (Do **not** claim a Treasury-bill reserve funds it — an EM currency's yield ≈ its own depreciation; that's circular.)
- *"Why blockchain?"* → Four records in four databases become one object on a shared ledger — nothing to reconcile, native audit trail. For everything else we'd use a database.
- *"Is this production?"* → Production-grade engineering, running on a public testnet, architected for the regulated rail. Not production-deployed — that's a regulated, multi-month effort.

**Cautions:** keep ONE lane (the data/verification + the capital it frees), mention any one juror's firm ≤2×, frame the pain as universal.
