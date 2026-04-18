import { describe, it, expect } from 'vitest';
import {
  encodeFunctionResult,
  type Address,
  type Hex,
} from 'viem';

import { createMuzixClient } from '../src/client.js';
import { MissingOracleError } from '../src/errors.js';
import { makeHarness, StreamingRevenueOracleAbi } from './helpers.js';

const CATALOG: Address = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca';
const MUSD: Address = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';
const ORACLE: Address = '0x0101010101010101010101010101010101010101';

describe('OracleModule', () => {
  it('throws MissingOracleError when oracle is not configured', async () => {
    const harness = makeHarness();
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD },
      publicClient: harness.publicClient,
    });
    await expect(
      muzix.oracle.getLatestRevenue(('0x' + '00'.repeat(32)) as Hex),
    ).rejects.toBeInstanceOf(MissingOracleError);
  });

  it('decodes isDataFresh', async () => {
    const harness = makeHarness({
      eth_call: () =>
        encodeFunctionResult({
          abi: StreamingRevenueOracleAbi,
          functionName: 'isDataFresh',
          result: true,
        }) as Hex,
    });
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD, oracle: ORACLE },
      publicClient: harness.publicClient,
    });
    expect(
      await muzix.oracle.isDataFresh(('0x' + '11'.repeat(32)) as Hex),
    ).toBe(true);
  });

  it('decodes getRevenueForPeriod', async () => {
    const harness = makeHarness({
      eth_call: () =>
        encodeFunctionResult({
          abi: StreamingRevenueOracleAbi,
          functionName: 'getRevenueForPeriod',
          result: 1_234_567n,
        }) as Hex,
    });
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD, oracle: ORACLE },
      publicClient: harness.publicClient,
    });
    const rev = await muzix.oracle.getRevenueForPeriod(
      ('0x' + '22'.repeat(32)) as Hex,
      100n,
      200n,
    );
    expect(rev).toBe(1_234_567n);
  });
});
