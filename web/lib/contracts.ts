/**
 * On-chain bindings for the Muzix contract builder.
 *
 * Addresses default to the local devnet (chainId 1338). When the canonical
 * deploy ships, override via NEXT_PUBLIC_MUZIX_CATALOG / NEXT_PUBLIC_MUZIX_AI_PROVENANCE.
 *
 * The ABI fragments below are the minimal slice the builder needs — they
 * are copied verbatim from `muzix/src/MuzixCatalog.sol` and
 * `muzix/src/MuzixAIProvenance.sol`. Keep them in sync if signatures change.
 */

import type { Abi, Address } from 'viem';

export const MUZIX_CHAIN_ID = Number(process.env.NEXT_PUBLIC_MUZIX_CHAIN_ID ?? 1338);

export const MUZIX_CATALOG_ADDRESS: Address =
  (process.env.NEXT_PUBLIC_MUZIX_CATALOG as Address | undefined) ??
  ('0x0000000000000000000000000000000000000000' as Address);

export const MUZIX_AI_PROVENANCE_ADDRESS: Address =
  (process.env.NEXT_PUBLIC_MUZIX_AI_PROVENANCE as Address | undefined) ??
  ('0x0000000000000000000000000000000000000000' as Address);

export const MUZIX_CATALOG_ABI = [
  {
    type: 'function',
    name: 'mintMusic',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenURI', type: 'string' },
      {
        name: 'metadata',
        type: 'tuple',
        components: [
          { name: 'isrc', type: 'string' },
          { name: 'artist', type: 'string' },
        ],
      },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'setRoyaltySplit',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'recipients', type: 'address[]' },
      { name: 'shares', type: 'uint16[]' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'event',
    name: 'Transfer',
    inputs: [
      { indexed: true, name: 'from', type: 'address' },
      { indexed: true, name: 'to', type: 'address' },
      { indexed: true, name: 'tokenId', type: 'uint256' },
    ],
  },
] as const satisfies Abi;

export const MUZIX_AI_PROVENANCE_ABI = [
  {
    type: 'function',
    name: 'setProvenance',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'catalog', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
      { name: 'humanOnly', type: 'bool' },
      { name: 'aiModelTokens', type: 'address[]' },
      { name: 'ipLineageURIs', type: 'string[]' },
      { name: 'provenanceHash', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'computeProvenanceHash',
    stateMutability: 'pure',
    inputs: [
      { name: 'humanOnly', type: 'bool' },
      { name: 'aiModelTokens', type: 'address[]' },
      { name: 'ipLineageURIs', type: 'string[]' },
    ],
    outputs: [{ name: '', type: 'bytes32' }],
  },
] as const satisfies Abi;

export type MuzixContractName = 'MuzixCatalog' | 'MuzixAIProvenance';

export function addressFor(name: MuzixContractName): Address {
  return name === 'MuzixCatalog' ? MUZIX_CATALOG_ADDRESS : MUZIX_AI_PROVENANCE_ADDRESS;
}

export function abiFor(name: MuzixContractName): Abi {
  return name === 'MuzixCatalog' ? (MUZIX_CATALOG_ABI as unknown as Abi) : (MUZIX_AI_PROVENANCE_ABI as unknown as Abi);
}

export function isDeployed(name: MuzixContractName): boolean {
  const a = addressFor(name);
  return !!a && a !== '0x0000000000000000000000000000000000000000';
}
