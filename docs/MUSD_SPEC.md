# MUSD Stablecoin & Royalty Protocol (v1.0)

## 1. Pull Payment Architecture
Unlike other implementations (#10, #13), MUSD uses an **Escrow-based Pull Pattern**.
- **Benefit:** Prevents Gas Limit attacks and Denial of Service (DoS). If one recipient is a contract that reverts on transfer, the whole distribution DOES NOT fail.
- **Efficiency:** Drastically reduces gas costs for the sender by shifting the transfer cost to the beneficiary during withdrawal.

## 2. Technical Specs
- **ERC-20 Permit:** Integrated for gasless approvals.
- **Atomic Splits:** Uses the MuzixCatalog as a single source of truth for distribution.
