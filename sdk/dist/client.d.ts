/**
 * Muzix Client - Main entry point for the SDK
 */
import { PublicClient, WalletClient } from 'viem';
import { MuzixClientConfig, ChainConfig } from './types';
import { MUSD } from './musd';
import { Catalog } from './catalog';
import { Royalty } from './royalty';
import { Streaming } from './streaming';
/**
 * Main client for interacting with Muzix chain
 */
export declare class MuzixClient {
    readonly chain: ChainConfig;
    readonly publicClient: PublicClient;
    readonly walletClient?: WalletClient;
    readonly musd: MUSD;
    readonly catalog: Catalog;
    readonly royalty: Royalty;
    readonly streaming: Streaming;
    constructor(config: MuzixClientConfig);
    /**
     * Check if wallet is connected
     */
    get isWalletConnected(): boolean;
    /**
     * Get connected wallet address
     */
    getWalletAddress(): Promise<`0x${string}` | undefined>;
    /**
     * Connect wallet
     */
    connectWallet(provider: any): Promise<void>;
    /**
     * Get chain ID
     */
    get chainId(): number;
    /**
     * Get block number
     */
    getBlockNumber(): Promise<bigint>;
    /**
     * Get balance of an address
     */
    getBalance(address: `0x${string}`): Promise<bigint>;
}
