# LABELTON — Architecture & Integration

> Status: **draft (2026-05-25)** — Patty + Abhi, pre-merge. Not yet on `main`.

LABELTON is the **rights-tokenization product** of the Muzix protocol. This document explains what it is, how it fits with the contracts already shipped to `kcolbchain/muzix`, and what it deliberately doesn't try to do.

## Where LABELTON fits

```
┌────────────────────────────────────────────────────────────────┐
│                     Muzix DAO (governance)                      │
│         protocol params · treasury · variant-kind toggles       │
│              verifier addresses · pause switch                  │
└──────────────────────────────┬─────────────────────────────────┘
                               │ governs (onlyOwner config)
                               ▼
┌────────────────────────────────────────────────────────────────┐
│                       LABELTON (this PR)                        │
│   ▸ registerMaster(isrc, upc, iswc, mirHash, legalIdHash,       │
│                    financialIdHash, capTable[])                 │
│   ▸ mintVariant(masterId, kind, isrc, uri)                      │
│                                                                 │
│   ERC-1155 supply == basis-point shares, fanned to cap-table.   │
│   Cap-table is immutable post-registration; variants inherit.   │
└──────────────────────────────┬─────────────────────────────────┘
                               │ runs on
                               ▼
┌────────────────────────────────────────────────────────────────┐
│           CR8 chain (own L1  OR  LUX subnet — open)             │
│   OP Stack settlement · MUSD or CR8-native gas (TBD)            │
└────────────────────────────────────────────────────────────────┘
```

## What LABELTON anchors

For each Master:

| Field | Type | Purpose |
|---|---|---|
| `isrcRoot` | string (unique) | Sound recording identifier (legal-system bridge) |
| `upc` | string (unique if set) | Release identifier (UPC / EAN / GRid) |
| `iswc` | string (unique if set) | Composition identifier |
| `mirHash` | bytes32 | Content-hash of off-chain MIR fingerprint document |
| `legalIdHash` | bytes32 | Content-hash of off-chain legal-entity dossier |
| `financialIdHash` | bytes32 | Content-hash of off-chain financial-routing record |
| `capTable` | `{address, uint16 bps}[]` | Immutable post-registration; sum to 10000 |

For each Variant:

| Field | Type | Purpose |
|---|---|---|
| `masterId` | uint256 | Backreference to master (cap-table source) |
| `kind` | enum | Master / Single / Album / Remix / Stem / SyncEdit / Cover / Instrumental / Live / Other |
| `isrc` | string (unique if set) | Per-variant ISRC, often a sibling of the master's |
| `uri` | string | Off-chain metadata URI (audio, art, JSON) |

ERC-1155 balance per `(holder, variantId)` equals the holder's basis-point share of that variant. Balance IS the share.

## Design principles

1. **Wallet-sovereign mint.** No admin gate on issuance. The artist (or any cap-table member) calls `registerMaster` and `mintVariant` directly. The DAO does not issue tokens.
2. **Cap-table is the rights anchor.** Set once at registration, immutable thereafter. Variants inherit it. This is the legal-weight commitment.
3. **Identifiers are first-class.** ISRC/UPC/ISWC stored on-chain as strings with uniqueness and reverse-lookups. Bridge to the music industry's legal identifier system.
4. **Off-chain payloads are hash-bound.** MIR, legal-ID, financial-ID docs live off-chain (IPFS / Arweave / custodian); LABELTON commits to their content-hash at registration.
5. **DAO governs configuration, not issuance.** Muzix DAO controls allowed variant kinds, verifier addresses, pause switch. It does *not* control mints.
6. **ERC-1155 supply = share unit.** 10000 units per variant matches basis-point granularity; no parallel cap-table mapping needed.

## How it integrates with existing muzix contracts

### MuzixRightsOffering (PR #37 — open)

`MuzixRightsOffering` is the pre-mint term-sheet negotiation layer (artist posts terms, bidders counter, artist accepts). The PR body explicitly says: *"Rights NFT issuance — for now `(offeringId, acceptedCounterId)` is the canonical on-chain commitment reference."* LABELTON closes that loop:

