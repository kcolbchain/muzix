/**
 * Royalty Module - Royalty split operations
 * 
 * Handle royalty splits, payments, and claims for catalog tokens.
 */

import { Address, parseAbi } from 'viem';
import { MuzixClient } from './client';
import {
  RoyaltySplit,
  RoyaltyPayment,
  QueryRoyaltySplitsParams,
  MuzixSDKError,
} from './types';

// Royalty Contract ABI (simplified - replace with actual contract ABI)
const ROYALTY_ABI = parseAbi([
  'function getSplits(uint256 catalogId) view returns (address[] recipients, uint256[] percentages)',
  'function distributeRoyalty(uint256 catalogId, uint256 amount)',
  'function claimRoyalty(uint256 catalogId)',
  'function getUnclaimedRoyalty(uint256 catalogId, address recipient) view returns (uint256)',
  'function getTotalDistributed(uint256 catalogId) view returns (uint256)',
  'event RoyaltyDistributed(uint256 indexed catalogId, uint256 amount, uint256 timestamp)',
  'event RoyaltyClaimed(uint256 indexed catalogId, address indexed recipient, uint256 amount)',
]);

/**
 * Default Royalty contract configuration
 */
export const DEFAULT_ROYALTY_ADDRESS: Address = '0x0000000000000000000000000000000000000000'; // Replace with actual address

/**
 * Royalty operations
 */
export class Royalty {
  private client: MuzixClient;
  private contractAddress: Address;

  constructor(client: MuzixClient, contractAddress: Address = DEFAULT_ROYALTY_ADDRESS) {
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
   * Query royalty splits for a catalog
   */
  async getRoyaltySplits(params: QueryRoyaltySplitsParams): Promise<RoyaltySplit[]> {
    try {
      const result = await this.client.publicClient.readContract({
        address: this.contractAddress,
        abi: ROYALTY_ABI,
        functionName: 'getSplits',
        args: [BigInt(params.catalogId)],
      });

      // Parse result (parallel arrays)
      const [recipients, percentages] = result as unknown as [Address[], bigint[]];
      
      return recipients.map((recipient, index) => ({
        recipient,
        percentage: Number(percentages[index]),
      }));
    } catch (error) {
      throw new MuzixSDKError(
        `Failed to get royalty splits for catalog ${params.catalogId}`,
        'GET_SPLITS_ERROR',
        error
      );
    }
  }

  /**
   * Get unclaimed royalty for a recipient
   */
  async getUnclaimedRoyalty(catalogId: string, recipient: Address): Promise<bigint> {
    try {
      return this.client.publicClient.readContract({
        address: this.contractAddress,
        abi: ROYALTY_ABI,
        functionName: 'getUnclaimedRoyalty',
        args: [BigInt(catalogId), recipient],
      }) as Promise<bigint>;
    } catch (error) {
      throw new MuzixSDKError(
        'Failed to get unclaimed royalty',
        'GET_UNCLAIMED_ERROR',
        error
      );
    }
  }

  /**
   * Get total distributed royalty for a catalog
   */
  async getTotalDistributed(catalogId: string): Promise<bigint> {
    try {
      return this.client.publicClient.readContract({
        address: this.contractAddress,
        abi: ROYALTY_ABI,
        functionName: 'getTotalDistributed',
        args: [BigInt(catalogId)],
      }) as Promise<bigint>;
    } catch (error) {
      throw new MuzixSDKError(
        'Failed to get total distributed royalty',
        'GET_TOTAL_DISTRIBUTED_ERROR',
        error
      );
    }
  }

  /**
   * Calculate royalty distribution
   */
  async calculateDistribution(catalogId: string, totalAmount: bigint): Promise<Map<Address, bigint>> {
    const splits = await this.getRoyaltySplits({ catalogId });
    
    const distribution = new Map<Address, bigint>();
    let totalPercentage = 0;

    for (const split of splits) {
      totalPercentage += split.percentage;
      const amount = (totalAmount * BigInt(split.percentage)) / BigInt(10000);
      distribution.set(split.recipient, amount);
    }

    // Verify total percentage is 10000 (100%)
    if (totalPercentage !== 10000) {
      console.warn(`Royalty splits total ${totalPercentage} basis points (expected 10000)`);
    }

    return distribution;
  }

  /**
   * Distribute royalty for a catalog
   * Requires wallet connection
   */
  async distributeRoyalty(catalogId: string, amount: bigint) {
    if (!this.client.walletClient) {
      throw new MuzixSDKError(
        'Wallet not connected. Connect wallet to distribute royalty.',
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
        abi: ROYALTY_ABI,
        functionName: 'distributeRoyalty',
        args: [BigInt(catalogId), amount],
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
        'Failed to distribute royalty',
        'DISTRIBUTE_ERROR',
        error
      );
    }
  }

  /**
   * Claim royalty for a catalog
   * Requires wallet connection
   */
  async claimRoyalty(catalogId: string) {
    if (!this.client.walletClient) {
      throw new MuzixSDKError(
        'Wallet not connected. Connect wallet to claim royalty.',
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
        abi: ROYALTY_ABI,
        functionName: 'claimRoyalty',
        args: [BigInt(catalogId)],
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
        'Failed to claim royalty',
        'CLAIM_ERROR',
        error
      );
    }
  }

  /**
   * Get royalty payment history
   * Note: This would typically query events from the blockchain
   */
  async getRoyaltyHistory(catalogId: string): Promise<RoyaltyPayment[]> {
    // In production, this would query event logs
    // For now, return empty array
    return [];
  }

  /**
   * Validate royalty splits
   */
  validateSplits(splits: RoyaltySplit[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    let totalPercentage = 0;

    for (const split of splits) {
      if (split.percentage < 0 || split.percentage > 10000) {
        errors.push(`Invalid percentage for ${split.recipient}: ${split.percentage}`);
      }
      totalPercentage += split.percentage;
    }

    if (totalPercentage !== 10000) {
      errors.push(`Total percentage must be 10000 (100%), got ${totalPercentage}`);
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
