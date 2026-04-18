import type { Address, Hash, PublicClient, WalletClient } from 'viem';

import { MUSDAbi } from './abis.js';
import { MissingWalletError } from './errors.js';
import type { WriteResult } from './types.js';

/**
 * Module for interacting with MUSD (Muzix USD stablecoin).
 *
 * The on-chain contract is ERC-20 + ERC-20Permit + pull-payment royalty
 * distribution via `transferWithRoyalty` / `batchRoyaltyDistribution` /
 * `claimPayments`.
 */
export class MusdModule {
  constructor(
    private readonly address: Address,
    private readonly publicClient: PublicClient,
    private readonly walletClient?: WalletClient,
  ) {}

  get contractAddress(): Address {
    return this.address;
  }

  // ----- Reads ---------------------------------------------------------

  async balanceOf(account: Address): Promise<bigint> {
    return (await this.publicClient.readContract({
      address: this.address,
      abi: MUSDAbi,
      functionName: 'balanceOf',
      args: [account],
    })) as bigint;
  }

  async totalSupply(): Promise<bigint> {
    return (await this.publicClient.readContract({
      address: this.address,
      abi: MUSDAbi,
      functionName: 'totalSupply',
    })) as bigint;
  }

  async allowance(owner: Address, spender: Address): Promise<bigint> {
    return (await this.publicClient.readContract({
      address: this.address,
      abi: MUSDAbi,
      functionName: 'allowance',
      args: [owner, spender],
    })) as bigint;
  }

  async pendingWithdrawals(account: Address): Promise<bigint> {
    return (await this.publicClient.readContract({
      address: this.address,
      abi: MUSDAbi,
      functionName: 'pendingWithdrawals',
      args: [account],
    })) as bigint;
  }

  async decimals(): Promise<number> {
    const raw = (await this.publicClient.readContract({
      address: this.address,
      abi: MUSDAbi,
      functionName: 'decimals',
    })) as number;
    return Number(raw);
  }

  // ----- Writes --------------------------------------------------------

  /**
   * Mint MUSD to `to`. Reverts unless the caller is the current owner of the
   * MUSD contract — which today is the deployer (see src/MUSD.sol).
   */
  async mint(params: { to: Address; amount: bigint }): Promise<WriteResult> {
    const wallet = this.requireWallet();
    const account = wallet.account;
    if (!account) throw new MissingWalletError();

    const hash = await wallet.writeContract({
      address: this.address,
      abi: MUSDAbi,
      functionName: 'mint',
      args: [params.to, params.amount],
      account,
      chain: wallet.chain ?? null,
    });
    return this.makeWriteResult(hash);
  }

  async approve(params: { spender: Address; amount: bigint }): Promise<WriteResult> {
    const wallet = this.requireWallet();
    const account = wallet.account;
    if (!account) throw new MissingWalletError();

    const hash = await wallet.writeContract({
      address: this.address,
      abi: MUSDAbi,
      functionName: 'approve',
      args: [params.spender, params.amount],
      account,
      chain: wallet.chain ?? null,
    });
    return this.makeWriteResult(hash);
  }

  async transfer(params: { to: Address; amount: bigint }): Promise<WriteResult> {
    const wallet = this.requireWallet();
    const account = wallet.account;
    if (!account) throw new MissingWalletError();

    const hash = await wallet.writeContract({
      address: this.address,
      abi: MUSDAbi,
      functionName: 'transfer',
      args: [params.to, params.amount],
      account,
      chain: wallet.chain ?? null,
    });
    return this.makeWriteResult(hash);
  }

  /** Push an MUSD payment into the catalog's pull-payment ledger for a tokenId. */
  async transferWithRoyalty(params: {
    tokenId: bigint;
    amount: bigint;
  }): Promise<WriteResult> {
    const wallet = this.requireWallet();
    const account = wallet.account;
    if (!account) throw new MissingWalletError();

    const hash = await wallet.writeContract({
      address: this.address,
      abi: MUSDAbi,
      functionName: 'transferWithRoyalty',
      args: [params.tokenId, params.amount],
      account,
      chain: wallet.chain ?? null,
    });
    return this.makeWriteResult(hash);
  }

  /**
   * Owner-only batched payout — models monthly DSP settlement reports.
   * `tokenIds` and `amounts` must be the same length; non-matching lengths
   * will revert on-chain.
   */
  async batchRoyaltyDistribution(params: {
    tokenIds: bigint[];
    amounts: bigint[];
  }): Promise<WriteResult> {
    const wallet = this.requireWallet();
    const account = wallet.account;
    if (!account) throw new MissingWalletError();

    const hash = await wallet.writeContract({
      address: this.address,
      abi: MUSDAbi,
      functionName: 'batchRoyaltyDistribution',
      args: [params.tokenIds, params.amounts],
      account,
      chain: wallet.chain ?? null,
    });
    return this.makeWriteResult(hash);
  }

  /** Claim the caller's accumulated MUSD royalty balance. */
  async claimPayments(): Promise<WriteResult> {
    const wallet = this.requireWallet();
    const account = wallet.account;
    if (!account) throw new MissingWalletError();

    const hash = await wallet.writeContract({
      address: this.address,
      abi: MUSDAbi,
      functionName: 'claimPayments',
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
