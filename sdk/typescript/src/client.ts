import type { PublicClient, WalletClient } from 'viem';

import { CatalogModule } from './catalog.js';
import { MusdModule } from './musd.js';
import { OracleModule } from './oracle.js';
import type { MuzixContracts } from './types.js';

export interface CreateMuzixClientOptions {
  /** Contract addresses for the target deployment. */
  contracts: MuzixContracts;
  /** Public client for reads (required). */
  publicClient: PublicClient;
  /** Wallet client for writes (optional — read-only clients are fine). */
  walletClient?: WalletClient;
}

/**
 * Top-level SDK client. One handle per deployment/chain.
 *
 * @example
 * ```ts
 * import { createPublicClient, createWalletClient, http } from 'viem';
 * import { privateKeyToAccount } from 'viem/accounts';
 * import { createMuzixClient, muzixDevnet } from '@kcolbchain/muzix-sdk';
 *
 * const publicClient = createPublicClient({ chain: muzixDevnet, transport: http() });
 * const walletClient = createWalletClient({
 *   chain: muzixDevnet,
 *   transport: http(),
 *   account: privateKeyToAccount(process.env.PK as `0x${string}`),
 * });
 *
 * const muzix = createMuzixClient({
 *   contracts: {
 *     catalog: '0x...',
 *     musd: '0x...',
 *   },
 *   publicClient,
 *   walletClient,
 * });
 *
 * const { hash, wait } = await muzix.catalog.mintMusic({
 *   tokenURI: 'ipfs://bafy.../metadata.json',
 *   metadata: { isrc: 'USRC17607839', artist: 'Test Artist' },
 * });
 * await wait();
 * ```
 */
export interface MuzixClient {
  contracts: MuzixContracts;
  publicClient: PublicClient;
  walletClient?: WalletClient;
  catalog: CatalogModule;
  musd: MusdModule;
  oracle: OracleModule;
}

export function createMuzixClient(opts: CreateMuzixClientOptions): MuzixClient {
  const { contracts, publicClient, walletClient } = opts;
  return {
    contracts,
    publicClient,
    walletClient,
    catalog: new CatalogModule(contracts.catalog, publicClient, walletClient),
    musd: new MusdModule(contracts.musd, publicClient, walletClient),
    oracle: new OracleModule(contracts.oracle, publicClient, walletClient),
  };
}
