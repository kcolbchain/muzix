import type { Address, Hash, PublicClient, WalletClient } from 'viem';

import { MuzixCatalogAbi } from './abis.js';
import {
  InvalidRoyaltySplitError,
  MissingWalletError,
} from './errors.js';
import type {
  MusicMetadata,
  RoyaltySplit,
  RoyaltySplitEntry,
  WriteResult,
} from './types.js';

/**
 * Module for interacting with MuzixCatalog (ERC-721 + ERC-2981 + ISRC).
 *
 * Reads go through `publicClient`; writes require `walletClient`.
 */
export class CatalogModule {
  constructor(
    private readonly address: Address,
    private readonly publicClient: PublicClient,
    private readonly walletClient?: WalletClient,
  ) {}

  /** Address of the MuzixCatalog contract. */
  get contractAddress(): Address {
    return this.address;
  }

  // ----- Reads ---------------------------------------------------------

  async ownerOf(tokenId: bigint): Promise<Address> {
    return (await this.publicClient.readContract({
      address: this.address,
      abi: MuzixCatalogAbi,
      functionName: 'ownerOf',
      args: [tokenId],
    })) as Address;
  }

  async tokenURI(tokenId: bigint): Promise<string> {
    return (await this.publicClient.readContract({
      address: this.address,
      abi: MuzixCatalogAbi,
      functionName: 'tokenURI',
      args: [tokenId],
    })) as string;
  }

  async getMetadata(tokenId: bigint): Promise<MusicMetadata> {
    const raw = (await this.publicClient.readContract({
      address: this.address,
      abi: MuzixCatalogAbi,
      functionName: 'musicRegistry',
      args: [tokenId],
    })) as readonly [string, string];
    return { isrc: raw[0], artist: raw[1] };
  }

  /** Returns the royalty cap-table (recipients + basis-point shares). */
  async getRoyaltySplit(tokenId: bigint): Promise<RoyaltySplit> {
    const raw = (await this.publicClient.readContract({
      address: this.address,
      abi: MuzixCatalogAbi,
      functionName: 'royaltySplits',
      args: [tokenId],
    })) as readonly [readonly Address[], readonly number[]];
    const [recipients, shares] = raw;
    const entries: RoyaltySplitEntry[] = recipients.map((recipient, i) => ({
      recipient,
      shareBps: Number(shares[i] ?? 0),
    }));
    return { tokenId, entries };
  }

  /** ERC-2981 — canonical royalty receiver + amount for a given sale price. */
  async royaltyInfo(
    tokenId: bigint,
    salePrice: bigint,
  ): Promise<{ receiver: Address; royaltyAmount: bigint }> {
    const raw = (await this.publicClient.readContract({
      address: this.address,
      abi: MuzixCatalogAbi,
      functionName: 'royaltyInfo',
      args: [tokenId, salePrice],
    })) as readonly [Address, bigint];
    return { receiver: raw[0], royaltyAmount: raw[1] };
  }

  async totalStreamingRevenue(tokenId: bigint): Promise<bigint> {
    return (await this.publicClient.readContract({
      address: this.address,
      abi: MuzixCatalogAbi,
      functionName: 'totalStreamingRevenue',
      args: [tokenId],
    })) as bigint;
  }

  async claimedBalance(tokenId: bigint, account: Address): Promise<bigint> {
    return (await this.publicClient.readContract({
      address: this.address,
      abi: MuzixCatalogAbi,
      functionName: 'claimedBalance',
      args: [tokenId, account],
    })) as bigint;
  }

  // ----- Writes --------------------------------------------------------

  /**
   * Mint a new catalog entry.
   *
   * Note: in the current MuzixCatalog, `mintMusic` is `onlyOwner`; the caller
   * must be the contract owner. This matches the spec (catalog admin onboards
   * music, then configures splits via `setRoyaltySplit`).
   */
  async mintMusic(params: {
    tokenURI: string;
    metadata: MusicMetadata;
  }): Promise<WriteResult> {
    const wallet = this.requireWallet();
    const account = wallet.account;
    if (!account) throw new MissingWalletError();

    const hash = await wallet.writeContract({
      address: this.address,
      abi: MuzixCatalogAbi,
      functionName: 'mintMusic',
      args: [params.tokenURI, params.metadata],
      account,
      chain: wallet.chain ?? null,
    });
    return this.makeWriteResult(hash);
  }

  /** Configure the cap-table split. Shares must sum to 10_000 bps (100%). */
  async setRoyaltySplit(params: {
    tokenId: bigint;
    entries: RoyaltySplitEntry[];
  }): Promise<WriteResult> {
    const total = params.entries.reduce((s, e) => s + e.shareBps, 0);
    if (total !== 10_000) {
      throw new InvalidRoyaltySplitError(total);
    }
    const wallet = this.requireWallet();
    const account = wallet.account;
    if (!account) throw new MissingWalletError();

    const recipients = params.entries.map((e) => e.recipient);
    const shares = params.entries.map((e) => e.shareBps);

    const hash = await wallet.writeContract({
      address: this.address,
      abi: MuzixCatalogAbi,
      functionName: 'setRoyaltySplit',
      args: [params.tokenId, recipients, shares],
      account,
      chain: wallet.chain ?? null,
    });
    return this.makeWriteResult(hash);
  }

  /** Deposit native ETH revenue for a catalog token. */
  async depositRevenue(params: {
    tokenId: bigint;
    amount: bigint;
  }): Promise<WriteResult> {
    const wallet = this.requireWallet();
    const account = wallet.account;
    if (!account) throw new MissingWalletError();

    const hash = await wallet.writeContract({
      address: this.address,
      abi: MuzixCatalogAbi,
      functionName: 'depositRevenue',
      args: [params.tokenId],
      value: params.amount,
      account,
      chain: wallet.chain ?? null,
    });
    return this.makeWriteResult(hash);
  }

  /** Claim the caller's pro-rata share of accumulated streaming revenue. */
  async claimStreamingRevenue(tokenId: bigint): Promise<WriteResult> {
    const wallet = this.requireWallet();
    const account = wallet.account;
    if (!account) throw new MissingWalletError();

    const hash = await wallet.writeContract({
      address: this.address,
      abi: MuzixCatalogAbi,
      functionName: 'claimStreamingRevenue',
      args: [tokenId],
      account,
      chain: wallet.chain ?? null,
    });
    return this.makeWriteResult(hash);
  }

  // ----- Internals -----------------------------------------------------

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