- After `acceptCounter` on #37, the accepted-counter `Economics` (artist royalty %, term, upfront, min guarantee) defines the cap-table.
- A downstream contract (or off-chain orchestrator) calls `Labelton.registerMaster` with that cap-table, anchoring the rights structure on-chain.
- For the Sapta pilot in #37, `registerMaster` is the next step after a counter is accepted.

### MUSD (existing)

`MUSD._distribute` currently reads the cap-table from `IMuzixCatalog.royaltySplits`. With LABELTON deployed, it should add a path that reads `Labelton.capTableOf(masterId)`. The pull-payment, batch-payout, and ERC-20-Permit features stay intact. Whether MUSD itself survives the tokenomics rebrainstorm is open — but the LABELTON-side surface is stable either way.

### MuzixStreamingOracle (PR #36 — open)

`MuzixStreamingOracle` ingests verified streaming-revenue data per `catalogId`. With LABELTON deployed:

- `catalogId` becomes the LABELTON master id (cross-DSP aggregate) or variant id (per-variant accounting).
- The downstream royalty distributor reads `Labelton.capTableOf(masterId)` to fan revenue.
- No changes to the `#36` contract itself; only the consumer side rewires.

### MuzixAIProvenance (merged)

`MuzixAIProvenance` already keys on `(catalog address, tokenId)` with owner-gated writes via `ownerOf`. It works against LABELTON identically — pass the Labelton contract address as `catalog` and the variant id as `tokenId`. Owner-gate compatibility is preserved because LABELTON is ERC-1155 and a holder of the variant token is the cap-table member.

Note: AIProvenance currently checks `IERC721Minimal(catalog).ownerOf(tokenId)`. For ERC-1155 we'd need a sibling check (`balanceOf(account, id) > 0`) or a separate provenance contract — a small follow-up.

### MuzixCatalog (existing — to be retired-as-rights-anchor)

`MuzixCatalog`'s `MusicMetadata { isrc, artist }` and parallel cap-table mapping are subsumed by LABELTON. Its known footguns become moot once the cap-table moves:

- ERC-2981 default royalty pointed to `address(this)` with no withdrawal path → no longer needed.
- Freely re-settable `setRoyaltySplit` lets a new token owner redirect cash flows → not a problem in LABELTON (cap-table immutable, share = ERC-1155 balance, transfers are explicit).
- No ISRC uniqueness → enforced in LABELTON.

`MuzixCatalog` can either be retired or repurposed as a lightweight artwork / release-art NFT — separate decision.

## What this PR does NOT do

- **No MUSD changes** — royalty distribution against LABELTON cap-tables is a follow-up.
- **No CR8 chain decision** — LABELTON deploys identically on either an own-L1 CR8 or a LUX subnet.
- **No verifier signature enforcement** — verifier addresses are storable on-chain but signatures are not yet checked at registration. Off-chain dossier verification is a follow-up.
- **No migration of existing MuzixCatalog tokens** — separate concern.
- **No DAO governance contract** — Muzix DAO governance lives elsewhere (Aragon / Tally / custom — TBD); LABELTON's `onlyOwner` config endpoints will be owned by it.
- **No per-variant cap-table override** — all variants inherit the master's cap-table. Future may allow remix-specific splits, but per the "root mint always lands to the same set of wallet holders" rule, v0 keeps the invariant strict.
- **No tokenomics on the CR8 native token** — out of scope.

## Open design questions

1. **Variant cap-table inheritance vs override.** Real-world remix royalties typically have different splits. v0 inherits. Override behind a governance vote? Per-variant explicit cap-table? See companion issue.
2. **Verifier enforcement.** Single oracle? Multi-sig? Per-domain (separate MIR, legal, financial)? v0 stores addresses but doesn't enforce signatures.
3. **MUSD vs CR8-native as settlement asset.** v0 leaves MUSD intact.
4. **`mintVariant` permission.** v0 allows any cap-table member. Should it be only the registrant, or a designated minter role?
5. **Cap-table mutability.** Real-world rights transfers happen. v0 says immutable; transfers are via ERC-1155. Should the DAO have a governance-gated mutation path for legal events (sales, inheritance, label assignments)?

## File layout

```
src/Labelton.sol                 ← new (this PR)
docs/labelton-architecture.md    ← new (this PR — this file)
test/Labelton.t.sol              ← new (this PR — Foundry tests, to follow)
```
