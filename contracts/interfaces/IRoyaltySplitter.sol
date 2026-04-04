// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IRoyaltySplitter
 * @notice Interface for a royalty splitter that receives MUSD and atomically
 *         distributes it among registered beneficiaries.
 */
interface IRoyaltySplitter {
    /// @notice Emitted when a beneficiary is added or updated.
    event BeneficiarySet(address indexed beneficiary, uint256 sharesBps);

    /// @notice Emitted when a beneficiary is removed.
    event BeneficiaryRemoved(address indexed beneficiary);

    /// @notice Emitted when an incoming payment is split among beneficiaries.
    event RoyaltySplit(
        address indexed from,
        uint256 totalAmount,
        uint256 beneficiaryCount
    );

    /// @notice Emitted for each individual distribution within a split.
    event RoyaltyDistributed(
        address indexed beneficiary,
        uint256 amount
    );

    /// @notice Called by the MUSD contract to execute an atomic royalty split.
    /// @param from The original sender of the MUSD.
    /// @param amount The total MUSD amount to split.
    function onRoyaltyReceived(address from, uint256 amount) external;

    /// @notice Set or update a beneficiary's share (in basis points, 1 bp = 0.01%).
    function setBeneficiary(address beneficiary, uint256 sharesBps) external;

    /// @notice Remove a beneficiary.
    function removeBeneficiary(address beneficiary) external;

    /// @notice Get the list of all beneficiary addresses.
    function getBeneficiaries() external view returns (address[] memory);

    /// @notice Get a beneficiary's share in basis points.
    function getShare(address beneficiary) external view returns (uint256);

    /// @notice Get the total allocated shares in basis points.
    function totalShares() external view returns (uint256);

    /// @notice Get the MUSD token address this splitter works with.
    function musd() external view returns (address);
}
