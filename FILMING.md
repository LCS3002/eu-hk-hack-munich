# FaanSail — Filming run-of-show

Two 2-minute videos. Full scripts live in [`PITCH.md`](./PITCH.md); this maps each
script beat to **exactly what to click** so you can shoot fast.

## Setup (once, before recording)
- Run the **production** build, not dev (no dev overlays, snappier):
  ```bash
  npm run build && npm start      # http://localhost:3000
  ```
- Browser **fullscreen** (F11), hide the bookmarks bar, zoom ~100–110%.
- Open **two tabs**: (1) the app, (2) `https://sepolia.etherscan.io` ready to paste.
- The settle takes **~18s** — never wait in silence; narrate over it (cues below).
- The money-flow animation plays **when the settled state appears** — so before you
  click, scroll the right panel so the **Settlement · stablecoin rail** block is in view.
- Do 2–3 takes of each. Record clean-trade for the main flow; dirty-trade for the refuse beat.

---

## VIDEO 1 — Business (2:00)
Mostly you on camera or voiceover; cut to the screen for the demo at 1:30.

| Time | On screen | Say (see PITCH.md › Business) |
|---|---|---|
| 0:00–0:15 | Landing hero (globe) | **Hook** — trade clears through Hong Kong and leaks money in three places: liquidity, reconciliation, and nobody verifies the trade. |
| 0:15–0:40 | Landing hero | **Problem** — 3–5 days, ~6.3% all-in, ~$1M trapped per $10M/mo; reconciliation is manual; compliance never sees the trade. |
| 0:40–1:05 | Click **ENTER CONSOLE** | **What FaanSail is** — the payment infrastructure fintechs run on: verify the trade, then settle in seconds, refuse the bad one before a cent moves. |
| 1:05–1:20 | Console idle | **Why Hong Kong** — runs on the rail HK just licensed (Stablecoins Ordinance, Project Ensemble). The corridor closes here. |
| 1:20–1:50 | Click **Clean trade** → narrate the AI gate as it streams → the **money flows** Buyer→Escrow→Supplier → **Settled in ~18s** | **Demo** — watch it clear: AI verifies invoice vs. bill of lading, funds release on the stablecoin rail, supplier paid — live on a public testnet. |
| 1:50–2:00 | Click **Over-invoiced** → **BLOCKED**, funds held | **Close** — the bad trade is refused, funds held. We make settlement verify the trade, free the capital, and reconcile itself. |

## VIDEO 2 — Tech (2:00)
Screen-record the whole time.

| Time | On screen | Say (see PITCH.md › Technical) |
|---|---|---|
| 0:00–0:20 | Console idle | **The spine** — money moves, trade is verified, books are matched: three systems, three times. We collapse them into one event. |
| 0:20–0:45 | Click **Clean trade**; point at the **AI Compliance Gate** streaming | **AI proof-of-trade gate** — a Next.js route streams Claude doing cross-document consistency (qty, value vs. history, beneficiary, ship date) → a structured verdict. |
| 0:45–1:10 | The **Settlement · stablecoin rail** block animates | **On-chain escrow** — a Solidity `TradeEscrow` holds the stablecoin; `approveAndRelease`/`reject` are `onlyOracle` — **the AI verdict gates the on-chain settlement**. |
| 1:10–1:35 | Click the **Etherscan ↗** on the transaction (and on TradeEscrow) | **Real, not staged** — deployed to Sepolia: real tx, mined, status success; the live contract; tests pass (SETTLE releases, BLOCK holds). |
| 1:35–1:50 | Back to console; the reconciliation line | **Reconciliation** — buyer, supplier, regulator read the same `Settled` event. One source of truth, zero breaks. |
| 1:50–2:00 | Console | **Liquidity, honestly** — instant compliance-cleared settlement compresses pre-funding; we take no FX risk. Close: real mechanism, live on a public testnet, built for the regulated rail. |

---

## Safety / gotchas
- Sepolia oracle wallet has ~0.04 ETH — good for dozens of settlements; no top-up needed.
- If a settle ever falls back to a mock tx (RPC hiccup), the chain badge reads `mock` instead of `sepolia` — just re-run; it self-heals.
- Live address table + contract links are in [`README.md`](./README.md) › *Live on Sepolia* if you want to show the repo on camera.
