/**
 * Minimal ABIs for the Muzix core contracts.
 *
 * These are hand-curated to cover the public surface the SDK exposes.
 * Regenerate / extend by compiling the Solidity sources in `src/` with
 * Foundry and importing the generated ABI fragments if you need the full
 * interface.
 */

export const MuzixCatalogAbi = [
  // Views
  {
    type: 'function',
    name: 'ownerOf',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'address' }],
  },
  {
    type: 'function',
    name: 'tokenURI',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'royaltyInfo',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'salePrice', type: 'uint256' },
    ],
    outputs: [
      { name: 'receiver', type: 'address' },
      { name: 'royaltyAmount', type: 'uint256' },
    ],
  },
  {
    type: 'function',
    name: 'royaltySplits',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'recipients', type: 'address[]' },
      { name: 'shares', type: 'uint16[]' },
    ],
  },
  {
    type: 'function',
    name: 'musicRegistry',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [
      { name: 'isrc', type: 'string' },
      { name: 'artist', type: 'string' },
    ],
  },
  {
    type: 'function',
    name: 'totalStreamingRevenue',
    stateMutability: 'view',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'claimedBalance',
    stateMutability: 'view',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'account', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  // State-changing
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
    name: 'depositRevenue',
    stateMutability: 'payable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
  {
    type: 'function',
    name: 'claimStreamingRevenue',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'tokenId', type: 'uint256' }],
    outputs: [],
  },
] as const;

export const MUSDAbi = [
  {
    type: 'function',
    name: 'name',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'symbol',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }],
  },
  {
    type: 'function',
    name: 'decimals',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
  },
  {
    type: 'function',
    name: 'totalSupply',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'allowance',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'pendingWithdrawals',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'transfer',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'mint',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'transferWithRoyalty',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenId', type: 'uint256' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'batchRoyaltyDistribution',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'tokenIds', type: 'uint256[]' },
      { name: 'amounts', type: 'uint256[]' },
    ],
    outputs: [],
  },
  {
    type: 'function',
    name: 'claimPayments',
    stateMutability: 'nonpayable',
    inputs: [],
    outputs: [],
  },
  {
    type: 'event',
    name: 'RoyaltyDistributed',
    inputs: [
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'totalAmount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'Withdrawal',
    inputs: [
      { name: 'payee', type: 'address', indexed: true },
      { name: 'amount', type: 'uint256', indexed: false },
    ],
  },
] as const;

/**
 * MuzixAIProvenance — optional AI-provenance registry keyed by
 * (catalog address, tokenId). See src/MuzixAIProvenance.sol.
 */
export const MuzixAIProvenanceAbi = [
  {
    type: 'function',
    name: 'getProvenance',
    stateMutability: 'view',
    inputs: [
      { name: 'catalog', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [
      {
        name: 'record',
        type: 'tuple',
        components: [
          { name: 'set', type: 'bool' },
          { name: 'humanOnly', type: 'bool' },
          { name: 'aiModelTokens', type: 'address[]' },
          { name: 'ipLineageURIs', type: 'string[]' },
          { name: 'provenanceHash', type: 'bytes32' },
          { name: 'updatedAt', type: 'uint64' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'hasProvenance',
    stateMutability: 'view',
    inputs: [
      { name: 'catalog', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
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
    name: 'clearProvenance',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'catalog', type: 'address' },
      { name: 'tokenId', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    type: 'event',
    name: 'ProvenanceSet',
    inputs: [
      { name: 'catalog', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
      { name: 'provenanceHash', type: 'bytes32', indexed: false },
      { name: 'humanOnly', type: 'bool', indexed: false },
      { name: 'modelCount', type: 'uint256', indexed: false },
      { name: 'uriCount', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ProvenanceCleared',
    inputs: [
      { name: 'catalog', type: 'address', indexed: true },
      { name: 'tokenId', type: 'uint256', indexed: true },
    ],
  },
] as const;

/**
 * IStreamingRevenueOracle — consumer interface from oracle/SPECIFICATION.md.
 *
 * Production deployments will point at the on-chain oracle contract once a
 * reference node is wired up (see oracle/README.md).
 */
export const StreamingRevenueOracleAbi = [
  {
    type: 'function',
    name: 'getLatestRevenue',
    stateMutability: 'view',
    inputs: [{ name: 'catalogId', type: 'bytes32' }],
    outputs: [
      {
        name: 'revenue',
        type: 'tuple',
        components: [
          { name: 'catalogId', type: 'bytes32' },
          { name: 'dspId', type: 'bytes32' },
          { name: 'totalStreams', type: 'uint256' },
          { name: 'revenueUsd', type: 'uint256' },
          { name: 'periodStart', type: 'uint256' },
          { name: 'periodEnd', type: 'uint256' },
          { name: 'territoryHash', type: 'bytes32' },
          { name: 'dataSourceHash', type: 'bytes32' },
          { name: 'lastUpdated', type: 'uint256' },
          { name: 'confidenceScore', type: 'uint256' },
        ],
      },
    ],
  },
  {
    type: 'function',
    name: 'getRevenueForPeriod',
    stateMutability: 'view',
    inputs: [
      { name: 'catalogId', type: 'bytes32' },
      { name: 'periodStart', type: 'uint256' },
      { name: 'periodEnd', type: 'uint256' },
    ],
    outputs: [{ name: 'totalRevenue', type: 'uint256' }],
  },
  {
    type: 'function',
    name: 'isDataFresh',
    stateMutability: 'view',
    inputs: [{ name: 'catalogId', type: 'bytes32' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    type: 'function',
    name: 'subscribeToUpdates',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'catalogId', type: 'bytes32' }],
    outputs: [],
  },
  {
    type: 'event',
    name: 'RevenueUpdated',
    inputs: [
      { name: 'catalogId', type: 'bytes32', indexed: true },
      { name: 'revenueUsd', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
      { name: 'confidenceScore', type: 'uint256', indexed: false },
    ],
  },
] as const;
