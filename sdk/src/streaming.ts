/**
 * Streaming Module - Streaming data operations
 * 
 * Submit and query streaming data for royalty calculations.
 */

import { Address, parseAbi } from 'viem';
import { MuzixClient } from './client';
import {
  StreamEvent,
  SubmitStreamingDataParams,
  MuzixSDKError,
} from './types';

// Streaming Contract ABI (simplified - replace with actual contract ABI)
const STREAMING_ABI = parseAbi([
  'function submitStream(uint256 catalogId, address listener, uint256 duration, string source)',
  'function submitBatchStreams(uint256[] catalogIds, address[] listeners, uint256[] durations, string[] sources)',
  'function getStreamCount(uint256 catalogId) view returns (uint256)',
  'function getStreamsByCatalog(uint256 catalogId, uint256 offset, uint256 limit) view returns (uint256[] catalogIds, address[] listeners, uint256[] timestamps, uint256[] durations, string[] sources)',
  'function getTotalStreamDuration(uint256 catalogId) view returns (uint256)',
  'event StreamSubmitted(uint256 indexed catalogId, address indexed listener, uint256 duration, string source, uint256 timestamp)',
]);

/**
 * Default Streaming contract configuration
 */
export const DEFAULT_STREAMING_ADDRESS: Address = '0x0000000000000000000000000000000000000000'; // Replace with actual address

/**
 * Streaming operations
 */
export class Streaming {
  private client: MuzixClient;
  private contractAddress: Address;

  constructor(client: MuzixClient, contractAddress: Address = DEFAULT_STREAMING_ADDRESS) {
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
   * Submit a single stream event
   * Requires wallet connection
   */
  async submitStream(stream: StreamEvent) {
    if (!this.client.walletClient) {
      throw new MuzixSDKError(
        'Wallet not connected. Connect wallet to submit stream data.',
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
        abi: STREAMING_ABI,
        functionName: 'submitStream',
        args: [
          BigInt(stream.catalogId),
          stream.listener,
          BigInt(stream.duration),
          stream.source,
        ],
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
        'Failed to submit stream',
        'SUBMIT_STREAM_ERROR',
        error
      );
    }
  }

  /**
   * Submit batch streaming data
   * More efficient for multiple streams
   * Requires wallet connection
   */
  async submitBatchStreams(params: SubmitStreamingDataParams) {
    if (!this.client.walletClient) {
      throw new MuzixSDKError(
        'Wallet not connected. Connect wallet to submit streaming data.',
        'WALLET_NOT_CONNECTED'
      );
    }

    try {
      const account = await this.client.getWalletAddress();
      if (!account) {
        throw new MuzixSDKError('No wallet account found', 'NO_ACCOUNT');
      }

      // Convert streams to contract format (parallel arrays)
      const catalogIds = params.streams.map(s => BigInt(s.catalogId));
      const listeners = params.streams.map(s => s.listener);
      const durations = params.streams.map(s => BigInt(s.duration));
      const sources = params.streams.map(s => s.source);

      const hash = await (this.client.walletClient as any).writeContract({
        address: this.contractAddress,
        abi: STREAMING_ABI,
        functionName: 'submitBatchStreams',
        args: [catalogIds, listeners, durations, sources],
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
        'Failed to submit batch streams',
        'SUBMIT_BATCH_ERROR',
        error
      );
    }
  }

  /**
   * Get stream count for a catalog
   */
  async getStreamCount(catalogId: string): Promise<bigint> {
    try {
      return this.client.publicClient.readContract({
        address: this.contractAddress,
        abi: STREAMING_ABI,
        functionName: 'getStreamCount',
        args: [BigInt(catalogId)],
      }) as Promise<bigint>;
    } catch (error) {
      throw new MuzixSDKError(
        'Failed to get stream count',
        'GET_STREAM_COUNT_ERROR',
        error
      );
    }
  }

  /**
   * Get streams for a catalog with pagination
   */
  async getStreamsByCatalog(
    catalogId: string,
    offset: number = 0,
    limit: number = 100
  ): Promise<StreamEvent[]> {
    try {
      const result = await this.client.publicClient.readContract({
        address: this.contractAddress,
        abi: STREAMING_ABI,
        functionName: 'getStreamsByCatalog',
        args: [BigInt(catalogId), BigInt(offset), BigInt(limit)],
      });

      // Parse result (parallel arrays)
      const [catalogIds, listeners, timestamps, durations, sources] = result as unknown as [bigint[], Address[], bigint[], bigint[], string[]];

      return catalogIds.map((catalogId, index) => ({
        catalogId: catalogId.toString(),
        listener: listeners[index],
        timestamp: timestamps[index],
        duration: Number(durations[index]),
        source: sources[index],
      }));
    } catch (error) {
      throw new MuzixSDKError(
        'Failed to get streams by catalog',
        'GET_STREAMS_ERROR',
        error
      );
    }
  }

  /**
   * Get total stream duration for a catalog
   */
  async getTotalStreamDuration(catalogId: string): Promise<bigint> {
    try {
      return this.client.publicClient.readContract({
        address: this.contractAddress,
        abi: STREAMING_ABI,
        functionName: 'getTotalStreamDuration',
        args: [BigInt(catalogId)],
      }) as Promise<bigint>;
    } catch (error) {
      throw new MuzixSDKError(
        'Failed to get total stream duration',
        'GET_TOTAL_DURATION_ERROR',
        error
      );
    }
  }

  /**
   * Calculate estimated royalty from streaming data
   */
  calculateEstimatedRoyalty(
    streamCount: number,
    totalDuration: number,
    ratePerStream: bigint
  ): bigint {
    return BigInt(streamCount) * ratePerStream;
  }

  /**
   * Create a stream event object
   */
  createStreamEvent(
    catalogId: string,
    listener: Address,
    duration: number,
    source: string
  ): StreamEvent {
    return {
      catalogId,
      listener,
      timestamp: BigInt(Math.floor(Date.now() / 1000)),
      duration,
      source,
    };
  }

  /**
   * Validate stream event
   */
  validateStreamEvent(stream: StreamEvent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!stream.catalogId || stream.catalogId === '0') {
      errors.push('Invalid catalog ID');
    }

    if (!stream.listener || stream.listener === '0x0000000000000000000000000000000000000000') {
      errors.push('Invalid listener address');
    }

    if (stream.duration <= 0) {
      errors.push('Duration must be greater than 0');
    }

    if (!stream.source || stream.source.trim() === '') {
      errors.push('Source is required');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
