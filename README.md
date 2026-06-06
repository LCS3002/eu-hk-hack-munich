# FaanSail ⛵

> **Payment infrastructure that mitigates liquidity and compliance risk on the Africa–China trade corridor — via Hong Kong.**

FaanSail is the rail cross-border B2B fintechs run on. An **AI gate verifies the real trade** (invoice vs. bill of lading), **settlement clears in seconds** on a stablecoin rail, and **every ledger reconciles itself** from a single on-chain event. The bad trade is refused before a cent moves; the good one frees the capital that used to sit trapped for days.

## The problem
Cross-border B2B settlement on the Africa↔China corridor is still **3–5 days at ~6.3% all-in**, and it leaks in three places at once:
- **Liquidity** trapped in pre-funding (~$1M per $10M/month of flow at T+3).
- **Reconciliation** that takes days of manual matching across separate systems.
- **Compliance** that can't see the actual trade — so over-invoicing / trade-based money laundering / capital flight walks straight through.

## How it works
```
Fintech's importer initiates payment against an invoice
      │
      ▼
AI proof-of-trade gate  ── Claude reads invoice + bill of lading, scores risk, returns a verdict
      │
      ▼
Trade passport (tokenized) locked in an on-chain Escrow      status: VERIFYING
      │
      ├─ CLEAR  →  approveAndRelease()  →  stablecoin to supplier   →  SETTLED
      └─ BLOCK  →  reject(reason)       →  funds held               →  BLOCKED
      │
      ▼
Buyer ledger + supplier ledger + regulator node reconcile off the one event — zero breaks
```

## The three wins
- **Compliance** — the AI verdict gates the on-chain release. The refusal is *enforced* (`onlyOracle`), not advisory.
- **Liquidity** — instant compliance-cleared settlement **compresses the pre-funding window → trapped capital is freed** and flows can net. *We take no FX risk; a licensed partner provides liquidity — we make the problem smaller.*
- **Reconciliation** — **one event, three parties, zero breaks**, from the single settlement event.

## Architecture
| Layer | Tech |
|---|---|
| Frontend + AI gate | Next.js 15 (App Router), React 19 |
| Compliance | Claude (`claude-sonnet-4-6`), cross-document consistency, streamed via SSE |
| Contracts | Solidity — `MockUSDC` + `TradeEscrow` (passport + `deposit`/`approveAndRelease`/`reject`, `onlyOracle`) |
| Chain | Hardhat → **Sepolia** (and a local node); `ethers` v6 oracle wallet enforces the verdict on-chain |

## Run it locally
```bash
# 1. install
npm install
npm --prefix contracts install

# 2. local chain (separate terminal)
npm --prefix contracts run node

# 3. deploy + note the printed USDC_ADDRESS / ESCROW_ADDRESS
npm --prefix contracts run deploy:local

# 4. .env (repo root) — see .env.example; for local:
#    HARBOUR_ANTHROPIC_KEY=sk-ant-...        (optional; without it a deterministic fixture verdict streams)
#    RPC_URL=http://127.0.0.1:8545
#    ORACLE_PRIVATE_KEY=<hardhat account #0 key>
#    ESCROW_ADDRESS / USDC_ADDRESS=<from step 3>
#    NEXT_PUBLIC_CHAIN_MODE=local

# 5. run
npm run dev      # http://localhost:3000
```

## Run it on Sepolia (real public testnet)
```bash
# fund the Sepolia deployer (SEPOLIA_PRIVATE_KEY in .env) via a faucet, then:
npm --prefix contracts run deploy:sepolia
# set ESCROW_ADDRESS / USDC_ADDRESS to the Sepolia addresses, ORACLE_PRIVATE_KEY=<SEPOLIA_PRIVATE_KEY>,
# RPC_URL=<sepolia rpc>, NEXT_PUBLIC_CHAIN_MODE=sepolia  → settlements become Etherscan-verifiable.
```

## What's real vs. simulated
- **Real:** the escrow and its conditional release/refuse on a public testnet (real txs, Etherscan-verifiable); the live AI cross-document verdict; reconciliation read from on-chain events.
- **Simulated (clearly labelled):** the fiat on/off ramps, and the settlement asset is mock USDC on testnet. The architecture is identical to a production deployment on a regulated stablecoin rail.

## Live on Sepolia
Every settlement in the demo is a **real transaction on the Sepolia public testnet** — and the console links each actor straight to Etherscan.

| Contract / wallet | On-chain role | Address |
|---|---|---|
| `TradeEscrow` | holds the funds, releases only on an AI pass | [`0x9527…540E`](https://sepolia.etherscan.io/address/0x9527bAc8dDf0A3d3B42Af0F0C11F48fe1253540E) |
| `MockUSDC` | the stablecoin that actually moves | [`0x4dA6…7be2`](https://sepolia.etherscan.io/address/0x4dA689E28D7C99C624a7e4280C06e1fF59937be2) |
| Oracle / buyer | funds the escrow, enforces the verdict | [`0xd2c3…8cb0`](https://sepolia.etherscan.io/address/0xd2c3e783655b8050256f3c127cc258af91c68cb0) |
| Supplier | receives the stablecoin on `CLEAR` | [`0x7099…79C8`](https://sepolia.etherscan.io/address/0x70997970C51812dc3A010C7d01b50e0d17dc79C8) |

## Tests
```bash
npm --prefix contracts test    # SETTLE (clean → released) + BLOCK (dirty → held)
```

## Honesty
See [`HONESTY.md`](./HONESTY.md) for exactly what was reused (UI scaffolding) vs. built during the hackathon (the whole settlement system), and [`PRODUCT.md`](./PRODUCT.md) for the full product spec.
