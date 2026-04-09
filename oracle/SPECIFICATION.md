# Streaming Revenue Oracle Specification

## Overview

The Streaming Revenue Oracle is a decentralized data feed that aggregates streaming revenue data from major DSPs (Digital Service Providers) including Spotify, Apple Music, and YouTube Music, and delivers verified revenue data on-chain for royalty distribution.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Data Sources (Off-Chain)                      │
├─────────────┬─────────────┬─────────────┬───────────────────────┤
│   Spotify   │ Apple Music │   YouTube   │    Other DSPs         │
│   API       │    API      │   Music API │    (extensible)       │
└──────┬──────┴──────┬──────┴──────┬──────┴───────────┬───────────┘
       │             │             │                  │
       └─────────────┴──────┬──────┴──────────────────┘
                            │
                   ┌────────▼────────┐
                   │  Data Aggregator │
                   │   (Node Network) │
                   └────────┬────────┘
                            │
                   ┌────────▼────────┐
                   │  Verification   │
                   │   & Consensus   │
                   └────────┬────────┘
                            │
       ┌────────────────────┼────────────────────┐
       │                    │                    │
┌──────▼──────┐    ┌────────▼────────┐   ┌──────▼──────┐
│  Muzix L1   │    │   IPFS/Arweave  │   │   Chainlink │
│  (Primary)  │    │  (Data Storage) │   │  (Fallback) │
└─────────────┘    └─────────────────┘   └─────────────┘
```

## Data Sources

### 1. Spotify
- **API**: Spotify Web API + Spotify for Artists API
- **Data Points**: 
  - Stream counts per track/artist
  - Revenue per stream (by country/territory)
  - Monthly revenue reports
- **Authentication**: OAuth 2.0
- **Rate Limits**: 1,000 requests/hour (requires approval for higher tiers)

### 2. Apple Music
- **API**: Apple Music API + iTunes Connect API
- **Data Points**:
  - Stream counts
  - Revenue per stream
  - Territory-specific rates
- **Authentication**: JWT (JSON Web Tokens)
- **Update Frequency**: Daily aggregates

### 3. YouTube Music
- **API**: YouTube Data API v3 + YouTube Analytics API
- **Data Points**:
  - Video views (music content)
  - Revenue from ads and YouTube Premium
  - Content ID claims data
- **Authentication**: OAuth 2.0
- **Special Considerations**: Distinguish YouTube Music from regular YouTube

### 4. Additional DSPs (Future)
- Amazon Music
- Tidal
- Deezer
- Pandora
- SoundCloud

## Data Schema

### Revenue Data Structure

```solidity
struct StreamingRevenue {
    bytes32 catalogId;           // Unique identifier for the catalog
    bytes32 dspId;              // DSP identifier (spotify, apple, youtube)
    uint256 totalStreams;        // Total stream count
    uint256 revenueUsd;          // Revenue in USD (6 decimals)
    uint256 periodStart;         // Start timestamp
    uint256 periodEnd;           // End timestamp
    bytes32 territoryHash;       // Hash of territories included
    bytes32 dataSourceHash;      // Hash of raw data sources
    uint256 lastUpdated;         // Last update timestamp
    uint256 confidenceScore;     // 0-10000 (basis points)
}
```

### DSP Registry

```solidity
struct DSPInfo {
    bytes32 dspId;
    string name;
    uint256 weight;              // Weight in aggregation (based on market share)
    bool isActive;
    uint256 minConfidenceScore;  // Minimum confidence to accept data
}
```

## Oracle Node Network

### Node Requirements
1. **Staking**: Nodes must stake MUSD to participate
2. **Reputation**: Track record of accurate data submissions
3. **Infrastructure**: High-availability servers with API access
4. **Geographic Distribution**: Minimum 5 regions

### Node Incentives
- **Submission Rewards**: MUSD rewards for successful data submissions
- **Accuracy Bonuses**: Additional rewards for high confidence scores
- **Slashing**: Penalties for incorrect data or downtime

### Consensus Mechanism

```
1. Aggregation Round (every 24 hours)
   ├── Each node queries DSP APIs
   ├── Nodes submit data to aggregator contract
   └── Submissions include cryptographic proof

2. Validation Phase (2 hours)
   ├── Compare submissions across nodes
   ├── Calculate median values
   ├── Identify and filter outliers (>10% deviation)
   └── Require minimum 3 agreeing nodes

3. Finalization Phase (1 hour)
   ├── Publish verified data on-chain
   ├── Distribute rewards to participating nodes
   └── Update reputation scores
```

## Update Frequency

| Data Type | Frequency | Latency |
|-----------|-----------|---------|
| Daily Aggregates | Every 24 hours | 6-12 hours |
| Weekly Reports | Every 7 days | 24-48 hours |
| Monthly Final | Monthly (1st of month) | 72 hours |
| Real-time (estimated) | Every 6 hours | 1-2 hours |

## Verification Mechanisms

### 1. Multi-Source Verification
- Each DSP data point must be confirmed by at least 3 independent nodes
- Cross-reference with official DSP reports when available
- Compare against historical trends (flag anomalies >20%)

### 2. Cryptographic Proofs
```solidity
// Node submits data with signature
function submitRevenueData(
    StreamingRevenue calldata data,
    bytes calldata signature,
    bytes calldata apiResponseProof
) external;

