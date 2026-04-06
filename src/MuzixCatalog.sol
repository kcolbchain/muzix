// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MuzixCatalog
 * @dev Implementation of ERC-721 for Music NFTs with ERC-2981 Royalties.
 * Fixes Issue #3 - Standard compliance and Security.
 */
contract MuzixCatalog is ERC721URIStorage, ERC2981, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId;
    
    // Pull-Payment mapping for royalty withdrawals
    mapping(address => uint256) public pendingWithdrawals;

    constructor() ERC721("Muzix Catalog", "MUZIX") Ownable(msg.sender) {}

    function mintMusic(address artist, string memory tokenURI, uint96 royaltyFee) 
        public 
        onlyOwner 
        returns (uint256) 
    {
        uint256 tokenId = _nextTokenId++;
        _safeMint(artist, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        // Define Royalties (max 10000 = 100%)
        _setTokenRoyalty(tokenId, artist, royaltyFee);
        
        return tokenId;
    }

    function withdraw() public nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to withdraw");
        
        pendingWithdrawals[msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage, ERC2981)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }

    function _burn(uint256 tokenId) internal override(ERC721URIStorage) {
        super._burn(tokenId);
    }
}
