# MUSD Stablecoin & Royalty Protocol (v1.2)

## 1. Pull Payment Architecture
Unlike other implementations (#10, #13), MUSD uses an **Escrow-based Pull Pattern**.
- **Benefit:** Prevents Gas Limit attacks and Denial of Service (DoS). If one recipient is a contract that reverts on transfer, the whole distribution DOES NOT fail.
- **Efficiency:** Drastically reduces gas costs for the sender by shifting the transfer cost to the beneficiary during withdrawal.

## 2. Technical Specs
- **ERC-20 Permit:** Integrated for gasless approvals.
- **Atomic Splits:** Uses the MuzixCatalog as a single source of truth for distribution.
- **ERC-20 + ERC-20Permit + Ownable + ReentrancyGuard:** Standard OZ v5 stack.
- **Pull-Payment:** `pendingWithdrawals[recipient]` tracks owed amounts; recipients call `claimPayments()` to withdraw.

## 3. Core Functions

### `transferWithRoyalty(uint256 tokenId, uint256 amount)`
Deposits `amount` into the MUSD escrow pool, then distributes it according to the royalty splits registered in MuzixCatalog for `tokenId`. Each recipient's `pendingWithdrawals` balance increases proportionally to their share (bps out of 10000).

### `batchRoyaltyDistribution(uint256[] tokenIds, uint256[] amounts)`
Batch version for processing multiple royalty events at once (e.g., weekly Spotify/Apple Music reports). Owner-only. Requires matching array lengths. Emits `BatchRoyaltyProcessed` with total tokens processed and volume.

### `claimPayments()`
Recipient withdraws accumulated pending payments. Uses ReentrancyGuard. Resets `pendingWithdrawals[msg.sender]` to 0 before transfer.

## 4. Events
| Event | Params | When |
|---|---|---|
| `RoyaltyDistributed` | `(tokenId, totalAmount)` | After each single royalty distribution |
| `BatchRoyaltyProcessed` | `(totalTokensProcessed, totalVolume)` | After batch distribution completes |
| `Withdrawal` | `(payee, amount)` | After `claimPayments()` succeeds |

## 5. Integration Points
- **MuzixCatalog** (`IMuzixCatalog` interface): Source of truth for `royaltySplits(tokenId)` → returns `(recipients[], shares[])`.
- **MuzixStreamingOracle**: Feeds streaming revenue data to trigger `transferWithRoyalty`.
- **MuzixRightsOffering**: Uses MUSD as the bonding currency for counter offers.

## 6. Security Considerations
- **ReentrancyGuard** on all state-modifying functions.
- **Ownable-only** for minting and batch distribution.
- **No infinite loop risk**: `_distribute` iterates over `recipients[]` from catalog; splits are bounded by MuzixCatalog's 100% (10000 bps) enforcement.
- **ERC-20 transfer fails gracefully**: If the escrow pool lacks sufficient balance, `_transfer` reverts — the caller loses nothing, only the distribution is skipped.
