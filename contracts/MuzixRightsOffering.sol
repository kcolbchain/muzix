// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface ILabelton {
    function registerMaster(address proposer, address[] memory stakeholders, uint256[] memory shares) external returns (uint256);
}

contract MuzixRightsOffering {
    ILabelton public labelton;
    struct Counter { address proposer; uint256 amount; bool accepted; }
    mapping(bytes32 => Counter) public counters;

    event CounterAccepted(bytes32 indexed id, uint256 masterId);

    constructor(address _labelton) { labelton = ILabelton(_labelton); }

    function acceptCounter(bytes32 id, address[] memory stakeholders, uint256[] memory shares) external {
        Counter storage c = counters[id];
        require(c.proposer != address(0), "counter not found");
        require(!c.accepted, "already accepted");
        c.accepted = true;
        uint256 masterId = labelton.registerMaster(c.proposer, stakeholders, shares);
        emit CounterAccepted(id, masterId);
    }
}
