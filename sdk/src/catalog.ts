/**
 * Catalog Module - Catalog token operations
 * 
 * Catalog tokens represent music IP on-chain. Each token represents
 * a song, album, or catalog with embedded royalty split logic.
 */

import { Address, parseAbi } from 'viem';
import { MuzixClient } from './client';
import {
  CatalogToken,
  CatalogMetadata,
  CreateCatalogParams,
  RoyaltySplit,
  TransactionResult,
  MuzixSDKError,
} from './types';

// Catalog Contract ABI (simplified - replace with actual contract ABI)
const CATALOG_ABI = parseAbi([
  'function createCatalog(string name, string artist, string metadataURI, address[] recipients, uint256[] percentages) returns (uint256)',
  'function getCatalog(uint256 tokenId) view returns (string name, string artist, string metadataURI, address owner, uint256 createdAt)',
  'function getRoyaltySplits(uint256 tokenId) view returns (address[] recipients, uint256[] percentages)',
  'function transferFrom(address from, address to, uint256 tokenId)',
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function totalSupply() view returns (uint256)',
  'event CatalogCreated(uint256 indexed tokenId, string name, string artist, address indexed owner)',
]);

/**
 * Default Catalog contract configuration
 */
export const DEFAULT_CATALOG_ADDRESS: Address = '0x0000000000000000000000000000000000000000'; // Replace with actual address

/**
 * Catalog token operations
 */
export class Catalog {
  private client: MuzixClient;
  private contractAddress: Address;

  constructor(client: MuzixClient, contractAddress: Address = DEFAULT_CATALOG_ADDRESS) {
    this.client = client;
    this.contractAddress = contractAddress;
  }

  /**
   * Get contract address
   */
  get address(): Address {
    return this.contractAddress;
  }

  /**
   * Create a new catalog token
   */
  async createCatalog(params: CreateCatalogParams): Promise<TransactionResult & { catalogId?: string }> {
    if (!this.client.walletClient) {
      throw new MuzixSDKError(
        'Wallet not connected. Connect wallet to create catalog.',
        'WALLET_NOT_CONNECTED'
      );
    }

    try {
      const account = await this.client.getWalletAddress();
      if (!account) {
        throw new MuzixSDKError('No wallet account found', 'NO_ACCOUNT');
      }

      // Convert metadata to URI (in production, this would upload to IPFS or similar)
      const metadataURI = this.metadataToURI(params.metadata);

      // Convert royalty splits to contract format (parallel arrays)
      const recipients = params.royaltySplits.map(split => split.recipient);
      const percentages = params.royaltySplits.map(split => BigInt(split.percentage));

      const hash = await (this.client.walletClient as any).writeContract({
        address: this.contractAddress,
        abi: CATALOG_ABI,
        functionName: 'createCatalog',
        args: [params.name, params.artist, metadataURI, recipients, percentages],
        account,
        chain: null,
      });

      return {
        hash,
        wait: async () => {
          const receipt = await this.client.publicClient.waitForTransactionReceipt({ hash });
          
          // Extract catalog ID from event logs (simplified)
          const catalogId = this.extractCatalogIdFromReceipt(receipt);
          
          return {
            success: receipt.status === 'success',
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed,
          };
        },
        catalogId: undefined, // Will be populated after transaction confirms
      };
    } catch (error) {
      throw new MuzixSDKError(
        'Failed to create catalog',
        'CREATE_CATALOG_ERROR',
        error
      );
    }
  }

  /**
   * Get catalog token by ID
   */
  async getCatalog(catalogId: string): Promise<CatalogToken> {
    try {
      const result = await this.client.publicClient.readContract({
        address: this.contractAddress,
        abi: CATALOG_ABI,
        functionName: 'getCatalog',
        args: [BigInt(catalogId)],
      });

      // Parse result tuple
      const resultArray = result as unknown as [string, string, string, Address, bigint];
      const [name, artist, metadataURI, owner, createdAt] = resultArray;

      return {
        id: catalogId,
        name,
        artist,
        metadata: this.parseMetadataURI(metadataURI),
        owner,
        createdAt: BigInt(createdAt as any),
      };
    } catch (error) {
      throw new MuzixSDKError(
        `Failed to get catalog ${catalogId}`,
        'GET_CATALOG_ERROR',
        error
      );
    }
  }

  /**
   * Get total supply of catalog tokens
   */
  async getTotalSupply(): Promise<bigint> {
    return this.client.publicClient.readContract({
      address: this.contractAddress,
      abi: CATALOG_ABI,
      functionName: 'totalSupply',
    }) as Promise<bigint>;
  }

  /**
   * Get owner of a catalog token
   */
  async getOwner(catalogId: string): Promise<Address> {
    return this.client.publicClient.readContract({
      address: this.contractAddress,
      abi: CATALOG_ABI,
      functionName: 'ownerOf',
      args: [BigInt(catalogId)],
    }) as Promise<Address>;
  }

  /**
   * Transfer catalog token
   */
  async transfer(to: Address, catalogId: string): Promise<TransactionResult> {
    if (!this.client.walletClient) {
      throw new MuzixSDKError(
        'Wallet not connected. Connect wallet to transfer catalog.',
        'WALLET_NOT_CONNECTED'
      );
    }

    try {
      const account = await this.client.getWalletAddress();
      if (!account) {
        throw new MuzixSDKError('No wallet account found', 'NO_ACCOUNT');
      }

      const hash = await (this.client.walletClient as any).writeContract({
        address: this.contractAddress,
        abi: CATALOG_ABI,
        functionName: 'transferFrom',
        args: [account, to, BigInt(catalogId)],
        account,
        chain: null,
      });

      return {
        hash,
        wait: async () => {
          const receipt = await this.client.publicClient.waitForTransactionReceipt({ hash });
          return {
            success: receipt.status === 'success',
            blockNumber: receipt.blockNumber,
            gasUsed: receipt.gasUsed,
          };
        },
      };
    } catch (error) {
      throw new MuzixSDKError(
        'Failed to transfer catalog',
        'TRANSFER_CATALOG_ERROR',
        error
      );
    }
  }

  /**
   * Convert metadata to URI
   * In production, this would upload to IPFS or similar
   */
  private metadataToURI(metadata: CatalogMetadata): string {
    // Placeholder implementation
    // In production: upload to IPFS, Arweave, or centralized storage
    const metadataJSON = JSON.stringify(metadata);
    return `data:application/json;base64,${Buffer.from(metadataJSON).toString('base64')}`;
  }

  /**
   * Parse metadata URI
   */
  private parseMetadataURI(uri: string): CatalogMetadata {
    try {
      if (uri.startsWith('data:application/json;base64,')) {
        const base64 = uri.replace('data:application/json;base64,', '');
        const json = Buffer.from(base64, 'base64').toString('utf-8');
        return JSON.parse(json);
      }
      // For IPFS or HTTP URIs, fetch in production
      return {} as CatalogMetadata;
    } catch {
      return {} as CatalogMetadata;
    }
  }

  /**
   * Extract catalog ID from transaction receipt
   */
  private extractCatalogIdFromReceipt(receipt: any): string | undefined {
    // Parse event logs to extract catalog ID
    // This is a simplified implementation
    return undefined;
  }
}
