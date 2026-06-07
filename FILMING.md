# FaanSail — Filming run-of-show

Two 2-minute videos. Full scripts live in [`PITCH.md`](./PITCH.md); this maps each
beat to **exactly what to click in the current UI** (phase-rail console, globe
bleeding behind, payment-complete / refused end states, on-chain regulator read-back).

## Setup (once, before recording)
- Run the **production** build (no dev overlays): `npm run build && npm start` → `http://localhost:3000`.
- **Warm-up settle first:** run one Clean trade and let it finish **before** recording — the first settle after idle re-mints test USDC (~15s); every settle after is fast. Don't record the warm-up.
- Browser fullscreen (F11), ~110% zoom, bookmarks hidden.
- Keep a `sepolia.etherscan.io` tab handy, or click the in-app **Etherscan ↗** links live.
- The settle takes ~18s — never sit in silence; the phase rail + globe fill it.

## What's on screen now
- **Header** — logo + FAANSAIL + the *Try a trade* pills: **Clean trade $46,000** · **Over-invoiced $74,000** · ↺.
- **Phase rail** (Grasshopper flow) — Trade → AI gate → Escrow → Release → Settled, lighting up live, each node carrying its real artifact (`risk 2`, `$46,000 locked`, `→ supplier`, `block N`).
- **Detail card** — payment lane · compliance gate · settlement · reconciliation, over the bleeding **globe**.
- **End states** — green **PAYMENT COMPLETE** (money flow + liquidity readout + **Regulator view · read from chain**) or red **Refused — funds held**.

---

## VIDEO 1 — Business (2:00)
| Time | Click / on screen | Say (PITCH.md › Business) |
|---|---|---|
| 0:00–0:15 | Landing hero (globe + wordmark) | **Hook** — trade clears through Hong Kong and leaks in three places; nobody verifies the *trade*. |
| 0:15–0:40 | Landing | **Problem** — 3–5 days, ~6.3% all-in, ~$1M trapped; reconciliation manual; compliance never sees the trade. |
| 0:40–1:00 | Click **ENTER CONSOLE** | **What FaanSail is** — the rail that verifies the trade, then settles or *refuses* in seconds. |
| 1:00–1:15 | Console (rail idle, globe) | **Why Hong Kong** — the regulated stablecoin rail HK just licensed. |
| 1:15–1:45 | Click **Clean trade** → rail runs Trade→…→Settled → **PAYMENT COMPLETE** | **Demo** — AI clears it, the money flows Buyer→escrow→supplier on a stablecoin rail, settled in ~18s, **liquidity freed T+3→T+0**. |
| 1:45–2:00 | Click **Over-invoiced** → **Refused, funds held** | **Close** — the bad trade refused before a cent moves; the good one settles and reconciles itself. |

## VIDEO 2 — Tech (2:00)
| Time | Click / on screen | Say (PITCH.md › Technical) |
|---|---|---|
| 0:00–0:20 | Console idle | **The spine** — money moves, trade is verified, books are matched: three systems, one event. |
| 0:20–0:45 | Click **Clean trade**; point at the **AI gate** node + the *Compliance gate* card | **Compliance is a deterministic rules engine** (`lib/compliance.ts`) — 5 cross-document checks → risk → the verdict of record. Claude only reads the docs + explains; it does **not** decide. |
| 0:45–1:05 | Watch the rail: Escrow `$46k locked` → Release `→ supplier`; the money-flow animation | **On-chain escrow** — `approveAndRelease` / `reject` are `onlyOracle`-gated by the verdict. The refusal is *enforced*, not advisory. |
| 1:05–1:30 | On **PAYMENT COMPLETE**, click **Etherscan ↗** on the transaction, then the TradeEscrow contract | **Real, verified on Sepolia** — real tx, mined; **verified contract source**; contract tests pass. |
| 1:30–1:50 | Point at **Regulator view · read from chain** (HS code · value · qty · amount · status) | **Reconciliation** — the regulator reads the *same record* back from the contract. **Verifiable compliance**: anyone re-runs the open rules against this passport and gets the same verdict. |
| 1:50–2:00 | Console | **Liquidity, honestly** (no FX risk; a partner provides liquidity). Close: real mechanism, live on a public testnet, built for the regulated rail. |

## The refused beat (show once — your differentiator, ~10s)
Click **Over-invoiced** → the **AI gate** node turns red (`risk 100`), **Release** shows ✕, the card reads **Refused — funds held in escrow**, and the **Regulator view shows status BLOCKED** (read live from chain). Line: *"Show me another rail that refuses a settlement because the documents don't match."*

## Gotchas
- If a settle ever shows chain `mock` (RPC hiccup), just re-run — it self-heals.
- The oracle wallet auto-tops-up test USDC, so settles won't fail mid-shoot (the warm-up absorbs the one slow mint).
- Live addresses + verified-contract links are in [`README.md`](./README.md) › *Live on Sepolia* if you show the repo on camera.
