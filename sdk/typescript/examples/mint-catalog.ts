/**
 * End-to-end example: mint a MuzixCatalog entry and query it back.
 *
 * Usage:
 *   1. Start the local Muzix devnet:
 *        cd node && ./deploy.sh        # spins docker-compose + deploys core contracts
 *   2. Export the addresses from the deploy script:
 *        export MUZIX_CATALOG_ADDRESS=0x...
 *        export MUZIX_MUSD_ADDRESS=0x...
 *        export PRIVATE_KEY=0x...       # must be the catalog owner key (the deployer)
 *   3. Run:
 *        npm run example:mint
 *
 * The script mints a single catalog token, prints its on-chain metadata,
 * sets a two-way royalty split, then deposits a symbolic 0.001 ETH of
 * streaming revenue to demonstrate the pull-payment flow.
 */

import { createPublicClient, createWalletClient, http, type Address } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import { createMuzixClient, muzixDevnet } from '../src/index.js';

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
    contracts: { catalog, musd },
    publicClient,
    walletClient,
  });

  // 1. Mint a catalog entry (caller must own the MuzixCatalog contract).
  console.log('Minting catalog token...');
  const mint = await muzix.catalog.mintMusic({
    tokenURI: 'ipfs://bafyexamplemuzixsdkdemo',
    metadata: { isrc: 'USRC17607839', artist: 'SDK Demo Artist' },
  });
  await mint.wait();
  console.log('  tx:', mint.hash);

  // 2. Find the tokenId — we just minted #0 in a fresh deployment, but for
  //    robustness, query the catalog's owner-of for the expected id.
  const tokenId = 0n;
  const owner = await muzix.catalog.ownerOf(tokenId);
  const metadata = await muzix.catalog.getMetadata(tokenId);
  console.log(`Token #${tokenId}`);
  console.log(`  owner:  ${owner}`);
  console.log(`  isrc:   ${metadata.isrc}`);
  console.log(`  artist: ${metadata.artist}`);

  // 3. Configure a 70/30 split. Both addresses must be distinct from address(0).
  const artistAddr = account.address;
  const labelAddr: Address = '0x1234567890123456789012345678901234567890';
  console.log('Setting royalty split (artist 70% / label 30%)...');
  const setSplit = await muzix.catalog.setRoyaltySplit({
    tokenId,
    entries: [
      { recipient: artistAddr, shareBps: 7000 },
      { recipient: labelAddr, shareBps: 3000 },
    ],
  });
  await setSplit.wait();
  console.log('  tx:', setSplit.hash);

  // 4. Read the split back.
  const split = await muzix.catalog.getRoyaltySplit(tokenId);
  console.log('On-chain split:');
  for (const entry of split.entries) {
    console.log(`  ${entry.recipient}  ${entry.shareBps / 100}%`);
  }

  // 5. Deposit some revenue (0.001 ETH).
  const depositAmount = 10n ** 15n;
  console.log(`Depositing ${depositAmount} wei of streaming revenue...`);
  const deposit = await muzix.catalog.depositRevenue({
    tokenId,
    amount: depositAmount,
  });
  await deposit.wait();
  console.log('  tx:', deposit.hash);

  const totalRevenue = await muzix.catalog.totalStreamingRevenue(tokenId);
  console.log(`Total streaming revenue on-chain: ${totalRevenue}`);
  console.log('Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
