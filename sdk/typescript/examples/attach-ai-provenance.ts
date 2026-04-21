/**
 * End-to-end example: mint a MuzixCatalog token, attach an AI-provenance
 * record referencing ERC-721-AI model tokens, read it back, and
 * demonstrate the "human-only" attestation pathway.
 *
 * Usage:
 *   1. Start the local Muzix devnet + deploy MuzixCatalog / MUSD /
 *      MuzixAIProvenance:
 *        cd node && ./deploy.sh
 *   2. Export deployed addresses + keys:
 *        export MUZIX_CATALOG_ADDRESS=0x...
 *        export MUZIX_MUSD_ADDRESS=0x...
 *        export MUZIX_PROVENANCE_ADDRESS=0x...
 *        # Two ERC-721-AI model token contracts (only the contract
 *        # addresses are referenced; this example does not deploy them):
 *        export ERC721_AI_MODEL_A=0x...
 *        export ERC721_AI_MODEL_B=0x...
 *        export PRIVATE_KEY=0x...       # catalog owner key (deployer)
 *   3. Run:
 *        npx tsx examples/attach-ai-provenance.ts
 */

import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import {
  computeProvenanceHash,
  createMuzixClient,
  muzixDevnet,
} from '../src/index.js';

function env(key: string): string {
  const v = process.env[key];
  if (!v) {
    throw new Error(`Missing required env var: ${key}`);
  }
  return v;
}

async function main() {
  const rpcUrl = process.env.MUZIX_RPC_URL ?? 'http://127.0.0.1:8545';
  const catalog = env('MUZIX_CATALOG_ADDRESS') as Address;
  const musd = env('MUZIX_MUSD_ADDRESS') as Address;
  const provenance = env('MUZIX_PROVENANCE_ADDRESS') as Address;
  const modelA = env('ERC721_AI_MODEL_A') as Address;
  const modelB = env('ERC721_AI_MODEL_B') as Address;
  const pk = env('PRIVATE_KEY') as `0x${string}`;

  const account = privateKeyToAccount(pk);
  const publicClient = createPublicClient({
    chain: muzixDevnet,
    transport: http(rpcUrl),
  });
  const walletClient = createWalletClient({
    chain: muzixDevnet,
    account,
    transport: http(rpcUrl),
  });

  const muzix = createMuzixClient({
    contracts: { catalog, musd, provenance },
    publicClient,
    walletClient,
  });

  // 1. Mint a catalog entry (caller must own the MuzixCatalog contract).
  console.log('Minting catalog token...');
  const mint = await muzix.catalog.mintMusic({
    tokenURI: 'ipfs://bafyexamplemuzixprovenancedemo',
    metadata: { isrc: 'USRC17607840', artist: 'AI-Assisted Demo Artist' },
  });
  await mint.wait();
  console.log('  tx:', mint.hash);

  const tokenId = 0n;
  const owner = await muzix.catalog.ownerOf(tokenId);
  console.log(`Token #${tokenId} owner: ${owner}`);

  // 2. Attach AI-provenance referencing two ERC-721-AI model contracts.
  const aiModelTokens: Address[] = [modelA, modelB];
  const ipLineageURIs = [
    'ipfs://bafy-model-card-A',
    'ipfs://bafy-training-data-manifest',
  ];
  const hashAi = computeProvenanceHash({
    humanOnly: false,
    aiModelTokens,
    ipLineageURIs,
  });
  console.log('Attaching AI-provenance record...');
  console.log('  computed provenanceHash:', hashAi);
  const setAi = await muzix.provenance.setProvenance({
    catalog,
    tokenId,
    humanOnly: false,
    aiModelTokens,
    ipLineageURIs,
    provenanceHash: hashAi,
  });
  await setAi.wait();
  console.log('  tx:', setAi.hash);

  // 3. Read back.
  const recAi = await muzix.provenance.getProvenance(catalog, tokenId);
  if (!recAi) throw new Error('expected provenance to be set');
  console.log('On-chain AI-provenance:');
  console.log(`  humanOnly:      ${recAi.humanOnly}`);
  console.log(`  aiModelTokens:  ${recAi.aiModelTokens.join(', ')}`);
  console.log(`  ipLineageURIs:  ${recAi.ipLineageURIs.join(', ')}`);
  console.log(`  provenanceHash: ${recAi.provenanceHash}`);
  console.log(`  updatedAt:      ${recAi.updatedAt}`);

  // 4. Demonstrate the human-only pathway: clear, then replace with a
  //    human-only attestation.
  console.log('Clearing AI-provenance record...');
  const clear = await muzix.provenance.clearProvenance({ catalog, tokenId });
  await clear.wait();
  console.log('  tx:', clear.hash);

  console.log('Attaching human-only attestation...');
  const hashHuman = computeProvenanceHash({
    humanOnly: true,
    aiModelTokens: [],
    ipLineageURIs: ['ipfs://bafy-human-only-attestation'],
  });
  const setHuman = await muzix.provenance.setProvenance({
    catalog,
    tokenId,
    humanOnly: true,
    aiModelTokens: [],
    ipLineageURIs: ['ipfs://bafy-human-only-attestation'],
    provenanceHash: hashHuman,
  });
  await setHuman.wait();
  console.log('  tx:', setHuman.hash);

  const recHuman = await muzix.provenance.getProvenance(catalog, tokenId);
  console.log('On-chain human-only attestation:');
  console.log(`  humanOnly: ${recHuman?.humanOnly}`);
  console.log(`  provenanceHash: ${recHuman?.provenanceHash}`);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
