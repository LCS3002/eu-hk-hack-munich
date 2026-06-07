# HONESTY.md

> Mandatory disclosure for the hackathon. This file lives at the root of your repository. Judges cross-check it against your code and your technical video.
>
> **The deal:** disclosed shortcuts are **not** penalized — that is the entire point of this file. Hidden ones are. Undisclosed pre-built code is heavily penalized, each undisclosed mock carries a small penalty, and a faked demo is heavily penalized. Telling the truth here costs you nothing.

---

## 1. Team — who did what
Judges compare this against `git shortlog -sn`, so keep it honest.

| Member | GitHub handle | Main contributions |
|---|---|---|
| Lorenz Huber | `LCS3002` | Settlement console + 3D globe / Grasshopper money-flow UI, **deterministic compliance engine**, chain bridge (`ethers`), proof-of-trade API route, design system, docs (23 commits) |
| Yi-Chen Hsu | `gunjyo0817` (commits as `yichen`) | Backend integration: OpenAPI 3.0 spec, `/api/health`, Hardhat deploy + `chain:*` scripts, dashboard panels, border-shorthand fixes (5 commits) |
| Miloš Preradović | `prmilos` | _Business case / pitch / market sizing — **fill in** (no commits to this repo)_ |
| John Yu | _add handle_ | _**fill in** (no commits to this repo)_ |

> `git shortlog -sn` shows code commits from **LCS3002** and **yichen** only. Miloš and John contributed off-repo (pitch / business / design) — please replace the italic notes with their actual work before submitting.

---

## 2. What is fully working
Features that run end-to-end on the live app, with real data and real logic.

- **Deterministic compliance engine** (`src/lib/compliance.ts`) — input: invoice + bill of lading + supplier history; output: a verdict of record (`CLEAR`/`BLOCK`), a 0–100 risk score, and five pass/fail cross-document checks (quantity, declared-value-vs-history, HS code, beneficiary account, ship-date-vs-terms). Pure rules, no model in the decision path. Reproducible: same input → same verdict, every run.
- **On-chain escrow on Sepolia** (verified `TradeEscrow` + `MockUSDC`) — `deposit` locks funds + the trade passport; `approveAndRelease` (CLEAR) pays the supplier; `reject` (BLOCK) holds the funds. The release is `onlyOracle`-gated by the verdict. Real, mined transactions.
- **Regulator read-back** (`/api/passport`) — reads `getPassport()` live from the contract and shows the on-chain trade + compliance status (reconciliation demonstrated, not claimed).
- **On-chain finality** (`/api/txstatus`) — polls the receipt and surfaces the mined block + success.
- **Live AI explanation** — Claude (`claude-sonnet-4-6`) streams the human-readable reasoning over SSE. It is an assist (it explains; in production it also extracts the fields from raw documents) — it does **not** decide the verdict.
- **The settlement console UI** — interactive phase flow, animated money flow across real Sepolia wallets, the green "payment complete" receipt, and the corridor globe.

---

## 3. What is mocked, stubbed, or hardcoded

| What is faked | Where (file/folder) | Why we mocked it | What the real version would do |
|---|---|---|---|
| Settlement asset (`MockUSDC`, mintable ERC-20, 6 dp) | `contracts/contracts/MockUSDC.sol` | No licensed stablecoin exists on a public testnet | Settle in an HKMA-licensed stablecoin on the regulated rail |
| Trade documents (two trade scenarios) | `src/lib/fixtures.ts` | Document ingestion was out of scope for the window | The LLM extracts the same fields from raw PDF / EDI invoices + bills of lading |
| Supplier history (12-mo avg value, known beneficiary, prior shipments) | `src/lib/fixtures.ts` | No data source wired up | Pulled from the fintech's transaction history / a KYC-AML store |
| Buyer wallet **is** the compliance oracle (one key) | `.env` (`ORACLE_PRIVATE_KEY`) | Demo simplicity | Separate buyer wallet + a multi-sig / HSM compliance oracle |
| Fiat on/off ramps | not implemented | Out of scope | Licensed PSP / bank rails at each end |
| Liquidity figures ("carry saved", "$1M per $10M/mo") | `JourneyConsole` payment-complete card | Illustrative, not from a live model | A real treasury / netting model |

---

## 4. External APIs, services & data sources

| Service / API / dataset | Used for | Real call or mocked? | Auth |
|---|---|---|---|
| Anthropic Claude API (`claude-sonnet-4-6`) | Streams the human explanation of the verdict (assist only) | **Real call** | Personal API key (to be rotated post-event) |
| Ethereum **Sepolia** (publicnode RPC) | On-chain settle / refuse + reads (`getPassport`, tx receipts) | **Real call** | Throwaway testnet private key |
| Etherscan API | One-time contract-source **verification** | **Real call** | Free Etherscan API key |
| Trade documents / supplier data | The trade being verified | **Mocked** (fixtures) | none |

---

## 5. Pre-existing code
Anything written **before** kickoff that we brought into this project.

| Item | Source (URL or description) | Roughly how much | License |
|---|---|---|---|
| UI scaffolding — hero/voxel-globe technique, SSE streaming plumbing, design-system classes | Team's prior hackathon project **Meridian** (`eu-hk-meridian`) | UI components + patterns only, re-skinned light + rewired; **no business logic reused** | Team-owned, unlicensed |
| `/team` page styling | Team's prior project **agorahack** (`github.com/LCS3002/agorahack`) | One page, adapted | Team-owned |
| Libraries | Next.js, React, @react-three/fiber + drei + three, ethers v6, Hardhat + toolbox, `@openzeppelin/contracts` (ERC-20 base), `@anthropic-ai/sdk` | standard dependencies | MIT / Apache-2.0 |

Everything that makes this *FaanSail* — the deterministic **compliance engine**, the `TradeEscrow` contract, the chain bridge, the proof-of-trade gate, the concept, and the data model — was written **during the hackathon window**.

---

## 6. Known limitations & next steps
- **Real document ingestion** — PDF/EDI → structured fields via the LLM, replacing the fixtures (the extraction layer is designed for but not wired).
- **Deeper compliance rules** — sanctions / PEP screening, more trade-based-money-laundering typologies, dual-use-goods flags. The engine is built to extend.
- **Production rail** — an HKMA-licensed stablecoin instead of `MockUSDC`, plus fiat on/off ramps.
- **Oracle hardening** — separate buyer + a multi-sig compliance oracle; reorg-aware finality (settlement is submitted optimistically today).
- **FX liquidity** — provided by a licensed partner (we take **no** FX risk); the partner integration is not built — we compress the pre-funding window via speed + netting, we don't create FX liquidity.
- **Blocked-path read-back** — the live regulator read-back is shown on the settled path; the refused path shows the held-in-escrow state but not yet the on-chain `BLOCKED` read-back.
