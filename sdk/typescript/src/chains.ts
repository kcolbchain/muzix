import { defineChain } from 'viem';

/**
 * Muzix devnet — matches `node/docker-compose.yml` and `node/README.md`.
 *
 * Chain ID 1338, 2-second block time. The RPC URL defaults to the local
 * op-geth endpoint; override with `createMuzixClient({ transport })` when
 * pointing at a hosted testnet/mainnet.
 */
export const muzixDevnet = defineChain({
  id: 1338,
  name: 'Muzix Devnet',
  nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
  blockExplorers: {
    default: { name: 'Blockscout (local)', url: 'http://127.0.0.1:4000' },
  },
  testnet: true,
});
