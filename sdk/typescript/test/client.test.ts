import { describe, it, expect } from 'vitest';
import type { Address } from 'viem';

import { createMuzixClient } from '../src/client.js';
import { MissingWalletError } from '../src/errors.js';
import { makeHarness } from './helpers.js';

const CATALOG: Address = '0xabcabcabcabcabcabcabcabcabcabcabcabcabca';
const MUSD: Address = '0xdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

describe('createMuzixClient', () => {
  it('wires up all three modules with the right addresses', () => {
    const harness = makeHarness();
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD },
      publicClient: harness.publicClient,
      walletClient: harness.walletClient,
    });
    expect(muzix.catalog.contractAddress.toLowerCase()).toBe(
      CATALOG.toLowerCase(),
    );
    expect(muzix.musd.contractAddress.toLowerCase()).toBe(MUSD.toLowerCase());
  });

  it('throws MissingWalletError when a read-only client tries to write', async () => {
    const harness = makeHarness();
    const muzix = createMuzixClient({
      contracts: { catalog: CATALOG, musd: MUSD },
      publicClient: harness.publicClient,
    });
    await expect(muzix.musd.claimPayments()).rejects.toBeInstanceOf(
      MissingWalletError,
    );
  });
});
