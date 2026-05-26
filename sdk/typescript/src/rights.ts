import type { Address, Hash, PublicClient, WalletClient } from 'viem';

import { MuzixRightsOfferingAbi } from './abis.js';
import { MissingWalletError } from './errors.js';
import type { Offering, Counter, CounterPayload, WriteResult } from './types.js';

export class RightsModule {
  constructor(
    private readonly address: Address | undefined,
    private readonly publicClient: PublicClient,
    private readonly walletClient?: WalletClient,
  ) {}

  get contractAddress(): Address {
    if (!this.address) throw new Error('No rights offering address configured');
    return this.address;
  }

  async getOffering(offeringId: bigint): Promise<Offering> {
    const addr = this.contractAddress;
    return (await this.publicClient.readContract({
      address: addr,
      abi: MuzixRightsOfferingAbi,
      functionName: 'getOffering',
      args: [offeringId],
    })) as Offering;
  }

  async getCounter(counterId: bigint): Promise<Counter> {
    const addr = this.contractAddress;
    return (await this.publicClient.readContract({
      address: addr,
      abi: MuzixRightsOfferingAbi,
      functionName: 'getCounter',
      args: [counterId],
    })) as Counter;
  }

  async counterIdsFor(offeringId: bigint): Promise<bigint[]> {
    const addr = this.contractAddress;
    return (await this.publicClient.readContract({
      address: addr,
      abi: MuzixRightsOfferingAbi,
      functionName: 'counterIdsFor',
      args: [offeringId],
    })) as bigint[];
  }

  async counterCountFor(offeringId: bigint): Promise<bigint> {
    const addr = this.contractAddress;
    return (await this.publicClient.readContract({
      address: addr,
      abi: MuzixRightsOfferingAbi,
      functionName: 'counterCountFor',
      args: [offeringId],
    })) as bigint;
  }

  async createOffering(params: {
    subjectHash: Hash;
    subjectURI: string;
    rights: {
      rightsType: number;
      exclusive: boolean;
      territoryHash: Hash;
      termSeconds: bigint;
    };
    baseTerms: {
      upfrontUsd: bigint;
      minGuaranteeUsd: bigint;
      artistRoyaltyBps: number;
      advanceRecoupCapUsd: bigint;
    };
    settlementToken: Address;
    minBondUsd: bigint;
    repliesDueBy: bigint;
  }): Promise<WriteResult> {
    const wallet = this.requireWallet();
    const account = wallet.account;
    if (!account) throw new MissingWalletError();

    const hash = await wallet.writeContract({
      address: this.contractAddress,
      abi: MuzixRightsOfferingAbi,
      functionName: 'createOffering',
      args: [
        params.subjectHash,
        params.subjectURI,
        params.rights,
        params.baseTerms,
        params.settlementToken,
        params.minBondUsd,
        params.repliesDueBy,
      ],
      account,
      chain: wallet.chain ?? null,
    });
    return this.makeWriteResult(hash);
  }

  async publishOffering(offeringId: bigint): Promise<WriteResult> {
    const wallet = this.requireWallet();
    const account = wallet.account;
    if (!account) throw new MissingWalletError();

    const hash = await wallet.writeContract({
      address: this.contractAddress,
      abi: MuzixRightsOfferingAbi,
      functionName: 'publishOffering',
      args: [offeringId],
      account,
      chain: wallet.chain ?? null,
    });
    return this.makeWriteResult(hash);
  }

  async submitCounter(params: CounterPayload): Promise<WriteResult> {
    const wallet = this.requireWallet();
    const account = wallet.account;
    if (!account) throw new MissingWalletError();

    const hash = await wallet.writeContract({
      address: this.contractAddress,
      abi: MuzixRightsOfferingAbi,
      functionName: 'submitCounter',
      args: [params.offeringId, params.terms, params.memoURI, params.bondAmount],
      account,
      chain: wallet.chain ?? null,
    });
    return this.makeWriteResult(hash);
  }

  async acceptCounter(counterId: bigint): Promise<WriteResult> {
    const wallet = this.requireWallet();
    const account = wallet.account;
    if (!account) throw new MissingWalletError();

    const hash = await wallet.writeContract({
      address: this.contractAddress,
      abi: MuzixRightsOfferingAbi,
      functionName: 'acceptCounter',
      args: [counterId],
      account,
      chain: wallet.chain ?? null,
    });
    return this.makeWriteResult(hash);
  }

  private requireWallet(): WalletClient {
    if (!this.walletClient) throw new MissingWalletError();
    return this.walletClient;
  }

  private makeWriteResult(hash: Hash): WriteResult {
    return {
      hash,
      wait: async () => {
        await this.publicClient.waitForTransactionReceipt({ hash });
      },
    };
  }
}
