# Muzix

> Layer 0 for music — extract value for musicians, tokenize catalogs, enable music finance, connect the industry on-chain.

## What is Muzix?

Muzix is the infrastructure layer for music finance. Built on the OP Stack, it connects musicians, labels, distributors, streaming platforms, and fans through a shared on-chain settlement layer.

It is not a music app. It is the layer that music apps, labels, distributors, and financial products plug into.

```
┌─────────────────────────────────────────────────────────────┐
│                      Music Industry                          │
│  Artists · Labels · Distributors · DSPs · Fans · Investors   │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     Muzix (Layer 0)                           │
│         Shared settlement, identity, and value layer          │
├─────────────┬──────────────┬──────────────┬─────────────────┤
│  Tokenize   │  Finance     │  Settle      │  Connect        │
│             │              │              │                 │
│  Catalogs   │  Royalty     │  Music       │  DSP ↔ Label    │
│  Songs      │  advances    │  stablecoins │  Artist ↔ Fan   │
│  Rights     │  Catalog     │  (MUSD)      │  Label ↔ Dist   │
│  Splits     │  lending     │  Cross-border│  Publisher ↔    │
│  Shares     │  Revenue     │  instant     │  Collector      │
│             │  swaps       │  settlement  │                 │
└─────────────┴──────────────┴──────────────┴─────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    OP Stack / Ethereum                        │
│              Security, finality, composability                │
└─────────────────────────────────────────────────────────────┘
```

## The Problem

The music industry moves $28B+ annually through a system designed in the 1970s:

- **Artists wait 6-18 months** for royalty payments to clear through 5+ intermediaries
- **Cross-border payments lose 3-8%** to FX and banking fees — devastating for artists in emerging markets
- **Catalog valuation is opaque** — no liquid market, no price discovery, no way for artists to monetize their back catalog without selling it outright
- **Rights data is fragmented** — who owns what share of which song is stored in incompatible databases across labels, publishers, PROs, and DSPs
- **Small artists get nothing** — micro-payments below $0.01 never reach the artist because transaction costs exceed the payment

## What Muzix Enables

### 1. Tokenize
Turn music IP into on-chain assets. Songs, albums, catalogs, and royalty splits become programmable, tradeable, and composable.

- Catalog NFTs with embedded royalty split logic
- Fractional ownership — fans and investors participate in music IP
- Rights registry — single source of truth for who owns what

### 2. Finance
Unlock capital that is trapped in the music industry.

- **Royalty advances** — borrow against verified future streaming revenue
- **Catalog-backed lending** — use tokenized catalogs as collateral
- **Revenue swaps** — trade future royalties for upfront capital
- **Music index funds** — diversified exposure to music catalogs as an asset class

### 3. Settle
Instant, transparent, global music payments.

