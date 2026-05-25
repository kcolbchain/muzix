# Streaming Revenue Oracle

Decentralized oracle for feeding streaming revenue data from major DSPs (Spotify, Apple Music, YouTube Music) on-chain for royalty distribution.

## Overview

The Streaming Revenue Oracle aggregates revenue data from Digital Service Providers and delivers verified data to Muzix chain for automated royalty distribution.

## Features

- **Multi-DSP Support**: Spotify, Apple Music, YouTube Music (extensible to more)
- **Decentralized Consensus**: Multi-node network with stake-weighted validation
- **Cryptographic Verification**: Signed data submissions with proof of origin
- **Confidence Scoring**: Multi-factor scoring for data reliability
- **Smart Contract Integration**: Easy consumption by royalty distribution contracts

## Status

| Component | State | Source |
|-----------|-------|--------|
| Consumer-facing contract | **Shipped** (Phase 1 MVP) | [`src/MuzixStreamingOracle.sol`](../src/MuzixStreamingOracle.sol) |
| Off-chain pusher node | In design | [SPECIFICATION.md §"Oracle Node Network"](./SPECIFICATION.md) |
| On-chain consensus + slashing | Not started | [SPECIFICATION.md Phase 2/3](./SPECIFICATION.md) |
| Chainlink fallback wiring | Not started | — |

## Quick Start

```solidity
import {MuzixStreamingOracle} from "../src/MuzixStreamingOracle.sol";

contract RoyaltyDistributor {
    MuzixStreamingOracle public oracle;

    function distributeIfFresh(bytes32 catalogId) external {
        require(oracle.isDataFresh(catalogId), "stale");
        MuzixStreamingOracle.StreamingRevenue memory rev = oracle.getLatestRevenue(catalogId);
        // ... settle MUSD against royalty splits using rev.revenueUsd
    }
}
```

## What the on-chain contract enforces

The deployed contract trusts the off-chain node network for consensus and verifies a focused
set of on-chain invariants per submission:

- **Pusher authorization** — only addresses added via `setPusher` may submit.
- **DSP registry** — submissions for unregistered or deactivated DSPs revert.
- **Confidence floor** — per-DSP `minConfidenceScore` overrides the default 7500 bps.
- **Period sanity** — `periodStart < periodEnd` and `periodEnd <= block.timestamp`.
- **Cooldown** — one submission round per pusher per `SUBMISSION_COOLDOWN` (1h);
  batches share the cooldown so a single round can land an arbitrary number of records.
- **Circuit breaker** — `pause()` halts all new submissions; reads continue working.

## Architecture

See [SPECIFICATION.md](./SPECIFICATION.md) for the full architecture, node-network design, and
roadmap. The on-chain contract implements the Phase 1 (MVP) consumer surface; subsequent
phases add the node-network and dispute machinery.

## Data Flow

1. **Query**: Oracle nodes query DSP APIs every 24 hours
2. **Aggregate**: Nodes submit data to aggregator contract
3. **Verify**: Consensus mechanism validates data across nodes
4. **Finalize**: Verified data published on-chain
5. **Distribute**: Royalty contracts consume data for payments

## Security

- Multi-signature validation from oracle nodes
- Stake-based slashing for incorrect data
- 48-hour dispute resolution window
- Circuit breaker for emergency pauses

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md)

## License

MIT
