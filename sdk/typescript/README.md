# @kcolbchain/muzix-sdk

TypeScript SDK for the [Muzix](https://github.com/kcolbchain/muzix) music-finance protocol.

Talks to:

- **MuzixCatalog** — ERC-721 + ERC-2981 catalog tokens with ISRC metadata and a cap-table royalty split (basis points, must sum to `10_000`).
- **MUSD** — Muzix USD stablecoin with pull-payment royalty distribution (`transferWithRoyalty`, `batchRoyaltyDistribution`, `claimPayments`).
- **Streaming Revenue Oracle** — the consumer-side interface from [`oracle/SPECIFICATION.md`](../../oracle/SPECIFICATION.md).

Built on [viem](https://viem.sh). Works against the local Muzix devnet (`node/docker-compose.yml`, chain id `1338`) and any chain you can point a viem client at.

Closes [#5](https://github.com/kcolbchain/muzix/issues/5).

## Install

```bash
npm install @kcolbchain/muzix-sdk viem
```

## Quickstart

```ts
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { createMuzixClient, muzixDevnet } from '@kcolbchain/muzix-sdk';

const publicClient = createPublicClient({
  chain: muzixDevnet,
  transport: http('http://127.0.0.1:8545'),
});
const walletClient = createWalletClient({
  chain: muzixDevnet,
  account: privateKeyToAccount(process.env.PK as `0x${string}`),
  transport: http('http://127.0.0.1:8545'),
});

const muzix = createMuzixClient({
  contracts: {
    catalog: process.env.MUZIX_CATALOG_ADDRESS as `0x${string}`,
    musd: process.env.MUZIX_MUSD_ADDRESS as `0x${string}`,
    // oracle: '0x...'  // optional — omit for non-oracle flows
  },
  publicClient,
  walletClient,
});

// Mint a catalog entry (caller must own the MuzixCatalog contract).
const mint = await muzix.catalog.mintMusic({
  tokenURI: 'ipfs://bafy.../metadata.json',
  metadata: { isrc: 'USRC17607839', artist: 'Test Artist' },
});
await mint.wait();

// Configure a royalty split (must sum to 10_000 bps).
await muzix.catalog.setRoyaltySplit({
  tokenId: 0n,
  entries: [
    { recipient: '0xArtist...', shareBps: 7000 },
    { recipient: '0xLabel...', shareBps: 3000 },
  ],
});

// Deposit ETH streaming revenue; stakeholders then claim pro-rata.
await muzix.catalog.depositRevenue({ tokenId: 0n, amount: 10n ** 15n });
await muzix.catalog.claimStreamingRevenue(0n);

// Oracle read (needs `contracts.oracle` set).
const isFresh = await muzix.oracle.isDataFresh('0xCatalogIdBytes32...' as `0x${string}`);
```

## Modules

| Module | Purpose | Source |
|---|---|---|
| `muzix.catalog` | Catalog tokens, metadata, royalty splits, pull-payment streaming revenue | `src/catalog.ts` |
| `muzix.musd` | MUSD ERC-20 + royalty distribution | `src/musd.ts` |
| `muzix.oracle` | Consumer-side reads of the streaming-revenue oracle | `src/oracle.ts` |

All write methods return `{ hash, wait }`. Reads return plain values (bigints, strings, structs).

### Errors

Imported from `@kcolbchain/muzix-sdk`:

- `InvalidRoyaltySplitError` — thrown client-side when `setRoyaltySplit` entries do not sum to 10_000 bps (before a doomed on-chain call).
- `MissingWalletError` — thrown when a write method is called on a read-only client.
- `MissingOracleError` — thrown when an oracle method is called without `contracts.oracle` configured.
- `MuzixSdkError` — base class for all of the above.

## Chains

The SDK ships with `muzixDevnet` (chain id `1338`, matching `node/docker-compose.yml`). Swap `transport: http('https://your-rpc')` and pass any `chain` object from viem to point at other deployments.

## Example

See [`examples/mint-catalog.ts`](./examples/mint-catalog.ts) for a full end-to-end walk-through that mints a token, configures splits, and deposits revenue.

```bash
# Requires a running local devnet (cd node && ./deploy.sh)
export MUZIX_CATALOG_ADDRESS=0x...
export MUZIX_MUSD_ADDRESS=0x...
export PRIVATE_KEY=0x...
npm run example:mint
```

## Development

```bash
npm install
npm run typecheck   # tsc --noEmit
npm test            # vitest (mocked RPC)
npm run build       # emits dist/ via tsconfig.build.json
```

Tests mock the EIP-1193 provider and assert on encoded calldata — no live chain required.

## License

MIT.
