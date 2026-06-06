# Attribution & Honesty

This document discloses, transparently, what in this repository was **pre-existing / reused** versus **built fresh during the hackathon**. We believe in being upfront about it.

## TL;DR
We reused **UI components and visual scaffolding only** from our team's earlier project. **Everything that makes this product *Harbour* — the smart contracts, the AI proof-of-trade gate, the chain wiring, the concept, and the data — was built during the hackathon.**

## What was pre-existing (reused, then re-skinned/rewired)
Seeded from our team's prior project **Meridian** (`eu-hk-meridian`), a Next.js operational-intelligence dashboard built for a *different* domain (supply-chain disruption monitoring). We reused its **frontend only** — not its logic:

**UI / presentation (reused, re-themed light + HSBC-red, and rewired):**
- **Project scaffold** — Next 15 + React 19 + React-Three-Fiber + Tailwind v4 setup and font wiring (`layout.tsx`: Inter / Chakra Petch / JetBrains Mono via `next/font`).
- **The animated hero** — voxel globe + canvas line-field background + wordmark (`landing/LandingPage.tsx`, `landing/LandingBackground.tsx`) — ported ~1:1 and colour-inverted to the light theme.
- **The design system** — `globals.css` / `landing.css` class structure (panels, HUD corners, status dots, ticker, timeline, metric cards, stream styles) — re-themed dark → light.
- **Streaming plumbing** — the Server-Sent-Events consumer (`ResponseStream.tsx`) and producer (`api/stream/route.ts`) pattern, rewired into the proof-of-trade gate.
- **Panel layout patterns** — `AlertPanel` and `Timeline` repurposed into `TradePanel` and `SettlementTimeline`.

**Third-party / open-source dependencies (standard libraries):**
Next.js, React, @react-three/fiber + drei + three, Framer Motion, Tailwind CSS, lucide-react, @anthropic-ai/sdk, ethers v6, Hardhat + @nomicfoundation/hardhat-toolbox, @openzeppelin/contracts (ERC-20 base). The voxel-globe rendering uses a standard instanced-mesh lat/long point-cloud technique.

## What was built fresh during the hackathon (100% new)
The entire **Harbour system**:
- **Smart contracts** — `MockUSDC` and `TradeEscrow` (the trade-passport data binding, `deposit` / `approveAndRelease` / `reject`, `onlyOracle` compliance gating, and events). New.
- **AI proof-of-trade gate** — the cross-document compliance prompt and structured-verdict logic (`api/verify`). New (Meridian's prompt produced an unrelated supply-chain brief).
- **Chain wiring** — `lib/chain.ts`: the oracle-gated release/refuse and event reconciliation. New.
- **Concept, data & flow** — the compliance-native settlement concept, the trade fixtures (clean + over-invoiced), corridor data, the regulator view, and the demo orchestration. New.

## Real vs simulated (see also `PRODUCT.md` §12)
- **Real:** the on-chain escrow and its conditional release/refuse on a public testnet (real transactions, Etherscan-verifiable); the AI cross-document verdict; reconciliation from on-chain events.
- **Simulated (and clearly labelled):** the fiat on/off ramps, and the settlement asset is mock USDC on testnet. The architecture is identical to a production deployment.
