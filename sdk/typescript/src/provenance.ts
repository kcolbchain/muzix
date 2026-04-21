import {
  encodeAbiParameters,
  keccak256,
  type Address,
  type Hash,
  type Hex,
  type PublicClient,
  type WalletClient,
} from 'viem';

import { MuzixAIProvenanceAbi } from './abis.js';
import {
  HumanOnlyHasModelsError,
  MissingProvenanceError,
  MissingWalletError,
} from './errors.js';
import type { AIProvenance, WriteResult } from './types.js';

/**
 * Module for interacting with the MuzixAIProvenance registry.
 *
 * The registry is a one-way bridge from MuzixCatalog tokens to ERC-721-AI
 * model tokens: a music token's owner can attach a provenance record that
 * either attests "human-only" (no AI model involved) or points at one or
 * more ERC-721-AI token contracts and IP-lineage URIs.
 *
 * Reads go through `publicClient`; writes require `walletClient` and the
 * caller must currently own the catalog token being annotated.
 */
export class ProvenanceModule {
  constructor(
    private readonly address: Address | undefined,
    private readonly publicClient: PublicClient,
    private readonly walletClient?: WalletClient,
  ) {}

  /** Address of the MuzixAIProvenance contract. Throws if not configured. */
  get contractAddress(): Address {
    if (!this.address) throw new MissingProvenanceError();
    return this.address;
  }

  // ----- Reads ---------------------------------------------------------

  /** Fetch the provenance record for a catalog token, or null if unset. */
  async getProvenance(
    catalog: Address,
    tokenId: bigint,
  ): Promise<AIProvenance | null> {
    const addr = this.contractAddress;
    const raw = (await this.publicClient.readContract({
      address: addr,
      abi: MuzixAIProvenanceAbi,
      functionName: 'getProvenance',
      args: [catalog, tokenId],
    })) as {
      set: boolean;
      humanOnly: boolean;
      aiModelTokens: readonly Address[];
      ipLineageURIs: readonly string[];
      provenanceHash: Hex;
      updatedAt: bigint;
    };

    if (!raw.set) return null;
    return {
      set: raw.set,
      humanOnly: raw.humanOnly,
      aiModelTokens: [...raw.aiModelTokens],
      ipLineageURIs: [...raw.ipLineageURIs],
      provenanceHash: raw.provenanceHash,
      updatedAt: raw.updatedAt,
    };
  }

  async hasProvenance(catalog: Address, tokenId: bigint): Promise<boolean> {
    const addr = this.contractAddress;
    return (await this.publicClient.readContract({
      address: addr,
      abi: MuzixAIProvenanceAbi,
      functionName: 'hasProvenance',
      args: [catalog, tokenId],
    })) as boolean;
  }

  // ----- Writes --------------------------------------------------------

  /**
   * Attach or replace the AI-provenance record for a catalog token.
   *
   * Caller must be the current ERC-721 owner of `tokenId` on `catalog`.
   * If `provenanceHash` is omitted, it is computed locally using the same
   * binding as `computeProvenanceHash` below so callers don't have to
   * double-hash.
   */
  async setProvenance(params: {
    catalog: Address;
    tokenId: bigint;
    humanOnly: boolean;
    aiModelTokens: Address[];
    ipLineageURIs: string[];
    /** Optional — defaults to `computeProvenanceHash(params)`. */
    provenanceHash?: Hex;
  }): Promise<WriteResult> {
    if (params.humanOnly && params.aiModelTokens.length > 0) {
      throw new HumanOnlyHasModelsError(params.aiModelTokens.length);
    }

    const addr = this.contractAddress;
    const wallet = this.requireWallet();
    const account = wallet.account;
    if (!account) throw new MissingWalletError();

    const provenanceHash =
      params.provenanceHash ??
      computeProvenanceHash({
        humanOnly: params.humanOnly,
        aiModelTokens: params.aiModelTokens,
        ipLineageURIs: params.ipLineageURIs,
      });

    const hash = await wallet.writeContract({
      address: addr,
      abi: MuzixAIProvenanceAbi,
      functionName: 'setProvenance',
      args: [
        params.catalog,
        params.tokenId,
        params.humanOnly,
        params.aiModelTokens,
        params.ipLineageURIs,
        provenanceHash,
      ],
      account,
      chain: wallet.chain ?? null,
    });
    return this.makeWriteResult(hash);
  }

  /** Revoke an existing provenance record. Caller must currently own the token. */
  async clearProvenance(params: {
    catalog: Address;
    tokenId: bigint;
  }): Promise<WriteResult> {
    const addr = this.contractAddress;
    const wallet = this.requireWallet();
    const account = wallet.account;
    if (!account) throw new MissingWalletError();

    const hash = await wallet.writeContract({
      address: addr,
      abi: MuzixAIProvenanceAbi,
      functionName: 'clearProvenance',
      args: [params.catalog, params.tokenId],
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

/**
 * Canonical off-chain binding for `provenanceHash`. Matches the on-chain
 * `MuzixAIProvenance.computeProvenanceHash` so that off-chain signers and
 * on-chain readers can verify the same digest.
 */
export function computeProvenanceHash(params: {
  humanOnly: boolean;
  aiModelTokens: Address[];
  ipLineageURIs: string[];
}): Hex {
  const encoded = encodeAbiParameters(
    [
      { type: 'bool' },
      { type: 'address[]' },
      { type: 'string[]' },
    ],
    [params.humanOnly, params.aiModelTokens, params.ipLineageURIs],
  );
  return keccak256(encoded);
}
