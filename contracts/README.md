# MUSD - Muzix USD Stablecoin

USD-pegged stablecoin with built-in hooks for automatic royalty splits on transfer. When MUSD moves as a royalty payment, splits execute atomically.

## Features

- **USD-Pegged Stablecoin**: Standard ERC20 token pegged to USD
- **Atomic Royalty Splits**: Automatic distribution to multiple recipients on transfer
- **Configurable Splits**: Set up different royalty configurations per content ID (song/album)
- **Up to 10 Recipients**: Support for complex royalty sharing scenarios
- **Authorized Operators**: Delegate royalty configuration to trusted operators
- **Pausable**: Emergency pause functionality for security

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                      MUSD Token                         │
├─────────────────────────────────────────────────────────┤
│  ERC20 Standard           │  Royalty Split Logic        │
│  - transfer()             │  - configureRoyaltySplit()  │
│  - balanceOf()            │  - transferWithRoyalty()    │
│  - approve()              │  - batchTransferWithRoyalty │
│                           │                             │
│  Mint/Burn (Owner)        │  Query Functions            │
│  - mint()                 │  - getRoyaltySplit()        │
│  - burn()                 │  - calculateRoyaltyShare()  │
└─────────────────────────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ▼                  ▼                  ▼
   ┌─────────┐      ┌──────────┐      ┌──────────┐
   │Artist 1 │      │  Label   │      │Publisher │
   │  40%    │      │   30%    │      │   30%    │
   └─────────┘      └──────────┘      └──────────┘
```

## Usage

### Configure Royalty Split

```solidity
bytes32 songId = keccak256("song-123");
address[] memory recipients = new address[](3);
recipients[0] = artistAddress;      // 40%
recipients[1] = labelAddress;       // 30%
recipients[2] = publisherAddress;   // 30%

uint256[] memory percentages = new uint256[](3);
percentages[0] = 4000;  // 40%
percentages[1] = 3000;  // 30%
percentages[2] = 3000;  // 30%

musd.configureRoyaltySplit(songId, recipients, percentages);
```

### Transfer with Royalty Split

```solidity
// Transfer 1000 MUSD with automatic royalty distribution
musd.transferWithRoyalty(songId, 1000 * 10**18);
// Automatically splits: 400 → artist, 300 → label, 300 → publisher
```

## Contract Functions

### Write Functions

- `configureRoyaltySplit(bytes32 contentId, address[] recipients, uint256[] percentages)` - Set up royalty split
- `transferWithRoyalty(bytes32 contentId, uint256 amount)` - Transfer with automatic split
- `batchTransferWithRoyalty(bytes32[] contentIds, uint256[] amounts)` - Batch transfers
- `mint(address to, uint256 amount)` - Mint new tokens (owner only)
- `setOperatorAuthorization(address operator, bool authorized)` - Authorize operators

### Read Functions

- `getRoyaltySplit(bytes32 contentId)` - Get split configuration
- `calculateRoyaltyShare(bytes32 contentId, uint256 amount, uint256 recipientIndex)` - Calculate share
- `royaltySplits(bytes32 contentId)` - Direct mapping access
- `authorizedOperators(address)` - Check operator status

## Deployment

```bash
# Install dependencies
npm install

# Compile contracts
npm run compile

# Run tests
npm test

# Deploy (configure network in hardhat.config.js first)
npm run deploy
```

## Security

- ReentrancyGuard on royalty transfers
- Pausable for emergency stops
- Only owner can mint new tokens
- Percentages must sum to 10000 basis points (100%)
- Maximum 10 recipients per split

## License

MIT
