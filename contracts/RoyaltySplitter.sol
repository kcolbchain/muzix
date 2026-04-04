// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./interfaces/IRoyaltySplitter.sol";

/**
 * @title RoyaltySplitter
 * @notice Receives MUSD royalty payments and atomically distributes them
 *         among registered beneficiaries according to their share (in basis
 *         points, where 10 000 bp = 100%).
 *
 * Designed to be called by the MUSD transfer hook. The MUSD contract transfers
 * tokens to this contract, then invokes `onRoyaltyReceived` which pulls from
 * its own balance and distributes.
 */
contract RoyaltySplitter is Ownable, IRoyaltySplitter {
    /// @dev Maximum basis points (100%).
    uint256 public constant MAX_BPS = 10_000;

    /// @notice The MUSD token this splitter works with.
    address public override musd;

    /// @dev Ordered list of beneficiary addresses.
    address[] private _beneficiaries;

    /// @dev Beneficiary address → share in basis points.
    mapping(address => uint256) private _shares;

    /// @dev Quick lookup for array membership.
    mapping(address => bool) private _isBeneficiary;

    /// @notice Aggregate of all allocated shares.
    uint256 public override totalShares;

    constructor(address musdToken, address owner_) Ownable(owner_) {
        require(musdToken != address(0), "Splitter: zero MUSD");
        musd = musdToken;
    }

    // ─────────────────────── Beneficiary Management ────────────────────────────

    /// @inheritdoc IRoyaltySplitter
    function setBeneficiary(address beneficiary, uint256 sharesBps)
        external
        override
        onlyOwner
    {
        require(beneficiary != address(0), "Splitter: zero address");
        require(sharesBps > 0, "Splitter: zero shares");

        uint256 oldShares = _shares[beneficiary];

        if (!_isBeneficiary[beneficiary]) {
            _beneficiaries.push(beneficiary);
            _isBeneficiary[beneficiary] = true;
        }

        totalShares = totalShares - oldShares + sharesBps;
        require(totalShares <= MAX_BPS, "Splitter: exceeds 100%");

        _shares[beneficiary] = sharesBps;
        emit BeneficiarySet(beneficiary, sharesBps);
    }

    /// @inheritdoc IRoyaltySplitter
    function removeBeneficiary(address beneficiary) external override onlyOwner {
        require(_isBeneficiary[beneficiary], "Splitter: not a beneficiary");

        totalShares -= _shares[beneficiary];
        _shares[beneficiary] = 0;
        _isBeneficiary[beneficiary] = false;

        // Remove from array (swap-and-pop).
        uint256 len = _beneficiaries.length;
        for (uint256 i = 0; i < len; i++) {
            if (_beneficiaries[i] == beneficiary) {
                _beneficiaries[i] = _beneficiaries[len - 1];
                _beneficiaries.pop();
                break;
            }
        }

        emit BeneficiaryRemoved(beneficiary);
    }

    /// @inheritdoc IRoyaltySplitter
    function getBeneficiaries() external view override returns (address[] memory) {
        return _beneficiaries;
    }

    /// @inheritdoc IRoyaltySplitter
    function getShare(address beneficiary) external view override returns (uint256) {
        return _shares[beneficiary];
    }

    // ──────────────────────── Royalty Split Logic ──────────────────────────────

    /**
     * @inheritdoc IRoyaltySplitter
     * @dev Called by the MUSD transfer hook. At this point the tokens are
     *      already in this contract's balance. We distribute proportionally
     *      and any dust (from rounding) stays in the splitter.
     */
    function onRoyaltyReceived(address from, uint256 amount) external override {
        require(msg.sender == musd, "Splitter: caller not MUSD");
        require(amount > 0, "Splitter: zero amount");

        uint256 beneficiaryCount = _beneficiaries.length;
        require(beneficiaryCount > 0, "Splitter: no beneficiaries");
        require(totalShares > 0, "Splitter: no shares allocated");

        IERC20 token = IERC20(musd);
        uint256 distributed = 0;

        for (uint256 i = 0; i < beneficiaryCount; i++) {
            address b = _beneficiaries[i];
            uint256 share = (amount * _shares[b]) / totalShares;
            if (share > 0) {
                bool ok = token.transfer(b, share);
                require(ok, "Splitter: transfer failed");
                distributed += share;
                emit RoyaltyDistributed(b, share);
            }
        }

        emit RoyaltySplit(from, distributed, beneficiaryCount);
    }
}
