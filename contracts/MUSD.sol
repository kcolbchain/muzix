// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title MUSD - Muzix USD Stablecoin
/// @notice USD-pegged stablecoin (6 decimals, USDC-compatible) with built-in royalty
///         split hooks. When MUSD moves as a royalty payment, splits execute atomically.
contract MUSD is ERC20, ERC20Permit, Ownable, ReentrancyGuard {
    uint256 public constant TOTAL_BPS = 10000;
    uint8 private constant DECIMALS = 6;

    struct RoyaltySplit {
        address[] payees;
        uint256[] basisPoints;
    }

    mapping(uint256 => RoyaltySplit) private _royaltySplits;
    mapping(address => bool) public splitters;
    mapping(address => bool) public distributors;

    event SplitRegistered(uint256 indexed catalogId, address indexed registrar, uint256 numRecipients);
    event SplitExecuted(uint256 indexed catalogId, address indexed from, uint256 totalAmount, uint256 numRecipients);
    event SplitterUpdated(address indexed account, bool enabled);
    event DistributorUpdated(address indexed account, bool enabled);

    error ZeroAddress();
    error InvalidSplitTotal(uint256 actual, uint256 expected);
    error SplitLengthMismatch();
    error SplitNotRegistered(uint256 catalogId);
    error NotDistributor();
    error MintLimitExceeded(uint256 amount, uint256 limit);

    uint256 public mintLimit;
    uint256 public totalMinted;

    constructor(address initialOwner, uint256 _mintLimit)
        ERC20("Muzix USD", "MUSD")
        ERC20Permit("Muzix USD")
        Ownable(initialOwner)
    {
        mintLimit = _mintLimit;
        splitters[initialOwner] = true;
        distributors[initialOwner] = true;
    }

    function decimals() public pure override returns (uint8) {
        return DECIMALS;
    }

    // ─── Minting ──────────────────────────────────────────────

    function mint(address to, uint256 amount) external onlyOwner {
        if (totalMinted + amount > mintLimit) revert MintLimitExceeded(totalMinted + amount, mintLimit);
        totalMinted += amount;
        _mint(to, amount);
    }

    function burn(uint256 amount) external {
        _burn(msg.sender, amount);
    }

    function burnFrom(address account, uint256 amount) external {
        _spendAllowance(account, msg.sender, amount);
        _burn(account, amount);
    }

    // ─── Admin ────────────────────────────────────────────────

    function setMintLimit(uint256 newLimit) external onlyOwner {
        mintLimit = newLimit;
    }

    function setSplitter(address account, bool enabled) external onlyOwner {
        splitters[account] = enabled;
        emit SplitterUpdated(account, enabled);
    }

    function setDistributor(address account, bool enabled) external onlyOwner {
        distributors[account] = enabled;
        emit DistributorUpdated(account, enabled);
    }

    // ─── Split Registration ───────────────────────────────────

    function registerSplit(
        uint256 catalogId,
        address[] calldata payees,
        uint256[] calldata basisPoints
    ) external {
        if (!splitters[msg.sender]) revert NotDistributor();
        _validateSplit(payees, basisPoints);

        _royaltySplits[catalogId] = RoyaltySplit({ payees: payees, basisPoints: basisPoints });
        emit SplitRegistered(catalogId, msg.sender, payees.length);
    }

    function updateSplit(
        uint256 catalogId,
        address[] calldata payees,
        uint256[] calldata basisPoints
    ) external {
        if (!splitters[msg.sender]) revert NotDistributor();
        _validateSplit(payees, basisPoints);

        _royaltySplits[catalogId] = RoyaltySplit({ payees: payees, basisPoints: basisPoints });
        emit SplitRegistered(catalogId, msg.sender, payees.length);
    }

    // ─── Atomic Royalty Transfer ──────────────────────────────

    function transferWithSplit(uint256 catalogId, uint256 totalAmount) external nonReentrant {
        RoyaltySplit storage split = _royaltySplits[catalogId];
        if (split.payees.length == 0) revert SplitNotRegistered(catalogId);

        _spendAllowance(msg.sender, address(this), totalAmount);

        uint256 distributed;
        for (uint256 i = 0; i < split.payees.length; i++) {
            uint256 share = (totalAmount * split.basisPoints[i]) / TOTAL_BPS;
            if (share > 0) {
                _transfer(msg.sender, split.payees[i], share);
                distributed += share;
            }
        }

        // Rounding dust to first payee
        uint256 dust = totalAmount - distributed;
        if (dust > 0) {
            _transfer(msg.sender, split.payees[0], dust);
        }

        emit SplitExecuted(catalogId, msg.sender, totalAmount, split.payees.length);
    }

    function transferWithSplitAndFee(
        uint256 catalogId,
        uint256 totalAmount,
        uint256 platformFeeBps,
        address platformAddress
    ) external nonReentrant {
        RoyaltySplit storage split = _royaltySplits[catalogId];
        if (split.payees.length == 0) revert SplitNotRegistered(catalogId);
        if (platformAddress == address(0)) revert ZeroAddress();

        _spendAllowance(msg.sender, address(this), totalAmount);

        // Platform fee
        uint256 feeAmount = (totalAmount * platformFeeBps) / TOTAL_BPS;
        if (feeAmount > 0) {
            _transfer(msg.sender, platformAddress, feeAmount);
        }

        // Distribute remainder
        uint256 remaining = totalAmount - feeAmount;
        uint256 distributed;
        for (uint256 i = 0; i < split.payees.length; i++) {
            uint256 share = (remaining * split.basisPoints[i]) / TOTAL_BPS;
            if (share > 0) {
                _transfer(msg.sender, split.payees[i], share);
                distributed += share;
            }
        }

        uint256 dust = remaining - distributed;
        if (dust > 0) {
            _transfer(msg.sender, split.payees[0], dust);
        }

        emit SplitExecuted(catalogId, msg.sender, totalAmount, split.payees.length);
    }

    // ─── Views ────────────────────────────────────────────────

    function getSplit(uint256 catalogId) external view returns (address[] memory payees, uint256[] memory basisPoints) {
        RoyaltySplit storage split = _royaltySplits[catalogId];
        return (split.payees, split.basisPoints);
    }

    function previewSplit(uint256 catalogId, uint256 totalAmount)
        external
        view
        returns (address[] memory payees, uint256[] memory amounts)
    {
        RoyaltySplit storage split = _royaltySplits[catalogId];
        payees = split.payees;
        amounts = new uint256[](split.basisPoints.length);
        for (uint256 i = 0; i < split.basisPoints.length; i++) {
            amounts[i] = (totalAmount * split.basisPoints[i]) / TOTAL_BPS;
        }
    }

    // ─── Internal ─────────────────────────────────────────────

    function _validateSplit(address[] calldata payees, uint256[] calldata basisPoints) internal pure {
        if (payees.length == 0) revert SplitLengthMismatch();
        if (payees.length != basisPoints.length) revert SplitLengthMismatch();

        uint256 totalBps;
        for (uint256 i = 0; i < basisPoints.length; i++) {
            if (payees[i] == address(0)) revert ZeroAddress();
            totalBps += basisPoints[i];
        }
        if (totalBps != TOTAL_BPS) revert InvalidSplitTotal(totalBps, TOTAL_BPS);
    }
}