- **MUSD** — music stablecoin for industry settlement (built with [stablecoin-toolkit](https://docs.kcolbchain.com/stablecoin-toolkit/))
- **Real-time royalty splits** — when revenue arrives, splits execute atomically on-chain
- **Cross-border settlement** — same cost whether paying an artist in Lagos or Los Angeles
- **Micro-payments** — $0.001 payments are viable on L2 — every stream can pay every contributor

### 4. Connect
A shared protocol layer that different music businesses plug into.

- DSPs report streaming data via oracles
- Labels and distributors settle through MUSD
- Publishers and PROs sync rights data on-chain
- Fans engage through fractional ownership and direct artist support
- Third-party apps build on the Muzix SDK

## Technical Architecture

| Layer | Component | Tech |
|-------|-----------|------|
| Chain | Muzix L1 | OP Stack (EVM, Ethereum settlement) |
| Stablecoin | MUSD | Solidity, stablecoin-toolkit |
| Tokenization | Catalog tokens | ERC-721 + ERC-1155 + royalty extensions |
| Rights | Split registry | On-chain registry with multi-party claims |
| Oracle | Streaming revenue feeds | Spotify, Apple Music, YouTube Music data |
| Finance | Lending, advances, swaps | DeFi primitives adapted for music assets |
| SDK | Music app integration | TypeScript + viem |
| Identity | Artist/label identity | DID-based, portable across platforms |

## Why OP Stack?

- **EVM compatible** — existing Solidity tooling, wallets, and infrastructure work out of the box
- **Low fees** — L2 economics make micro-payments viable ($0.001 per txn)
- **Ethereum security** — settlement on Ethereum L1, not a standalone chain with weak security
- **Superchain ecosystem** — composable with Base, Optimism, and other OP Stack chains
- **Battle-tested** — Base processes billions in volume on the same stack

## Roadmap

**Phase 1 — Foundation**
- [ ] OP Stack testnet deployment
- [ ] MUSD stablecoin contracts
- [ ] Basic royalty split contract

**Phase 2 — Tokenization**
- [ ] Catalog tokenization standard
- [ ] Fractional ownership contracts
- [ ] Rights registry

**Phase 3 — Oracle + Finance**
- [ ] Streaming revenue oracle (Spotify, Apple Music)
- [ ] Royalty advance contracts
- [ ] Catalog-backed lending

**Phase 4 — Ecosystem**
- [ ] TypeScript SDK
- [ ] First artist onboarding
- [ ] DSP integration pilot
- [ ] Mainnet launch

## Repository Structure

```
muzix/
├── contracts/                # Solidity smart contracts
│   ├── MUSD.sol              # ERC-20 stablecoin with royalty split hooks
│   ├── RoyaltySplitter.sol   # Royalty distribution contract
│   └── interfaces/
│       ├── IMUSD.sol         # MUSD interface
│       └── IRoyaltySplitter.sol  # RoyaltySplitter interface
├── test/
│   └── MUSD.test.js          # Hardhat test suite (45 tests)
├── hardhat.config.js          # Hardhat configuration
├── package.json               # Node.js dependencies
├── node/               # OP Stack node configuration (planned)
├── sdk/                # TypeScript SDK for music apps (planned)
├── oracle/             # Streaming revenue data feeds (planned)
├── registry/           # Rights and splits registry (planned)
├── docs/               # Architecture, specs, standards (planned)
└── deploy/             # Deployment scripts and configs (planned)
```

## MUSD Stablecoin Architecture

MUSD is the music-industry settlement stablecoin built on the [stablecoin-toolkit](https://docs.kcolbchain.com/stablecoin-toolkit/).

### Core Contracts

**MUSD.sol** — ERC-20 token with:
- **USD peg** maintained via authorized minter mint/burn (off-chain reserves)
- **Royalty split hooks** — transfers to registered `RoyaltySplitter` contracts automatically trigger atomic distribution to beneficiaries
- **Access control** — `DEFAULT_ADMIN_ROLE` manages minters and splitter registry; `MINTER_ROLE` can mint/burn
- **Pausable** — admin can pause all transfers for emergency stops

**RoyaltySplitter.sol** — Receives MUSD and distributes it:
- Beneficiaries are registered with shares in basis points (10 000 bp = 100%)
- When MUSD is transferred to a splitter, `onRoyaltyReceived()` executes atomically
- Rounding dust stays in the splitter contract
- Events emitted for every split and individual distribution

### Flow

```
Artist streams → Revenue oracle → MUSD minted → Transfer to RoyaltySplitter
                                                        │
                                        ┌───────────────┼───────────────┐
                                        ▼               ▼               ▼
                                   Artist (50%)    Producer (30%)   Label (20%)
```

### Quick Start

```bash
npm install
npx hardhat compile
npx hardhat test
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). We need:
- **Solidity** — stablecoin, tokenization, DeFi contracts
- **Go** — OP Stack node customization
- **TypeScript** — SDK, frontend, oracle integrations
- **Music industry** — domain expertise, rights management, artist onboarding
- **Research** — music finance economics, tokenization models

## Background

Muzix is the evolution of earlier music x blockchain experiments at kcolbchain, including Create Protocol. The thesis has been refined through years of working with musicians, labels, and music tech companies.

## Links

- **kcolbchain:** [kcolbchain.com](https://kcolbchain.com) (est. 2015)
- **Documentation:** [docs.kcolbchain.com](https://docs.kcolbchain.com)
- **GitHub:** [github.com/kcolbchain](https://github.com/kcolbchain)
- **stablecoin-toolkit:** [docs.kcolbchain.com/stablecoin-toolkit/](https://docs.kcolbchain.com/stablecoin-toolkit/)

## License

MIT

---

*Muzix is built by [kcolbchain](https://kcolbchain.com) (est. 2015). Founded by [Abhishek Krishna](https://abhishekkrishna.com).*