// Verify node signature
function verifyNodeSignature(
    bytes32 dataHash,
    bytes calldata signature,
    address node
) external view returns (bool);
```

### 3. Confidence Scoring

| Factor | Weight | Calculation |
|--------|--------|-------------|
| Node Agreement | 40% | % of nodes submitting similar values |
| Source Reliability | 30% | Historical accuracy of DSP |
| Data Freshness | 20% | Time since last update |
| Historical Consistency | 10% | Comparison to previous periods |

**Minimum Confidence Threshold**: 7500/10000 (75%)

## Smart Contract Integration

### Consumer Interface

```solidity
interface IStreamingRevenueOracle {
    // Get latest revenue data for a catalog
    function getLatestRevenue(bytes32 catalogId) 
        external view 
        returns (StreamingRevenue memory);
    
    // Get revenue for specific period
    function getRevenueForPeriod(
        bytes32 catalogId, 
        uint256 periodStart, 
        uint256 periodEnd
    ) external view returns (uint256 totalRevenue);
    
    // Check if data is fresh (updated within 24 hours)
    function isDataFresh(bytes32 catalogId) 
        external view 
        returns (bool);
    
    // Subscribe to updates (for automated royalty distribution)
    function subscribeToUpdates(bytes32 catalogId) external;
    
    // Event emitted when new data is available
    event RevenueUpdated(
        bytes32 indexed catalogId,
        uint256 revenueUsd,
        uint256 timestamp,
        uint256 confidenceScore
    );
}
```

### Royalty Distribution Integration

```solidity
contract RoyaltyDistributor {
    IStreamingRevenueOracle public oracle;
    
    function distributeRoyalties(bytes32 catalogId) external {
        StreamingRevenue memory revenue = oracle.getLatestRevenue(catalogId);
        
        // Only distribute if data is fresh and confidence is high
        require(oracle.isDataFresh(catalogId), "Data stale");
        require(revenue.confidenceScore >= 7500, "Low confidence");
        
        // Query royalty splits from catalog
        RoyaltySplit[] memory splits = getRoyaltySplits(catalogId);
        
        // Distribute based on splits
        for (uint i = 0; i < splits.length; i++) {
            uint256 amount = (revenue.revenueUsd * splits[i].percentage) / 10000;
            // Transfer MUSD to recipient
            musd.transfer(splits[i].recipient, amount);
        }
        
        emit RoyaltiesDistributed(catalogId, revenue.revenueUsd);
    }
}
```

## Security Considerations

### 1. Data Integrity
- **Tamper-Proof**: All submissions signed by nodes
- **Audit Trail**: IPFS storage of raw API responses
- **Dispute Resolution**: 48-hour window to challenge data

### 2. Access Control
```solidity
// Only verified nodes can submit
modifier onlyVerifiedNode() {
    require(nodeRegistry.isVerified(msg.sender), "Not verified");
    _;
}

// Rate limiting per node
mapping(address => uint256) public lastSubmissionTime;
uint256 constant SUBMISSION_COOLDOWN = 1 hours;
```

### 3. Fail-Safes
- **Circuit Breaker**: Pause updates if >50% nodes are down
- **Fallback Oracle**: Chainlink integration for critical data
- **Manual Override**: Emergency update by governance

## Implementation Phases

### Phase 1: MVP (Weeks 1-2)
- [ ] Deploy oracle contract with 3-node network
- [ ] Integrate Spotify API only
- [ ] Daily updates, manual verification
- [ ] Basic confidence scoring

### Phase 2: Production (Weeks 3-4)
- [ ] Add Apple Music and YouTube Music
- [ ] Automated consensus (7 nodes)
- [ ] Real-time estimates
- [ ] Full verification mechanisms

### Phase 3: Scale (Weeks 5-6)
- [ ] Support 10+ DSPs
- [ ] Decentralized node network (21 nodes)
- [ ] Advanced analytics and reporting
- [ ] Cross-chain compatibility

## Technical Stack

| Component | Technology |
|-----------|------------|
| Oracle Contract | Solidity 0.8.x |
| Node Runtime | Node.js 20 + TypeScript |
| Blockchain Client | viem |
| Data Storage | IPFS + Arweave |
| Monitoring | Prometheus + Grafana |
| API | Express.js |

## Gas Optimization

### Batched Updates
```solidity
function batchUpdateRevenue(StreamingRevenue[] calldata updates) external {
    for (uint i = 0; i < updates.length; i++) {
        _updateRevenue(updates[i]);
    }
}
```

### Storage Optimization
- Use `bytes32` instead of `string` for IDs
- Pack struct fields efficiently
- Store only hashes of large data on-chain

## Cost Estimates

| Operation | Gas Cost | USD Cost* |
|-----------|----------|-----------|
| Single Update | ~150,000 | $0.50 |
| Batch (10) | ~800,000 | $2.50 |
| Query (View) | 0 | Free |
| Node Registration | ~200,000 | $0.65 |

*At 20 gwei gas price and $2000 ETH

## Monitoring & Alerting

### Key Metrics
- Update latency (target: <12 hours)
- Node uptime (target: >99%)
- Data accuracy (target: >95%)
- Consensus time (target: <2 hours)

### Alerts
- Node downtime (>1 hour)
- Data anomalies (>20% deviation)
- Low confidence scores (<75%)
- Gas price spikes

## Future Enhancements

1. **AI-Powered Verification**: ML models to detect fraudulent data
2. **Zero-Knowledge Proofs**: Privacy-preserving revenue verification
3. **Prediction Markets**: Crowd-sourced data validation
4. **DAO Governance**: Community-controlled oracle parameters

## References

- [Chainlink Oracle Documentation](https://docs.chain.link/)
- [Spotify Web API](https://developer.spotify.com/documentation/web-api/)
- [Apple Music API](https://developer.apple.com/documentation/applemusicapi/)
- [YouTube Data API](https://developers.google.com/youtube/v3)

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-05  
**Author**: Muzix Contributors
