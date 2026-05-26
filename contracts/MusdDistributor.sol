// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILabelton {
    function capTableOf(uint256 masterId) external view returns (address[] memory, uint256[] memory);
}

contract MusdDistributor {
    ILabelton public labelton;
    mapping(uint256 => mapping(address => uint256)) public unclaimed;

    event Distributed(uint256 indexed masterId, uint256 totalAmount);
    event Claimed(uint256 indexed masterId, address indexed recipient, uint256 amount);

    constructor(address _labelton) {
        labelton = ILabelton(_labelton);
    }

    function distribute(uint256 masterId, uint256 totalAmount) external {
        (address[] memory recipients, uint256[] memory shares) = labelton.capTableOf(masterId);
        uint256 totalShares;
        for (uint256 i; i < shares.length; i++) totalShares += shares[i];
        for (uint256 i; i < recipients.length; i++) {
            uint256 amount = totalAmount * shares[i] / totalShares;
            unclaimed[masterId][recipients[i]] += amount;
        }
        emit Distributed(masterId, totalAmount);
    }

    function claim(uint256 masterId) external {
        uint256 amount = unclaimed[masterId][msg.sender];
        require(amount > 0, "nothing to claim");
        unclaimed[masterId][msg.sender] = 0;
        emit Claimed(masterId, msg.sender, amount);
    }
}
