/**
 * Muzix SDK Types
 */

import { Address, Hash, PublicClient, WalletClient } from 'viem';

// Chain configuration
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

// Client configuration
export interface MuzixClientConfig {
  chain: ChainConfig;
  publicClient?: PublicClient;
  walletClient?: WalletClient;
}

// MUSD Token
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

// Catalog Token
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
  duration: number; // in seconds
  isrc?: string; // International Standard Recording Code
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

// Royalty
export interface RoyaltySplit {
  recipient: Address;
  percentage: number; // 0-10000 (basis points, 10000 = 100%)
}

export interface RoyaltyPayment {
  catalogId: string;
  recipient: Address;
  amount: bigint;
  timestamp: bigint;
  source: string; // e.g., "spotify", "apple-music"
}

export interface QueryRoyaltySplitsParams {
  catalogId: string;
}

// Streaming
export interface StreamEvent {
  catalogId: string;
  listener: Address;
  timestamp: bigint;
  duration: number; // seconds listened
  source: string; // platform name
}

export interface SubmitStreamingDataParams {
  catalogId: string;
  streams: StreamEvent[];
}

// Contract ABIs (simplified - will be updated with actual contract ABIs)
export interface ContractABIs {
  musd: any;
  catalog: any;
  royalty: any;
  streaming: any;
}

// Transaction result
export interface TransactionResult {
  hash: Hash;
  wait: () => Promise<{
    success: boolean;
    blockNumber?: bigint;
    gasUsed?: bigint;
  }>;
}

// SDK Error
export class MuzixSDKError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MuzixSDKError';
  }
}
