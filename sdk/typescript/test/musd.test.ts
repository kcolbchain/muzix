import { describe, it, expect } from 'vitest';
import {
  decodeFunctionData,
  encodeFunctionResult,
  type Address,
  type Hex,
} from 'viem';

import { createMuzixClient } from '../src/client.js';
import { makeHarness, MUSDAbi } from './helpers.js';

const CATALOG: Address = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca';
const MUSD: Address = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

describe('MusdModule — reads', () => {
  it('reads balanceOf', async () => {
    const harness = makeHarness({
      eth_call: () =>
        encodeFunctionResult({
          abi: MUSDAbi,
          functionName: 'balanceOf',
          result: 1_234_000n,
        }) as Hex,
    });
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD },
      publicClient: harness.publicClient,
    });
    const bal = await muzix.musd.balanceOf(
      '0x1111111111111111111111111111111111111111',
    );
    expect(bal).toBe(1_234_000n);
  });

  it('reads pendingWithdrawals', async () => {
    const harness = makeHarness({
      eth_call: () =>
        encodeFunctionResult({
          abi: MUSDAbi,
          functionName: 'pendingWithdrawals',
          result: 42n,
        }) as Hex,
    });
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD },
      publicClient: harness.publicClient,
    });
    expect(
      await muzix.musd.pendingWithdrawals(
        '0x1111111111111111111111111111111111111111',
      ),
    ).toBe(42n);
  });
});

describe('MusdModule — writes', () => {
  it('sends batchRoyaltyDistribution with matched arrays', async () => {
    const harness = makeHarness();
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD },
      publicClient: harness.publicClient,
      walletClient: harness.walletClient,
    });
    await muzix.musd.batchRoyaltyDistribution({
      tokenIds: [1n, 2n],
      amounts: [100_000n, 200_000n],
    });
    const tx = harness.provider.sentTxs[0]!;
    expect(tx.to?.toLowerCase()).toBe(MUSD.toLowerCase());
    const decoded = decodeFunctionData({
      abi: MUSDAbi,
      data: tx.data!,
    });
    expect(decoded.functionName).toBe('batchRoyaltyDistribution');
    const [ids, amounts] = decoded.args as [readonly bigint[], readonly bigint[]];
    expect(ids).toEqual([1n, 2n]);
    expect(amounts).toEqual([100_000n, 200_000n]);
  });

  it('sends claimPayments', async () => {
    const harness = makeHarness();
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD },
      publicClient: harness.publicClient,
      walletClient: harness.walletClient,
    });
    await muzix.musd.claimPayments();
    const tx = harness.provider.sentTxs[0]!;
    const decoded = decodeFunctionData({ abi: MUSDAbi, data: tx.data! });
    expect(decoded.functionName).toBe('claimPayments');
  });

  it('sends approve with encoded args', async () => {
    const harness = makeHarness();
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD },
      publicClient: harness.publicClient,
      walletClient: harness.walletClient,
    });
    await muzix.musd.approve({
      spender: '0x5555555555555555555555555555555555555555',
      amount: 777n,
    });
    const tx = harness.provider.sentTxs[0]!;
    const decoded = decodeFunctionData({ abi: MUSDAbi, data: tx.data! });
    expect(decoded.functionName).toBe('approve');
    expect(decoded.args?.[1]).toBe(777n);
  });
});
