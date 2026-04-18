import { describe, it, expect } from 'vitest';
import {
  encodeAbiParameters,
  encodeFunctionResult,
  toFunctionSelector,
  decodeFunctionData,
  type Address,
  type Hex,
} from 'viem';

import { createMuzixClient } from '../src/client.js';
import { InvalidRoyaltySplitError } from '../src/errors.js';
import { makeHarness, MuzixCatalogAbi } from './helpers.js';

const CATALOG: Address = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca';
const MUSD: Address = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

function abiItem(name: string) {
  const item = MuzixCatalogAbi.find(
    (i) => 'name' in i && i.name === name && i.type === 'function',
  );
  if (!item) throw new Error(`ABI item ${name} not found`);
  return item;
}

describe('CatalogModule — reads', () => {
  it('decodes ownerOf', async () => {
    const expected: Address = '0x1111111111111111111111111111111111111111';
    const harness = makeHarness({
      eth_call: () =>
        encodeAbiParameters([{ type: 'address' }], [expected]) as Hex,
    });
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD },
      publicClient: harness.publicClient,
      walletClient: harness.walletClient,
    });
    const got = await muzix.catalog.ownerOf(7n);
    expect(got.toLowerCase()).toBe(expected.toLowerCase());
  });

  it('decodes tokenURI', async () => {
    const harness = makeHarness({
      eth_call: () =>
        encodeFunctionResult({
          abi: MuzixCatalogAbi,
          functionName: 'tokenURI',
          result: 'ipfs://bafy.../meta.json',
        }) as Hex,
    });
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD },
      publicClient: harness.publicClient,
    });
    const got = await muzix.catalog.tokenURI(42n);
    expect(got).toBe('ipfs://bafy.../meta.json');
  });

  it('decodes getRoyaltySplit into { recipient, shareBps } entries', async () => {
    const a: Address = '0x2222222222222222222222222222222222222222';
    const b: Address = '0x3333333333333333333333333333333333333333';
    const harness = makeHarness({
      eth_call: () =>
        encodeFunctionResult({
          abi: MuzixCatalogAbi,
          functionName: 'royaltySplits',
          result: [
            [a, b],
            [7000, 3000],
          ],
        }) as Hex,
    });
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD },
      publicClient: harness.publicClient,
    });
    const split = await muzix.catalog.getRoyaltySplit(1n);
    expect(split.tokenId).toBe(1n);
    expect(split.entries).toHaveLength(2);
    expect(split.entries[0]).toEqual({ recipient: a, shareBps: 7000 });
    expect(split.entries[1]).toEqual({ recipient: b, shareBps: 3000 });
  });

  it('decodes royaltyInfo per ERC-2981', async () => {
    const rec: Address = '0x4444444444444444444444444444444444444444';
    const harness = makeHarness({
      eth_call: () =>
        encodeFunctionResult({
          abi: MuzixCatalogAbi,
          functionName: 'royaltyInfo',
          result: [rec, 10_000n],
        }) as Hex,
    });
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD },
      publicClient: harness.publicClient,
    });
    const info = await muzix.catalog.royaltyInfo(1n, 100_000n);
    expect(info.receiver.toLowerCase()).toBe(rec.toLowerCase());
    expect(info.royaltyAmount).toBe(10_000n);
  });

  it('decodes getMetadata tuple', async () => {
    const harness = makeHarness({
      eth_call: () =>
        encodeFunctionResult({
          abi: MuzixCatalogAbi,
          functionName: 'musicRegistry',
          result: ['USRC17607839', 'Test Artist'],
        }) as Hex,
    });
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD },
      publicClient: harness.publicClient,
    });
    const meta = await muzix.catalog.getMetadata(1n);
    expect(meta).toEqual({ isrc: 'USRC17607839', artist: 'Test Artist' });
  });
});

describe('CatalogModule — writes', () => {
  it('rejects splits that do not sum to 10000 bps', async () => {
    const harness = makeHarness();
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD },
      publicClient: harness.publicClient,
      walletClient: harness.walletClient,
    });
    await expect(
      muzix.catalog.setRoyaltySplit({
        tokenId: 1n,
        entries: [
          { recipient: '0x1111111111111111111111111111111111111111', shareBps: 5000 },
          { recipient: '0x2222222222222222222222222222222222222222', shareBps: 4000 },
        ],
      }),
    ).rejects.toBeInstanceOf(InvalidRoyaltySplitError);
  });

  it('sends mintMusic with correct calldata', async () => {
    const harness = makeHarness();
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD },
      publicClient: harness.publicClient,
      walletClient: harness.walletClient,
    });
    const { hash } = await muzix.catalog.mintMusic({
      tokenURI: 'ipfs://abc',
      metadata: { isrc: 'USRC17607839', artist: 'Test Artist' },
    });
    expect(hash.startsWith('0x')).toBe(true);
    expect(harness.provider.sentTxs).toHaveLength(1);
    const tx = harness.provider.sentTxs[0]!;
    expect(tx.to?.toLowerCase()).toBe(CATALOG.toLowerCase());
    const decoded = decodeFunctionData({
      abi: MuzixCatalogAbi,
      data: tx.data!,
    });
    expect(decoded.functionName).toBe('mintMusic');
    const [uri, md] = decoded.args as [string, { isrc: string; artist: string }];
    expect(uri).toBe('ipfs://abc');
    expect(md.isrc).toBe('USRC17607839');
    expect(md.artist).toBe('Test Artist');
  });

  it('sends depositRevenue with the right value', async () => {
    const harness = makeHarness();
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD },
      publicClient: harness.publicClient,
      walletClient: harness.walletClient,
    });
    await muzix.catalog.depositRevenue({ tokenId: 9n, amount: 1_000n });
    const tx = harness.provider.sentTxs[0]!;
    const decoded = decodeFunctionData({
      abi: MuzixCatalogAbi,
      data: tx.data!,
    });
    expect(decoded.functionName).toBe('depositRevenue');
    expect(decoded.args?.[0]).toBe(9n);
    // value is hex-encoded
    expect(BigInt(tx.value ?? '0x0')).toBe(1_000n);
  });

  it('sends setRoyaltySplit with bps entries ordered correctly', async () => {
    const harness = makeHarness();
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD },
      publicClient: harness.publicClient,
      walletClient: harness.walletClient,
    });
    const a: Address = '0x1111111111111111111111111111111111111111';
    const b: Address = '0x2222222222222222222222222222222222222222';
    await muzix.catalog.setRoyaltySplit({
      tokenId: 1n,
      entries: [
        { recipient: a, shareBps: 7000 },
        { recipient: b, shareBps: 3000 },
      ],
    });
    const tx = harness.provider.sentTxs[0]!;
    const decoded = decodeFunctionData({
      abi: MuzixCatalogAbi,
      data: tx.data!,
    });
    expect(decoded.functionName).toBe('setRoyaltySplit');
    const [tokenId, recipients, shares] = decoded.args as [
      bigint,
      readonly Address[],
      readonly number[],
    ];
    expect(tokenId).toBe(1n);
    expect(recipients).toEqual([a, b]);
    expect(shares).toEqual([7000, 3000]);
  });

  it('exposes the right function selector on claimStreamingRevenue', async () => {
    const harness = makeHarness();
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD },
      publicClient: harness.publicClient,
      walletClient: harness.walletClient,
    });
    await muzix.catalog.claimStreamingRevenue(5n);
    const tx = harness.provider.sentTxs[0]!;
    const selector = tx.data?.slice(0, 10);
    expect(selector).toBe(
      toFunctionSelector(abiItem('claimStreamingRevenue') as never),
    );
  });
});
