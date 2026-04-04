# Muzix Catalog Token Standard (MRC-721)

**Technical specification for music catalog tokenization on the Muzix protocol**

---

## Abstract

This document defines MRC-721, an ERC-721 extension for representing music catalogs as on-chain assets. Each token represents a song, album, or catalog with embedded metadata (ISRC, ISWC), configurable royalty splits, streaming revenue claims, and fractional ownership support via ERC-1155 sub-tokens.

---

## 1. Overview

### 1.1 Design Goals

1. **Composability**: Compatible with existing ERC-721 tooling (marketplaces, wallets, DeFi protocols)
2. **Revenue distribution**: Native royalty split hooks that execute on every revenue event
3. **Metadata completeness**: On-chain representation of music industry identifiers (ISRC, ISWC, UPC)
4. **Fractionalization**: Built-in support for splitting a single catalog token into fungible shares
5. **Upgradability**: Metadata and split configurations can be updated by authorized parties

### 1.2 Token Hierarchy

```
CatalogToken (ERC-721)
├── Metadata (ISRC, title, artist, splits)
├── RevenueStream (claimable royalties)
├── FractionalShares (ERC-1155 sub-tokens)
└── RoyaltySplitConfig (automatic distribution)
```

---

## 2. Interface Specification

### 2.1 ICatalogToken (extends IERC721)

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

interface ICatalogToken is IERC721 {
    
    /// @notice Metadata for a catalog entry
    struct CatalogMetadata {
        string title;           // Song/album title
        string artist;          // Primary artist name
        string isrc;            // International Standard Recording Code
        string iswc;            // International Standard Musical Work Code  
        string upc;             // Universal Product Code (for albums)
        uint256 releaseDate;    // Unix timestamp
        string genre;           // Primary genre
        string contentURI;      // IPFS/Arweave URI for audio content
        string metadataURI;     // IPFS/Arweave URI for extended metadata (JSON)
    }

    /// @notice Royalty split configuration
    struct RoyaltySplit {
        address payable recipient;  // Payment recipient
        uint16 basisPoints;         // Share in basis points (100 = 1%)
        string role;                // "artist", "producer", "songwriter", "label"
    }

    /// @notice Emitted when a new catalog token is minted
    event CatalogMinted(
        uint256 indexed tokenId,
        string isrc,
        address indexed artist,
        uint256 splitCount
    );

    /// @notice Emitted when revenue is distributed
    event RevenueDistributed(
        uint256 indexed tokenId,
        uint256 totalAmount,
        address indexed currency
    );

    /// @notice Emitted when royalty splits are updated
    event SplitsUpdated(uint256 indexed tokenId, uint256 splitCount);

    /// @notice Mint a new catalog token
    /// @param to Initial owner (typically the primary artist or label)
    /// @param metadata Catalog metadata
    /// @param splits Initial royalty split configuration
    /// @return tokenId The ID of the newly minted token
    function mintCatalog(
        address to,
        CatalogMetadata calldata metadata,
        RoyaltySplit[] calldata splits
    ) external returns (uint256 tokenId);

    /// @notice Get metadata for a catalog token
    function getCatalogMetadata(uint256 tokenId) 
        external view returns (CatalogMetadata memory);

    /// @notice Get royalty splits for a catalog token
    function getRoyaltySplits(uint256 tokenId) 
        external view returns (RoyaltySplit[] memory);

    /// @notice Update royalty splits (requires authorization)
    /// @dev Only callable by token owner or authorized split manager
    function updateSplits(uint256 tokenId, RoyaltySplit[] calldata newSplits) 
        external;

    /// @notice Distribute revenue to all split recipients
    /// @param tokenId The catalog token receiving revenue
    /// @param currency Address of the ERC-20 token (address(0) for native)
    /// @param amount Total revenue amount to distribute
    function distributeRevenue(
        uint256 tokenId,
        address currency,
        uint256 amount
    ) external;

    /// @notice Get total accumulated revenue for a token
    function totalRevenue(uint256 tokenId) external view returns (uint256);

