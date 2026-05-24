# LABELTON: the rights primitive music has been missing on-chain

*By [@abhicris](https://github.com/abhicris) (Abhishek Krishna, kcolbchain) and [@Pattermesh](https://github.com/Pattermesh) (Patty)*

*kcolbchain · 2026-05-25*

---

## The gap

Web3 music has shipped four serious waves: Royal sold fractional royalty shares, Audius ran a decentralized DSP, Opulous lent against future royalties, Sound.xyz and Catalog turned tracks into collectibles.

Every one of them is a **product on top of an implicit rights model**. The rights model itself was always either off-chain (a custodian holding the answer to "who actually owns this song") or weakly bound (an NFT whose link to the underlying recording was a free-form string in a metadata blob).

The music industry has spent fifty years building a legal identifier system that the on-chain world has mostly ignored:

- **ISRC** (International Standard Recording Code) — issued per sound recording, the canonical identifier for what plays on Spotify or Apple Music.
- **UPC / EAN / GRid** — the release identifier, what a label uses to sell an album.
- **ISWC** — the composition identifier, what the publisher and PRO use to track songwriter royalties.
- **IPI / IPN** — the rights-holder identifier, what attaches a real legal entity (a person, a label, a publisher) to a share.

Every label contract, every PRO payout, every sync deal routes through these identifiers. They are the **legal-system primary keys** of the music industry.

Nothing on-chain today binds tokenized music to those keys with the weight a real contract would carry. That is the missing primitive. LABELTON is what we built to fill it.

## What LABELTON is

LABELTON is a contract — and a product — that turns the legal identifier system into a first-class on-chain object.

For every piece of music, LABELTON registers a **Master**:

| What's anchored | How it's stored |
|---|---|
| **ISRC** (recording identifier) | On-chain string, unique, with a reverse-lookup mapping. |
| **UPC** (release identifier) | On-chain string, unique if set. |
| **ISWC** (composition identifier) | On-chain string, unique if set. |
| **MIR fingerprint** (audio-derived metadata) | Content-hash of the off-chain dossier (IPFS / Arweave). |
| **Legal identity** (the rights-holder entity) | Content-hash of the off-chain legal dossier. |
| **Financial routing** (payout / tax / banking) | Content-hash of the off-chain financial record. |
| **Cap-table** (who owns what share of this work) | On-chain, basis-point granularity, **immutable** post-registration. |

Once a master is registered, LABELTON can mint **variants** of it — singles, albums, remixes, stems, sync edits, covers, instrumentals, live recordings. Each variant is an ERC-1155 token class, and its 10000-unit supply is fanned across the master's cap-table in proportion to each holder's basis-point share.

ERC-1155 balance **is** the share. There is no parallel cap-table mapping; the token itself encodes the rights stake.

## The primitive, compressed

> **The cap-table IS the rights structure. It is set at the moment of master generation, by the artist's wallet, with the legal identifiers attached. The token, the cap-table, and the legal identifier are issued in the same transaction.**

No admin sits between the artist and the token. No editor modifies the cap-table after the fact. No metadata string substitutes for an ISRC.

What this gives us:

1. **Wallet-sovereign mint.** The artist's wallet (or any cap-table member) calls `registerMaster` directly. There is no admin path. There is no label gatekeeper. There is no DAO veto on issuance. The artist's signature on a single transaction is sufficient and authoritative.
2. **The cap-table doesn't drift.** Industry contracts assume "this song splits 50/40/10 between writer, performer, producer" and they can be audited five years later. LABELTON's cap-table can be audited the same way — it is immutable from the moment of registration. Rights *transfers* are explicit ERC-1155 share transfers with on-chain events. Rights *re-allocation* — the thing labels quietly do to themselves — is no longer possible without registering a new master.
3. **The token speaks the industry's language.** A LABELTON token with a real ISRC reconciles directly against a Spotify payout report. A token with a real UPC reconciles against a distributor's release statement. A token with a real ISWC reconciles against a PRO's collections statement. The identifiers are not optional metadata — they are the canonical anchor and the basis for every downstream reconciliation.
4. **Off-chain payloads stay off-chain, but verifiable.** A master's MIR fingerprint doesn't go on chain — its hash does. A rights-holder's KYC dossier doesn't go on chain — its hash does. If the hash changes, it's a new master. The chain is the commitment layer, not the storage layer.

## The architectural innovations

Two things in LABELTON are worth pulling out specifically because they make the rest possible.

### ERC-1155 supply = basis-point share

Every variant of a master mints 10000 units, fanned across the cap-table by each holder's basis-point share. A 50/30/20 cap-table is `(5000, 3000, 2000)` units to three wallets per variant. This means:

- **ERC-1155 `balanceOf(holder, variantId)` is the holder's basis-point share.** No parallel mapping, no `setRoyaltySplit` function for a token-owner to abuse later.
- **Royalty distribution is a single `balanceOf` lookup per recipient.** Streaming revenue per variant divides by 10000 and multiplies by each holder's balance. The settlement contract reads one value from one mapping.
- **Share transfers are first-class.** A cap-table holder selling their stake is an ERC-1155 `safeTransferFrom`. Marketplaces handle it natively.
- **Multi-variant token classes per master are free.** Single, album, remix, sync edit — same contract, different token ids, same cap-table arithmetic.

### Standalone contract, owner-gated by ownership

LABELTON does not extend an existing ERC-721. It is its own contract. Provenance contracts (like `MuzixAIProvenance`) attach to LABELTON tokens by referencing the contract address and the variant id. The pattern is composable rather than monolithic.

That matters because it lets us evolve the rights surface without breaking the catalog surface, and it lets multiple registries (rights, AI provenance, sync licenses, mechanical splits) coexist without one of them owning the schema.

## The legal-system bridge

LABELTON is not a parallel music industry. The point of putting ISRC on chain isn't to deprecate the IFPI's issuance authority — it is to **make the existing authority's outputs first-class on chain**.

A label with thousands of ISRC-coded recordings can register them in LABELTON without re-licensing anything. A PRO that tracks ISWCs can audit on-chain claims against its database. A regulator that wants to know which legal entity owns a particular master can read the cap-table and verify the hash-bound legal dossier.

This is the part prior on-chain music projects skipped. It is also the part that determines whether music finance on chain connects to the $28B+ off-chain economy or remains a parallel curiosity. We picked the connecting side.

## Muzix DAO, LABELTON product, CR8 chain

Three layers. Strictly separated.

```
┌──────────────────────────────────────────────────────────┐
│                  Muzix DAO (governance)                   │
│   Variant kinds · verifier addresses · pause · treasury   │
└────────────────────────┬─────────────────────────────────┘
                         │ governs (no admin mint power)
                         ▼
┌──────────────────────────────────────────────────────────┐
│                LABELTON (rights product)                  │
│   Master registry · variant mint · cap-table · ID bridge  │
└────────────────────────┬─────────────────────────────────┘
                         │ runs on
                         ▼
┌──────────────────────────────────────────────────────────┐
│                       CR8 chain                           │
│   OP Stack settlement · MUSD or CR8-native gas (open)     │
└──────────────────────────────────────────────────────────┘
```

The DAO does not mint music. It cannot insert itself between an artist and their wallet. It governs the protocol's configuration surface (which variant kinds exist, which verifier addresses are trusted, whether the contract is paused) — and that's it.

This is a deliberate inversion of the typical "DAO that issues NFTs" pattern. The DAO sits **above** the product, configuring it; it does not sit **inside** the product, gating it.

## How we got here

We arrived at this design from opposite ends.

**Abhi** built the on-chain infrastructure: the OP Stack chain, the MUSD stablecoin with pull-payment royalty distribution (PR #20), the catalog tokenization contracts (#17), the streaming-revenue oracle spec (#15), the rights-offering term-sheet registry where labels and artists negotiate (#37). The chain and the money were ready before the rights were.

**Patty** seeded the rights side: a tokenization model that mints directly to artist wallets at master generation, anchored by industry identifiers, with an immutable cap-table. The rights model existed independently of any specific chain.

The two converged on 2026-05-25. The chain and the money were waiting for a rights primitive; the rights primitive was waiting for a chain. Muzix is now the DAO. LABELTON is the product. CR8 is the chain.

## The pipeline

Three artists are in our broker pipeline as of today: **SAPTA**, **NORIKO**, **GRAVE**.

SAPTA is the first pilot. Abhi's PR #37 already seeds two Sapta drafts (a 3-year exclusive distribution deal and a 5-year full-catalog deal) in the rights-offering contract. When a counter is accepted on that offering, LABELTON mints the cap-table on-chain — that's the moment SAPTA's rights structure goes from a PDF to a primary key.

NORIKO and GRAVE follow.

## Where we want pushback

Five design questions are open on the repo. We have a position on each; we are not pretending otherwise. We are publishing them in public so the people who will reconcile against this on the legal side get to push back on the technical side before code ships to mainnet.

1. **Variant cap-table inheritance vs override** (issue #45). Strict inheritance is v0. Remix royalties argue for something more nuanced.
2. **Verifier model for MIR / legal / financial-ID dossiers** (issue #46). EIP-712 single-signer per domain is our current position. Multi-sig is a later upgrade.
3. **MUSD vs CR8-native as the settlement asset.** Open. The tokenomics rebrainstorm decides this.
4. **CR8 chain — own L1 or LUX subnet** (issue #47). Patty has proposed both; we will pick one.
5. **Cap-table mutability for real-world legal events** (sales, inheritance, label assignments). v0 is immutable. Transfers are ERC-1155 share transfers. We think that is enough; the industry will tell us if it isn't.

If you are a label A&R, a publisher, a PRO operator, a music finance fund, a sync supervisor, or a regulator: open an issue on `kcolbchain/muzix`. We will treat your reconciliation cases as ground truth.

## What LABELTON is not

LABELTON is not a DSP. Audius covered that surface.

LABELTON is not a fractional-royalty marketplace. Royal covered that surface.

LABELTON is not catalog-backed DeFi. Opulous covered that surface.

LABELTON is the **protocol underneath** — the rights anchor any of those products should have been built on, and weren't, because it didn't exist.

It exists now. The contract is in `kcolbchain/muzix#48`. The thesis follows the code, not the other way around.

---

*References:*

- LABELTON contract: [`kcolbchain/muzix#48`](https://github.com/kcolbchain/muzix/pull/48) (draft PR, 2026-05-25)
- Architecture doc: [`docs/labelton-architecture.md`](./labelton-architecture.md)
- LABELTON RFC: [`kcolbchain/muzix#38`](https://github.com/kcolbchain/muzix/issues/38)
- Music finance economics (prior work): [`docs/music-finance-economics.md`](./music-finance-economics.md)
- Rights-offering contract: [`kcolbchain/muzix#37`](https://github.com/kcolbchain/muzix/pull/37)
- Streaming-revenue oracle: [`kcolbchain/muzix#36`](https://github.com/kcolbchain/muzix/pull/36)
- kcolbchain research repo: [`github.com/kcolbchain/research`](https://github.com/kcolbchain/research)
