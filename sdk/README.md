# Muzix SDK

TypeScript SDK for Muzix chain integration. Built on top of [viem](https://viem.sh/) for Ethereum interaction.

## Features

- **MUSD Operations** - Mint, burn, and transfer MUSD stablecoin
- **Catalog Tokens** - Create and manage music catalog NFTs
- **Royalty Splits** - Query and manage royalty distributions
- **Streaming Data** - Submit and query streaming events for royalty calculations

## Installation

```bash
npm install @muzix/sdk
# or
yarn add @muzix/sdk
# or
pnpm add @muzix/sdk
```

## Quick Start

```typescript
import { MuzixClient } from '@muzix/sdk';

// Initialize client
const client = new MuzixClient({
  chain: {
    id: 1337, // Muzix chain ID
    name: 'Muzix Testnet',
    rpcUrl: 'https://rpc.muzix.testnet',
    nativeCurrency: {
      name: 'ETH',
      symbol: 'ETH',
      decimals: 18,
    },
  },
});

// Connect wallet
await client.connectWallet(window.ethereum);

// Get wallet address
const address = await client.getWalletAddress();
console.log('Connected:', address);
```

## Usage

### MUSD (Music Stablecoin)

```typescript
// Get MUSD balance
const balance = await client.musd.getBalance('0x...');
console.log('Balance:', await client.musd.formatBalance(balance));

// Mint MUSD (requires permissions)
const result = await client.musd.mint({
  to: '0x...',
  amount: BigInt(1000000), // 1 MUSD (6 decimals)
});

// Wait for confirmation
const receipt = await result.wait();
console.log('Minted:', receipt.success);

// Transfer MUSD
const transfer = await client.musd.transfer('0x...', BigInt(500000));
await transfer.wait();
```

### Catalog Tokens

```typescript
// Create a new catalog token
const result = await client.catalog.createCatalog({
  name: 'My Song',
  artist: 'Artist Name',
  metadata: {
    title: 'My Song',
    artist: 'Artist Name',
    album: 'My Album',
    duration: 180,
    genre: 'Pop',
    isrc: 'US-S1Z-99-00001',
  },
  royaltySplits: [
    { recipient: '0x...', percentage: 5000 }, // 50%
    { recipient: '0x...', percentage: 5000 }, // 50%
  ],
});

const receipt = await result.wait();
console.log('Catalog created:', receipt.success);

// Get catalog info
const catalog = await client.catalog.getCatalog('1');
console.log('Catalog:', catalog.name, catalog.artist);
```

### Royalty Splits

```typescript
// Query royalty splits
const splits = await client.royalty.getRoyaltySplits({ catalogId: '1' });
console.log('Splits:', splits);

// Get unclaimed royalty
const unclaimed = await client.royalty.getUnclaimedRoyalty('1', '0x...');
console.log('Unclaimed:', unclaimed);

// Claim royalty
const claim = await client.royalty.claimRoyalty('1');
await claim.wait();
```

### Streaming Data

```typescript
// Submit single stream
const stream = await client.streaming.submitStream({
  catalogId: '1',
  listener: '0x...',
  timestamp: BigInt(Date.now() / 1000),
  duration: 180,
  source: 'spotify',
});
await stream.wait();

// Submit batch streams (more efficient)
const batch = await client.streaming.submitBatchStreams({
  catalogId: '1',
  streams: [
    {
      catalogId: '1',
      listener: '0x...',
      timestamp: BigInt(Date.now() / 1000),
      duration: 180,
      source: 'spotify',
    },
    // ... more streams
  ],
});
await batch.wait();

// Get stream count
const count = await client.streaming.getStreamCount('1');
console.log('Total streams:', count);
```

## API Reference

### MuzixClient

Main entry point for the SDK.

```typescript
const client = new MuzixClient({
  chain: ChainConfig;
  publicClient?: PublicClient; // Optional: custom viem public client
  walletClient?: WalletClient; // Optional: custom viem wallet client
});
```

### MUSD

MUSD stablecoin operations.

- `getBalance(address)` - Get MUSD balance
- `mint({ to, amount })` - Mint MUSD (requires permissions)
- `burn({ from, amount })` - Burn MUSD (requires permissions)
- `transfer(to, amount)` - Transfer MUSD

### Catalog

Catalog token operations.

- `createCatalog(params)` - Create new catalog token
- `getCatalog(id)` - Get catalog by ID
- `transfer(to, catalogId)` - Transfer catalog token

### Royalty

Royalty split operations.

- `getRoyaltySplits({ catalogId })` - Query royalty splits
- `getUnclaimedRoyalty(catalogId, recipient)` - Get unclaimed amount
- `claimRoyalty(catalogId)` - Claim royalty

### Streaming

Streaming data operations.

- `submitStream(stream)` - Submit single stream event
- `submitBatchStreams({ catalogId, streams })` - Submit multiple streams
- `getStreamCount(catalogId)` - Get total stream count

## Configuration

### Chain Configuration

```typescript
interface ChainConfig {
  id: number;              // Chain ID
  name: string;            // Chain name
  rpcUrl: string;          // RPC endpoint
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}
```

### Contract Addresses

The SDK uses placeholder addresses by default. Set actual addresses:

```typescript
import { MUSD } from '@muzix/sdk';

const musd = new MUSD(client, {
  address: '0x...', // Actual MUSD contract address
  decimals: 6,
  symbol: 'MUSD',
  name: 'Music USD',
});
```

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Test
npm test

# Lint
npm run lint

# Format
npm run format
```

## Contributing

See [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines.

## License

MIT
