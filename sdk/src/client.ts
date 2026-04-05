/**
 * Muzix Client - Main entry point for the SDK
 */

import { PublicClient, WalletClient, createPublicClient, createWalletClient, http, custom } from 'viem';
import { MuzixClientConfig, ChainConfig, MuzixSDKError } from './types';
import { MUSD } from './musd';
import { Catalog } from './catalog';
import { Royalty } from './royalty';
import { Streaming } from './streaming';

/**
 * Main client for interacting with Muzix chain
 */
export class MuzixClient {
  public readonly chain: ChainConfig;
  public readonly publicClient: PublicClient;
  public readonly walletClient?: WalletClient;

  // Feature modules
  public readonly musd: MUSD;
  public readonly catalog: Catalog;
  public readonly royalty: Royalty;
  public readonly streaming: Streaming;

  constructor(config: MuzixClientConfig) {
    this.chain = config.chain;

    // Initialize public client for read operations
    if (config.publicClient) {
      this.publicClient = config.publicClient;
    } else {
      this.publicClient = createPublicClient({
        chain: {
          id: config.chain.id,
          name: config.chain.name,
          nativeCurrency: config.chain.nativeCurrency,
          rpcUrls: {
            default: { http: [config.chain.rpcUrl] },
            public: { http: [config.chain.rpcUrl] },
          },
        },
        transport: http(config.chain.rpcUrl),
      });
    }

    // Initialize wallet client for write operations
    if (config.walletClient) {
      this.walletClient = config.walletClient;
    }

    // Initialize feature modules
    this.musd = new MUSD(this);
    this.catalog = new Catalog(this);
    this.royalty = new Royalty(this);
    this.streaming = new Streaming(this);
  }

  /**
   * Check if wallet is connected
   */
  get isWalletConnected(): boolean {
    return !!this.walletClient;
  }

  /**
   * Get connected wallet address
   */
  async getWalletAddress(): Promise<`0x${string}` | undefined> {
    if (!this.walletClient) {
      return undefined;
    }
    
    try {
      const accounts = await this.walletClient.getAddresses();
      return accounts[0];
    } catch (error) {
      return undefined;
    }
  }

  /**
   * Connect wallet
   */
  async connectWallet(provider: any): Promise<void> {
    try {
      (this as any).walletClient = createWalletClient({
        chain: {
          id: this.chain.id,
          name: this.chain.name,
          nativeCurrency: this.chain.nativeCurrency,
          rpcUrls: {
            default: { http: [this.chain.rpcUrl] },
            public: { http: [this.chain.rpcUrl] },
          },
        },
        transport: custom(provider),
      });
    } catch (error) {
      throw new MuzixSDKError(
        'Failed to connect wallet',
        'WALLET_CONNECTION_ERROR',
        error
      );
    }
  }

  /**
   * Get chain ID
   */
  get chainId(): number {
    return this.chain.id;
  }

  /**
   * Get block number
   */
  async getBlockNumber(): Promise<bigint> {
    return this.publicClient.getBlockNumber();
  }

  /**
   * Get balance of an address
   */
  async getBalance(address: `0x${string}`): Promise<bigint> {
    return this.publicClient.getBalance({ address });
  }
}
