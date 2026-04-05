/**
 * Catalog Module - Catalog token operations
 *
 * Catalog tokens represent music IP on-chain. Each token represents
 * a song, album, or catalog with embedded royalty split logic.
 */
import { Address } from 'viem';
import { MuzixClient } from './client';
import { CatalogToken, CreateCatalogParams, TransactionResult } from './types';
/**
 * Default Catalog contract configuration
 */
export declare const DEFAULT_CATALOG_ADDRESS: Address;
/**
 * Catalog token operations
 */
export declare class Catalog {
    private client;
    private contractAddress;
    constructor(client: MuzixClient, contractAddress?: Address);
    /**
     * Get contract address
     */
    get address(): Address;
    /**
     * Create a new catalog token
     */
    createCatalog(params: CreateCatalogParams): Promise<TransactionResult & {
        catalogId?: string;
    }>;
    /**
     * Get catalog token by ID
     */
    getCatalog(catalogId: string): Promise<CatalogToken>;
    /**
     * Get total supply of catalog tokens
     */
    getTotalSupply(): Promise<bigint>;
    /**
     * Get owner of a catalog token
     */
    getOwner(catalogId: string): Promise<Address>;
    /**
     * Transfer catalog token
     */
    transfer(to: Address, catalogId: string): Promise<TransactionResult>;
    /**
     * Convert metadata to URI
     * In production, this would upload to IPFS or similar
     */
    private metadataToURI;
    /**
     * Parse metadata URI
     */
    private parseMetadataURI;
    /**
     * Extract catalog ID from transaction receipt
     */
    private extractCatalogIdFromReceipt;
}
