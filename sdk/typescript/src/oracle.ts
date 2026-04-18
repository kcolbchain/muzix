import type { Address, Hex, PublicClient, WalletClient } from 'viem';

import { StreamingRevenueOracleAbi } from './abis.js';
import { MissingOracleError, MissingWalletError } from './errors.js';
import type { StreamingRevenue, WriteResult } from './types.js';

/**
 * Consumer-side wrapper for the Muzix Streaming Revenue Oracle.
 *
 * The oracle is spec'd in `oracle/SPECIFICATION.md`; a reference node
 * implementation is still pre-MVP. This module talks to whatever deployment
 * address is passed at construction and will surface a friendly error if the
 * consumer forgot to configure one.
 */
export class OracleModule {
  constructor(
    private readonly address: Address | undefined,
    private readonly publicClient: PublicClient,
    private readonly walletClient?: WalletClient,
  ) {}

  get contractAddress(): Address {
    if (!this.address) throw new MissingOracleError();
    return this.address;
  }

  async getLatestRevenue(catalogId: Hex): Promise<StreamingRevenue> {
    const addr = this.contractAddress;
    const raw = (await this.publicClient.readContract({
      address: addr,
      abi: StreamingRevenueOracleAbi,
      functionName: 'getLatestRevenue',
      args: [catalogId],
    })) as StreamingRevenue;
    return raw;
  }

  async getRevenueForPeriod(
    catalogId: Hex,
    periodStart: bigint,
    periodEnd: bigint,
  ): Promise<bigint> {
    const addr = this.contractAddress;
    return (await this.publicClient.readContract({
      address: addr,
      abi: StreamingRevenueOracleAbi,
      functionName: 'getRevenueForPeriod',
      args: [catalogId, periodStart, periodEnd],
    })) as bigint;
  }

  async isDataFresh(catalogId: Hex): Promise<boolean> {
    const addr = this.contractAddress;
    return (await this.publicClient.readContract({
      address: addr,
      abi: StreamingRevenueOracleAbi,
      functionName: 'isDataFresh',
      args: [catalogId],
    })) as boolean;
  }

  async subscribeToUpdates(catalogId: Hex): Promise<WriteResult> {
    const addr = this.contractAddress;
    if (!this.walletClient) throw new MissingWalletError();
    const account = this.walletClient.account;
    if (!account) throw new MissingWalletError();

    const hash = await this.walletClient.writeContract({
      address: addr,
      abi: StreamingRevenueOracleAbi,
      functionName: 'subscribeToUpdates',
      args: [catalogId],
      account,
      chain: this.walletClient.chain ?? null,
    });
    return {
      hash,
      wait: async () => {
        await this.publicClient.waitForTransactionReceipt({ hash });
      },
    };
  }
}
