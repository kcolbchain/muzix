"use strict";
/**
 * MUSD Module - MUSD stablecoin operations
 *
 * MUSD is the music stablecoin for industry settlement on Muzix chain.
 * It enables instant, transparent, global music payments with real-time
 * royalty splits.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MUSD = exports.DEFAULT_MUSD_CONFIG = void 0;
const viem_1 = require("viem");
const types_1 = require("./types");
// MUSD Contract ABI (simplified - replace with actual contract ABI)
const MUSD_ABI = (0, viem_1.parseAbi)([
    'function name() view returns (string)',
    'function symbol() view returns (string)',
    'function decimals() view returns (uint8)',
    'function totalSupply() view returns (uint256)',
    'function balanceOf(address account) view returns (uint256)',
    'function transfer(address to, uint256 amount) returns (bool)',
    'function allowance(address owner, address spender) view returns (uint256)',
    'function approve(address spender, uint256 amount) returns (bool)',
    'function transferFrom(address from, address to, uint256 amount) returns (bool)',
    'function mint(address to, uint256 amount)',
    'function burn(address from, uint256 amount)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'event Approval(address indexed owner, address indexed spender, uint256 value)',
]);
/**
 * Default MUSD configuration for testnet
 * Replace with actual contract addresses for mainnet
 */
exports.DEFAULT_MUSD_CONFIG = {
    address: '0x0000000000000000000000000000000000000000', // Replace with actual address
    decimals: 6,
    symbol: 'MUSD',
    name: 'Music USD',
};
/**
 * MUSD stablecoin operations
 */
