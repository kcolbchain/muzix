/**
 * Muzix SDK Types
 */
import { Address, Hash, PublicClient, WalletClient } from 'viem';
export interface ChainConfig {
    id: number;
    name: string;
    rpcUrl: string;
    nativeCurrency: {
        name: string;
        symbol: string;
        decimals: number;
    };
}
export interface MuzixClientConfig {
    chain: ChainConfig;
    publicClient?: PublicClient;
    walletClient?: WalletClient;
}
export interface MUSDConfig {
    address: Address;
    decimals: number;
    symbol: string;
    name: string;
}
export interface MintMUSDParams {
    to: Address;
    amount: bigint;
}
export interface BurnMUSDParams {
    from: Address;
    amount: bigint;
}
export interface CatalogToken {
    id: string;
    name: string;
    artist: string;
    metadata: CatalogMetadata;
    owner: Address;
    createdAt: bigint;
}
export interface CatalogMetadata {
    title: string;
    artist: string;
    album?: string;
    duration: number;
    isrc?: string;
    releaseDate?: string;
    genre?: string;
    imageUrl?: string;
    audioUrl?: string;
}
export interface CreateCatalogParams {
    name: string;
    artist: string;
    metadata: CatalogMetadata;
    royaltySplits: RoyaltySplit[];
}
export interface RoyaltySplit {
    recipient: Address;
    percentage: number;
}
export interface RoyaltyPayment {
    catalogId: string;
    recipient: Address;
    amount: bigint;
    timestamp: bigint;
    source: string;
}
export interface QueryRoyaltySplitsParams {
    catalogId: string;
}
export interface StreamEvent {
    catalogId: string;
    listener: Address;
    timestamp: bigint;
    duration: number;
    source: string;
}
export interface SubmitStreamingDataParams {
    catalogId: string;
    streams: StreamEvent[];
}
export interface ContractABIs {
    musd: any;
    catalog: any;
    royalty: any;
    streaming: any;
}
export interface TransactionResult {
    hash: Hash;
    wait: () => Promise<{
        success: boolean;
        blockNumber?: bigint;
        gasUsed?: bigint;
    }>;
}
export declare class MuzixSDKError extends Error {
    code: string;
    details?: any | undefined;
    constructor(message: string, code: string, details?: any | undefined);
}
