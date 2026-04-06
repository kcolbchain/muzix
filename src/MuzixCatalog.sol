// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MuzixCatalog is ERC721URIStorage, ERC2981, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId;

    struct RoyaltySplit {
        address[] payees;
        uint256[] shares; 
    }
    mapping(uint256 => RoyaltySplit) public tokenSplits;

    mapping(uint256 => uint256) public totalStreamingRevenue;
    mapping(uint256 => mapping(address => uint256)) public claimedRevenue;

    constructor() ERC721("Muzix Catalog", "MUZIX") Ownable(msg.sender) {}

    function mintMusic(
        address[] memory payees,
        uint256[] memory shares,
        string memory tokenURI,
        uint96 royaltyFee
    ) public onlyOwner returns (uint256) {
        require(payees.length == shares.length, "Mismatched arrays");
        uint256 tokenId = _nextTokenId++;
        
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        tokenSplits[tokenId] = RoyaltySplit(payees, shares);
        
        _setTokenRoyalty(tokenId, address(this), royaltyFee);
        
        return tokenId;
    }

    function depositRevenue(uint256 tokenId) public payable {
        totalStreamingRevenue[tokenId] += msg.value;
    }

    function claimRevenue(uint256 tokenId) public nonReentrant {
        RoyaltySplit storage split = tokenSplits[tokenId];
        uint256 total = totalStreamingRevenue[tokenId];
        
        for (uint i = 0; i < split.payees.length; i++) {
            if (split.payees[i] == msg.sender) {
                uint256 entitlement = (total * split.shares[i]) / 10000;
                uint256 alreadyClaimed = claimedRevenue[tokenId][msg.sender];
                uint256 payableAmount = entitlement - alreadyClaimed;

                require(payableAmount > 0, "No new revenue");
                claimedRevenue[tokenId][msg.sender] += payableAmount;
                
                (bool success, ) = payable(msg.sender).call{value: payableAmount}("");
                require(success, "Transfer failed");
            }
        }
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
