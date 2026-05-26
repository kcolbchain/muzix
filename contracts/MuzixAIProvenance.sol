// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IERC1155Minimal {
    function balanceOf(address account, uint256 id) external view returns (uint256);
}

contract MuzixAIProvenance {
    IERC1155Minimal public labelton;

    constructor(address _labelton) { labelton = IERC1155Minimal(_labelton); }

    function _requireTokenOwner(uint256 tokenId, address account) internal view {
        require(labelton.balanceOf(account, tokenId) > 0, "not token owner");
    }
}
