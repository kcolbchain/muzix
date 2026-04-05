/**
 * Streaming Module - Streaming data operations
 *
 * Submit and query streaming data for royalty calculations.
 */
import { Address } from 'viem';
import { MuzixClient } from './client';
import { StreamEvent, SubmitStreamingDataParams } from './types';
/**
 * Default Streaming contract configuration
 */
export declare const DEFAULT_STREAMING_ADDRESS: Address;
/**
 * Streaming operations
 */
export declare class Streaming {
    private client;
    private contractAddress;
    constructor(client: MuzixClient, contractAddress?: Address);
    /**
     * Get contract address
     */
    get address(): Address;
    /**
     * Submit a single stream event
     * Requires wallet connection
     */
    submitStream(stream: StreamEvent): Promise<{
        hash: any;
        wait: () => Promise<{
            success: boolean;
            blockNumber: bigint;
            gasUsed: bigint;
        }>;
    }>;
    /**
     * Submit batch streaming data
     * More efficient for multiple streams
     * Requires wallet connection
     */
    submitBatchStreams(params: SubmitStreamingDataParams): Promise<{
        hash: any;
        wait: () => Promise<{
            success: boolean;
            blockNumber: bigint;
            gasUsed: bigint;
        }>;
    }>;
    /**
     * Get stream count for a catalog
     */
    getStreamCount(catalogId: string): Promise<bigint>;
    /**
     * Get streams for a catalog with pagination
     */
    getStreamsByCatalog(catalogId: string, offset?: number, limit?: number): Promise<StreamEvent[]>;
    /**
     * Get total stream duration for a catalog
     */
    getTotalStreamDuration(catalogId: string): Promise<bigint>;
    /**
     * Calculate estimated royalty from streaming data
     */
    calculateEstimatedRoyalty(streamCount: number, totalDuration: number, ratePerStream: bigint): bigint;
    /**
     * Create a stream event object
     */
    createStreamEvent(catalogId: string, listener: Address, duration: number, source: string): StreamEvent;
    /**
     * Validate stream event
     */
    validateStreamEvent(stream: StreamEvent): {
        valid: boolean;
        errors: string[];
    };
}
