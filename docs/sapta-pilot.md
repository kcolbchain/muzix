# Sapta Rights-Offering Pilot

A live pilot of [`MuzixRightsOffering`](../src/MuzixRightsOffering.sol) with two
drafts published under the artist Sapta:

| Draft | Scope | Term | Upfront | Min Guarantee | Artist Royalty | Reply Window |
|------|------|------|---------|---------------|----------------|--------------|
| Album | Single album, exclusive distribution, worldwide | 3 years | $25,000 | $50,000 | 65% | 30 days |
| Catalogue | Whole catalogue, exclusive full rights (dist + sync + master + publishing), worldwide | 5 years | $150,000 | $400,000 | 70% | 45 days |

These are the artist's **base terms**. Labels, IP buyers, distributors, and
sync agencies can either accept the base outright or submit a counter that
modifies any subset of the economics. Numbers above are placeholders for the
pilot bootstrap and can be tuned before publishing — see
[`script/DeploySaptaPilot.s.sol`](../script/DeploySaptaPilot.s.sol).

## How to participate as a bidder

Bidders need:
1. An EVM wallet with MUSD on the target chain.
2. The deployed `MuzixRightsOffering` address (announced post-deploy).
3. The relevant `offeringId` for the draft you're responding to.

### Accept the base terms

```solidity
// 1. Approve the offering contract to pull your bond
musd.approve(offeringAddr, bondAmount);

// 2. Submit your commitment to the artist's exact base terms
uint256 counterId = offering.acceptBaseTerms(
    offeringId,
    "ipfs://<your-company-memo-uri>",
    bondAmount        // must be >= offering.minBondUsd
);
```

### Counter with modified economics

```solidity
MuzixRightsOffering.Economics memory myTerms = MuzixRightsOffering.Economics({
    upfrontUsd:           30_000e6,   // beating the artist's $25K floor
    minGuaranteeUsd:      60_000e6,
    artistRoyaltyBps:     6000,        // proposing 60/40 split
    advanceRecoupCapUsd:  30_000e6
});

musd.approve(offeringAddr, bondAmount);
uint256 counterId = offering.submitCounter(
    offeringId,
    myTerms,
    "ipfs://<your-detailed-term-sheet>",
    bondAmount
);
```

The bond is **earnest, not payment**. Posting it signals you have the capital
and are serious. It is escrowed in the contract and refunded when:
- the artist accepts your counter (winning bond returns to you; upfront
  settlement is handled separately by a downstream contract);
- the artist accepts someone else's counter (call `withdrawCounter`);
- the artist explicitly rejects your counter;
- the artist withdraws the offering;
- the deadline passes and anyone calls `markExpired`.

## How acceptance works

1. The artist (Sapta's wallet) reviews counters off-chain.
2. The artist calls `acceptCounter(counterId)` to lock in the winning bid.
3. The offering flips to `Accepted`; the accepted counter's id is recorded as
   `acceptedCounterId` on the offering.
4. Losing counters remain `Pending` until each bidder calls
   `withdrawCounter` to recover their bond.

The on-chain record is the **commitment**, not the settlement. A downstream
contract reads `acceptedCounterId` to execute the upfront payment and to
register the licensee against the catalog. Off-chain, the parties sign the
prose agreement referenced by the bidder's `memoURI` and the artist's
`subjectURI`.

## Subject manifests

Each draft references an off-chain manifest by IPFS URI and keccak256 hash.
The album manifest describes the specific album (ISRC list, track titles,
masters status, existing encumbrances). The catalogue manifest describes the
full set of works and any carve-outs. Suggested manifest schema:

```jsonc
{
  "type": "album" | "catalogue",
  "artist": "Sapta",
  "subjectName": "<title>",
  "tracks": [
    { "isrc": "AAXX000000001", "title": "...", "duration": 213 }
  ],
  "existingEncumbrances": [],
  "createdAt": "2026-05-24",
  "version": 1
}
```

Pin the manifest to IPFS, compute `keccak256` of the bytes, and pass both as
`subjectURI` / `subjectHash` to `createOffering`.

## Deploy

```bash
export SAPTA_ARTIST=0x...       # Sapta's wallet
export MUSD_TOKEN=0x...          # MUSD on the target L1
export SAPTA_ALBUM_URI=ipfs://...
export SAPTA_ALBUM_HASH=0x...
export SAPTA_CAT_URI=ipfs://...
export SAPTA_CAT_HASH=0x...

forge script script/DeploySaptaPilot.s.sol \
    --rpc-url $RPC_URL \
    --broadcast \
    --private-key $DEPLOYER_KEY
```

Then publish each draft from Sapta's wallet:

```bash
cast send $OFFERING_ADDR "publishOffering(uint256)" $ALBUM_ID \
    --rpc-url $RPC_URL --private-key $SAPTA_KEY

cast send $OFFERING_ADDR "publishOffering(uint256)" $CATALOGUE_ID \
    --rpc-url $RPC_URL --private-key $SAPTA_KEY
```

## What's deliberately out of scope

This pilot ships the **commitment surface** only. The following are downstream
contracts that read an accepted offering's terms and execute:

- Upfront / minimum-guarantee payment from licensee → artist.
- Royalty stream settlement (driven by `MuzixStreamingOracle` revenue data).
- KYC / accreditation gating of bidders.
- Rights NFT issuance (the `(offeringId, acceptedCounterId)` pair is the
  canonical on-chain commitment reference until then).
