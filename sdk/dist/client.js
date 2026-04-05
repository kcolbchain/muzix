"use strict";
/**
 * Muzix Client - Main entry point for the SDK
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MuzixClient = void 0;
const viem_1 = require("viem");
const types_1 = require("./types");
const musd_1 = require("./musd");
const catalog_1 = require("./catalog");
const royalty_1 = require("./royalty");
const streaming_1 = require("./streaming");
/**
 * Main client for interacting with Muzix chain
 */
class MuzixClient {
    constructor(config) {
        this.chain = config.chain;
        // Initialize public client for read operations
        if (config.publicClient) {
            this.publicClient = config.publicClient;
        }
        else {
            this.publicClient = (0, viem_1.createPublicClient)({
                chain: {
                    id: config.chain.id,
                    name: config.chain.name,
                    nativeCurrency: config.chain.nativeCurrency,
                    rpcUrls: {
                        default: { http: [config.chain.rpcUrl] },
                        public: { http: [config.chain.rpcUrl] },
                    },
                },
                transport: (0, viem_1.http)(config.chain.rpcUrl),
            });
        }
        // Initialize wallet client for write operations
        if (config.walletClient) {
            this.walletClient = config.walletClient;
        }
        // Initialize feature modules
        this.musd = new musd_1.MUSD(this);
        this.catalog = new catalog_1.Catalog(this);
        this.royalty = new royalty_1.Royalty(this);
        this.streaming = new streaming_1.Streaming(this);
    }
    /**
     * Check if wallet is connected
     */
    get isWalletConnected() {
        return !!this.walletClient;
    }
    /**
     * Get connected wallet address
     */
    async getWalletAddress() {
        if (!this.walletClient) {
            return undefined;
        }
        try {
            const accounts = await this.walletClient.getAddresses();
            return accounts[0];
        }
        catch (error) {
            return undefined;
        }
    }
    /**
     * Connect wallet
     */
    async connectWallet(provider) {
        try {
            this.walletClient = (0, viem_1.createWalletClient)({
                chain: {
                    id: this.chain.id,
                    name: this.chain.name,
                    nativeCurrency: this.chain.nativeCurrency,
                    rpcUrls: {
                        default: { http: [this.chain.rpcUrl] },
                        public: { http: [this.chain.rpcUrl] },
                    },
                },
                transport: (0, viem_1.custom)(provider),
            });
        }
        catch (error) {
            throw new types_1.MuzixSDKError('Failed to connect wallet', 'WALLET_CONNECTION_ERROR', error);
        }
    }
    /**
     * Get chain ID
     */
    get chainId() {
        return this.chain.id;
    }
    /**
     * Get block number
     */
    async getBlockNumber() {
        return this.publicClient.getBlockNumber();
    }
    /**
     * Get balance of an address
     */
    async getBalance(address) {
        return this.publicClient.getBalance({ address });
    }
}
exports.MuzixClient = MuzixClient;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpZW50LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vc3JjL2NsaWVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7OztBQUVILCtCQUF3RztBQUN4RyxtQ0FBd0U7QUFDeEUsaUNBQThCO0FBQzlCLHVDQUFvQztBQUNwQyx1Q0FBb0M7QUFDcEMsMkNBQXdDO0FBRXhDOztHQUVHO0FBQ0gsTUFBYSxXQUFXO0lBV3RCLFlBQVksTUFBeUI7UUFDbkMsSUFBSSxDQUFDLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBSyxDQUFDO1FBRTFCLCtDQUErQztRQUMvQyxJQUFJLE1BQU0sQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN4QixJQUFJLENBQUMsWUFBWSxHQUFHLE1BQU0sQ0FBQyxZQUFZLENBQUM7UUFDMUMsQ0FBQzthQUFNLENBQUM7WUFDTixJQUFJLENBQUMsWUFBWSxHQUFHLElBQUEseUJBQWtCLEVBQUM7Z0JBQ3JDLEtBQUssRUFBRTtvQkFDTCxFQUFFLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUNuQixJQUFJLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxJQUFJO29CQUN2QixjQUFjLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxjQUFjO29CQUMzQyxPQUFPLEVBQUU7d0JBQ1AsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRTt3QkFDeEMsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRTtxQkFDeEM7aUJBQ0Y7Z0JBQ0QsU0FBUyxFQUFFLElBQUEsV0FBSSxFQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO2FBQ3JDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxnREFBZ0Q7UUFDaEQsSUFBSSxNQUFNLENBQUMsWUFBWSxFQUFFLENBQUM7WUFDeEIsSUFBSSxDQUFDLFlBQVksR0FBRyxNQUFNLENBQUMsWUFBWSxDQUFDO1FBQzFDLENBQUM7UUFFRCw2QkFBNkI7UUFDN0IsSUFBSSxDQUFDLElBQUksR0FBRyxJQUFJLFdBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUMzQixJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksaUJBQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsT0FBTyxHQUFHLElBQUksaUJBQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQztRQUNqQyxJQUFJLENBQUMsU0FBUyxHQUFHLElBQUkscUJBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztJQUN2QyxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFJLGlCQUFpQjtRQUNuQixPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUMsWUFBWSxDQUFDO0lBQzdCLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxnQkFBZ0I7UUFDcEIsSUFBSSxDQUFDLElBQUksQ0FBQyxZQUFZLEVBQUUsQ0FBQztZQUN2QixPQUFPLFNBQVMsQ0FBQztRQUNuQixDQUFDO1FBRUQsSUFBSSxDQUFDO1lBQ0gsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3hELE9BQU8sUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQ3JCLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxhQUFhLENBQUMsUUFBYTtRQUMvQixJQUFJLENBQUM7WUFDRixJQUFZLENBQUMsWUFBWSxHQUFHLElBQUEseUJBQWtCLEVBQUM7Z0JBQzlDLEtBQUssRUFBRTtvQkFDTCxFQUFFLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFO29CQUNqQixJQUFJLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJO29CQUNyQixjQUFjLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjO29CQUN6QyxPQUFPLEVBQUU7d0JBQ1AsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRTt3QkFDdEMsTUFBTSxFQUFFLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsRUFBRTtxQkFDdEM7aUJBQ0Y7Z0JBQ0QsU0FBUyxFQUFFLElBQUEsYUFBTSxFQUFDLFFBQVEsQ0FBQzthQUM1QixDQUFDLENBQUM7UUFDTCxDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE1BQU0sSUFBSSxxQkFBYSxDQUNyQiwwQkFBMEIsRUFDMUIseUJBQXlCLEVBQ3pCLEtBQUssQ0FDTixDQUFDO1FBQ0osQ0FBQztJQUNILENBQUM7SUFFRDs7T0FFRztJQUNILElBQUksT0FBTztRQUNULE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7SUFDdkIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGNBQWM7UUFDbEIsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLGNBQWMsRUFBRSxDQUFDO0lBQzVDLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBc0I7UUFDckMsT0FBTyxJQUFJLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxFQUFFLE9BQU8sRUFBRSxDQUFDLENBQUM7SUFDbkQsQ0FBQztDQUNGO0FBakhELGtDQWlIQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogTXV6aXggQ2xpZW50IC0gTWFpbiBlbnRyeSBwb2ludCBmb3IgdGhlIFNES1xuICovXG5cbmltcG9ydCB7IFB1YmxpY0NsaWVudCwgV2FsbGV0Q2xpZW50LCBjcmVhdGVQdWJsaWNDbGllbnQsIGNyZWF0ZVdhbGxldENsaWVudCwgaHR0cCwgY3VzdG9tIH0gZnJvbSAndmllbSc7XG5pbXBvcnQgeyBNdXppeENsaWVudENvbmZpZywgQ2hhaW5Db25maWcsIE11eml4U0RLRXJyb3IgfSBmcm9tICcuL3R5cGVzJztcbmltcG9ydCB7IE1VU0QgfSBmcm9tICcuL211c2QnO1xuaW1wb3J0IHsgQ2F0YWxvZyB9IGZyb20gJy4vY2F0YWxvZyc7XG5pbXBvcnQgeyBSb3lhbHR5IH0gZnJvbSAnLi9yb3lhbHR5JztcbmltcG9ydCB7IFN0cmVhbWluZyB9IGZyb20gJy4vc3RyZWFtaW5nJztcblxuLyoqXG4gKiBNYWluIGNsaWVudCBmb3IgaW50ZXJhY3Rpbmcgd2l0aCBNdXppeCBjaGFpblxuICovXG5leHBvcnQgY2xhc3MgTXV6aXhDbGllbnQge1xuICBwdWJsaWMgcmVhZG9ubHkgY2hhaW46IENoYWluQ29uZmlnO1xuICBwdWJsaWMgcmVhZG9ubHkgcHVibGljQ2xpZW50OiBQdWJsaWNDbGllbnQ7XG4gIHB1YmxpYyByZWFkb25seSB3YWxsZXRDbGllbnQ/OiBXYWxsZXRDbGllbnQ7XG5cbiAgLy8gRmVhdHVyZSBtb2R1bGVzXG4gIHB1YmxpYyByZWFkb25seSBtdXNkOiBNVVNEO1xuICBwdWJsaWMgcmVhZG9ubHkgY2F0YWxvZzogQ2F0YWxvZztcbiAgcHVibGljIHJlYWRvbmx5IHJveWFsdHk6IFJveWFsdHk7XG4gIHB1YmxpYyByZWFkb25seSBzdHJlYW1pbmc6IFN0cmVhbWluZztcblxuICBjb25zdHJ1Y3Rvcihjb25maWc6IE11eml4Q2xpZW50Q29uZmlnKSB7XG4gICAgdGhpcy5jaGFpbiA9IGNvbmZpZy5jaGFpbjtcblxuICAgIC8vIEluaXRpYWxpemUgcHVibGljIGNsaWVudCBmb3IgcmVhZCBvcGVyYXRpb25zXG4gICAgaWYgKGNvbmZpZy5wdWJsaWNDbGllbnQpIHtcbiAgICAgIHRoaXMucHVibGljQ2xpZW50ID0gY29uZmlnLnB1YmxpY0NsaWVudDtcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5wdWJsaWNDbGllbnQgPSBjcmVhdGVQdWJsaWNDbGllbnQoe1xuICAgICAgICBjaGFpbjoge1xuICAgICAgICAgIGlkOiBjb25maWcuY2hhaW4uaWQsXG4gICAgICAgICAgbmFtZTogY29uZmlnLmNoYWluLm5hbWUsXG4gICAgICAgICAgbmF0aXZlQ3VycmVuY3k6IGNvbmZpZy5jaGFpbi5uYXRpdmVDdXJyZW5jeSxcbiAgICAgICAgICBycGNVcmxzOiB7XG4gICAgICAgICAgICBkZWZhdWx0OiB7IGh0dHA6IFtjb25maWcuY2hhaW4ucnBjVXJsXSB9LFxuICAgICAgICAgICAgcHVibGljOiB7IGh0dHA6IFtjb25maWcuY2hhaW4ucnBjVXJsXSB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0sXG4gICAgICAgIHRyYW5zcG9ydDogaHR0cChjb25maWcuY2hhaW4ucnBjVXJsKSxcbiAgICAgIH0pO1xuICAgIH1cblxuICAgIC8vIEluaXRpYWxpemUgd2FsbGV0IGNsaWVudCBmb3Igd3JpdGUgb3BlcmF0aW9uc1xuICAgIGlmIChjb25maWcud2FsbGV0Q2xpZW50KSB7XG4gICAgICB0aGlzLndhbGxldENsaWVudCA9IGNvbmZpZy53YWxsZXRDbGllbnQ7XG4gICAgfVxuXG4gICAgLy8gSW5pdGlhbGl6ZSBmZWF0dXJlIG1vZHVsZXNcbiAgICB0aGlzLm11c2QgPSBuZXcgTVVTRCh0aGlzKTtcbiAgICB0aGlzLmNhdGFsb2cgPSBuZXcgQ2F0YWxvZyh0aGlzKTtcbiAgICB0aGlzLnJveWFsdHkgPSBuZXcgUm95YWx0eSh0aGlzKTtcbiAgICB0aGlzLnN0cmVhbWluZyA9IG5ldyBTdHJlYW1pbmcodGhpcyk7XG4gIH1cblxuICAvKipcbiAgICogQ2hlY2sgaWYgd2FsbGV0IGlzIGNvbm5lY3RlZFxuICAgKi9cbiAgZ2V0IGlzV2FsbGV0Q29ubmVjdGVkKCk6IGJvb2xlYW4ge1xuICAgIHJldHVybiAhIXRoaXMud2FsbGV0Q2xpZW50O1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjb25uZWN0ZWQgd2FsbGV0IGFkZHJlc3NcbiAgICovXG4gIGFzeW5jIGdldFdhbGxldEFkZHJlc3MoKTogUHJvbWlzZTxgMHgke3N0cmluZ31gIHwgdW5kZWZpbmVkPiB7XG4gICAgaWYgKCF0aGlzLndhbGxldENsaWVudCkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG4gICAgXG4gICAgdHJ5IHtcbiAgICAgIGNvbnN0IGFjY291bnRzID0gYXdhaXQgdGhpcy53YWxsZXRDbGllbnQuZ2V0QWRkcmVzc2VzKCk7XG4gICAgICByZXR1cm4gYWNjb3VudHNbMF07XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIENvbm5lY3Qgd2FsbGV0XG4gICAqL1xuICBhc3luYyBjb25uZWN0V2FsbGV0KHByb3ZpZGVyOiBhbnkpOiBQcm9taXNlPHZvaWQ+IHtcbiAgICB0cnkge1xuICAgICAgKHRoaXMgYXMgYW55KS53YWxsZXRDbGllbnQgPSBjcmVhdGVXYWxsZXRDbGllbnQoe1xuICAgICAgICBjaGFpbjoge1xuICAgICAgICAgIGlkOiB0aGlzLmNoYWluLmlkLFxuICAgICAgICAgIG5hbWU6IHRoaXMuY2hhaW4ubmFtZSxcbiAgICAgICAgICBuYXRpdmVDdXJyZW5jeTogdGhpcy5jaGFpbi5uYXRpdmVDdXJyZW5jeSxcbiAgICAgICAgICBycGNVcmxzOiB7XG4gICAgICAgICAgICBkZWZhdWx0OiB7IGh0dHA6IFt0aGlzLmNoYWluLnJwY1VybF0gfSxcbiAgICAgICAgICAgIHB1YmxpYzogeyBodHRwOiBbdGhpcy5jaGFpbi5ycGNVcmxdIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgICAgdHJhbnNwb3J0OiBjdXN0b20ocHJvdmlkZXIpLFxuICAgICAgfSk7XG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgIHRocm93IG5ldyBNdXppeFNES0Vycm9yKFxuICAgICAgICAnRmFpbGVkIHRvIGNvbm5lY3Qgd2FsbGV0JyxcbiAgICAgICAgJ1dBTExFVF9DT05ORUNUSU9OX0VSUk9SJyxcbiAgICAgICAgZXJyb3JcbiAgICAgICk7XG4gICAgfVxuICB9XG5cbiAgLyoqXG4gICAqIEdldCBjaGFpbiBJRFxuICAgKi9cbiAgZ2V0IGNoYWluSWQoKTogbnVtYmVyIHtcbiAgICByZXR1cm4gdGhpcy5jaGFpbi5pZDtcbiAgfVxuXG4gIC8qKlxuICAgKiBHZXQgYmxvY2sgbnVtYmVyXG4gICAqL1xuICBhc3luYyBnZXRCbG9ja051bWJlcigpOiBQcm9taXNlPGJpZ2ludD4ge1xuICAgIHJldHVybiB0aGlzLnB1YmxpY0NsaWVudC5nZXRCbG9ja051bWJlcigpO1xuICB9XG5cbiAgLyoqXG4gICAqIEdldCBiYWxhbmNlIG9mIGFuIGFkZHJlc3NcbiAgICovXG4gIGFzeW5jIGdldEJhbGFuY2UoYWRkcmVzczogYDB4JHtzdHJpbmd9YCk6IFByb21pc2U8YmlnaW50PiB7XG4gICAgcmV0dXJuIHRoaXMucHVibGljQ2xpZW50LmdldEJhbGFuY2UoeyBhZGRyZXNzIH0pO1xuICB9XG59XG4iXX0=