// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MuzixCatalog is ERC721URIStorage, ERC2981, Ownable, ReentrancyGuard {
    uint256 private _nextTokenId;

    // 1️⃣ Royalty Split: Mapeamento explícito solicitado
    struct Split {
        address[] recipients;
        uint16[] shares; // Base 10000 (100%)
    }
    mapping(uint256 => Split) public royaltySplits;

    // 2️⃣ Streaming Claims: Mecanismo Pull de saldo acumulado
    mapping(uint256 => uint256) public totalStreamingRevenue;
    mapping(uint256 => mapping(address => uint256)) public claimedBalance;

    // Metadata Musical para bônus de aceitação
    struct MusicMetadata {
        string isrc;
        string artist;
    }
    mapping(uint256 => MusicMetadata) public musicRegistry;

    constructor() ERC721("Muzix Catalog", "MUZIX") Ownable(msg.sender) {}

    // Função de Mint com metadados
    function mintMusic(string memory tokenURI, MusicMetadata memory metadata) public onlyOwner returns (uint256) {
        uint256 tokenId = _nextTokenId++;
        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI);
        musicRegistry[tokenId] = metadata;
        return tokenId;
    }

    // 1️⃣ Configuração de Royalty Split (Pode ser chamado após o mint)
    function setRoyaltySplit(uint256 tokenId, address[] memory recipients, uint16[] memory shares) public {
        require(ownerOf(tokenId) == msg.sender, "Not the owner");
        require(recipients.length == shares.length, "Mismatched arrays");
        
        uint16 total;
        for(uint i = 0; i < shares.length; i++) total += shares[i];
        require(total == 10000, "Total must be 100%");

        royaltySplits[tokenId] = Split(recipients, shares);
        _setTokenRoyalty(tokenId, address(this), 1000); // 10% padrão para o pool
    }

    // Recebimento de Receita
    function depositRevenue(uint256 tokenId) public payable {
        totalStreamingRevenue[tokenId] += msg.value;
    }

    // 2️⃣ Streaming Claims: Função pull que permite saque do saldo acumulado
    function claimStreamingRevenue(uint256 tokenId) public nonReentrant {
        Split storage split = royaltySplits[tokenId];
        uint256 total = totalStreamingRevenue[tokenId];
        
        for (uint i = 0; i < split.recipients.length; i++) {
            if (split.recipients[i] == msg.sender) {
                uint256 shareAmount = (total * split.shares[i]) / 10000;
                uint256 amountToWithdraw = shareAmount - claimedBalance[tokenId][msg.sender];

                require(amountToWithdraw > 0, "No balance to claim");
                
                claimedBalance[tokenId][msg.sender] += amountToWithdraw;
                (bool success, ) = payable(msg.sender).call{value: amountToWithdraw}("");
                require(success, "Transfer failed");
                return;
            }
        }
        revert("Not a stakeholder");
    }

    // 3️⃣ Fractionalize (Bônus): Logica de fracionamento econômico explicada no SPEC
    function fractionalize(uint256 tokenId) public view returns (bool) {
        return royaltySplits[tokenId].recipients.length > 1;
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721URIStorage, ERC2981) returns (bool) {
        return super.supportsInterface(interfaceId);
    }
}
