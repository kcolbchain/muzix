# Muzix Catalog Tokenization Standard

## Overview

The `MuzixCatalog` contract defines a token standard for representing music catalogs on-chain. Built on ERC-721 with ERC-2981 (royalty info) and ERC-721Enumerable extensions.

## Token Representation

Each token represents one of:
- **SINGLE** — Individual song/track
- **ALBUM** — Album or EP
- **CATALOG** — Full artist catalog (multiple works)

## On-Chain Metadata

| Field | Type | Description |
|-------|------|-------------|
| `isrc` | string | International Standard Recording Code |
| `iswc` | string | International Standard Musical Work Code |
| `title` | string | Song/album/catalog title |
| `artist` | string | Primary artist name |
| `catalogType` | enum | SINGLE, ALBUM, or CATALOG |
| `licenseType` | enum | MASTER, COMPOSITION, or BOTH |
| `territory` | string | ISO 3166-1 code or "WORLDWIDE" |
| `releaseDate` | uint256 | Original release date (Unix timestamp) |
| `mintedAt` | uint256 | Tokenization timestamp |

## Royalty Split Configuration

Up to 8 beneficiaries per token. Splits are defined in basis points (total must equal 10,000).

```
Example: Song tokenized by independent artist
├── Artist:   7000 bps (70%)
├── Producer: 1500 bps (15%)
├── Label:    1000 bps (10%)
└── Manager:   500 bps (5%)
```

## Revenue Flow

1. **Revenue Deposit**: DSP or distributor calls `depositRevenue(tokenId)` with ETH/MUSD
2. **Automatic Split**: Revenue is allocated to beneficiaries per configured splits
3. **Claim**: Each beneficiary calls `claimRevenue(tokenId)` to withdraw

## Secondary Sales (EIP-2981)

Marketplaces that support EIP-2981 will automatically pay royalties on resale. Max secondary royalty: 20% (2000 bps).

## Fractional Ownership

Fractional ownership is achieved through the split system — multiple beneficiaries with revenue claim rights. For tradeable fractional shares, a companion ERC-1155 contract can represent sub-tokens of each catalog NFT.
