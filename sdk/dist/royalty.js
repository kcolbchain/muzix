"use strict";
/**
 * Royalty Module - Royalty split operations
 *
 * Handle royalty splits, payments, and claims for catalog tokens.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Royalty = exports.DEFAULT_ROYALTY_ADDRESS = void 0;
const viem_1 = require("viem");
const types_1 = require("./types");
// Royalty Contract ABI (simplified - replace with actual contract ABI)
const ROYALTY_ABI = (0, viem_1.parseAbi)([
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
exports.DEFAULT_ROYALTY_ADDRESS = '0x0000000000000000000000000000000000000000'; // Replace with actual address
/**
 * Royalty operations
 */
class Royalty {
    constructor(client, contractAddress = exports.DEFAULT_ROYALTY_ADDRESS) {
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
     * Query royalty splits for a catalog
     */
    async getRoyaltySplits(params) {
        try {
            const result = await this.client.publicClient.readContract({
                address: this.contractAddress,
                abi: ROYALTY_ABI,
                functionName: 'getSplits',
                args: [BigInt(params.catalogId)],
            });
            // Parse result (parallel arrays)
            const [recipients, percentages] = result;
            return recipients.map((recipient, index) => ({
                recipient,
                percentage: Number(percentages[index]),
            }));
        }
        catch (error) {
            throw new types_1.MuzixSDKError(`Failed to get royalty splits for catalog ${params.catalogId}`, 'GET_SPLITS_ERROR', error);
        }
    }
    /**
     * Get unclaimed royalty for a recipient
     */
    async getUnclaimedRoyalty(catalogId, recipient) {
        try {
            return this.client.publicClient.readContract({
                address: this.contractAddress,
                abi: ROYALTY_ABI,
                functionName: 'getUnclaimedRoyalty',
                args: [BigInt(catalogId), recipient],
            });
        }
        catch (error) {
            throw new types_1.MuzixSDKError('Failed to get unclaimed royalty', 'GET_UNCLAIMED_ERROR', error);
        }
    }
    /**
     * Get total distributed royalty for a catalog
     */
    async getTotalDistributed(catalogId) {
        try {
            return this.client.publicClient.readContract({
                address: this.contractAddress,
                abi: ROYALTY_ABI,
                functionName: 'getTotalDistributed',
                args: [BigInt(catalogId)],
            });
        }
        catch (error) {
            throw new types_1.MuzixSDKError('Failed to get total distributed royalty', 'GET_TOTAL_DISTRIBUTED_ERROR', error);
        }
    }
    /**
     * Calculate royalty distribution
     */
    async calculateDistribution(catalogId, totalAmount) {
        const splits = await this.getRoyaltySplits({ catalogId });
        const distribution = new Map();
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
    async distributeRoyalty(catalogId, amount) {
        if (!this.client.walletClient) {
            throw new types_1.MuzixSDKError('Wallet not connected. Connect wallet to distribute royalty.', 'WALLET_NOT_CONNECTED');
        }
        try {
            const account = await this.client.getWalletAddress();
            if (!account) {
                throw new types_1.MuzixSDKError('No wallet account found', 'NO_ACCOUNT');
            }
            const hash = await this.client.walletClient.writeContract({
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
        }
        catch (error) {
            throw new types_1.MuzixSDKError('Failed to distribute royalty', 'DISTRIBUTE_ERROR', error);
        }
    }
    /**
     * Claim royalty for a catalog
     * Requires wallet connection
     */
    async claimRoyalty(catalogId) {
        if (!this.client.walletClient) {
            throw new types_1.MuzixSDKError('Wallet not connected. Connect wallet to claim royalty.', 'WALLET_NOT_CONNECTED');
        }
        try {
            const account = await this.client.getWalletAddress();
            if (!account) {
                throw new types_1.MuzixSDKError('No wallet account found', 'NO_ACCOUNT');
            }
            const hash = await this.client.walletClient.writeContract({
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
        }
        catch (error) {
            throw new types_1.MuzixSDKError('Failed to claim royalty', 'CLAIM_ERROR', error);
        }
    }
    /**
     * Get royalty payment history
     * Note: This would typically query events from the blockchain
     */
    async getRoyaltyHistory(catalogId) {
        // In production, this would query event logs
        // For now, return empty array
        return [];
    }
    /**
     * Validate royalty splits
     */
    validateSplits(splits) {
        const errors = [];
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
exports.Royalty = Royalty;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicm95YWx0eS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9yb3lhbHR5LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7OztHQUlHOzs7QUFFSCwrQkFBeUM7QUFFekMsbUNBS2lCO0FBRWpCLHVFQUF1RTtBQUN2RSxNQUFNLFdBQVcsR0FBRyxJQUFBLGVBQVEsRUFBQztJQUMzQixrR0FBa0c7SUFDbEcsK0RBQStEO0lBQy9ELDBDQUEwQztJQUMxQywyRkFBMkY7SUFDM0Ysd0VBQXdFO0lBQ3hFLHdGQUF3RjtJQUN4Riw0RkFBNEY7Q0FDN0YsQ0FBQyxDQUFDO0FBRUg7O0dBRUc7QUFDVSxRQUFBLHVCQUF1QixHQUFZLDRDQUE0QyxDQUFDLENBQUMsOEJBQThCO0FBRTVIOztHQUVHO0FBQ0gsTUFBYSxPQUFPO0lBSWxCLFlBQVksTUFBbUIsRUFBRSxrQkFBMkIsK0JBQXVCO1FBQ2pGLElBQUksQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDO1FBQ3JCLElBQUksQ0FBQyxlQUFlLEdBQUcsZUFBZSxDQUFDO0lBQ3pDLENBQUM7SUFFRDs7T0FFRztJQUNILElBQUksT0FBTztRQUNULE9BQU8sSUFBSSxDQUFDLGVBQWUsQ0FBQztJQUM5QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsZ0JBQWdCLENBQUMsTUFBZ0M7UUFDckQsSUFBSSxDQUFDO1lBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBTSxJQUFJLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxZQUFZLENBQUM7Z0JBQ3pELE9BQU8sRUFBRSxJQUFJLENBQUMsZUFBZTtnQkFDN0IsR0FBRyxFQUFFLFdBQVc7Z0JBQ2hCLFlBQVksRUFBRSxXQUFXO2dCQUN6QixJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxDQUFDO2FBQ2pDLENBQUMsQ0FBQztZQUVILGlDQUFpQztZQUNqQyxNQUFNLENBQUMsVUFBVSxFQUFFLFdBQVcsQ0FBQyxHQUFHLE1B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QUFNLElBQUkscUJBQWEsQ0FDckIseUJBQXlCLEVBQ3pCLGFBQWEsRUFDYixLQUFLLENBQ04sQ0FBQztRQUNKLENBQUM7SUFDSCxDQUFDO0lBRUQ7OztPQUdHO0lBQ0gsS0FBSyxDQUFDLGlCQUFpQixDQUFDLFNBQWlCO1FBQ3ZDLDZDQUE2QztRQUM3Qyw4QkFBOEI7UUFDOUIsT0FBTyxFQUFFLENBQUM7SUFDWixDQUFDO0lBRUQ7O09BRUc7SUFDSCxjQUFjLENBQUMsTUFBc0I7UUFDbkMsTUFBTSxNQUFNLEdBQWEsRUFBRSxDQUFDO1FBQzVCLElBQUksZUFBZSxHQUFHLENBQUMsQ0FBQztRQUV4QixLQUFLLE1BQU0sS0FBSyxJQUFJLE1BQU0sRUFBRSxDQUFDO1lBQzNCLElBQUksS0FBSyxDQUFDLFVBQVUsR0FBRyxDQUFDLElBQUksS0FBSyxDQUFDLFVBQVUsR0FBRyxLQUFLLEVBQUUsQ0FBQztnQkFDckQsTUFBTSxDQUFDLElBQUksQ0FBQywwQkFBMEIsS0FBSyxDQUFDLFNBQVMsS0FBSyxLQUFLLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQztZQUNoRixDQUFDO1lBQ0QsZUFBZSxJQUFJLEtBQUssQ0FBQyxVQUFVLENBQUM7UUFDdEMsQ0FBQztRQUVELElBQUksZUFBZSxLQUFLLEtBQUssRUFBRSxDQUFDO1lBQzlCLE1BQU0sQ0FBQyxJQUFJLENBQUMsOENBQThDLGVBQWUsRUFBRSxDQUFDLENBQUM7UUFDL0UsQ0FBQztRQUVELE9BQU87WUFDTCxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQzFCLE1BQU07U0FDUCxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBMU9ELDBCQTBPQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogUm95YWx0eSBNb2R1bGUgLSBSb3lhbHR5IHNwbGl0IG9wZXJhdGlvbnNcbiAqIFxuICogSGFuZGxlIHJveWFsdHkgc3BsaXRzLCBwYXltZW50cywgYW5kIGNsYWltcyBmb3IgY2F0YWxvZyB0b2tlbnMuXG4gKi9cblxuaW1wb3J0IHsgQWRkcmVzcywgcGFyc2VBYmkgfSBmcm9tICd2aWVtJztcbmltcG9ydCB7IE11eml4Q2xpZW50IH0gZnJvbSAnLi9jbGllbnQnO1xuaW1wb3J0IHtcbiAgUm95YWx0eVNwbGl0LFxuICBSb3lhbHR5UGF5bWVudCxcbiAgUXVlcnlSb3lhbHR5U3BsaXRzUGFyYW1zLFxuICBNdXppeFNES0Vycm9yLFxufSBmcm9tICcuL3R5cGVzJztcblxuLy8gUm95YWx0eSBDb250cmFjdCBBQkkgKHNpbXBsaWZpZWQgLSByZXBsYWNlIHdpdGggYWN0dWFsIGNvbnRyYWN0IEFCSSlcbmNvbnN0IFJPWUFMVFlfQUJJID0gcGFyc2VBYmkoW1xuICAnZnVuY3Rpb24gZ2V0U3BsaXRzKHVpbnQyNTYgY2F0YWxvZ0lkKSB2aWV3IHJldHVybnMgKGFkZHJlc3NbXSByZWNpcGllbnRzLCB1aW50MjU2W10gcGVyY2VudGFnZXMpJyxcbiAgJ2Z1bmN0aW9uIGRpc3RyaWJ1dGVSb3lhbHR5KHVpbnQyNTYgY2F0YWxvZ0lkLCB1aW50MjU2IGFtb3VudCknLFxuICAnZnVuY3Rpb24gY2xhaW1Sb3lhbHR5KHVpbnQyNTYgY2F0YWxvZ0lkKScsXG4gICdmdW5jdGlvbiBnZXRVbmNsYWltZWRSb3lhbHR5KHVpbnQyNTYgY2F0YWxvZ0lkLCBhZGRyZXNzIHJlY2lwaWVudCkgdmlldyByZXR1cm5zICh1aW50MjU2KScsXG4gICdmdW5jdGlvbiBnZXRUb3RhbERpc3RyaWJ1dGVkKHVpbnQyNTYgY2F0YWxvZ0lkKSB2aWV3IHJldHVybnMgKHVpbnQyNTYpJyxcbiAgJ2V2ZW50IFJveWFsdHlEaXN0cmlidXRlZCh1aW50MjU2IGluZGV4ZWQgY2F0YWxvZ0lkLCB1aW50MjU2IGFtb3VudCwgdWludDI1NiB0aW1lc3RhbXApJyxcbiAgJ2V2ZW50IFJveWFsdHlDbGFpbWVkKHVpbnQyNTYgaW5kZXhlZCBjYXRhbG9nSWQsIGFkZHJlc3MgaW5kZXhlZCByZWNpcGllbnQsIHVpbnQyNTYgYW1vdW50KScsXG5dKTtcblxuLyoqXG4gKiBEZWZhdWx0IFJveWFsdHkgY29udHJhY3QgY29uZmlndXJhdGlvblxuICovXG5leHBvcnQgY29uc3QgREVGQVVMVF9ST1lBTFRZX0FERFJFU1M6IEFkZHJlc3MgPSAnMHgwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwJzsgLy8gUmVwbGFjZSB3aXRoIGFjdHVhbCBhZGRyZXNzXG5cbi8qKlxuICogUm95YWx0eSBvcGVyYXRpb25zXG4gKi9cbmV4cG9ydCBjbGFzcyBSb3lhbHR5IHtcbiAgcHJpdmF0ZSBjbGllbnQ6IE11eml4Q2xpZW50O1xuICBwcml2YXRlIGNvbnRyYWN0QWRkcmVzczogQWRkcmVzcztcblxuICBjb25zdHJ1Y3RvcihjbGllbnQ6IE11eml4Q2xpZW50LCBjb250cmFjdEFkZHJlc3M6IEFkZHJlc3MgPSBERUZBVUxUX1JPWUFMVFlfQUREUkVTUykge1xuICAgIHRoaXMuY2xpZW50ID0gY2xpZW50O1xuICAgIHRoaXMuY29udHJhY3RBZGRyZXNzID0gY29udHJhY3RBZGRyZXNzO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjb250cmFjdCBhZGRyZXNzXG4gICAqL1xuICBnZXQgYWRkcmVzcygpOiBBZGRyZXNzIHtcbiAgICByZXR1cm4gdGhpcy5jb250cmFjdEFkZHJlc3M7XG4gIH1cblxuICAvKipcbiAgICogUXVlcnkgcm95YWx0eSBzcGxpdHMgZm9yIGEgY2F0YWxvZ1xuICAgKi9cbiAgYXN5bmMgZ2V0Um95YWx0eVNwbGl0cyhwYXJhbXM6IFF1ZXJ5Um95YWx0eVNwbGl0c1BhcmFtcyk6IFByb21pc2U8Um95YWx0eVNwbGl0W10+IHtcbiAgICB0cnkge1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5jbGllbnQucHVibGljQ2xpZW50LnJlYWRDb250cmFjdCh7XG4gICAgICAgIGFkZHJlc3M6IHRoaXMuY29udHJhY3RBZGRyZXNzLFxuICAgICAgICBhYmk6IFJPWUFMVFlfQUJJLFxuICAgICAgICBmdW5jdGlvbk5hbWU6ICdnZXRTcGxpdHMnLFxuICAgICAgICBhcmdzOiBbQmlnSW50KHBhcmFtcy5jYXRhbG9nSWQpXSxcbiAgICAgIH0pO1xuXG4gICAgICAvLyBQYXJzZSByZXN1bHQgKHBhcmFsbGVsIGFycmF5cylcbiAgICAgIGNvbnN0IFtyZWNpcGllbnRzLCBwZXJjZW50YWdlc10gPSByZXN1bHQgYXMgdW5rbm93biBhcyBbQWRkcmVzc1tdLCBiaWdpbnRbXV07XG4gICAgICBcbiAgICAgIHJldHVybiByZWNpcGllbnRzLm1hcCgocmVjaXBpZW50LCBpbmRleCkgPT4gKHtcbiAgICAgICAgcmVjaXBpZW50LFxuICAgICAgICBwZXJjZW50YWdlOiBOdW1iZXIocGVyY2VudGFnZXNbaW5kZXhdKSxcbiAgICAgIH0pKTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhyb3cgbmV3IE11eml4U0RLRXJyb3IoXG4gICAgICAgIGBGYWlsZWQgdG8gZ2V0IHJveWFsdHkgc3BsaXRzIGZvciBjYXRhbG9nICR7cGFyYW1zLmNhdGFsb2dJZH1gLFxuICAgICAgICAnR0VUX1NQTElUU19FUlJPUicsXG4gICAgICAgIGVycm9yXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdW5jbGFpbWVkIHJveWFsdHkgZm9yIGEgcmVjaXBpZW50XG4gICAqL1xuICBhc3luYyBnZXRVbmNsYWltZWRSb3lhbHR5KGNhdGFsb2dJZDogc3RyaW5nLCByZWNpcGllbnQ6IEFkZHJlc3MpOiBQcm9taXNlPGJpZ2ludD4ge1xuICAgIHRyeSB7XG4gICAgICByZXR1cm4gdGhpcy5jbGllbnQucHVibGljQ2xpZW50LnJlYWRDb250cmFjdCh7XG4gICAgICAgIGFkZHJlc3M6IHRoaXMuY29udHJhY3RBZGRyZXNzLFxuICAgICAgICBhYmk6IFJPWUFMVFlfQUJJLFxuICAgICAgICBmdW5jdGlvbk5hbWU6ICdnZXRVbmNsYWltZWRSb3lhbHR5JyxcbiAgICAgICAgYXJnczogW0JpZ0ludChjYXRhbG9nSWQpLCByZWNpcGllbnRdLFxuICAgICAgfSkgYXMgUHJvbWlzZTxiaWdpbnQ+O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aHJvdyBuZXcgTXV6aXhTREtFcnJvcihcbiAgICAgICAgJ0ZhaWxlZCB0byBnZXQgdW5jbGFpbWVkIHJveWFsdHknLFxuICAgICAgICAnR0VUX1VOQ0xBSU1FRF9FUlJPUicsXG4gICAgICAgIGVycm9yXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdG90YWwgZGlzdHJpYnV0ZWQgcm95YWx0eSBmb3IgYSBjYXRhbG9nXG4gICAqL1xuICBhc3luYyBnZXRUb3RhbERpc3RyaWJ1dGVkKGNhdGFsb2dJZDogc3RyaW5nKTogUHJvbWlzZTxiaWdpbnQ+IHtcbiAgICB0cnkge1xuICAgICAgcmV0dXJuIHRoaXMuY2xpZW50LnB1YmxpY0NsaWVudC5yZWFkQ29udHJhY3Qoe1xuICAgICAgICBhZGRyZXNzOiB0aGlzLmNvbnRyYWN0QWRkcmVzcyxcbiAgICAgICAgYWJpOiBST1lBTFRZX0FCSSxcbiAgICAgICAgZnVuY3Rpb25OYW1lOiAnZ2V0VG90YWxEaXN0cmlidXRlZCcsXG4gICAgICAgIGFyZ3M6IFtCaWdJbnQoY2F0YWxvZ0lkKV0sXG4gICAgICB9KSBhcyBQcm9taXNlPGJpZ2ludD47XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRocm93IG5ldyBNdXppeFNES0Vycm9yKFxuICAgICAgICAnRmFpbGVkIHRvIGdldCB0b3RhbCBkaXN0cmlidXRlZCByb3lhbHR5JyxcbiAgICAgICAgJ0dFVF9UT1RBTF9ESVNUUklCVVRFRF9FUlJPUicsXG4gICAgICAgIGVycm9yXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBDYWxjdWxhdGUgcm95YWx0eSBkaXN0cmlidXRpb25cbiAgICovXG4gIGFzeW5jIGNhbGN1bGF0ZURpc3RyaWJ1dGlvbihjYXRhbG9nSWQ6IHN0cmluZywgdG90YWxBbW91bnQ6IGJpZ2ludCk6IFByb21pc2U8TWFwPEFkZHJlc3MsIGJpZ2ludD4+IHtcbiAgICBjb25zdCBzcGxpdHMgPSBhd2FpdCB0aGlzLmdldFJveWFsdHlTcGxpdHMoeyBjYXRhbG9nSWQgfSk7XG4gICAgXG4gICAgY29uc3QgZGlzdHJpYnV0aW9uID0gbmV3IE1hcDxBZGRyZXNzLCBiaWdpbnQ+KCk7XG4gICAgbGV0IHRvdGFsUGVyY2VudGFnZSA9IDA7XG5cbiAgICBmb3IgKGNvbnN0IHNwbGl0IG9mIHNwbGl0cykge1xuICAgICAgdG90YWxQZXJjZW50YWdlICs9IHNwbGl0LnBlcmNlbnRhZ2U7XG4gICAgICBjb25zdCBhbW91bnQgPSAodG90YWxBbW91bnQgKiBCaWdJbnQoc3BsaXQucGVyY2VudGFnZSkpIC8gQmlnSW50KDEwMDAwKTtcbiAgICAgIGRpc3RyaWJ1dGlvbi5zZXQoc3BsaXQucmVjaXBpZW50LCBhbW91bnQpO1xuICAgIH1cblxuICAgIC8vIFZlcmlmeSB0b3RhbCBwZXJjZW50YWdlIGlzIDEwMDAwICgxMDAlKVxuICAgIGlmICh0b3RhbFBlcmNlbnRhZ2UgIT09IDEwMDAwKSB7XG4gICAgICBjb25zb2xlLndhcm4oYFJveWFsdHkgc3BsaXRzIHRvdGFsICR7dG90YWxQZXJjZW50YWdlfSBiYXNpcyBwb2ludHMgKGV4cGVjdGVkIDEwMDAwKWApO1xuICAgIH1cblxuICAgIHJldHVybiBkaXN0cmlidXRpb247XG4gIH1cblxuICAvKipcbiAgICogRGlzdHJpYnV0ZSByb3lhbHR5IGZvciBhIGNhdGFsb2dcbiAgICogUmVxdWlyZXMgd2FsbGV0IGNvbm5lY3Rpb25cbiAgICovXG4gIGFzeW5jIGRpc3RyaWJ1dGVSb3lhbHR5KGNhdGFsb2dJZDogc3RyaW5nLCBhbW91bnQ6IGJpZ2ludCkge1xuICAgIGlmICghdGhpcy5jbGllbnQud2FsbGV0Q2xpZW50KSB7XG4gICAgICB0aHJvdyBuZXcgTXV6aXhTREtFcnJvcihcbiAgICAgICAgJ1dhbGxldCBub3QgY29ubmVjdGVkLiBDb25uZWN0IHdhbGxldCB0byBkaXN0cmlidXRlIHJveWFsdHkuJyxcbiAgICAgICAgJ1dBTExFVF9OT1RfQ09OTkVDVEVEJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IHRoaXMuY2xpZW50LmdldFdhbGxldEFkZHJlc3MoKTtcbiAgICAgIGlmICghYWNjb3VudCkge1xuICAgICAgICB0aHJvdyBuZXcgTXV6aXhTREtFcnJvcignTm8gd2FsbGV0IGFjY291bnQgZm91bmQnLCAnTk9fQUNDT1VOVCcpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBoYXNoID0gYXdhaXQgKHRoaXMuY2xpZW50LndhbGxldENsaWVudCBhcyBhbnkpLndyaXRlQ29udHJhY3Qoe1xuICAgICAgICBhZGRyZXNzOiB0aGlzLmNvbnRyYWN0QWRkcmVzcyxcbiAgICAgICAgYWJpOiBST1lBTFRZX0FCSSxcbiAgICAgICAgZnVuY3Rpb25OYW1lOiAnZGlzdHJpYnV0ZVJveWFsdHknLFxuICAgICAgICBhcmdzOiBbQmlnSW50KGNhdGFsb2dJZCksIGFtb3VudF0sXG4gICAgICAgIGFjY291bnQsXG4gICAgICAgIGNoYWluOiBudWxsLFxuICAgICAgfSk7XG5cbiAgICAgIHJldHVybiB7XG4gICAgICAgIGhhc2gsXG4gICAgICAgIHdhaXQ6IGFzeW5jICgpID0+IHtcbiAgICAgICAgICBjb25zdCByZWNlaXB0ID0gYXdhaXQgdGhpcy5jbGllbnQucHVibGljQ2xpZW50LndhaXRGb3JUcmFuc2FjdGlvblJlY2VpcHQoeyBoYXNoIH0pO1xuICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzdWNjZXNzOiByZWNlaXB0LnN0YXR1cyA9PT0gJ3N1Y2Nlc3MnLFxuICAgICAgICAgICAgYmxvY2tOdW1iZXI6IHJlY2VpcHQuYmxvY2tOdW1iZXIsXG4gICAgICAgICAgICBnYXNVc2VkOiByZWNlaXB0Lmdhc1VzZWQsXG4gICAgICAgICAgfTtcbiAgICAgICAgfSxcbiAgICAgIH07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRocm93IG5ldyBNdXppeFNES0Vycm9yKFxuICAgICAgICAnRmFpbGVkIHRvIGRpc3RyaWJ1dGUgcm95YWx0eScsXG4gICAgICAgICdESVNUUklCVVRFX0VSUk9SJyxcbiAgICAgICAgZXJyb3JcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENsYWltIHJveWFsdHkgZm9yIGEgY2F0YWxvZ1xuICAgKiBSZXF1aXJlcyB3YWxsZXQgY29ubmVjdGlvblxuICAgKi9cbiAgYXN5bmMgY2xhaW1Sb3lhbHR5KGNhdGFsb2dJZDogc3RyaW5nKSB7XG4gICAgaWYgKCF0aGlzLmNsaWVudC53YWxsZXRDbGllbnQpIHtcbiAgICAgIHRocm93IG5ldyBNdXppeFNES0Vycm9yKFxuICAgICAgICAnV2FsbGV0IG5vdCBjb25uZWN0ZWQuIENvbm5lY3Qgd2FsbGV0IHRvIGNsYWltIHJveWFsdHkuJyxcbiAgICAgICAgJ1dBTExFVF9OT1RfQ09OTkVDVEVEJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IHRoaXMuY2xpZW50LmdldFdhbGxldEFkZHJlc3MoKTtcbiAgICAgIGlmICghYWNjb3VudCkge1xuICAgICAgICB0aHJvdyBuZXcgTXV6aXhTREtFcnJvcignTm8gd2FsbGV0IGFjY291bnQgZm91bmQnLCAnTk9fQUNDT1VOVCcpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBoYXNoID0gYXdhaXQgKHRoaXMuY2xpZW50LndhbGxldENsaWVudCBhcyBhbnkpLndyaXRlQ29udHJhY3Qoe1xuICAgICAgICBhZGRyZXNzOiB0aGlzLmNvbnRyYWN0QWRkcmVzcyxcbiAgICAgICAgYWJpOiBST1lBTFRZX0FCSSxcbiAgICAgICAgZnVuY3Rpb25OYW1lOiAnY2xhaW1Sb3lhbHR5JyxcbiAgICAgICAgYXJnczogW0JpZ0ludChjYXRhbG9nSWQpXSxcbiAgICAgICAgYWNjb3VudCxcbiAgICAgICAgY2hhaW46IG51bGwsXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaGFzaCxcbiAgICAgICAgd2FpdDogYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJlY2VpcHQgPSBhd2FpdCB0aGlzLmNsaWVudC5wdWJsaWNDbGllbnQud2FpdEZvclRyYW5zYWN0aW9uUmVjZWlwdCh7IGhhc2ggfSk7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHJlY2VpcHQuc3RhdHVzID09PSAnc3VjY2VzcycsXG4gICAgICAgICAgICBibG9ja051bWJlcjogcmVjZWlwdC5ibG9ja051bWJlcixcbiAgICAgICAgICAgIGdhc1VzZWQ6IHJlY2VpcHQuZ2FzVXNlZCxcbiAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhyb3cgbmV3IE11eml4U0RLRXJyb3IoXG4gICAgICAgICdGYWlsZWQgdG8gY2xhaW0gcm95YWx0eScsXG4gICAgICAgICdDTEFJTV9FUlJPUicsXG4gICAgICAgIGVycm9yXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgcm95YWx0eSBwYXltZW50IGhpc3RvcnlcbiAgICogTm90ZTogVGhpcyB3b3VsZCB0eXBpY2FsbHkgcXVlcnkgZXZlbnRzIGZyb20gdGhlIGJsb2NrY2hhaW5cbiAgICovXG4gIGFzeW5jIGdldFJveWFsdHlIaXN0b3J5KGNhdGFsb2dJZDogc3RyaW5nKTogUHJvbWlzZTxSb3lhbHR5UGF5bWVudFtdPiB7XG4gICAgLy8gSW4gcHJvZHVjdGlvbiwgdGhpcyB3b3VsZCBxdWVyeSBldmVudCBsb2dzXG4gICAgLy8gRm9yIG5vdywgcmV0dXJuIGVtcHR5IGFycmF5XG4gICAgcmV0dXJuIFtdO1xuICB9XG5cbiAgLyoqXG4gICAqIFZhbGlkYXRlIHJveWFsdHkgc3BsaXRzXG4gICAqL1xuICB2YWxpZGF0ZVNwbGl0cyhzcGxpdHM6IFJveWFsdHlTcGxpdFtdKTogeyB2YWxpZDogYm9vbGVhbjsgZXJyb3JzOiBzdHJpbmdbXSB9IHtcbiAgICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW107XG4gICAgbGV0IHRvdGFsUGVyY2VudGFnZSA9IDA7XG5cbiAgICBmb3IgKGNvbnN0IHNwbGl0IG9mIHNwbGl0cykge1xuICAgICAgaWYgKHNwbGl0LnBlcmNlbnRhZ2UgPCAwIHx8IHNwbGl0LnBlcmNlbnRhZ2UgPiAxMDAwMCkge1xuICAgICAgICBlcnJvcnMucHVzaChgSW52YWxpZCBwZXJjZW50YWdlIGZvciAke3NwbGl0LnJlY2lwaWVudH06ICR7c3BsaXQucGVyY2VudGFnZX1gKTtcbiAgICAgIH1cbiAgICAgIHRvdGFsUGVyY2VudGFnZSArPSBzcGxpdC5wZXJjZW50YWdlO1xuICAgIH1cblxuICAgIGlmICh0b3RhbFBlcmNlbnRhZ2UgIT09IDEwMDAwKSB7XG4gICAgICBlcnJvcnMucHVzaChgVG90YWwgcGVyY2VudGFnZSBtdXN0IGJlIDEwMDAwICgxMDAlKSwgZ290ICR7dG90YWxQZXJjZW50YWdlfWApO1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICB2YWxpZDogZXJyb3JzLmxlbmd0aCA9PT0gMCxcbiAgICAgIGVycm9ycyxcbiAgICB9O1xuICB9XG59XG4iXX0=