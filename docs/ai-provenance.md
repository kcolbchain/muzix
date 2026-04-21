# AI-Provenance Hook — `MuzixAIProvenance`

`MuzixAIProvenance` is an optional, opt-in on-chain registry that binds a
MuzixCatalog music token to either:

- a **human-only attestation** (no AI model contributed to the work), or
- a set of ERC-721-AI (or compatible) **model-token contracts** + off-chain
  IP-lineage URIs.

It is the first concrete bridge from [`kcolbchain/erc721-ai`][erc721-ai] (AI
model weights as ERC-721) to [`kcolbchain/muzix`][muzix] (music-finance
contracts).

## Why it exists

Tokenised music in 2026 can no longer dodge the question "was AI used, and
how?" — the ELVIS Act, the EU AI Act (Art. 50), label-side provenance
mandates, and artist-side credit demands all push toward verifiable,
portable provenance. Muzix's settlement layer (MUSD + MuzixCatalog + the
streaming-revenue oracle) needs a provenance primitive it can point at.
The design goals, in priority order:

1. **Opt-in, non-invasive.** MuzixCatalog is not modified. Catalogs can
   adopt the registry without a migration.
2. **One-way bridge.** `erc721-ai` is referenced by address only; it is
   not a build-time dependency here. Any future AI-asset standard that
   exposes an `address` identity can be referenced the same way.
3. **Commit-reveal friendly.** Full lineage documents live off-chain
   (IPFS/Arweave); on-chain we store the referenced addresses, the URIs,
   and a `provenanceHash` that binds them. Off-chain verifiers can
   reproduce the binding and challenge a mismatch.
4. **Owner-gated writes.** Only the current ERC-721 owner of the catalog
   token can attach or revoke provenance. In practice this is the same
   address that controls the royalty cap-table on MuzixCatalog, so the
   authority model matches Muzix's existing surface.

## The record

```solidity
struct AIProvenance {
    bool set;
    bool humanOnly;
    address[] aiModelTokens;   // ERC-721-AI (or compatible) contracts
    string[] ipLineageURIs;    // off-chain lineage docs (model cards, credits)
    bytes32 provenanceHash;    // keccak256(abi.encode(humanOnly, aiModelTokens, ipLineageURIs))
    uint64 updatedAt;
}
```

**Invariants enforced on write:**

- `provenanceHash != bytes32(0)`
- `humanOnly == true` implies `aiModelTokens.length == 0`
- `aiModelTokens.length <= MAX_AI_MODEL_TOKENS` (16)
- `ipLineageURIs.length <= MAX_LINEAGE_URIS` (16)
- each URI is at most `MAX_URI_BYTES` (512 bytes)

The SDK provides `computeProvenanceHash(...)` (on-chain: pure view;
off-chain: `keccak256(encodeAbiParameters([...], [...]))`). Callers are
free to adopt a richer binding (e.g. EIP-712) and pass any non-zero hash
— the contract treats it as an opaque commitment.

## Auth model

Writes (`setProvenance`, `clearProvenance`) call
`IERC721Minimal(catalog).ownerOf(tokenId)` and require the caller to be
the current owner. Reads are unrestricted.

Transferring the music token transfers the right to replace the record
(the old owner loses write authority). Replacing a record overwrites the
previous one entirely; clearing it emits `ProvenanceCleared` and zeroes
storage.

## Integration with `erc721-ai`

The bridge is one-way. A music token's record stores the erc721-ai
**contract addresses** that produced it — not erc721-ai token IDs. The
reasoning:

- A single AI model (one erc721-ai contract) may have many training
  runs / epochs with different token IDs; referencing the contract keeps
  the record stable across model versioning.
- Consumers who need finer granularity can encode it in the
  off-chain lineage doc referenced by `ipLineageURIs`, and bind it with
  `provenanceHash`.
- Future follow-up: add a companion registry that maps
  `(catalog, tokenId) -> (modelContract, modelTokenId)[]` once `erc721-ai`
  token IDs are stable. Out of scope here.

## Downstream hooks (follow-ups, not in this PR)

- Royalty-split auto-routing to erc721-ai model owners (reads from this
  registry at `claim`-time). Blocked on MuzixCatalog.sol:17 compile fix
  (issue #25) because it requires a registry pointer in MuzixCatalog.
- ERC-2981 extension that optionally sends the AI share of secondary-sale
  royalties to model owners.
- Subgraph for provenance-keyed search.

## SDK surface

```ts
import { createMuzixClient, computeProvenanceHash } from '@kcolbchain/muzix-sdk';

const muzix = createMuzixClient({
  contracts: {
    catalog: '0x...',
    musd: '0x...',
    provenance: '0x...', // MuzixAIProvenance address
  },
  publicClient,
  walletClient,
});

const hash = computeProvenanceHash({
  humanOnly: false,
  aiModelTokens: ['0x...modelA', '0x...modelB'],
  ipLineageURIs: ['ipfs://lineage-doc'],
});

await muzix.provenance.setProvenance({
  catalog: '0x...catalog',
  tokenId: 1n,
  humanOnly: false,
  aiModelTokens: ['0x...modelA', '0x...modelB'],
  ipLineageURIs: ['ipfs://lineage-doc'],
  provenanceHash: hash,
});

const record = await muzix.provenance.getProvenance('0x...catalog', 1n);
```

See `sdk/typescript/examples/attach-ai-provenance.ts` for an end-to-end
script.

[erc721-ai]: https://github.com/kcolbchain/erc721-ai
[muzix]: https://github.com/kcolbchain/muzix