class MUSD {
    constructor(client, config = exports.DEFAULT_MUSD_CONFIG) {
        this.client = client;
        this.config = config;
    }
    /**
     * Get MUSD contract address
     */
    get address() {
        return this.config.address;
    }
    /**
     * Get token symbol
     */
    async getSymbol() {
        return this.client.publicClient.readContract({
            address: this.config.address,
            abi: MUSD_ABI,
            functionName: 'symbol',
        });
    }
    /**
     * Get token name
     */
    async getName() {
        return this.client.publicClient.readContract({
            address: this.config.address,
            abi: MUSD_ABI,
            functionName: 'name',
        });
    }
    /**
     * Get token decimals
     */
    async getDecimals() {
        return this.client.publicClient.readContract({
            address: this.config.address,
            abi: MUSD_ABI,
            functionName: 'decimals',
        });
    }
    /**
     * Get total supply
     */
    async getTotalSupply() {
        return this.client.publicClient.readContract({
            address: this.config.address,
            abi: MUSD_ABI,
            functionName: 'totalSupply',
        });
    }
    /**
     * Get balance of an account
     */
    async getBalance(account) {
        return this.client.publicClient.readContract({
            address: this.config.address,
            abi: MUSD_ABI,
            functionName: 'balanceOf',
            args: [account],
        });
    }
    /**
     * Format balance to human-readable string
     */
    async formatBalance(balance) {
        const decimals = await this.getDecimals();
        return (0, viem_1.formatUnits)(balance, decimals);
    }
    /**
     * Mint MUSD tokens
     * Requires wallet connection and appropriate permissions
     */
    async mint(params) {
        if (!this.client.walletClient) {
            throw new types_1.MuzixSDKError('Wallet not connected. Connect wallet to mint MUSD.', 'WALLET_NOT_CONNECTED');
        }
        try {
            const account = await this.client.getWalletAddress();
            if (!account) {
                throw new types_1.MuzixSDKError('No wallet account found', 'NO_ACCOUNT');
            }
            const hash = await this.client.walletClient.writeContract({
                address: this.config.address,
                abi: MUSD_ABI,
                functionName: 'mint',
                args: [params.to, params.amount],
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
            throw new types_1.MuzixSDKError('Failed to mint MUSD', 'MINT_ERROR', error);
        }
    }
    /**
     * Burn MUSD tokens
     * Requires wallet connection and appropriate permissions
     */
    async burn(params) {
        if (!this.client.walletClient) {
            throw new types_1.MuzixSDKError('Wallet not connected. Connect wallet to burn MUSD.', 'WALLET_NOT_CONNECTED');
        }
        try {
            const account = await this.client.getWalletAddress();
            if (!account) {
                throw new types_1.MuzixSDKError('No wallet account found', 'NO_ACCOUNT');
            }
            const hash = await this.client.walletClient.writeContract({
                address: this.config.address,
                abi: MUSD_ABI,
                functionName: 'burn',
                args: [params.from, params.amount],
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
            throw new types_1.MuzixSDKError('Failed to burn MUSD', 'BURN_ERROR', error);
        }
    }
    /**
     * Transfer MUSD tokens
     */
    async transfer(to, amount) {
        if (!this.client.walletClient) {
            throw new types_1.MuzixSDKError('Wallet not connected. Connect wallet to transfer MUSD.', 'WALLET_NOT_CONNECTED');
        }
        try {
            const account = await this.client.getWalletAddress();
            if (!account) {
                throw new types_1.MuzixSDKError('No wallet account found', 'NO_ACCOUNT');
            }
            const hash = await this.client.walletClient.writeContract({
                address: this.config.address,
                abi: MUSD_ABI,
                functionName: 'transfer',
                args: [to, amount],
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
            throw new types_1.MuzixSDKError('Failed to transfer MUSD', 'TRANSFER_ERROR', error);
        }
    }
}
exports.MUSD = MUSD;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibXVzZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uL3NyYy9tdXNkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7O0dBTUc7OztBQUVILCtCQUFzRDtBQUV0RCxtQ0FNaUI7QUFFakIsb0VBQW9FO0FBQ3BFLE1BQU0sUUFBUSxHQUFHLElBQUEsZUFBUSxFQUFDO0lBQ3hCLHVDQUF1QztJQUN2Qyx5Q0FBeUM7SUFDekMsMENBQTBDO0lBQzFDLCtDQUErQztJQUMvQyw0REFBNEQ7SUFDNUQsOERBQThEO0lBQzlELDJFQUEyRTtJQUMzRSxrRUFBa0U7SUFDbEUsZ0ZBQWdGO0lBQ2hGLDJDQUEyQztJQUMzQyw2Q0FBNkM7SUFDN0MseUVBQXlFO0lBQ3pFLCtFQUErRTtDQUNoRixDQUFDLENBQUM7QUFFSDs7O0dBR0c7QUFDVSxRQUFBLG1CQUFtQixHQUFlO0lBQzdDLE9BQU8sRUFBRSw0Q0FBNEMsRUFBRSw4QkFBOEI7SUFDckYsUUFBUSxFQUFFLENBQUM7SUFDWCxNQUFNLEVBQUUsTUFBTTtJQUNkLElBQUksRUFBRSxXQUFXO0NBQ2xCLENBQUM7QUFFRjs7R0FFRztBQUNILE1BQWEsSUFBSTtJQUlmLFlBQVksTUFBbUIsRUFBRSxTQUFxQiwyQkFBbUI7UUFDdkUsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7UUFDckIsSUFBSSxDQUFDLE1BQU0sR0FBRyxNQUFNLENBQUM7SUFDdkIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBSSxPQUFPO1FBQ1QsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQztJQUM3QixDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsU0FBUztRQUNiLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDO1lBQzNDLE9BQU8sRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU87WUFDNUIsR0FBRyxFQUFFLFFBQVE7WUFDYixZQUFZLEVBQUUsUUFBUTtT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QkFDTCxJQUFJO2dCQUNKLElBQUksRUFBRSxLQUFLLElBQUksRUFBRTtvQkFDZixNQUFNLE9BQU8sR0FBRyxNQUFNLElBQUksQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLHlCQUF5QixDQUFDLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQztvQkFDbkYsT0FBTzt3QkFDTCxPQUFPLEVBQUUsT0FBTyxDQUFDLE1BQU0sS0FBSyxTQUFTO3dCQUNyQyxXQUFXLEVBQUUsT0FBTyxDQUFDLFdBQVc7d0JBQ2hDLE9BQU8sRUFBRSxPQUFPLENBQUMsT0FBTztxQkFDekIsQ0FBQztnQkFDSixDQUFDO2FBQ0YsQ0FBQztRQUNKLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsTUFBTSxJQUFJLHFCQUFhLENBQ3JCLHlCQUF5QixFQUN6QixnQkFBZ0IsRUFDaEIsS0FBSyxDQUNOLENBQUM7UUFDSixDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBM05ELG9CQTJOQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogTVVTRCBNb2R1bGUgLSBNVVNEIHN0YWJsZWNvaW4gb3BlcmF0aW9uc1xuICogXG4gKiBNVVNEIGlzIHRoZSBtdXNpYyBzdGFibGVjb2luIGZvciBpbmR1c3RyeSBzZXR0bGVtZW50IG9uIE11eml4IGNoYWluLlxuICogSXQgZW5hYmxlcyBpbnN0YW50LCB0cmFuc3BhcmVudCwgZ2xvYmFsIG11c2ljIHBheW1lbnRzIHdpdGggcmVhbC10aW1lXG4gKiByb3lhbHR5IHNwbGl0cy5cbiAqL1xuXG5pbXBvcnQgeyBBZGRyZXNzLCBwYXJzZUFiaSwgZm9ybWF0VW5pdHMgfSBmcm9tICd2aWVtJztcbmltcG9ydCB7IE11eml4Q2xpZW50IH0gZnJvbSAnLi9jbGllbnQnO1xuaW1wb3J0IHtcbiAgTVVTRENvbmZpZyxcbiAgTWludE1VU0RQYXJhbXMsXG4gIEJ1cm5NVVNEUGFyYW1zLFxuICBUcmFuc2FjdGlvblJlc3VsdCxcbiAgTXV6aXhTREtFcnJvcixcbn0gZnJvbSAnLi90eXBlcyc7XG5cbi8vIE1VU0QgQ29udHJhY3QgQUJJIChzaW1wbGlmaWVkIC0gcmVwbGFjZSB3aXRoIGFjdHVhbCBjb250cmFjdCBBQkkpXG5jb25zdCBNVVNEX0FCSSA9IHBhcnNlQWJpKFtcbiAgJ2Z1bmN0aW9uIG5hbWUoKSB2aWV3IHJldHVybnMgKHN0cmluZyknLFxuICAnZnVuY3Rpb24gc3ltYm9sKCkgdmlldyByZXR1cm5zIChzdHJpbmcpJyxcbiAgJ2Z1bmN0aW9uIGRlY2ltYWxzKCkgdmlldyByZXR1cm5zICh1aW50OCknLFxuICAnZnVuY3Rpb24gdG90YWxTdXBwbHkoKSB2aWV3IHJldHVybnMgKHVpbnQyNTYpJyxcbiAgJ2Z1bmN0aW9uIGJhbGFuY2VPZihhZGRyZXNzIGFjY291bnQpIHZpZXcgcmV0dXJucyAodWludDI1NiknLFxuICAnZnVuY3Rpb24gdHJhbnNmZXIoYWRkcmVzcyB0bywgdWludDI1NiBhbW91bnQpIHJldHVybnMgKGJvb2wpJyxcbiAgJ2Z1bmN0aW9uIGFsbG93YW5jZShhZGRyZXNzIG93bmVyLCBhZGRyZXNzIHNwZW5kZXIpIHZpZXcgcmV0dXJucyAodWludDI1NiknLFxuICAnZnVuY3Rpb24gYXBwcm92ZShhZGRyZXNzIHNwZW5kZXIsIHVpbnQyNTYgYW1vdW50KSByZXR1cm5zIChib29sKScsXG4gICdmdW5jdGlvbiB0cmFuc2ZlckZyb20oYWRkcmVzcyBmcm9tLCBhZGRyZXNzIHRvLCB1aW50MjU2IGFtb3VudCkgcmV0dXJucyAoYm9vbCknLFxuICAnZnVuY3Rpb24gbWludChhZGRyZXNzIHRvLCB1aW50MjU2IGFtb3VudCknLFxuICAnZnVuY3Rpb24gYnVybihhZGRyZXNzIGZyb20sIHVpbnQyNTYgYW1vdW50KScsXG4gICdldmVudCBUcmFuc2ZlcihhZGRyZXNzIGluZGV4ZWQgZnJvbSwgYWRkcmVzcyBpbmRleGVkIHRvLCB1aW50MjU2IHZhbHVlKScsXG4gICdldmVudCBBcHByb3ZhbChhZGRyZXNzIGluZGV4ZWQgb3duZXIsIGFkZHJlc3MgaW5kZXhlZCBzcGVuZGVyLCB1aW50MjU2IHZhbHVlKScsXG5dKTtcblxuLyoqXG4gKiBEZWZhdWx0IE1VU0QgY29uZmlndXJhdGlvbiBmb3IgdGVzdG5ldFxuICogUmVwbGFjZSB3aXRoIGFjdHVhbCBjb250cmFjdCBhZGRyZXNzZXMgZm9yIG1haW5uZXRcbiAqL1xuZXhwb3J0IGNvbnN0IERFRkFVTFRfTVVTRF9DT05GSUc6IE1VU0RDb25maWcgPSB7XG4gIGFkZHJlc3M6ICcweDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAwMDAnLCAvLyBSZXBsYWNlIHdpdGggYWN0dWFsIGFkZHJlc3NcbiAgZGVjaW1hbHM6IDYsXG4gIHN5bWJvbDogJ01VU0QnLFxuICBuYW1lOiAnTXVzaWMgVVNEJyxcbn07XG5cbi8qKlxuICogTVVTRCBzdGFibGVjb2luIG9wZXJhdGlvbnNcbiAqL1xuZXhwb3J0IGNsYXNzIE1VU0Qge1xuICBwcml2YXRlIGNsaWVudDogTXV6aXhDbGllbnQ7XG4gIHByaXZhdGUgY29uZmlnOiBNVVNEQ29uZmlnO1xuXG4gIGNvbnN0cnVjdG9yKGNsaWVudDogTXV6aXhDbGllbnQsIGNvbmZpZzogTVVTRENvbmZpZyA9IERFRkFVTFRfTVVTRF9DT05GSUcpIHtcbiAgICB0aGlzLmNsaWVudCA9IGNsaWVudDtcbiAgICB0aGlzLmNvbmZpZyA9IGNvbmZpZztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgTVVTRCBjb250cmFjdCBhZGRyZXNzXG4gICAqL1xuICBnZXQgYWRkcmVzcygpOiBBZGRyZXNzIHtcbiAgICByZXR1cm4gdGhpcy5jb25maWcuYWRkcmVzcztcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdG9rZW4gc3ltYm9sXG4gICAqL1xuICBhc3luYyBnZXRTeW1ib2woKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gdGhpcy5jbGllbnQucHVibGljQ2xpZW50LnJlYWRDb250cmFjdCh7XG4gICAgICBhZGRyZXNzOiB0aGlzLmNvbmZpZy5hZGRyZXNzLFxuICAgICAgYWJpOiBNVVNEX0FCSSxcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ3N5bWJvbCcsXG4gICAgfSk7XG4gIH1cblxuICAvKipcbiAgICogR2V0IHRva2VuIG5hbWVcbiAgICovXG4gIGFzeW5jIGdldE5hbWUoKTogUHJvbWlzZTxzdHJpbmc+IHtcbiAgICByZXR1cm4gdGhpcy5jbGllbnQucHVibGljQ2xpZW50LnJlYWRDb250cmFjdCh7XG4gICAgICBhZGRyZXNzOiB0aGlzLmNvbmZpZy5hZGRyZXNzLFxuICAgICAgYWJpOiBNVVNEX0FCSSxcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ25hbWUnLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCB0b2tlbiBkZWNpbWFsc1xuICAgKi9cbiAgYXN5bmMgZ2V0RGVjaW1hbHMoKTogUHJvbWlzZTxudW1iZXI+IHtcbiAgICByZXR1cm4gdGhpcy5jbGllbnQucHVibGljQ2xpZW50LnJlYWRDb250cmFjdCh7XG4gICAgICBhZGRyZXNzOiB0aGlzLmNvbmZpZy5hZGRyZXNzLFxuICAgICAgYWJpOiBNVVNEX0FCSSxcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ2RlY2ltYWxzJyxcbiAgICB9KTtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgdG90YWwgc3VwcGx5XG4gICAqL1xuICBhc3luYyBnZXRUb3RhbFN1cHBseSgpOiBQcm9taXNlPGJpZ2ludD4ge1xuICAgIHJldHVybiB0aGlzLmNsaWVudC5wdWJsaWNDbGllbnQucmVhZENvbnRyYWN0KHtcbiAgICAgIGFkZHJlc3M6IHRoaXMuY29uZmlnLmFkZHJlc3MsXG4gICAgICBhYmk6IE1VU0RfQUJJLFxuICAgICAgZnVuY3Rpb25OYW1lOiAndG90YWxTdXBwbHknLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBiYWxhbmNlIG9mIGFuIGFjY291bnRcbiAgICovXG4gIGFzeW5jIGdldEJhbGFuY2UoYWNjb3VudDogQWRkcmVzcyk6IFByb21pc2U8YmlnaW50PiB7XG4gICAgcmV0dXJuIHRoaXMuY2xpZW50LnB1YmxpY0NsaWVudC5yZWFkQ29udHJhY3Qoe1xuICAgICAgYWRkcmVzczogdGhpcy5jb25maWcuYWRkcmVzcyxcbiAgICAgIGFiaTogTVVTRF9BQkksXG4gICAgICBmdW5jdGlvbk5hbWU6ICdiYWxhbmNlT2YnLFxuICAgICAgYXJnczogW2FjY291bnRdLFxuICAgIH0pO1xuICB9XG5cbiAgLyoqXG4gICAqIEZvcm1hdCBiYWxhbmNlIHRvIGh1bWFuLXJlYWRhYmxlIHN0cmluZ1xuICAgKi9cbiAgYXN5bmMgZm9ybWF0QmFsYW5jZShiYWxhbmNlOiBiaWdpbnQpOiBQcm9taXNlPHN0cmluZz4ge1xuICAgIGNvbnN0IGRlY2ltYWxzID0gYXdhaXQgdGhpcy5nZXREZWNpbWFscygpO1xuICAgIHJldHVybiBmb3JtYXRVbml0cyhiYWxhbmNlLCBkZWNpbWFscyk7XG4gIH1cblxuICAvKipcbiAgICogTWludCBNVVNEIHRva2Vuc1xuICAgKiBSZXF1aXJlcyB3YWxsZXQgY29ubmVjdGlvbiBhbmQgYXBwcm9wcmlhdGUgcGVybWlzc2lvbnNcbiAgICovXG4gIGFzeW5jIG1pbnQocGFyYW1zOiBNaW50TVVTRFBhcmFtcyk6IFByb21pc2U8VHJhbnNhY3Rpb25SZXN1bHQ+IHtcbiAgICBpZiAoIXRoaXMuY2xpZW50LndhbGxldENsaWVudCkge1xuICAgICAgdGhyb3cgbmV3IE11eml4U0RLRXJyb3IoXG4gICAgICAgICdXYWxsZXQgbm90IGNvbm5lY3RlZC4gQ29ubmVjdCB3YWxsZXQgdG8gbWludCBNVVNELicsXG4gICAgICAgICdXQUxMRVRfTk9UX0NPTk5FQ1RFRCdcbiAgICAgICk7XG4gICAgfVxuXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGFjY291bnQgPSBhd2FpdCB0aGlzLmNsaWVudC5nZXRXYWxsZXRBZGRyZXNzKCk7XG4gICAgICBpZiAoIWFjY291bnQpIHtcbiAgICAgICAgdGhyb3cgbmV3IE11eml4U0RLRXJyb3IoJ05vIHdhbGxldCBhY2NvdW50IGZvdW5kJywgJ05PX0FDQ09VTlQnKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaGFzaCA9IGF3YWl0ICh0aGlzLmNsaWVudC53YWxsZXRDbGllbnQgYXMgYW55KS53cml0ZUNvbnRyYWN0KHtcbiAgICAgICAgYWRkcmVzczogdGhpcy5jb25maWcuYWRkcmVzcyxcbiAgICAgICAgYWJpOiBNVVNEX0FCSSxcbiAgICAgICAgZnVuY3Rpb25OYW1lOiAnbWludCcsXG4gICAgICAgIGFyZ3M6IFtwYXJhbXMudG8sIHBhcmFtcy5hbW91bnRdLFxuICAgICAgICBhY2NvdW50LFxuICAgICAgICBjaGFpbjogbnVsbCxcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBoYXNoLFxuICAgICAgICB3YWl0OiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgcmVjZWlwdCA9IGF3YWl0IHRoaXMuY2xpZW50LnB1YmxpY0NsaWVudC53YWl0Rm9yVHJhbnNhY3Rpb25SZWNlaXB0KHsgaGFzaCB9KTtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogcmVjZWlwdC5zdGF0dXMgPT09ICdzdWNjZXNzJyxcbiAgICAgICAgICAgIGJsb2NrTnVtYmVyOiByZWNlaXB0LmJsb2NrTnVtYmVyLFxuICAgICAgICAgICAgZ2FzVXNlZDogcmVjZWlwdC5nYXNVc2VkLFxuICAgICAgICAgIH07XG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aHJvdyBuZXcgTXV6aXhTREtFcnJvcihcbiAgICAgICAgJ0ZhaWxlZCB0byBtaW50IE1VU0QnLFxuICAgICAgICAnTUlOVF9FUlJPUicsXG4gICAgICAgIGVycm9yXG4gICAgICApO1xuICAgIH1cbiAgfVxuXG4gIC8qKlxuICAgKiBCdXJuIE1VU0QgdG9rZW5zXG4gICAqIFJlcXVpcmVzIHdhbGxldCBjb25uZWN0aW9uIGFuZCBhcHByb3ByaWF0ZSBwZXJtaXNzaW9uc1xuICAgKi9cbiAgYXN5bmMgYnVybihwYXJhbXM6IEJ1cm5NVVNEUGFyYW1zKTogUHJvbWlzZTxUcmFuc2FjdGlvblJlc3VsdD4ge1xuICAgIGlmICghdGhpcy5jbGllbnQud2FsbGV0Q2xpZW50KSB7XG4gICAgICB0aHJvdyBuZXcgTXV6aXhTREtFcnJvcihcbiAgICAgICAgJ1dhbGxldCBub3QgY29ubmVjdGVkLiBDb25uZWN0IHdhbGxldCB0byBidXJuIE1VU0QuJyxcbiAgICAgICAgJ1dBTExFVF9OT1RfQ09OTkVDVEVEJ1xuICAgICAgKTtcbiAgICB9XG5cbiAgICB0cnkge1xuICAgICAgY29uc3QgYWNjb3VudCA9IGF3YWl0IHRoaXMuY2xpZW50LmdldFdhbGxldEFkZHJlc3MoKTtcbiAgICAgIGlmICghYWNjb3VudCkge1xuICAgICAgICB0aHJvdyBuZXcgTXV6aXhTREtFcnJvcignTm8gd2FsbGV0IGFjY291bnQgZm91bmQnLCAnTk9fQUNDT1VOVCcpO1xuICAgICAgfVxuXG4gICAgICBjb25zdCBoYXNoID0gYXdhaXQgKHRoaXMuY2xpZW50LndhbGxldENsaWVudCBhcyBhbnkpLndyaXRlQ29udHJhY3Qoe1xuICAgICAgICBhZGRyZXNzOiB0aGlzLmNvbmZpZy5hZGRyZXNzLFxuICAgICAgICBhYmk6IE1VU0RfQUJJLFxuICAgICAgICBmdW5jdGlvbk5hbWU6ICdidXJuJyxcbiAgICAgICAgYXJnczogW3BhcmFtcy5mcm9tLCBwYXJhbXMuYW1vdW50XSxcbiAgICAgICAgYWNjb3VudCxcbiAgICAgICAgY2hhaW46IG51bGwsXG4gICAgICB9KTtcblxuICAgICAgcmV0dXJuIHtcbiAgICAgICAgaGFzaCxcbiAgICAgICAgd2FpdDogYXN5bmMgKCkgPT4ge1xuICAgICAgICAgIGNvbnN0IHJlY2VpcHQgPSBhd2FpdCB0aGlzLmNsaWVudC5wdWJsaWNDbGllbnQud2FpdEZvclRyYW5zYWN0aW9uUmVjZWlwdCh7IGhhc2ggfSk7XG4gICAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHN1Y2Nlc3M6IHJlY2VpcHQuc3RhdHVzID09PSAnc3VjY2VzcycsXG4gICAgICAgICAgICBibG9ja051bWJlcjogcmVjZWlwdC5ibG9ja051bWJlcixcbiAgICAgICAgICAgIGdhc1VzZWQ6IHJlY2VpcHQuZ2FzVXNlZCxcbiAgICAgICAgICB9O1xuICAgICAgICB9LFxuICAgICAgfTtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgdGhyb3cgbmV3IE11eml4U0RLRXJyb3IoXG4gICAgICAgICdGYWlsZWQgdG8gYnVybiBNVVNEJyxcbiAgICAgICAgJ0JVUk5fRVJST1InLFxuICAgICAgICBlcnJvclxuICAgICAgKTtcbiAgICB9XG4gIH1cblxuICAvKipcbiAgICogVHJhbnNmZXIgTVVTRCB0b2tlbnNcbiAgICovXG4gIGFzeW5jIHRyYW5zZmVyKHRvOiBBZGRyZXNzLCBhbW91bnQ6IGJpZ2ludCk6IFByb21pc2U8VHJhbnNhY3Rpb25SZXN1bHQ+IHtcbiAgICBpZiAoIXRoaXMuY2xpZW50LndhbGxldENsaWVudCkge1xuICAgICAgdGhyb3cgbmV3IE11eml4U0RLRXJyb3IoXG4gICAgICAgICdXYWxsZXQgbm90IGNvbm5lY3RlZC4gQ29ubmVjdCB3YWxsZXQgdG8gdHJhbnNmZXIgTVVTRC4nLFxuICAgICAgICAnV0FMTEVUX05PVF9DT05ORUNURUQnXG4gICAgICApO1xuICAgIH1cblxuICAgIHRyeSB7XG4gICAgICBjb25zdCBhY2NvdW50ID0gYXdhaXQgdGhpcy5jbGllbnQuZ2V0V2FsbGV0QWRkcmVzcygpO1xuICAgICAgaWYgKCFhY2NvdW50KSB7XG4gICAgICAgIHRocm93IG5ldyBNdXppeFNES0Vycm9yKCdObyB3YWxsZXQgYWNjb3VudCBmb3VuZCcsICdOT19BQ0NPVU5UJyk7XG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGhhc2ggPSBhd2FpdCAodGhpcy5jbGllbnQud2FsbGV0Q2xpZW50IGFzIGFueSkud3JpdGVDb250cmFjdCh7XG4gICAgICAgIGFkZHJlc3M6IHRoaXMuY29uZmlnLmFkZHJlc3MsXG4gICAgICAgIGFiaTogTVVTRF9BQkksXG4gICAgICAgIGZ1bmN0aW9uTmFtZTogJ3RyYW5zZmVyJyxcbiAgICAgICAgYXJnczogW3RvLCBhbW91bnRdLFxuICAgICAgICBhY2NvdW50LFxuICAgICAgICBjaGFpbjogbnVsbCxcbiAgICAgIH0pO1xuXG4gICAgICByZXR1cm4ge1xuICAgICAgICBoYXNoLFxuICAgICAgICB3YWl0OiBhc3luYyAoKSA9PiB7XG4gICAgICAgICAgY29uc3QgcmVjZWlwdCA9IGF3YWl0IHRoaXMuY2xpZW50LnB1YmxpY0NsaWVudC53YWl0Rm9yVHJhbnNhY3Rpb25SZWNlaXB0KHsgaGFzaCB9KTtcbiAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgc3VjY2VzczogcmVjZWlwdC5zdGF0dXMgPT09ICdzdWNjZXNzJyxcbiAgICAgICAgICAgIGJsb2NrTnVtYmVyOiByZWNlaXB0LmJsb2NrTnVtYmVyLFxuICAgICAgICAgICAgZ2FzVXNlZDogcmVjZWlwdC5nYXNVc2VkLFxuICAgICAgICAgIH07XG4gICAgICAgIH0sXG4gICAgICB9O1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICB0aHJvdyBuZXcgTXV6aXhTREtFcnJvcihcbiAgICAgICAgJ0ZhaWxlZCB0byB0cmFuc2ZlciBNVVNEJyxcbiAgICAgICAgJ1RSQU5TRkVSX0VSUk9SJyxcbiAgICAgICAgZXJyb3JcbiAgICAgICk7XG4gICAgfVxuICB9XG59XG4iXX0=