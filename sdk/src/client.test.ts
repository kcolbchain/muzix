/**
 * MuzixClient Tests
 */

import { MuzixClient } from './client';
import { ChainConfig } from './types';

// Mock chain config for testing
const mockChain: ChainConfig = {
  id: 1337,
  name: 'Muzix Testnet',
  rpcUrl: 'http://localhost:8545',
  nativeCurrency: {
    name: 'ETH',
    symbol: 'ETH',
    decimals: 18,
  },
};

describe('MuzixClient', () => {
  let client: MuzixClient;

  beforeEach(() => {
    client = new MuzixClient({
      chain: mockChain,
    });
  });

  describe('Initialization', () => {
    it('should initialize with chain config', () => {
      expect(client.chain).toEqual(mockChain);
      expect(client.chainId).toBe(1337);
    });

    it('should not have wallet connected initially', () => {
      expect(client.isWalletConnected).toBe(false);
    });

    it('should initialize all feature modules', () => {
      expect(client.musd).toBeDefined();
      expect(client.catalog).toBeDefined();
      expect(client.royalty).toBeDefined();
      expect(client.streaming).toBeDefined();
    });
  });

  describe('Wallet Connection', () => {
    it('should return undefined for wallet address when not connected', async () => {
      const address = await client.getWalletAddress();
      expect(address).toBeUndefined();
    });
  });

  describe('Chain Info', () => {
    it('should return correct chain ID', () => {
      expect(client.chainId).toBe(1337);
    });

    it('should return chain config', () => {
      expect(client.chain.name).toBe('Muzix Testnet');
      expect(client.chain.rpcUrl).toBe('http://localhost:8545');
    });
  });
});
