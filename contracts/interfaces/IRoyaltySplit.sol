// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

interface IRoyaltySplit {
    struct SplitRecipient {
        address payable payee;
        uint256 basisPoints;
        uint256 claimed;
    }

    event SplitConfigured(uint256 indexed tokenId, address indexed configurator);
    event RevenueDistributed(uint256 indexed tokenId, uint256 totalAmount, uint256 numRecipients);
    event RevenueClaimed(uint256 indexed tokenId, address indexed payee, uint256 amount);
    event SplitUpdated(uint256 indexed tokenId, address indexed payee, uint256 newBasisPoints);

    function configureSplit(uint256 tokenId, address[] calldata payees, uint256[] calldata basisPoints) external;
    function getSplits(uint256 tokenId) external view returns (SplitRecipient[] memory);
    function distributeRevenue(uint256 tokenId, uint256 amount) external payable;
    function claimRevenue(uint256 tokenId, address payee) external returns (uint256);
    function getUnclaimedRevenue(uint256 tokenId) external view returns (uint256);
}
