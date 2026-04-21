import type { Address, Hash, Hex } from 'viem';

/**
 * Deployment addresses for a given Muzix environment.
 * oracle is optional because the reference node is still pre-MVP.
 */
export interface MuzixContracts {
  catalog: Address;
  musd: Address;
  oracle?: Address;
  /** MuzixAIProvenance registry (erc721-ai × muzix bridge). Optional. */
  provenance?: Address;
}

/**
 * AI-provenance record for a MuzixCatalog token. Mirrors
 * `AIProvenance` in src/MuzixAIProvenance.sol.
 *
 * - `humanOnly = true` is an on-chain attestation that no AI model was
 *   used in the token's creation. `aiModelTokens` MUST be empty in that
 *   case.
 * - Otherwise `aiModelTokens` lists ERC-721-AI (or compatible) token
 *   contracts that were referenced, and `ipLineageURIs` points at off-chain
 *   lineage documents (model cards, training-data manifests, credits).
 * - `provenanceHash` is a commit to the full off-chain lineage document.
 */
export interface AIProvenance {
  set: boolean;
  humanOnly: boolean;
  aiModelTokens: Address[];
  ipLineageURIs: string[];
  provenanceHash: Hex;
  /** Unix seconds — 0 when `set` is false. */
  updatedAt: bigint;
}

/**
 * Metadata attached to a MuzixCatalog token at mint time.
 * Matches `MusicMetadata` in src/MuzixCatalog.sol.
 */
export interface MusicMetadata {
  /** International Standard Recording Code, e.g. "USRC17607839" */
  isrc: string;
  /** Primary credited artist name (free-form) */
  artist: string;
}

/**
 * One entry in a catalog token's royalty cap table. Share is in basis points;
 * the full split must sum to 10_000 (100%).
 */
export interface RoyaltySplitEntry {
  recipient: Address;
  /** Basis points, 10000 = 100% */
  shareBps: number;
}

export interface RoyaltySplit {
  tokenId: bigint;
  entries: RoyaltySplitEntry[];
}

/**
 * Consumer-side view of on-chain streaming revenue for a catalog.
 * Matches `StreamingRevenue` in oracle/SPECIFICATION.md.
 */
export interface StreamingRevenue {
  catalogId: Hex;
  dspId: Hex;
  totalStreams: bigint;
  /** USD revenue, 6 decimals (matches MUSD) */
  revenueUsd: bigint;
  periodStart: bigint;
  periodEnd: bigint;
  territoryHash: Hex;
  dataSourceHash: Hex;
  lastUpdated: bigint;
  /** 0-10000 (basis points) */
  confidenceScore: bigint;
}

/**
 * Common return shape for write methods — a transaction hash plus a helper
 * that returns the confirmed receipt when awaited.
 */
export interface WriteResult {
  hash: Hash;
  wait: () => Promise<void>;
}
