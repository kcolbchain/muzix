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

## Quick Start

```solidity
import {IStreamingRevenueOracle} from "./interfaces/IStreamingRevenueOracle.sol";

contract MyContract {
    IStreamingRevenueOracle oracle;
    
    function getRevenue(bytes32 catalogId) external view returns (uint256) {
        StreamingRevenue memory revenue = oracle.getLatestRevenue(catalogId);
        return revenue.revenueUsd;
    }
}
```

## Architecture

See [SPECIFICATION.md](./SPECIFICATION.md) for detailed architecture and implementation guide.

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