    /// @notice Get claimable revenue for a specific recipient
    function claimableRevenue(uint256 tokenId, address recipient) 
        external view returns (uint256);

    /// @notice Claim accumulated revenue
    function claimRevenue(uint256 tokenId) external;
}
```

### 2.2 ICatalogFractions (ERC-1155 Extension)

```solidity
interface ICatalogFractions {
    
    /// @notice Fractionalize a catalog token into fungible shares
    /// @param catalogTokenId The ERC-721 token to fractionalize
    /// @param totalShares Total number of fractional shares to create
    /// @param retainedShares Shares retained by the original owner
    /// @return fractionId The ERC-1155 token ID for the fractional shares
    function fractionalize(
        uint256 catalogTokenId,
        uint256 totalShares,
        uint256 retainedShares
    ) external returns (uint256 fractionId);

    /// @notice Redeem all fractional shares to reclaim the ERC-721 token
    /// @dev Caller must hold 100% of fractional shares
    function redeem(uint256 fractionId) external;

    /// @notice Revenue distribution proportional to share ownership
    /// @dev Called by the revenue oracle when streaming income arrives
    function distributeFractionalRevenue(
        uint256 fractionId,
        address currency,
        uint256 amount
    ) external;

    /// @notice Get the underlying catalog token for a fraction
    function underlyingCatalog(uint256 fractionId) 
        external view returns (uint256 catalogTokenId);

    /// @notice Check if a catalog token has been fractionalized
    function isFractionalized(uint256 catalogTokenId) 
        external view returns (bool);
}
```

---

## 3. Revenue Distribution Mechanism

### 3.1 Revenue Flow

```
Streaming Platform (Spotify, Apple Music)
    ↓ (oracle reports streaming counts + revenue)
Revenue Oracle Contract
    ↓ (converts to MUSD, calls distributeRevenue)
CatalogToken Contract
    ↓ (applies RoyaltySplit configuration)
Recipients (artist, producer, songwriter, label, fraction holders)
```

### 3.2 Split Validation Rules

- Total basis points across all splits MUST equal 10,000 (100%)
- Minimum split per recipient: 100 basis points (1%)
- Maximum recipients per token: 20
- Splits can only be updated by: token owner OR an authorized `splitManager` role

### 3.3 Revenue Accumulation

Revenue is accumulated in a pull-payment pattern to avoid gas costs scaling with recipient count:

```solidity
mapping(uint256 => mapping(address => uint256)) private _claimable;

