"use strict";
/**
 * Catalog Module - Catalog token operations
 *
 * Catalog tokens represent music IP on-chain. Each token represents
 * a song, album, or catalog with embedded royalty split logic.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Catalog = exports.DEFAULT_CATALOG_ADDRESS = void 0;
const viem_1 = require("viem");
const types_1 = require("./types");
// Catalog Contract ABI (simplified - replace with actual contract ABI)
const CATALOG_ABI = (0, viem_1.parseAbi)([
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
exports.DEFAULT_CATALOG_ADDRESS = '0x0000000000000000000000000000000000000000'; // Replace with actual address
/**
 * Catalog token operations
 */
class Catalog {
    constructor(client, contractAddress = exports.DEFAULT_CATALOG_ADDRESS) {
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
     * Create a new catalog token
     */
    async createCatalog(params) {
        if (!this.client.walletClient) {
            throw new types_1.MuzixSDKError('Wallet not connected. Connect wallet to create catalog.', 'WALLET_NOT_CONNECTED');
        }
        try {
            const account = await this.client.getWalletAddress();
            if (!account) {
                throw new types_1.MuzixSDKError('No wallet account found', 'NO_ACCOUNT');
            }
            // Convert metadata to URI (in production, this would upload to IPFS or similar)
            const metadataURI = this.metadataToURI(params.metadata);
            // Convert royalty splits to contract format (parallel arrays)
            const recipients = params.royaltySplits.map(split => split.recipient);
            const percentages = params.royaltySplits.map(split => BigInt(split.percentage));
            const hash = await this.client.walletClient.writeContract({
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
        }
        catch (error) {
            throw new types_1.MuzixSDKError('Failed to create catalog', 'CREATE_CATALOG_ERROR', error);
        }
    }
    /**
     * Get catalog token by ID
     */
    async getCatalog(catalogId) {
        try {
            const result = await this.client.publicClient.readContract({
                address: this.contractAddress,
                abi: CATALOG_ABI,
                functionName: 'getCatalog',
                args: [BigInt(catalogId)],
            });
            // Parse result tuple
            const resultArray = result;
            const [name, artist, metadataURI, owner, createdAt] = resultArray;
            return {
                id: catalogId,
                name,
                artist,
                metadata: this.parseMetadataURI(metadataURI),
                owner,
                createdAt: BigInt(createdAt),
            };
        }
        catch (error) {
            throw new types_1.MuzixSDKError(`Failed to get catalog ${catalogId}`, 'GET_CATALOG_ERROR', error);
        }
    }
    /**
     * Get total supply of catalog tokens
     */
    async getTotalSupply() {
        return this.client.publicClient.readContract({
            address: this.contractAddress,
            abi: CATALOG_ABI,
            functionName: 'totalSupply',
        });
    }
    /**
     * Get owner of a catalog token
     */
    async getOwner(catalogId) {
        return this.client.publicClient.readContract({
            address: this.contractAddress,
            abi: CATALOG_ABI,
            functionName: 'ownerOf',
            args: [BigInt(catalogId)],
        });
    }
    /**
     * Transfer catalog token
     */
    async transfer(to, catalogId) {
        if (!this.client.walletClient) {
            throw new types_1.MuzixSDKError('Wallet not connected. Connect wallet to transfer catalog.', 'WALLET_NOT_CONNECTED');
        }
        try {
            const account = await this.client.getWalletAddress();
            if (!account) {
                throw new types_1.MuzixSDKError('No wallet account found', 'NO_ACCOUNT');
            }
            const hash = await this.client.walletClient.writeContract({
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
        }
        catch (error) {
            throw new types_1.MuzixSDKError('Failed to transfer catalog', 'TRANSFER_CATALOG_ERROR', error);
        }
    }
    /**
     * Convert metadata to URI
     * In production, this would upload to IPFS or similar
     */
    metadataToURI(metadata) {
        // Placeholder implementation
        // In production: upload to IPFS, Arweave, or centralized storage
        const metadataJSON = JSON.stringify(metadata);
        return `data:application/json;base64,${Buffer.from(metadataJSON).toString('base64')}`;
    }
    /**
     * Parse metadata URI
     */
    parseMetadataURI(uri) {
        try {
            if (uri.startsWith('data:application/json;base64,')) {
                const base64 = uri.replace('data:application/json;base64,', '');
                const json = Buffer.from(base64, 'base64').toString('utf-8');
                return JSON.parse(json);
            }
            // For IPFS or HTTP URIs, fetch in production
            return {};
        }
        catch {
            return {};
        }
    }
    /**
     * Extract catalog ID from transaction receipt
     */
    extractCatalogIdFromReceipt(receipt) {
        // Parse event logs to extract catalog ID
        // This is a simplified implementation
        return undefined;
    }
}
exports.Catalog = Catalog;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2F0YWxvZy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9jYXRhbG9nLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7R0FLRzs7O0FBRUgsK0JBQXlDO0FBRXpDLG1DQU9pQjtBQUVqQix1RUFBdUU7QUFDdkUsTUFBTSxXQUFXLEdBQUcsSUFBQSxlQUFRLEVBQUM7SUFDM0IsdUlBQXVJO0lBQ3ZJLHNJQUFzSTtJQUN0SSx1R0FBdUc7SUFDdkcsa0VBQWtFO0lBQ2xFLDBEQUEwRDtJQUMxRCwrQ0FBK0M7SUFDL0Msa0dBQWtHO0NBQ25HLENBQUMsQ0FBQztBQUVIOztHQUVHO0FBQ1UsUUFBQSx1QkFBdUIsR0FBWSw0Q0FBNEMsQ0FBQyxDQUFDLDhCQUE4QjtBQUU1SDs7R0FFRztBQUNILE1BQWEsT0FBTztJQUlsQixZQUFZLE1BQW1CLEVBQUUsa0JBQTJCLCtCQUF1QjtRQUNqRixJQUFJLENBQUMsTUFBTSxHQUFHLE1BQU0sQ0FBQztRQUNyQixJQUFJLENBQUMsZUFBZSxHQUFHLGVBQWUsQ0FBQztJQUN6QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFJLE9BQU87UUFDVCxPQUFPLElBQUksQ0FBQyxlQUFlLENBQUM7SUFDOUIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGFBQWEsQ0FBQyxNQUEyQjtRQUM3QyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUM5QixNQUFNLElBQUkscUJBQWEsQ0FDckIseURBQXlELEVBQ3pELHNCQUFzQixDQUN2QixDQUFDO1FBQ0osQ0FBQztRQUVELElBQUksQ0FBQztZQUNILE1BQU0sT0FBTyxHQUFHLE1BQU0sSUFBSSxDQUFDLE1BQU0sQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3JELElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDYixNQUFNLElBQUkscUJBQWEsQ0FBQyx5QkFBeUIsRUFBRSxZQUFZLENBQUMsQ0FBQztZQUNu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RSxFQUFFLENBQUMsQ0FBQztnQkFDaEUsTUFBTSxJQUFJLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDO2dCQUM3RCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDMUIsQ0FBQztZQUNELDZDQUE2QztZQUM3QyxPQUFPLEVBQXFCLENBQUM7UUFDL0IsQ0FBQztRQUFDLE1BQU0sQ0FBQztZQUNQLE9BQU8sRUFBcUIsQ0FBQztRQUMvQixDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0ssMkJBQTJCLENBQUMsT0FBWTtRQUM5Qyx5Q0FBeUM7UUFDekMsc0NBQXNDO1FBQ3RDLE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7Q0FDRjtBQXBORCwwQkFvTkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIENhdGFsb2cgTW9kdWxlIC0gQ2F0YWxvZyB0b2tlbiBvcGVyYXRpb25zXG4gKiBcbiAqIENhdGFsb2cgdG9rZW5zIHJlcHJlc2VudCBtdXNpYyBJUCBvbi1jaGFpbi4gRWFjaCB0b2tlbiByZXByZXNlbnRzXG4gKiBhIHNvbmcsIGFsYnVtLCBvciBjYXRhbG9nIHdpdGggZW1iZWRkZWQgcm95YWx0eSBzcGxpdCBsb2dpYy5cbiAqL1xuXG5pbXBvcnQgeyBBZGRyZXNzLCBwYXJzZUFiaSB9IGZyb20gJ3ZpZW0nO1xuaW1wb3J0IHsgTXV6aXhDbGllbnQgfSBmcm9tICcuL2NsaWVudCc7XG5pbXBvcnQge1xuICBDYXRhbG9nVG9rZW4sXG4gIENhdGFsb2dNZXRhZGF0YSxcbiAgQ3JlYXRlQ2F0YWxvZ1BhcmFtcyxcbiAgUm95YWx0eVNwbGl0LFxuICBUcmFuc2FjdGlvblJlc3VsdCxcbiAgTXV6aXhTREtFcnJvcixcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8vIENhdGFsb2cgQ29udHJhY3QgQUJJIChzaW1wbGlmaWVkIC0gcmVwbGFjZSB3aXRoIGFjdHVhbCBjb250cmFjdCBBQkkpXG5jb25zdCBDQVRBTE9HX0FCSSA9IHBhcnNlQWJpKFtcbiAgJ2Z1bmN0aW9uIGNyZWF0ZUNhdGFsb2coc3RyaW5nIG5hbWUsIHN0cmluZyBhcnRpc3QsIHN0cmluZyBtZXRhZGF0YVVSSSwgYWRkcmVzc1tdIHJlY2lwaWVudHMsIHVpbnQyNTZbXSBwZXJjZW50YWdlcykgcmV0dXJucyAodWludDI1NiknLFxuICAnZnVuY3Rpb24gZ2V0Q2F0YWxvZyh1aW50MjU2IHRva2VuSWQpIHZpZXcgcmV0dXJucyAoc3RyaW5nIG5hbWUsIHN0cmluZyBhcnRpc3QsIHN0cmluZyBtZXRhZGF0YVVSSSwgYWRkcmVzcyBvd25lciwgdWludDI1NiBjcmVhdGVkQXQpJyxcbiAgJ2Z1bmN0aW9uIGdldFJveWFsdHlTcGxpdHModWludDI1NiB0b2tlbklkKSB2aWV3IHJldHVybnMgKGFkZHJlc3NbXSByZWNpcGllbnRzLCB1aW50MjU2W10gcGVyY2VudGFnZXMpJyxcbiAgJ2Z1bmN0aW9uIHRyYW5zZmVyRnJvbShhZGRyZXNzIGZyb20sIGFkZHJlc3MgdG8sIHVpbnQyNTYgdG9rZW5JZCknLFxuICAnZnVuY3Rpb24gb3duZXJPZih1aW50MjU2IHRva2VuSWQpIHZpZXcgcmV0dXJucyAoYWRkcmVzcyknLFxuICAnZnVuY3Rpb24gdG90YWxTdXBwbHkoKSB2aWV3IHJldHVybnMgKHVpbnQyNTYpJyxcbiAgJ2V2ZW50IENhdGFsb2dDcmVhdGVkKHVpbnQyNTYgaW5kZXhlZCB0b2tlbklkLCBzdHJpbmcgbmFtZSwgc3RyaW5nIGFydGlzdCwgYWRkcmVzcyBpbmRleGVkIG93bmVyKScsXG5dKTtcblxuLyoqXG4gKiBEZWZhdWx0IENhdGFsb2cgY29udHJhY3QgY29uZmlndXJhdGlvblxuICovXG5leHBvcnQgY29uc3QgREVGQVVMVF9DQVRBTE9HX0FERFJFU1M6IEFkZHJlc3MgPSAnMHgwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwJzsgLy8gUmVwbGFjZSB3aXRoIGFjdHVhbCBhZGRyZXNzXG5cbi8qKlxuICogQ2F0YWxvZyB0b2tlbiBvcGVyYXRpb25zXG4gKi9cbmV4cG9ydCBjbGFzcyBDYXRhbG9nIHtcbiAgcHJpdmF0ZSBjbGllbnQ6IE11eml4Q2xpZW50O1xuICBwcml2YXRlIGNvbnRyYWN0QWRkcmVzczogQWRkcmVzcztcblxuICBjb25zdHJ1Y3RvcihjbGllbnQ6IE11eml4Q2xpZW50LCBjb250cmFjdEFkZHJlc3M6IEFkZHJlc3MgPSBERUZBVUxUX0NBVEFMT0dfQUREUkVTUykge1xuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xuICAgIHRoaXMuY29udHJhY3RBZGRyZXNzID0gY29udHJhY3RBZGRyZXNzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjb250cmFjdCBhZGRyZXNzXG4gICAqL1xuICBnZXQgYWRkcmVzcygpOiBBZGRyZXNzIHtcbiAgICByZXR1cm4gdGhpcy5jb250cmFjdEFkZHJlc3M7XG4gIH1cblxuICAvKipcbiAgICogQ3JlYXRlIGEgbmV3IGNhdGFsb2cgdG9rZW5cbiAgICovXG4gIGFzeW5jIGNyZWF0ZUNhdGFsb2cocGFyYW1zOiBDcmVhdGVDYXRhbG9nUGFyYW1zKTogUHJvbWlzZTxUcmFuc2FjdGlvblJlc3VsdCAmIHsgY2F0YWxvZ0lkPzogc3RyaW5nIH0+IHtcbiAgICBpZiAoIXRoaXMuY2xpZW50LndhbGxldENsaWVudCkge1xuICAgICAgdGhyb3cgbmV3IE11eml4U0RLRXJyb3IoXG4gICAgICAgICdXYWxsZXQgbm90IGNvbm5lY3RlZC4gQ29ubmVjdCB3YWxsZXQgdG8gY3JlYXRlIGNhdGFsb2cuJyxcbiAgICAgICAgJ1dBTExFVF9OT1RfQ09OTkVDVEVEJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IHRoaXMuY2xpZW50LmdldFdhbGxldEFkZHJlc3MoKTtcbiAgICAgIGlmICghYWNjb3VudCkge1xuICAgICAgICB0aHJvdyBuZXcgTXV6aXhTREtFcnJvcignTm8gd2FsbGV0IGFjY291bnQgZm91bmQnLCAnTk9fQUNDT1VOVCcpO1xuICAgICAgfVxuXG4gICAgICAvLyBDb252ZXJ0IG1ldGFkYXRhIHRvIFVSSSAoaW4gcHJvZHVjdGlvbiwgdGhpcyB3b3VsZCB1cGxvYWQgdG8gSVBGUyBvciBzaW1pbGFyKVxuICAgICAgY29uc3QgbWV0YWRhdGFVUkkgPSB0aGlzLm1ldGFkYXRhVG9VUkkocGFyYW1zLm1ldGFkYXRhKTtcblxuICAgICAgLy8gQ29udmVydCByb3lhbHR5IHNwbGl0cyB0byBjb250cmFjdCBmb3JtYXQgKHBhcmFsbGVsIGFycmF5cylcbiAgICAgIGNvbnN0IHJlY2lwaWVudHMgPSBwYXJhbXMucm95YWx0eVNwbGl0cy5tYXAoc3BsaXQgPT4gc3BsaXQucmVjaXBpZW50KTtcbiAgICAgIGNvbnN0IHBlcmNlbnRhZ2VzID0gcGFyYW1zLnJveWFsdHlTcGxpdHMubWFwKHNwbGl0ID0+IEJpZ0ludChzcGxpdC5wZXJjZW50YWdlKSk7XG5cbiAgICAgIGNvbnN0IGhhc2ggPSBhd2FpdCAodGhpcy5jbGllbnQud2FsbGV0Q2xpZW50IGFzIGFueSkud3JpdGVDb250cmFjdCh7XG4gICAgICAgIGFkZHJlc3M6IHRoaXMuY29udHJhY3RBZGRyZXNzLFxuICAgICAgICBhYmk6IENBVEFMT0dfQUJJLFxuICAgICAgICBmdW5jdGlvbk5hbWU6ICdjcmVhdGVDYXRhbG9nJyxcbiAgICAgICAgYXJnczogW3BhcmFtcy5uYW1lLCBwYXJhbXMuYXJ0aXN0LCBtZXRhZGF0YVVSSSwgcmVjaXBpZW50cywgcGVyY2VudGFnZXNdLFxuICAgICAgICBhY2NvdW50LFxuICAgICAgICBjaGFpbjogbnVsbCxcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBoYXNoLFxuICAgICAgICB3YWl0OiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgcmVjZWlwdCA9IGF3YWl0IHRoaXMuY2xpZW50LnB1YmxpY0NsaWVudC53YWl0Rm9yVHJhbnNhY3Rpb25SZWNlaXB0KHsgaGFzaCB9KTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBFeHRyYWN0IGNhdGFsb2cgSUQgZnJvbSBldmVudCBsb2dzIChzaW1wbGlmaWVkKVxuICAgICAgICAgIGNvbnN0IGNhdGFsb2dJZCA9IHRoaXMuZXh0cmFjdENhdGFsb2dJZEZyb21SZWNlaXB0KHJlY2VpcHQpO1xuICAgICAgICAgIFxuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiByZWNlaXB0LnN0YXR1cyA9PT0gJ3N1Y2Nlc3MnLFxuICAgICAgICAgICAgYmxvY2tOdW1iZXI6IHJlY2VpcHQuYmxvY2tOdW1iZXIsXG4gICAgICAgICAgICBnYXNVc2VkOiByZWNlaXB0Lmdhc1VzZWQsXG4gICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgICAgY2F0YWxvZ0lkOiB1bmRlZmluZWQsIC8vIFdpbGwgYmUgcG9wdWxhdGVkIGFmdGVyIHRyYW5zYWN0aW9uIGNvbmZpcm1zXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aHJvdyBuZXcgTXV6aXhTREtFcnJvcihcbiAgICAgICAgJ0ZhaWxlZCB0byBjcmVhdGUgY2F0YWxvZycsXG4gICAgICAgICdDUkVBVEVfQ0FUQUxPR19FUlJPUicsXG4gICAgICAgIGVycm9yXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgY2F0YWxvZyB0b2tlbiBieSBJRFxuICAgKi9cbiAgYXN5bmMgZ2V0Q2F0YWxvZyhjYXRhbG9nSWQ6IHN0cmluZyk6IFByb21pc2U8Q2F0YWxvZ1Rva2VuPiB7XG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IHRoaXMuY2xpZW50LnB1YmxpY0NsaWVudC5yZWFkQ29udHJhY3Qoe1xuICAgICAgICBhZGRyZXNzOiB0aGlzLmNvbnRyYWN0QWRkcmVzcyxcbiAgICAgICAgYWJpOiBDQVRBTE9HX0FCSSxcbiAgICAgICAgZnVuY3Rpb25OYW1lOiAnZ2V0Q2F0YWxvZycsXG4gICAgICAgIGFyZ3M6IFtCaWdJbnQoY2F0YWxvZ0lkKV0sXG4gICAgICB9KTtcblxuICAgICAgLy8gUGFyc2UgcmVzdWx0IHR1cGxlXG4gICAgICBjb25zdCByZXN1bHRBcnJheSA9IHJlc3VsdCBhcyB1bmtub3duIGFzIFtzdHJpbmcsIHN0cmluZywgc3RyaW5nLCBBZGRyZXNzLCBiaWdpbnRdO1xuICAgICAgY29uc3QgW25hbWUsIGFydGlzdCwgbWV0YWRhdGFVUkksIG93bmVyLCBjcmVhdGVkQXRdID0gcmVzdWx0QXJyYXk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGlkOiBjYXRhbG9nSWQsXG4gICAgICAgIG5hbWUsXG4gICAgICAgIGFydGlzdCxcbiAgICAgICAgbWV0YWRhdGE6IHRoaXMucGFyc2VNZXRhZGF0YVVSSShtZXRhZGF0YVVSSSksXG4gICAgICAgIG93bmVyLFxuICAgICAgICBjcmVhdGVkQXQ6IEJpZ0ludChjcmVhdGVkQXQgYXMgYW55KSxcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRocm93IG5ldyBNdXppeFNES0Vycm9yKFxuICAgICAgICBgRmFpbGVkIHRvIGdldCBjYXRhbG9nICR7Y2F0YWxvZ0lkfWAsXG4gICAgICAgICdHRVRfQ0FUQUxPR19FUlJPUicsXG4gICAgICAgIGVycm9yXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdG90YWwgc3VwcGx5IG9mIGNhdGFsb2cgdG9rZW5zXG4gICAqL1xuICBhc3luYyBnZXRUb3RhbFN1cHBseSgpOiBQcm9taXNlPGJpZ2ludD4ge1xuICAgIHJldHVybiB0aGlzLmNsaWVudC5wdWJsaWNDbGllbnQucmVhZENvbnRyYWN0KHtcbiAgICAgIGFkZHJlc3M6IHRoaXMuY29udHJhY3RBZGRyZXNzLFxuICAgICAgYWJpOiBDQVRBTE9HX0FCSSxcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ3RvdGFsU3VwcGx5JyxcbiAgICB9KSBhcyBQcm9taXNlPGJpZ2ludD47XG4gIH1cblxuICAvKipcbiAgICogR2V0IG93bmVyIG9mIGEgY2F0YWxvZyB0b2tlblxuICAgKi9cbiAgYXN5bmMgZ2V0T3duZXIoY2F0YWxvZ0lkOiBzdHJpbmcpOiBQcm9taXNlPEFkZHJlc3M+IHtcbiAgICByZXR1cm4gdGhpcy5jbGllbnQucHVibGljQ2xpZW50LnJlYWRDb250cmFjdCh7XG4gICAgICBhZGRyZXNzOiB0aGlzLmNvbnRyYWN0QWRkcmVzcyxcbiAgICAgIGFiaTogQ0FUQUxPR19BQkksXG4gICAgICBmdW5jdGlvbk5hbWU6ICdvd25lck9mJyxcbiAgICAgIGFyZ3M6IFtCaWdJbnQoY2F0YWxvZ0lkKV0sXG4gICAgfSkgYXMgUHJvbWlzZTxBZGRyZXNzPjtcbiAgfVxuXG4gIC8qKlxuICAgKiBUcmFuc2ZlciBjYXRhbG9nIHRva2VuXG4gICAqL1xuICBhc3luYyB0cmFuc2Zlcih0bzogQWRkcmVzcywgY2F0YWxvZ0lkOiBzdHJpbmcpOiBQcm9taXNlPFRyYW5zYWN0aW9uUmVzdWx0PiB7XG4gICAgaWYgKCF0aGlzLmNsaWVudC53YWxsZXRDbGllbnQpIHtcbiAgICAgIHRocm93IG5ldyBNdXppeFNES0Vycm9yKFxuICAgICAgICAnV2FsbGV0IG5vdCBjb25uZWN0ZWQuIENvbm5lY3Qgd2FsbGV0IHRvIHRyYW5zZmVyIGNhdGFsb2cuJyxcbiAgICAgICAgJ1dBTExFVF9OT1RfQ09OTkVDVEVEJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IHRoaXMuY2xpZW50LmdldFdhbGxldEFkZHJlc3MoKTtcbiAgICAgIGlmICghYWNjb3VudCkge1xuICAgICAgICB0aHJvdyBuZXcgTXV6aXhTREtFcnJvcignTm8gd2FsbGV0IGFjY291bnQgZm91bmQnLCAnTk9fQUNDT1VOVCcpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBoYXNoID0gYXdhaXQgKHRoaXMuY2xpZW50LndhbGxldENsaWVudCBhcyBhbnkpLndyaXRlQ29udHJhY3Qoe1xuICAgICAgICBhZGRyZXNzOiB0aGlzLmNvbnRyYWN0QWRkcmVzcyxcbiAgICAgICAgYWJpOiBDQVRBTE9HX0FCSSxcbiAgICAgICAgZnVuY3Rpb25OYW1lOiAndHJhbnNmZXJGcm9tJyxcbiAgICAgICAgYXJnczogW2FjY291bnQsIHRvLCBCaWdJbnQoY2F0YWxvZ0lkKV0sXG4gICAgICAgIGFjY291bnQsXG4gICAgICAgIGNoYWluOiBudWxsLFxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGhhc2gsXG4gICAgICAgIHdhaXQ6IGFzeW5jICgpID0+IHtcbiAgICAgICAgICBjb25zdCByZWNlaXB0ID0gYXdhaXQgdGhpcy5jbGllbnQucHVibGljQ2xpZW50LndhaXRGb3JUcmFuc2FjdGlvblJlY2VpcHQoeyBoYXNoIH0pO1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiByZWNlaXB0LnN0YXR1cyA9PT0gJ3N1Y2Nlc3MnLFxuICAgICAgICAgICAgYmxvY2tOdW1iZXI6IHJlY2VpcHQuYmxvY2tOdW1iZXIsXG4gICAgICAgICAgICBnYXNVc2VkOiByZWNlaXB0Lmdhc1VzZWQsXG4gICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRocm93IG5ldyBNdXppeFNES0Vycm9yKFxuICAgICAgICAnRmFpbGVkIHRvIHRyYW5zZmVyIGNhdGFsb2cnLFxuICAgICAgICAnVFJBTlNGRVJfQ0FUQUxPR19FUlJPUicsXG4gICAgICAgIGVycm9yXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDb252ZXJ0IG1ldGFkYXRhIHRvIFVSSVxuICAgKiBJbiBwcm9kdWN0aW9uLCB0aGlzIHdvdWxkIHVwbG9hZCB0byBJUEZTIG9yIHNpbWlsYXJcbiAgICovXG4gIHByaXZhdGUgbWV0YWRhdGFUb1VSSShtZXRhZGF0YTogQ2F0YWxvZ01ldGFkYXRhKTogc3RyaW5nIHtcbiAgICAvLyBQbGFjZWhvbGRlciBpbXBsZW1lbnRhdGlvblxuICAgIC8vIEluIHByb2R1Y3Rpb246IHVwbG9hZCB0byBJUEZTLCBBcndlYXZlLCBvciBjZW50cmFsaXplZCBzdG9yYWdlXG4gICAgY29uc3QgbWV0YWRhdGFKU09OID0gSlNPTi5zdHJpbmdpZnkobWV0YWRhdGEpO1xuICAgIHJldHVybiBgZGF0YTphcHBsaWNhdGlvbi9qc29uO2Jhc2U2NCwke0J1ZmZlci5mcm9tKG1ldGFkYXRhSlNPTikudG9TdHJpbmcoJ2Jhc2U2NCcpfWA7XG4gIH1cblxuICAvKipcbiAgICogUGFyc2UgbWV0YWRhdGEgVVJJXG4gICAqL1xuICBwcml2YXRlIHBhcnNlTWV0YWRhdGFVUkkodXJpOiBzdHJpbmcpOiBDYXRhbG9nTWV0YWRhdGEge1xuICAgIHRyeSB7XG4gICAgICBpZiAodXJpLnN0YXJ0c1dpdGgoJ2RhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsJykpIHtcbiAgICAgICAgY29uc3QgYmFzZTY0ID0gdXJpLnJlcGxhY2UoJ2RhdGE6YXBwbGljYXRpb24vanNvbjtiYXNlNjQsJywgJycpO1xuICAgICAgICBjb25zdCBqc29uID0gQnVmZmVyLmZyb20oYmFzZTY0LCAnYmFzZTY0JykudG9TdHJpbmcoJ3V0Zi04Jyk7XG4gICAgICAgIHJldHVybiBKU09OLnBhcnNlKGpzb24pO1xuICAgICAgfVxuICAgICAgLy8gRm9yIElQRlMgb3IgSFRUUCBVUklzLCBmZXRjaCBpbiBwcm9kdWN0aW9uXG4gICAgICByZXR1cm4ge30gYXMgQ2F0YWxvZ01ldGFkYXRhO1xuICAgIH0gY2F0Y2gge1xuICAgICAgcmV0dXJuIHt9IGFzIENhdGFsb2dNZXRhZGF0YTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogRXh0cmFjdCBjYXRhbG9nIElEIGZyb20gdHJhbnNhY3Rpb24gcmVjZWlwdFxuICAgKi9cbiAgcHJpdmF0ZSBleHRyYWN0Q2F0YWxvZ0lkRnJvbVJlY2VpcHQocmVjZWlwdDogYW55KTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcbiAgICAvLyBQYXJzZSBldmVudCBsb2dzIHRvIGV4dHJhY3QgY2F0YWxvZyBJRFxuICAgIC8vIFRoaXMgaXMgYSBzaW1wbGlmaWVkIGltcGxlbWVudGF0aW9uXG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuIl19