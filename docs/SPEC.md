# Muzix Catalog Specification (v1.1)

## 1. Fractional Ownership Support
Implemented via **Economic Fractioning** in the `tokenSplits` mapping. This allows multiple stakeholders to hold a percentage interest in the NFT's generated revenue without needing to wrap the ERC-721 into ERC-20 tokens, maintaining marketplace compatibility.

## 2. Streaming Revenue Claims
- **Deposit:** External platforms deposit ETH/Tokens via `depositRevenue(tokenId)`.
- **Claim:** Stakeholders call `claimRevenue(tokenId)` to withdraw their specific share based on the configured splits.
- **Security:** Uses the Pull-Payment pattern and `ReentrancyGuard` to prevent distribution attacks.

## 3. Royalty Split Configuration
- Fully compliant with **ERC-2981**.
- Supports multiple recipients by pointing the ERC-2981 royalty receiver to the contract itself, which then distributes funds according to the internal `RoyaltySplit` logic.
