import { describe, it, expect } from 'vitest';
import {
  decodeFunctionData,
  encodeFunctionResult,
  toFunctionSelector,
  type Address,
  type Hex,
} from 'viem';

import { createMuzixClient } from '../src/client.js';
import { computeProvenanceHash } from '../src/provenance.js';
import {
  HumanOnlyHasModelsError,
  MissingProvenanceError,
} from '../src/errors.js';
import { makeHarness } from './helpers.js';
import { MuzixAIProvenanceAbi } from '../src/abis.js';

const CATALOG: Address = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca';
const MUSD: Address = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
const PROVENANCE: Address = '0x00000000000000000000000000000000c0ffee11';

const MODEL_A: Address = '0x1111111111111111111111111111111111111111';
const MODEL_B: Address = '0x2222222222222222222222222222222222222222';

function abiItem(name: string) {
  const item = MuzixAIProvenanceAbi.find(
    (i) => 'name' in i && i.name === name && i.type === 'function',
  );
  if (!item) throw new Error(`ABI item ${name} not found`);
  return item;
}

describe('ProvenanceModule — guard rails', () => {
  it('throws MissingProvenanceError when no registry address is configured', async () => {
    const harness = makeHarness();
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD },
      publicClient: harness.publicClient,
      walletClient: harness.walletClient,
    });
    await expect(muzix.provenance.hasProvenance(CATALOG, 1n)).rejects.toBeInstanceOf(
      MissingProvenanceError,
    );
  });

  it('rejects humanOnly=true when aiModelTokens is non-empty', async () => {
    const harness = makeHarness();
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD, provenance: PROVENANCE },
      publicClient: harness.publicClient,
      walletClient: harness.walletClient,
    });
    await expect(
      muzix.provenance.setProvenance({
        catalog: CATALOG,
        tokenId: 1n,
        humanOnly: true,
        aiModelTokens: [MODEL_A],
        ipLineageURIs: [],
      }),
    ).rejects.toBeInstanceOf(HumanOnlyHasModelsError);
  });
});

describe('ProvenanceModule — reads', () => {
  it('returns null when the on-chain record is unset', async () => {
    const harness = makeHarness({
      eth_call: () =>
        encodeFunctionResult({
          abi: MuzixAIProvenanceAbi,
          functionName: 'getProvenance',
          result: {
            set: false,
            humanOnly: false,
            aiModelTokens: [],
            ipLineageURIs: [],
            provenanceHash:
              '0x0000000000000000000000000000000000000000000000000000000000000000' as Hex,
            updatedAt: 0n,
          },
        }) as Hex,
    });
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD, provenance: PROVENANCE },
      publicClient: harness.publicClient,
    });
    const got = await muzix.provenance.getProvenance(CATALOG, 1n);
    expect(got).toBeNull();
  });

  it('decodes a populated provenance record', async () => {
    const hash =
      '0xaabbccddeeff00112233445566778899aabbccddeeff00112233445566778899' as Hex;
    const harness = makeHarness({
      eth_call: () =>
        encodeFunctionResult({
          abi: MuzixAIProvenanceAbi,
          functionName: 'getProvenance',
          result: {
            set: true,
            humanOnly: false,
            aiModelTokens: [MODEL_A, MODEL_B],
            ipLineageURIs: ['ipfs://bafy-lineage'],
            provenanceHash: hash,
            updatedAt: 1_700_000_000n,
          },
        }) as Hex,
    });
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD, provenance: PROVENANCE },
      publicClient: harness.publicClient,
    });
    const got = await muzix.provenance.getProvenance(CATALOG, 1n);
    expect(got).not.toBeNull();
    expect(got!.humanOnly).toBe(false);
    expect(got!.aiModelTokens).toEqual([MODEL_A, MODEL_B]);
    expect(got!.ipLineageURIs).toEqual(['ipfs://bafy-lineage']);
    expect(got!.provenanceHash).toBe(hash);
    expect(got!.updatedAt).toBe(1_700_000_000n);
  });

  it('decodes hasProvenance', async () => {
    const harness = makeHarness({
      eth_call: () =>
        encodeFunctionResult({
          abi: MuzixAIProvenanceAbi,
          functionName: 'hasProvenance',
          result: true,
        }) as Hex,
    });
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD, provenance: PROVENANCE },
      publicClient: harness.publicClient,
    });
    const got = await muzix.provenance.hasProvenance(CATALOG, 1n);
    expect(got).toBe(true);
  });
});

