# RFC: LABELTON — Rights Tokenization on Muzix DAO + CR8 Chain

> **Status:** Draft RFC  
> **Author:** Muzix DAO Engineering  
> **Date:** 2026-05-27

## Abstract

LABELTON is a protocol for tokenizing music intellectual property rights on the Muzix DAO ecosystem, leveraging CR8 chain as settlement layer and Arbitrum for execution.

## 1. Motivation

Current music rights management is fragmented across centralized registries with opaque revenue distribution. LABELTON aims to:
- Bring on-chain transparency to royalty distribution
- Enable fractional rights ownership via ERC-1155 tokens
- Reduce settlement time from quarterly to near-instant
- Lower administrative costs by 60-80% via smart contract automation

## 2. Protocol Architecture

```
┌─────────────────────────────────────────┐
│              Muzix DAO Governance        │
├─────────────────────────────────────────┤
│            LABELTON Protocol             │
├────────────┬─────────────┬──────────────┤
│  MIR Core  │ Cap Table   │ Distribution │
│  Registry  │ Manager     │ Engine       │
├────────────┴─────────────┴──────────────┤
│          CR8 Chain (Settlement)          │
│        Arbitrum (Execution)              │
└─────────────────────────────────────────┘
```

## 3. Token Standards

| Standard | Usage | Rationale |
|----------|-------|-----------|
| ERC-1155 | Rights tokens | Multi-token efficiency for variants |
| ERC-20 | $MUZ governance | DAO voting and staking |
| ERC-6551 | Rights holder wallet | Token-bound accounts for composability |

## 4. Rights Tokenization Flow

1. **Registration**: Rights holder submits metadata + proof → MIR Registry
2. **Verification**: MIR/Legal/Financial-ID verification (see docs/design/MIR-verifier-model.md)
3. **Minting**: Verified rights → ERC-1155 token(s) minted
4. **Distribution**: Revenue streams → Distribution Engine → rights holders

## 5. Revenue Distribution

```solidity
function distribute(uint256 tokenId, uint256 amount) external {
    CapEntry[] memory entries = capTable.getEntries(tokenId);
    for (uint256 i = 0; i < entries.length; i++) {
        _transfer(entries[i].holder, amount * entries[i].basisPoints / 10000);
    }
}
```

## 6. Governance Parameters

| Parameter | Value | Description |
|-----------|-------|-------------|
| Min verification period | 30 days | Challenge window for MIR registration |
| Max cap table entries | 50 | Gas limit for distribution |
| Protocol fee | 2.5% | Muzix DAO treasury |
| Variant depth limit | 3 | Max inheritance chain length |

## 7. Security & Compliance

- **No plaintext identity data on-chain** (ZK proofs only)
- **Compliant with** US Copyright Office, EU CDSM Article 18-23
- **Emergency pause** via Muzix DAO multisig (6/11 threshold)
- **Oracle diversity** minimum 3 independent oracles per verification

## 8. Open Questions

- Should variant cap tables be stored as IPFS pointers or on-chain?
- What bridging mechanism between Arbitrum and CR8 chain?
- Fractionalization threshold: minimum basis points per holder?

## 9. Implementation Roadmap

| Phase | Timeline | Deliverables |
|-------|----------|--------------|
| Phase 1 | Q3 2026 | MIR Registry + Cap Table Manager |
| Phase 2 | Q4 2026 | Distribution Engine + Revenue Splits |
| Phase 3 | Q1 2027 | CR8 chain bridge + Oracle Network |
| Phase 4 | Q2 2027 | Governance dashboard + Audits |
