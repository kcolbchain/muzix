// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILabelton {
    function capTableOf(uint256 masterId) external view returns (address[] memory, uint256[] memory);
}

contract RoyaltyDistributor {
    ILabelton public labelton;

    constructor(address _labelton) { labelton = ILabelton(_labelton); }

    function distribute(uint256 masterId, uint256 amount) external returns (uint256) {
        (address[] memory recipients, uint256[] memory shares) = labelton.capTableOf(masterId);
        uint256 total;
        for (uint256 i; i < recipients.length; i++) total += shares[i];
        return total > 0 ? amount : 0;
    }
}