describe('ProvenanceModule — writes', () => {
  it('auto-computes provenanceHash when omitted and sends correct calldata', async () => {
    const harness = makeHarness();
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD, provenance: PROVENANCE },
      publicClient: harness.publicClient,
      walletClient: harness.walletClient,
    });

    await muzix.provenance.setProvenance({
      catalog: CATALOG,
      tokenId: 7n,
      humanOnly: false,
      aiModelTokens: [MODEL_A, MODEL_B],
      ipLineageURIs: ['ipfs://bafy-lineage'],
    });

    const tx = harness.provider.sentTxs[0]!;
    expect(tx.to?.toLowerCase()).toBe(PROVENANCE.toLowerCase());

    const decoded = decodeFunctionData({
      abi: MuzixAIProvenanceAbi,
      data: tx.data!,
    });
    expect(decoded.functionName).toBe('setProvenance');

    const [catalog, tokenId, humanOnly, models, uris, provenanceHash] =
      decoded.args as [Address, bigint, boolean, readonly Address[], readonly string[], Hex];
    expect(catalog.toLowerCase()).toBe(CATALOG.toLowerCase());
    expect(tokenId).toBe(7n);
    expect(humanOnly).toBe(false);
    expect(models).toEqual([MODEL_A, MODEL_B]);
    expect(uris).toEqual(['ipfs://bafy-lineage']);
    // Matches the local helper bit-for-bit.
    expect(provenanceHash).toBe(
      computeProvenanceHash({
        humanOnly: false,
        aiModelTokens: [MODEL_A, MODEL_B],
        ipLineageURIs: ['ipfs://bafy-lineage'],
      }),
    );
  });

  it('passes an explicit provenanceHash through unchanged', async () => {
    const explicit =
      '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef' as Hex;
    const harness = makeHarness();
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD, provenance: PROVENANCE },
      publicClient: harness.publicClient,
      walletClient: harness.walletClient,
    });

    await muzix.provenance.setProvenance({
      catalog: CATALOG,
      tokenId: 1n,
      humanOnly: true,
      aiModelTokens: [],
      ipLineageURIs: [],
      provenanceHash: explicit,
    });
    const tx = harness.provider.sentTxs[0]!;
    const decoded = decodeFunctionData({
      abi: MuzixAIProvenanceAbi,
      data: tx.data!,
    });
    const [, , , , , ph] = decoded.args as [
      Address,
      bigint,
      boolean,
      readonly Address[],
      readonly string[],
      Hex,
    ];
    expect(ph).toBe(explicit);
  });

  it('exposes the right function selector on clearProvenance', async () => {
    const harness = makeHarness();
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD, provenance: PROVENANCE },
      publicClient: harness.publicClient,
      walletClient: harness.walletClient,
    });
    await muzix.provenance.clearProvenance({ catalog: CATALOG, tokenId: 9n });
    const tx = harness.provider.sentTxs[0]!;
    const selector = tx.data?.slice(0, 10);
    expect(selector).toBe(toFunctionSelector(abiItem('clearProvenance') as never));
  });
});

describe('computeProvenanceHash', () => {
  it('is deterministic and order-sensitive', () => {
    const h1 = computeProvenanceHash({
      humanOnly: false,
      aiModelTokens: [MODEL_A, MODEL_B],
      ipLineageURIs: ['ipfs://u1'],
    });
    const h2 = computeProvenanceHash({
      humanOnly: false,
      aiModelTokens: [MODEL_A, MODEL_B],
      ipLineageURIs: ['ipfs://u1'],
    });
    const h3 = computeProvenanceHash({
      humanOnly: false,
      aiModelTokens: [MODEL_B, MODEL_A],
      ipLineageURIs: ['ipfs://u1'],
    });
    expect(h1).toBe(h2);
    expect(h1).not.toBe(h3);
  });

  it('distinguishes humanOnly from AI provenance with the same lineage URIs', () => {
    const h1 = computeProvenanceHash({
      humanOnly: true,
      aiModelTokens: [],
      ipLineageURIs: ['ipfs://u'],
    });
    const h2 = computeProvenanceHash({
      humanOnly: false,
      aiModelTokens: [],
      ipLineageURIs: ['ipfs://u'],
    });
    expect(h1).not.toBe(h2);
  });
});
