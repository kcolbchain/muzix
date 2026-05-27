# Cap Table: Inheritance vs Per-Variant Override

> **Status:** Draft Design  
> **Author:** Muzix DAO Engineering  
> **Date:** 2026-05-27

## 1. Problem Statement

Music rights tokenization requires flexible cap table management where rights holders may have:
- **Inheritance**: Default revenue splits inherited from the parent work
- **Per-variant override**: Specific revenue splits for remixes, covers, or localized versions

## 2. Cap Table Model

### Structure

```solidity
struct CapEntry {
    address holder;
    uint256 basisPoints; // 0-10000 (0% to 100%)
    bytes32 variantId;   // bytes32(0) = default/inheritance
    bool isOverridden;   // true if variant-specific
}

struct CapTable {
    uint256 totalBasisPoints; // must sum to 10000
    mapping(bytes32 => CapEntry[]) entries; // variantId → entries
}
```

### Inheritance Rules

| Scenario | Behavior |
|----------|----------|
| No variant cap table | Use default cap table from parent MIR |
| Variant cap table exists | Override default for that variant only |
| Partial override | Specified holders override; unspecified fall back to default |
| Multi-level inheritance | Grandchild inherits from child or grandparent (depth-first) |

## 3. Gas Optimization Strategy

- Default cap table stored once; variants store only diffs
- Variant cap tables use SSTORE2 for large tables (>32 holders)
- Cached totalBasisPoints per variant to avoid O(n) summation

## 4. Edge Cases

- **Empty variant table**: Falls back to parent default (no extra storage)
- **Round-down splits**: Dust collector address for residual basis points
- **Overflow variants**: 10+ levels of variant nesting capped at 3 by protocol rule

## 5. Implementation Plan

1. Core `CapTableManager` contract with mapping storage
2. `VariantCapTable` extension for per-variant overrides
3. Gas benchmark suite for common cap table sizes (2-50 holders)
4. Governance parameter for max variant depth
