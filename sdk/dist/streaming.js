"use strict";
/**
 * Streaming Module - Streaming data operations
 *
 * Submit and query streaming data for royalty calculations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Streaming = exports.DEFAULT_STREAMING_ADDRESS = void 0;
const viem_1 = require("viem");
const types_1 = require("./types");
// Streaming Contract ABI (simplified - replace with actual contract ABI)
const STREAMING_ABI = (0, viem_1.parseAbi)([
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
exports.DEFAULT_STREAMING_ADDRESS = '0x0000000000000000000000000000000000000000'; // Replace with actual address
/**
 * Streaming operations
 */
class Streaming {
    constructor(client, contractAddress = exports.DEFAULT_STREAMING_ADDRESS) {
        this.client = client;
        this.contractAddress = contractAddress;
    }
    /**
     * Get contract address
     */
    get address() {
        return this.contractAddress;
    }
    /**
     * Submit a single stream event
     * Requires wallet connection
     */
    async submitStream(stream) {
        if (!this.client.walletClient) {
            throw new types_1.MuzixSDKError('Wallet not connected. Connect wallet to submit stream data.', 'WALLET_NOT_CONNECTED');
        }
        try {
            const account = await this.client.getWalletAddress();
            if (!account) {
                throw new types_1.MuzixSDKError('No wallet account found', 'NO_ACCOUNT');
            }
            const hash = await this.client.walletClient.writeContract({
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
        }
        catch (error) {
            throw new types_1.MuzixSDKError('Failed to submit stream', 'SUBMIT_STREAM_ERROR', error);
        }
    }
    /**
     * Submit batch streaming data
     * More efficient for multiple streams
     * Requires wallet connection
     */
    async submitBatchStreams(params) {
        if (!this.client.walletClient) {
            throw new types_1.MuzixSDKError('Wallet not connected. Connect wallet to submit streaming data.', 'WALLET_NOT_CONNECTED');
        }
        try {
            const account = await this.client.getWalletAddress();
            if (!account) {
                throw new types_1.MuzixSDKError('No wallet account found', 'NO_ACCOUNT');
            }
            // Convert streams to contract format (parallel arrays)
            const catalogIds = params.streams.map(s => BigInt(s.catalogId));
            const listeners = params.streams.map(s => s.listener);
            const durations = params.streams.map(s => BigInt(s.duration));
            const sources = params.streams.map(s => s.source);
            const hash = await this.client.walletClient.writeContract({
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
        }
        catch (error) {
            throw new types_1.MuzixSDKError('Failed to submit batch streams', 'SUBMIT_BATCH_ERROR', error);
        }
    }
    /**
     * Get stream count for a catalog
     */
    async getStreamCount(catalogId) {
        try {
            return this.client.publicClient.readContract({
                address: this.contractAddress,
                abi: STREAMING_ABI,
                functionName: 'getStreamCount',
                args: [BigInt(catalogId)],
            });
        }
        catch (error) {
            throw new types_1.MuzixSDKError('Failed to get stream count', 'GET_STREAM_COUNT_ERROR', error);
        }
    }
    /**
     * Get streams for a catalog with pagination
     */
    async getStreamsByCatalog(catalogId, offset = 0, limit = 100) {
        try {
            const result = await this.client.publicClient.readContract({
                address: this.contractAddress,
                abi: STREAMING_ABI,
                functionName: 'getStreamsByCatalog',
                args: [BigInt(catalogId), BigInt(offset), BigInt(limit)],
            });
            // Parse result (parallel arrays)
            const [catalogIds, listeners, timestamps, durations, sources] = result;
            return catalogIds.map((catalogId, index) => ({
                catalogId: catalogId.toString(),
                listener: listeners[index],
                timestamp: timestamps[index],
                duration: Number(durations[index]),
                source: sources[index],
            }));
        }
        catch (error) {
            throw new types_1.MuzixSDKError('Failed to get streams by catalog', 'GET_STREAMS_ERROR', error);
        }
    }
    /**
     * Get total stream duration for a catalog
     */
    async getTotalStreamDuration(catalogId) {
        try {
            return this.client.publicClient.readContract({
                address: this.contractAddress,
                abi: STREAMING_ABI,
                functionName: 'getTotalStreamDuration',
                args: [BigInt(catalogId)],
            });
        }
        catch (error) {
            throw new types_1.MuzixSDKError('Failed to get total stream duration', 'GET_TOTAL_DURATION_ERROR', error);
        }
    }
    /**
     * Calculate estimated royalty from streaming data
     */
    calculateEstimatedRoyalty(streamCount, totalDuration, ratePerStream) {
        return BigInt(streamCount) * ratePerStream;
    }
    /**
     * Create a stream event object
     */
    createStreamEvent(catalogId, listener, duration, source) {
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
    validateStreamEvent(stream) {
        const errors = [];
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
exports.Streaming = Streaming;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3RyZWFtaW5nLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL3N0cmVhbWluZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7O0FBRUgsK0JBQXlDO0FBRXpDLG1DQUlpQjtBQUVqQix5RUFBeUU7QUFDekUsTUFBTSxhQUFhLEdBQUcsSUFBQSxlQUFRLEVBQUM7SUFDN0IsNkZBQTZGO0lBQzdGLCtHQUErRztJQUMvRyxtRUFBbUU7SUFDbkUsc01BQXNNO0lBQ3RNLDJFQUEyRTtJQUMzRSxnSUFBZ0k7Q0FDakksQ0FBQyxDQUFDO0FBRUg7O0dBRUc7QUFDVSxRQUFBLHlCQUF5QixHQUFZLDRDQUE0QyxDQUFDLENBQUMsOEJBQThCO0FBRTlIOztHQUVHO0FBQ0gsTUFBYSxTQUFTO0lBSXBCLFlBQVksTUFBbUIsRUFBRSxrQkFBMkIsaUNBQXlCO1FBQ25GLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDO0lBQ3pDLENBQUM7SUFFRDs7T0FFRztJQUNILElBQUksT0FBTztRQUNULE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQztJQUM5QixDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLFlBQVksQ0FBQyxNQUFtQjtRQUNwQyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUM5QixNQUFNLElBQUkscUJBQWEsQ0FDckIsNkRBQTZELEVBQzdELHNCQUFzQixDQUN2QixDQUFDO1FBQ0osQ0FBQztRQUVELElBQUksQ0FBQztZQUNILE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3JELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDYixNQUFNLElBQUkscUJBQWEsQ0FBQyx5QkFBeUIsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUNuRSxDQUFDO1lB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TUFBTSxDQUFDLElBQUksQ0FBQyxpQ0FBaUMsQ0FBQyxDQUFDO1FBQ2pELENBQUM7UUFFRCxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sSUFBSSxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQ2xELE1BQU0sQ0FBQyxJQUFJLENBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUNwQyxDQUFDO1FBRUQsT0FBTztZQUNMLEtBQUssRUFBRSxNQUFNLENBQUMsTUFBTSxLQUFLLENBQUM7WUFDMUIsTUFBTTtTQUNQLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUE3UEQsOEJBNlBDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBTdHJlYW1pbmcgTW9kdWxlIC0gU3RyZWFtaW5nIGRhdGEgb3BlcmF0aW9uc1xuICogXG4gKiBTdWJtaXQgYW5kIHF1ZXJ5IHN0cmVhbWluZyBkYXRhIGZvciByb3lhbHR5IGNhbGN1bGF0aW9ucy5cbiAqL1xuXG5pbXBvcnQgeyBBZGRyZXNzLCBwYXJzZUFiaSB9IGZyb20gJ3ZpZW0nO1xuaW1wb3J0IHsgTXV6aXhDbGllbnQgfSBmcm9tICcuL2NsaWVudCc7XG5pbXBvcnQge1xuICBTdHJlYW1FdmVudCxcbiAgU3VibWl0U3RyZWFtaW5nRGF0YVBhcmFtcyxcbiAgTXV6aXhTREtFcnJvcixcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8vIFN0cmVhbWluZyBDb250cmFjdCBBQkkgKHNpbXBsaWZpZWQgLSByZXBsYWNlIHdpdGggYWN0dWFsIGNvbnRyYWN0IEFCSSlcbmNvbnN0IFNUUkVBTUlOR19BQkkgPSBwYXJzZUFiaShbXG4gICdmdW5jdGlvbiBzdWJtaXRTdHJlYW0odWludDI1NiBjYXRhbG9nSWQsIGFkZHJlc3MgbGlzdGVuZXIsIHVpbnQyNTYgZHVyYXRpb24sIHN0cmluZyBzb3VyY2UpJyxcbiAgJ2Z1bmN0aW9uIHN1Ym1pdEJhdGNoU3RyZWFtcyh1aW50MjU2W10gY2F0YWxvZ0lkcywgYWRkcmVzc1tdIGxpc3RlbmVycywgdWludDI1NltdIGR1cmF0aW9ucywgc3RyaW5nW10gc291cmNlcyknLFxuICAnZnVuY3Rpb24gZ2V0U3RyZWFtQ291bnQodWludDI1NiBjYXRhbG9nSWQpIHZpZXcgcmV0dXJucyAodWludDI1NiknLFxuICAnZnVuY3Rpb24gZ2V0U3RyZWFtc0J5Q2F0YWxvZyh1aW50MjU2IGNhdGFsb2dJZCwgdWludDI1NiBvZmZzZXQsIHVpbnQyNTYgbGltaXQpIHZpZXcgcmV0dXJucyAodWludDI1NltdIGNhdGFsb2dJZHMsIGFkZHJlc3NbXSBsaXN0ZW5lcnMsIHVpbnQyNTZbXSB0aW1lc3RhbXBzLCB1aW50MjU2W10gZHVyYXRpb25zLCBzdHJpbmdbXSBzb3VyY2VzKScsXG4gICdmdW5jdGlvbiBnZXRUb3RhbFN0cmVhbUR1cmF0aW9uKHVpbnQyNTYgY2F0YWxvZ0lkKSB2aWV3IHJldHVybnMgKHVpbnQyNTYpJyxcbiAgJ2V2ZW50IFN0cmVhbVN1Ym1pdHRlZCh1aW50MjU2IGluZGV4ZWQgY2F0YWxvZ0lkLCBhZGRyZXNzIGluZGV4ZWQgbGlzdGVuZXIsIHVpbnQyNTYgZHVyYXRpb24sIHN0cmluZyBzb3VyY2UsIHVpbnQyNTYgdGltZXN0YW1wKScsXG5dKTtcblxuLyoqXG4gKiBEZWZhdWx0IFN0cmVhbWluZyBjb250cmFjdCBjb25maWd1cmF0aW9uXG4gKi9cbmV4cG9ydCBjb25zdCBERUZBVUxUX1NUUkVBTUlOR19BRERSRVNTOiBBZGRyZXNzID0gJzB4MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMCc7IC8vIFJlcGxhY2Ugd2l0aCBhY3R1YWwgYWRkcmVzc1xuXG4vKipcbiAqIFN0cmVhbWluZyBvcGVyYXRpb25zXG4gKi9cbmV4cG9ydCBjbGFzcyBTdHJlYW1pbmcge1xuICBwcml2YXRlIGNsaWVudDogTXV6aXhDbGllbnQ7XG4gIHByaXZhdGUgY29udHJhY3RBZGRyZXNzOiBBZGRyZXNzO1xuXG4gIGNvbnN0cnVjdG9yKGNsaWVudDogTXV6aXhDbGllbnQsIGNvbnRyYWN0QWRkcmVzczogQWRkcmVzcyA9IERFRkFVTFRfU1RSRUFNSU5HX0FERFJFU1MpIHtcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcbiAgICB0aGlzLmNvbnRyYWN0QWRkcmVzcyA9IGNvbnRyYWN0QWRkcmVzcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgY29udHJhY3QgYWRkcmVzc1xuICAgKi9cbiAgZ2V0IGFkZHJlc3MoKTogQWRkcmVzcyB7XG4gICAgcmV0dXJuIHRoaXMuY29udHJhY3RBZGRyZXNzO1xuICB9XG5cbiAgLyoqXG4gICAqIFN1Ym1pdCBhIHNpbmdsZSBzdHJlYW0gZXZlbnRcbiAgICogUmVxdWlyZXMgd2FsbGV0IGNvbm5lY3Rpb25cbiAgICovXG4gIGFzeW5jIHN1Ym1pdFN0cmVhbShzdHJlYW06IFN0cmVhbUV2ZW50KSB7XG4gICAgaWYgKCF0aGlzLmNsaWVudC53YWxsZXRDbGllbnQpIHtcbiAgICAgIHRocm93IG5ldyBNdXppeFNES0Vycm9yKFxuICAgICAgICAnV2FsbGV0IG5vdCBjb25uZWN0ZWQuIENvbm5lY3Qgd2FsbGV0IHRvIHN1Ym1pdCBzdHJlYW0gZGF0YS4nLFxuICAgICAgICAnV0FMTEVUX05PVF9DT05ORUNURUQnXG4gICAgICApO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBhY2NvdW50ID0gYXdhaXQgdGhpcy5jbGllbnQuZ2V0V2FsbGV0QWRkcmVzcygpO1xuICAgICAgaWYgKCFhY2NvdW50KSB7XG4gICAgICAgIHRocm93IG5ldyBNdXppeFNES0Vycm9yKCdObyB3YWxsZXQgYWNjb3VudCBmb3VuZCcsICdOT19BQ0NPVU5UJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGhhc2ggPSBhd2FpdCAodGhpcy5jbGllbnQud2FsbGV0Q2xpZW50IGFzIGFueSkud3JpdGVDb250cmFjdCh7XG4gICAgICAgIGFkZHJlc3M6IHRoaXMuY29udHJhY3RBZGRyZXNzLFxuICAgICAgICBhYmk6IFNUUkVBTUlOR19BQkksXG4gICAgICAgIGZ1bmN0aW9uTmFtZTogJ3N1Ym1pdFN0cmVhbScsXG4gICAgICAgIGFyZ3M6IFtcbiAgICAgICAgICBCaWdJbnQoc3RyZWFtLmNhdGFsb2dJZCksXG4gICAgICAgICAgc3RyZWFtLmxpc3RlbmVyLFxuICAgICAgICAgIEJpZ0ludChzdHJlYW0uZHVyYXRpb24pLFxuICAgICAgICAgIHN0cmVhbS5zb3VyY2UsXG4gICAgICAgIF0sXG4gICAgICAgIGFjY291bnQsXG4gICAgICAgIGNoYWluOiBudWxsLFxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGhhc2gsXG4gICAgICAgIHdhaXQ6IGFzeW5jICgpID0+IHtcbiAgICAgICAgICBjb25zdCByZWNlaXB0ID0gYXdhaXQgdGhpcy5jbGllbnQucHVibGljQ2xpZW50LndhaXRGb3JUcmFuc2FjdGlvblJlY2VpcHQoeyBoYXNoIH0pO1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiByZWNlaXB0LnN0YXR1cyA9PT0gJ3N1Y2Nlc3MnLFxuICAgICAgICAgICAgYmxvY2tOdW1iZXI6IHJlY2VpcHQuYmxvY2tOdW1iZXIsXG4gICAgICAgICAgICBnYXNVc2VkOiByZWNlaXB0Lmdhc1VzZWQsXG4gICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRocm93IG5ldyBNdXppeFNES0Vycm9yKFxuICAgICAgICAnRmFpbGVkIHRvIHN1Ym1pdCBzdHJlYW0nLFxuICAgICAgICAnU1VCTUlUX1NUUkVBTV9FUlJPUicsXG4gICAgICAgIGVycm9yXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBTdWJtaXQgYmF0Y2ggc3RyZWFtaW5nIGRhdGFcbiAgICogTW9yZSBlZmZpY2llbnQgZm9yIG11bHRpcGxlIHN0cmVhbXNcbiAgICogUmVxdWlyZXMgd2FsbGV0IGNvbm5lY3Rpb25cbiAgICovXG4gIGFzeW5jIHN1Ym1pdEJhdGNoU3RyZWFtcyhwYXJhbXM6IFN1Ym1pdFN0cmVhbWluZ0RhdGFQYXJhbXMpIHtcbiAgICBpZiAoIXRoaXMuY2xpZW50LndhbGxldENsaWVudCkge1xuICAgICAgdGhyb3cgbmV3IE11eml4U0RLRXJyb3IoXG4gICAgICAgICdXYWxsZXQgbm90IGNvbm5lY3RlZC4gQ29ubmVjdCB3YWxsZXQgdG8gc3VibWl0IHN0cmVhbWluZyBkYXRhLicsXG4gICAgICAgICdXQUxMRVRfTk9UX0NPTk5FQ1RFRCdcbiAgICAgICk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGFjY291bnQgPSBhd2FpdCB0aGlzLmNsaWVudC5nZXRXYWxsZXRBZGRyZXNzKCk7XG4gICAgICBpZiAoIWFjY291bnQpIHtcbiAgICAgICAgdGhyb3cgbmV3IE11eml4U0RLRXJyb3IoJ05vIHdhbGxldCBhY2NvdW50IGZvdW5kJywgJ05PX0FDQ09VTlQnKTtcbiAgICAgIH1cblxuICAgICAgLy8gQ29udmVydCBzdHJlYW1zIHRvIGNvbnRyYWN0IGZvcm1hdCAocGFyYWxsZWwgYXJyYXlzKVxuICAgICAgY29uc3QgY2F0YWxvZ0lkcyA9IHBhcmFtcy5zdHJlYW1zLm1hcChzID0+IEJpZ0ludChzLmNhdGFsb2dJZCkpO1xuICAgICAgY29uc3QgbGlzdGVuZXJzID0gcGFyYW1zLnN0cmVhbXMubWFwKHMgPT4gcy5saXN0ZW5lcik7XG4gICAgICBjb25zdCBkdXJhdGlvbnMgPSBwYXJhbXMuc3RyZWFtcy5tYXAocyA9PiBCaWdJbnQocy5kdXJhdGlvbikpO1xuICAgICAgY29uc3Qgc291cmNlcyA9IHBhcmFtcy5zdHJlYW1zLm1hcChzID0+IHMuc291cmNlKTtcblxuICAgICAgY29uc3QgaGFzaCA9IGF3YWl0ICh0aGlzLmNsaWVudC53YWxsZXRDbGllbnQgYXMgYW55KS53cml0ZUNvbnRyYWN0KHtcbiAgICAgICAgYWRkcmVzczogdGhpcy5jb250cmFjdEFkZHJlc3MsXG4gICAgICAgIGFiaTogU1RSRUFNSU5HX0FCSSxcbiAgICAgICAgZnVuY3Rpb25OYW1lOiAnc3VibWl0QmF0Y2hTdHJlYW1zJyxcbiAgICAgICAgYXJnczogW2NhdGFsb2dJZHMsIGxpc3RlbmVycywgZHVyYXRpb25zLCBzb3VyY2VzXSxcbiAgICAgICAgYWNjb3VudCxcbiAgICAgICAgY2hhaW46IG51bGwsXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaGFzaCxcbiAgICAgICAgd2FpdDogYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJlY2VpcHQgPSBhd2FpdCB0aGlzLmNsaWVudC5wdWJsaWNDbGllbnQud2FpdEZvclRyYW5zYWN0aW9uUmVjZWlwdCh7IGhhc2ggfSk7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHJlY2VpcHQuc3RhdHVzID09PSAnc3VjY2VzcycsXG4gICAgICAgICAgICBibG9ja051bWJlcjogcmVjZWlwdC5ibG9ja051bWJlcixcbiAgICAgICAgICAgIGdhc1VzZWQ6IHJlY2VpcHQuZ2FzVXNlZCxcbiAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhyb3cgbmV3IE11eml4U0RLRXJyb3IoXG4gICAgICAgICdGYWlsZWQgdG8gc3VibWl0IGJhdGNoIHN0cmVhbXMnLFxuICAgICAgICAnU1VCTUlUX0JBVENIX0VSUk9SJyxcbiAgICAgICAgZXJyb3JcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBzdHJlYW0gY291bnQgZm9yIGEgY2F0YWxvZ1xuICAgKi9cbiAgYXN5bmMgZ2V0U3RyZWFtQ291bnQoY2F0YWxvZ0lkOiBzdHJpbmcpOiBQcm9taXNlPGJpZ2ludD4ge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gdGhpcy5jbGllbnQucHVibGljQ2xpZW50LnJlYWRDb250cmFjdCh7XG4gICAgICAgIGFkZHJlc3M6IHRoaXMuY29udHJhY3RBZGRyZXNzLFxuICAgICAgICBhYmk6IFNUUkVBTUlOR19BQkksXG4gICAgICAgIGZ1bmN0aW9uTmFtZTogJ2dldFN0cmVhbUNvdW50JyxcbiAgICAgICAgYXJnczogW0JpZ0ludChjYXRhbG9nSWQpXSxcbiAgICAgIH0pIGFzIFByb21pc2U8YmlnaW50PjtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhyb3cgbmV3IE11eml4U0RLRXJyb3IoXG4gICAgICAgICdGYWlsZWQgdG8gZ2V0IHN0cmVhbSBjb3VudCcsXG4gICAgICAgICdHRVRfU1RSRUFNX0NPVU5UX0VSUk9SJyxcbiAgICAgICAgZXJyb3JcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBzdHJlYW1zIGZvciBhIGNhdGFsb2cgd2l0aCBwYWdpbmF0aW9uXG4gICAqL1xuICBhc3luYyBnZXRTdHJlYW1zQnlDYXRhbG9nKFxuICAgIGNhdGFsb2dJZDogc3RyaW5nLFxuICAgIG9mZnNldDogbnVtYmVyID0gMCxcbiAgICBsaW1pdDogbnVtYmVyID0gMTAwXG4gICk6IFByb21pc2U8U3RyZWFtRXZlbnRbXT4ge1xuICAgIHRyeSB7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCB0aGlzLmNsaWVudC5wdWJsaWNDbGllbnQucmVhZENvbnRyYWN0KHtcbiAgICAgICAgYWRkcmVzczogdGhpcy5jb250cmFjdEFkZHJlc3MsXG4gICAgICAgIGFiaTogU1RSRUFNSU5HX0FCSSxcbiAgICAgICAgZnVuY3Rpb25OYW1lOiAnZ2V0U3RyZWFtc0J5Q2F0YWxvZycsXG4gICAgICAgIGFyZ3M6IFtCaWdJbnQoY2F0YWxvZ0lkKSwgQmlnSW50KG9mZnNldCksIEJpZ0ludChsaW1pdCldLFxuICAgICAgfSk7XG5cbiAgICAgIC8vIFBhcnNlIHJlc3VsdCAocGFyYWxsZWwgYXJyYXlzKVxuICAgICAgY29uc3QgW2NhdGFsb2dJZHMsIGxpc3RlbmVycywgdGltZXN0YW1wcywgZHVyYXRpb25zLCBzb3VyY2VzXSA9IHJlc3VsdCBhcyB1bmtub3duIGFzIFtiaWdpbnRbXSwgQWRkcmVzc1tdLCBiaWdpbnRbXSwgYmlnaW50W10sIHN0cmluZ1tdXTtcblxuICAgICAgcmV0dXJuIGNhdGFsb2dJZHMubWFwKChjYXRhbG9nSWQsIGluZGV4KSA9PiAoe1xuICAgICAgICBjYXRhbG9nSWQ6IGNhdGFsb2dJZC50b1N0cmluZygpLFxuICAgICAgICBsaXN0ZW5lcjogbGlzdGVuZXJzW2luZGV4XSxcbiAgICAgICAgdGltZXN0YW1wOiB0aW1lc3RhbXBzW2luZGV4XSxcbiAgICAgICAgZHVyYXRpb246IE51bWJlcihkdXJhdGlvbnNbaW5kZXhdKSxcbiAgICAgICAgc291cmNlOiBzb3VyY2VzW2luZGV4XSxcbiAgICAgIH0pKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhyb3cgbmV3IE11eml4U0RLRXJyb3IoXG4gICAgICAgICdGYWlsZWQgdG8gZ2V0IHN0cmVhbXMgYnkgY2F0YWxvZycsXG4gICAgICAgICdHRVRfU1RSRUFNU19FUlJPUicsXG4gICAgICAgIGVycm9yXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdG90YWwgc3RyZWFtIGR1cmF0aW9uIGZvciBhIGNhdGFsb2dcbiAgICovXG4gIGFzeW5jIGdldFRvdGFsU3RyZWFtRHVyYXRpb24oY2F0YWxvZ0lkOiBzdHJpbmcpOiBQcm9taXNlPGJpZ2ludD4ge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gdGhpcy5jbGllbnQucHVibGljQ2xpZW50LnJlYWRDb250cmFjdCh7XG4gICAgICAgIGFkZHJlc3M6IHRoaXMuY29udHJhY3RBZGRyZXNzLFxuICAgICAgICBhYmk6IFNUUkVBTUlOR19BQkksXG4gICAgICAgIGZ1bmN0aW9uTmFtZTogJ2dldFRvdGFsU3RyZWFtRHVyYXRpb24nLFxuICAgICAgICBhcmdzOiBbQmlnSW50KGNhdGFsb2dJZCldLFxuICAgICAgfSkgYXMgUHJvbWlzZTxiaWdpbnQ+O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aHJvdyBuZXcgTXV6aXhTREtFcnJvcihcbiAgICAgICAgJ0ZhaWxlZCB0byBnZXQgdG90YWwgc3RyZWFtIGR1cmF0aW9uJyxcbiAgICAgICAgJ0dFVF9UT1RBTF9EVVJBVElPTl9FUlJPUicsXG4gICAgICAgIGVycm9yXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGUgZXN0aW1hdGVkIHJveWFsdHkgZnJvbSBzdHJlYW1pbmcgZGF0YVxuICAgKi9cbiAgY2FsY3VsYXRlRXN0aW1hdGVkUm95YWx0eShcbiAgICBzdHJlYW1Db3VudDogbnVtYmVyLFxuICAgIHRvdGFsRHVyYXRpb246IG51bWJlcixcbiAgICByYXRlUGVyU3RyZWFtOiBiaWdpbnRcbiAgKTogYmlnaW50IHtcbiAgICByZXR1cm4gQmlnSW50KHN0cmVhbUNvdW50KSAqIHJhdGVQZXJTdHJlYW07XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgc3RyZWFtIGV2ZW50IG9iamVjdFxuICAgKi9cbiAgY3JlYXRlU3RyZWFtRXZlbnQoXG4gICAgY2F0YWxvZ0lkOiBzdHJpbmcsXG4gICAgbGlzdGVuZXI6IEFkZHJlc3MsXG4gICAgZHVyYXRpb246IG51bWJlcixcbiAgICBzb3VyY2U6IHN0cmluZ1xuICApOiBTdHJlYW1FdmVudCB7XG4gICAgcmV0dXJuIHtcbiAgICAgIGNhdGFsb2dJZCxcbiAgICAgIGxpc3RlbmVyLFxuICAgICAgdGltZXN0YW1wOiBCaWdJbnQoTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCkpLFxuICAgICAgZHVyYXRpb24sXG4gICAgICBzb3VyY2UsXG4gICAgfTtcbiAgfVxuXG4gIC8qKlxuICAgKiBWYWxpZGF0ZSBzdHJlYW0gZXZlbnRcbiAgICovXG4gIHZhbGlkYXRlU3RyZWFtRXZlbnQoc3RyZWFtOiBTdHJlYW1FdmVudCk6IHsgdmFsaWQ6IGJvb2xlYW47IGVycm9yczogc3RyaW5nW10gfSB7XG4gICAgY29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xuXG4gICAgaWYgKCFzdHJlYW0uY2F0YWxvZ0lkIHx8IHN0cmVhbS5jYXRhbG9nSWQgPT09ICcwJykge1xuICAgICAgZXJyb3JzLnB1c2goJ0ludmFsaWQgY2F0YWxvZyBJRCcpO1xuICAgIH1cblxuICAgIGlmICghc3RyZWFtLmxpc3RlbmVyIHx8IHN0cmVhbS5saXN0ZW5lciA9PT0gJzB4MDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMCcpIHtcbiAgICAgIGVycm9ycy5wdXNoKCdJbnZhbGlkIGxpc3RlbmVyIGFkZHJlc3MnKTtcbiAgICB9XG5cbiAgICBpZiAoc3RyZWFtLmR1cmF0aW9uIDw9IDApIHtcbiAgICAgIGVycm9ycy5wdXNoKCdEdXJhdGlvbiBtdXN0IGJlIGdyZWF0ZXIgdGhhbiAwJyk7XG4gICAgfVxuXG4gICAgaWYgKCFzdHJlYW0uc291cmNlIHx8IHN0cmVhbS5zb3VyY2UudHJpbSgpID09PSAnJykge1xuICAgICAgZXJyb3JzLnB1c2goJ1NvdXJjZSBpcyByZXF1aXJlZCcpO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZXJyb3JzLmxlbmd0aCA9PT0gMCxcbiAgICAgIGVycm9ycyxcbiAgICB9O1xuICB9XG59XG4iXX0=