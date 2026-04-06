// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title MuzixCatalog - Industry Ready
 * @dev ERC-721 with ISRC metadata, Fractional Shares, and Streaming Claims.
 */
contract MuzixCatalog is ERC721URIStorage, ERC2981, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId;

    // 3️⃣ Metadata Musical (Padrão da Indústria)
    struct MusicMetadata {
        string isrc;      // International Standard Recording Code
        string artist;
        string album;
        string publisher;
    }
    mapping(uint256 => MusicMetadata) public musicRegistry;

    // 1️⃣ Fractional Ownership (Economic Shares via Splits)
    struct RoyaltySplit {
        address[] payees;
        uint256[] shares; // Base points: 5000 = 50%
    }
    mapping(uint256 => RoyaltySplit) public tokenSplits;

    // 2️⃣ Streaming Revenue Claims
    mapping(uint256 => uint256) public totalStreamingRevenue;
    mapping(uint256 => mapping(address => uint256)) public claimedRevenue;

    constructor() ERC721("Muzix Catalog", "MUZIX") Ownable(msg.sender) {}

    /**
     * @dev Mint com Metadados Industriais e Splits de Propriedade.
     * Resolve: "Fractional Ownership" e "Ownership Metadata".
     */
    function mintMusic(
        address[] memory payees,
        uint256[] memory shares,
        string memory tokenURI,
        MusicMetadata memory metadata,
        uint96 royaltyFee
    ) public onlyOwner returns (uint256) {
        require(payees.length == shares.length, "Mismatched arrays");
        
        uint256 totalShares;
        for(uint i = 0; i < shares.length; i++) {
            totalShares += shares[i];
        }
        require(totalShares == 10000, "Total shares must be 100%");

        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
        
        musicRegistry[tokenId] = metadata;
        tokenSplits[tokenId] = RoyaltySplit(payees, shares);
        
        // Royalties ERC-2981 apontam para este contrato para redistribuição
        _setTokenRoyalty(tokenId, address(this), royaltyFee);
        
        return tokenId;
    }

    /**
     * @dev Depósito de Receita (Simula pagamento de plataformas como Spotify).
     */
    function depositStreamingRevenue(uint256 tokenId) public payable {
        require(msg.value > 0, "Zero deposit");
        totalStreamingRevenue[tokenId] += msg.value;
    }

    /**
     * @dev 2️⃣ Reivindicação de Receita de Streaming (Claim).
     * Resolve: "Streaming Revenue Claims".
     */
    function claimRevenue(uint256 tokenId) public nonReentrant {
        RoyaltySplit storage split = tokenSplits[tokenId];
        uint256 total = totalStreamingRevenue[tokenId];
        
        bool isPayee = false;
        for (uint i = 0; i < split.payees.length; i++) {
            if (split.payees[i] == msg.sender) {
                isPayee = true;
                uint256 entitlement = (total * split.shares[i]) / 10000;
                uint256 alreadyClaimed = claimedRevenue[tokenId][msg.sender];
                uint256 payableAmount = entitlement - alreadyClaimed;

                require(payableAmount > 0, "No new revenue to claim");
                
                claimedRevenue[tokenId][msg.sender] += payableAmount;
                (bool success, ) = payable(msg.sender).call{value: payableAmount}("");
                require(success, "Transfer failed");
                break;
            }
        }
        require(isPayee, "Not a stakeholder");
    }

    // Overrides obrigatórios para Solidity
    function supportsInterface(bytes4 interfaceId) 
        public 
        view 
        override(ERC721URIStorage, ERC2981) 
        returns (bool) 
    {
        return super.supportsInterface(interfaceId);
    }
}