function distributeRevenue(uint256 tokenId, address currency, uint256 amount) external {
    RoyaltySplit[] memory splits = _splits[tokenId];
    
    for (uint i = 0; i < splits.length; i++) {
        uint256 share = (amount * splits[i].basisPoints) / 10000;
        _claimable[tokenId][splits[i].recipient] += share;
    }
    
    // If fractionalized, remaining share goes to fraction holders
    if (_fractionalized[tokenId]) {
        _distributeFractional(tokenId, currency, amount);
    }
    
    emit RevenueDistributed(tokenId, amount, currency);
}
```

---

## 4. Metadata Standard

### 4.1 On-Chain Metadata

Core identifiers stored on-chain for discoverability and composability:

| Field | Type | Required | Description |
|---|---|---|---|
| `title` | string | Yes | Song or album title |
| `artist` | string | Yes | Primary artist |
| `isrc` | string | Yes* | International Standard Recording Code |
| `iswc` | string | No | International Standard Musical Work Code |
| `upc` | string | No | Universal Product Code (albums) |
| `releaseDate` | uint256 | Yes | Unix timestamp |
| `genre` | string | No | Primary genre classification |
| `contentURI` | string | No | IPFS/Arweave hash for audio |
| `metadataURI` | string | Yes | Extended metadata JSON |

*ISRC required for songs; UPC required for albums

### 4.2 Extended Metadata (Off-Chain JSON)

```json
{
    "name": "Song Title",
    "description": "A description of the work",
    "image": "ipfs://...",
    "animation_url": "ipfs://...(audio file)",
    "external_url": "https://muzix.io/catalog/...",
    "attributes": [
        {"trait_type": "BPM", "value": 120},
        {"trait_type": "Key", "value": "C Minor"},
        {"trait_type": "Duration", "value": 234},
        {"trait_type": "Label", "value": "Independent"},
        {"trait_type": "Territory", "value": "Worldwide"},
        {"trait_type": "Language", "value": "English"}
    ],
    "music_metadata": {
        "isrc": "USRC12345678",
        "iswc": "T-345246800-1",
        "contributors": [
            {"name": "Artist Name", "role": "performer", "ipi": "00012345678"},
            {"name": "Producer Name", "role": "producer"},
            {"name": "Songwriter Name", "role": "composer", "ipi": "00098765432"}
        ],
        "rights": {
            "master_owner": "0x...",
            "publishing_owner": "0x...",
            "territories": ["worldwide"],
            "license_type": "exclusive"
        },
        "streaming_data": {
            "oracle": "0x...(oracle contract address)",
            "data_source": "luminate",
            "last_updated": "2026-04-04T00:00:00Z"
        }
    }
}
```

---

## 5. Fractionalization Model

### 5.1 Process

1. Owner calls `fractionalize(tokenId, 10000, 6000)` — creates 10,000 shares, retains 6,000
2. ERC-721 token is locked in the fractions contract
3. 4,000 shares available for sale/distribution
4. Revenue distributes pro-rata to all share holders
5. If someone accumulates all 10,000 shares, they can `redeem()` to unlock the ERC-721

### 5.2 Revenue Distribution to Fraction Holders

```
Total Revenue for Token: $1000/month
├── RoyaltySplit recipients (artist 60%, producer 15%, etc.): $750
└── Fraction holder pool (25% allocated to fractions): $250
    ├── Holder A (6000/10000 shares): $150
    ├── Holder B (3000/10000 shares): $75
    └── Holder C (1000/10000 shares): $25
```

### 5.3 Integration with DeFi

Fractional catalog shares (ERC-1155) are composable with DeFi:

- **Lending**: Use catalog shares as collateral on Aave/Compound forks
- **AMM liquidity**: Trade catalog shares on Uniswap V3 pools
- **Index funds**: Bundle multiple catalog shares into diversified music funds
- **Yield farming**: Stake catalog shares for additional protocol incentives

---

## 6. Security Considerations

1. **Oracle trust**: Revenue oracles must be decentralized or use multi-source verification
2. **Split griefing**: Malicious split recipients could refuse to claim, but pull-payment pattern prevents blocking others
3. **Metadata immutability**: ISRC/ISWC should be immutable post-mint; only extended metadata URI should be updatable
4. **Fraction redemption**: Prevent hostile buyouts by requiring governance vote above a threshold (e.g., 90% of shares)
5. **Re-entrancy**: All revenue distribution functions must be re-entrancy safe

---

## 7. Compatibility

| Standard | Compatibility |
|---|---|
| ERC-721 | Full — catalog tokens are standard NFTs |
| ERC-2981 | Full — `royaltyInfo()` returns aggregate split info |
| ERC-1155 | Fractional shares use ERC-1155 |
| ERC-4907 | Optional — support rental/licensing via user role |
| EIP-2535 | Diamond pattern for upgradable implementations |

---

## References

- [ERC-721](https://eips.ethereum.org/EIPS/eip-721) — Non-Fungible Token Standard
- [ERC-1155](https://eips.ethereum.org/EIPS/eip-1155) — Multi Token Standard
- [ERC-2981](https://eips.ethereum.org/EIPS/eip-2981) — NFT Royalty Standard
- [ISRC Standard](https://isrc.ifpi.org/) — International Standard Recording Code
- [ISWC Standard](https://www.iswc.org/) — International Standard Musical Work Code
- [Muzix Protocol](https://github.com/kcolbchain/muzix) — Music Finance Layer

---

*Prepared for: Muzix Protocol (kcolbchain)*
*Date: April 2026*
*Author: kas-storksoft*
