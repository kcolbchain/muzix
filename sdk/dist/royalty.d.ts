/**
 * Royalty Module - Royalty split operations
 *
 * Handle royalty splits, payments, and claims for catalog tokens.
 */
import { Address } from 'viem';
import { MuzixClient } from './client';
import { RoyaltySplit, RoyaltyPayment, QueryRoyaltySplitsParams } from './types';
/**
 * Default Royalty contract configuration
 */
export declare const DEFAULT_ROYALTY_ADDRESS: Address;
/**
 * Royalty operations
 */
export declare class Royalty {
    private client;
    private contractAddress;
    constructor(client: MuzixClient, contractAddress?: Address);
    /**
     * Get contract address
     */
    get address(): Address;
    /**
     * Query royalty splits for a catalog
     */
    getRoyaltySplits(params: QueryRoyaltySplitsParams): Promise<RoyaltySplit[]>;
    /**
     * Get unclaimed royalty for a recipient
     */
    getUnclaimedRoyalty(catalogId: string, recipient: Address): Promise<bigint>;
    /**
     * Get total distributed royalty for a catalog
     */
    getTotalDistributed(catalogId: string): Promise<bigint>;
    /**
     * Calculate royalty distribution
     */
    calculateDistribution(catalogId: string, totalAmount: bigint): Promise<Map<Address, bigint>>;
    /**
     * Distribute royalty for a catalog
     * Requires wallet connection
     */
    distributeRoyalty(catalogId: string, amount: bigint): Promise<{
        hash: any;
        wait: () => Promise<{
            success: boolean;
            blockNumber: bigint;
            gasUsed: bigint;
        }>;
    }>;
    /**
     * Claim royalty for a catalog
     * Requires wallet connection
     */
    claimRoyalty(catalogId: string): Promise<{
        hash: any;
        wait: () => Promise<{
            success: boolean;
            blockNumber: bigint;
            gasUsed: bigint;
        }>;
    }>;
    /**
     * Get royalty payment history
     * Note: This would typically query events from the blockchain
     */
    getRoyaltyHistory(catalogId: string): Promise<RoyaltyPayment[]>;
    /**
     * Validate royalty splits
     */
    validateSplits(splits: RoyaltySplit[]): {
        valid: boolean;
        errors: string[];
    };
}
