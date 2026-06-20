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

## 4. MUSD Royalty Stablecoin
- **Pull-Payment:** Royalties are escrowed in MUSD contract; recipients call `claimPayments()` to withdraw.
- **Batch Distribution:** Owner can process multiple token royalty events atomically via `batchRoyaltyDistribution()`.
- **Integration:** MUSD pulls royalty splits from MuzixCatalog; streaming oracle feeds revenue data to trigger distributions.
- See [MUSD_SPEC.md](MUSD_SPEC.md) for full technical details.

## 5. AI Provenance
- `MuzixAIProvenance` bridges ERC-721-AI model tokens to music NFTs.
- Opt-in, non-invasive — MuzixCatalog is not modified.
- Supports human-only attestation and multi-model lineage.
- See [ai-provenance.md](ai-provenance.md) for design.

## 6. Rights Registry (Labelton)
- `MuzixRightsOffering` enables on-chain term-sheet negotiation for music rights.
- ERC-1155 multi-variant minter for split rights (master, publishing, neighboring).
- See [labelton-architecture.md](labelton-architecture.md) for details.
