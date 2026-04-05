// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

/**
 * @title MUSD — Music USD Stablecoin
 * @notice USD-pegged stablecoin with built-in royalty split hooks.
 *
 * When MUSD is transferred as a royalty payment (via `transferWithSplit`),
 * splits execute atomically — the transfer itself distributes to all
 * configured beneficiaries in a single transaction.
 *
 * Design:
 *   - Standard ERC-20 for normal transfers
 *   - `transferWithSplit` for royalty-aware transfers
 *   - Split tables registered per catalog/song identifier
 *   - MINTER_ROLE for authorized minting (backed by reserves)
 *   - PAUSER_ROLE for emergency circuit breaker
 */
contract MUSD is ERC20, ERC20Burnable, ERC20Pausable, AccessControl {

    // ─── Roles ────────────────────────────────────────────────────────

    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant SPLIT_ADMIN_ROLE = keccak256("SPLIT_ADMIN_ROLE");

    // ─── Types ────────────────────────────────────────────────────────

    struct SplitEntry {
        address beneficiary;
        uint16 basisPoints; // out of 10000
    }

    // ─── State ────────────────────────────────────────────────────────

    /// @notice Royalty split table per catalog identifier (e.g. ISRC hash)
    mapping(bytes32 => SplitEntry[]) private _splitTables;

    /// @notice Whether a split table has been registered
    mapping(bytes32 => bool) public splitExists;

    uint16 public constant BPS_DENOMINATOR = 10000;
    uint8 public constant MAX_SPLITS = 10;

    // ─── Events ───────────────────────────────────────────────────────

    event SplitRegistered(bytes32 indexed catalogId, uint8 splitCount);
    event SplitTransfer(
        bytes32 indexed catalogId,
        address indexed from,
        uint256 totalAmount,
        uint8 splitCount
    );

    // ─── Constructor ──────────────────────────────────────────────────

    constructor() ERC20("Music USD", "MUSD") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(SPLIT_ADMIN_ROLE, msg.sender);
    }

    function decimals() public pure override returns (uint8) {
        return 6; // USDC-style 6 decimals for micro-payment precision
    }

    // ─── Minting / Burning ────────────────────────────────────────────

    /**
     * @notice Mint MUSD (backed by USD reserves).
     */
    function mint(address to, uint256 amount) external onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function pause() external onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() external onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    // ─── Split Tables ─────────────────────────────────────────────────

    /**
     * @notice Register a royalty split table for a catalog identifier.
     * @param catalogId  Unique identifier (e.g. keccak256 of ISRC code)
     * @param splits     Array of beneficiary + basis points (must sum to 10000)
     */
    function registerSplit(bytes32 catalogId, SplitEntry[] calldata splits)
        external
        onlyRole(SPLIT_ADMIN_ROLE)
    {
        require(splits.length > 0 && splits.length <= MAX_SPLITS, "Invalid split count");
        require(!splitExists[catalogId], "Split already registered");

        uint16 totalBps;
        for (uint8 i = 0; i < splits.length; i++) {
            require(splits[i].beneficiary != address(0), "Zero address");
            require(splits[i].basisPoints > 0, "Zero bps");
            totalBps += splits[i].basisPoints;
            _splitTables[catalogId].push(splits[i]);
        }
        require(totalBps == BPS_DENOMINATOR, "Splits must sum to 10000");

        splitExists[catalogId] = true;
        emit SplitRegistered(catalogId, uint8(splits.length));
    }

    /**
     * @notice Update an existing split table.
     */
    function updateSplit(bytes32 catalogId, SplitEntry[] calldata splits)
        external
        onlyRole(SPLIT_ADMIN_ROLE)
    {
        require(splitExists[catalogId], "Split not registered");
        require(splits.length > 0 && splits.length <= MAX_SPLITS, "Invalid split count");

        // Clear existing
        delete _splitTables[catalogId];

        uint16 totalBps;
        for (uint8 i = 0; i < splits.length; i++) {
            require(splits[i].beneficiary != address(0), "Zero address");
            require(splits[i].basisPoints > 0, "Zero bps");
            totalBps += splits[i].basisPoints;
            _splitTables[catalogId].push(splits[i]);
        }
        require(totalBps == BPS_DENOMINATOR, "Splits must sum to 10000");

        emit SplitRegistered(catalogId, uint8(splits.length));
    }

    function getSplits(bytes32 catalogId) external view returns (SplitEntry[] memory) {
        return _splitTables[catalogId];
    }

    // ─── Royalty-Aware Transfer ───────────────────────────────────────

    /**
     * @notice Transfer MUSD as a royalty payment. The amount is automatically
     *         split among all beneficiaries registered for the catalog.
     *
     * @param catalogId  The catalog whose split table to use
     * @param amount     Total MUSD to distribute
     *
     * All splits execute atomically in a single transaction.
     * Rounding dust goes to the last beneficiary.
     */
    function transferWithSplit(bytes32 catalogId, uint256 amount) external whenNotPaused {
        require(splitExists[catalogId], "No split table for catalog");
        require(amount > 0, "Zero amount");

        SplitEntry[] storage splits = _splitTables[catalogId];
        uint256 remaining = amount;

        for (uint8 i = 0; i < splits.length; i++) {
            uint256 share;
            if (i == splits.length - 1) {
                share = remaining; // Last gets remainder
            } else {
                share = (amount * splits[i].basisPoints) / BPS_DENOMINATOR;
                remaining -= share;
            }
            _transfer(msg.sender, splits[i].beneficiary, share);
        }

        emit SplitTransfer(catalogId, msg.sender, amount, uint8(splits.length));
    }

    // ─── Required Overrides ───────────────────────────────────────────

    function _beforeTokenTransfer(address from, address to, uint256 amount)
        internal
        override(ERC20, ERC20Pausable)
    {
        super._beforeTokenTransfer(from, to, amount);
    }
}
