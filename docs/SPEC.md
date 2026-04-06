# Muzix Protocol Specification (v1.2)

## 1. Fractional Ownership (Economic Shares)
The protocol implements fractional ownership through an on-chain cap table (`tokenSplits`). 
- **Validation:** The system enforces a strict 100% (10000 bps) share distribution during minting.
- **Mechanism:** Revenue is distributed proportionally to each stakeholder's share.

## 2. Industry Standard Metadata
Each NFT is linked to a `MusicMetadata` struct containing:
- **ISRC:** The global standard for sound recording identification.
- **Artist/Album/Publisher:** Essential for copyright and licensing transparency.

## 3. Streaming Revenue Claims
- Platforms deposit ETH via `depositStreamingRevenue(tokenId)`.
- Stakeholders use `claimRevenue(tokenId)` to withdraw their specific balance.
- **Security:** ReentrancyGuard and Pull-Payment pattern implemented.
