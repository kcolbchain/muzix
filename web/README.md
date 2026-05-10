# Muzix Web

Minimal explorer UI for the Muzix music-finance protocol — Next.js 15 + Tailwind, dark/mono aesthetic. Ships with mock catalog data so it works pre-deployment; swaps to live `@kcolbchain/muzix-sdk` reads once a canonical contract set lands.

## Develop

```bash
cd web
npm install
npm run dev
# http://localhost:3000
```

## Routes

- `/` — Hero, protocol stats, four pillars, recent issuances
- `/catalog` — All tokens with split bars + AI-provenance flag
- `/catalog/[tokenId]` — Track detail: cap table, AI provenance, on-chain refs
- `/about` — Architecture (MuzixCatalog · MUSD · MuzixAIProvenance · StreamingRevenueOracle)

## Going live

1. Deploy `MuzixCatalog`, `MUSD`, `MuzixAIProvenance`, oracle to a public network.
2. Wire `lib/mock-data.ts` consumers to `createMuzixClient({ contracts, transport })` from `@kcolbchain/muzix-sdk`.
3. Set `NEXT_PUBLIC_RPC_URL` and contract addresses via env.
4. Drop a Vercel project at `muzix.kcolbchain.com`.

## Aesthetic

- Background `#0a0a0a`, text `#f5f1e8`, single accent `#f5c451` (honey).
- Inter for prose, JetBrains Mono for ISRC / addresses / hashes.
- Pseudo-waveforms are deterministic per ISRC — same seed, same bars.
