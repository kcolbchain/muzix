// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "./IRoyaltySplit.sol";
import "./IERC2981.sol";

interface IMusicCatalog is IERC2981, IRoyaltySplit {
    enum CatalogType { SONG, ALBUM, CATALOG, RIGHTS }

    struct CatalogMetadata {
        string isrc;
        string iswc;
        string title;
        string artist;
        string album;
        uint256 releaseDate;
        CatalogType catalogType;
        bool isExplicit;
    }

    event CatalogMinted(uint256 indexed tokenId, address indexed owner, CatalogType catalogType, string title);
    event MetadataUpdated(uint256 indexed tokenId, string title);

    function mint(
        address to,
        CatalogMetadata calldata metadata,
        string calldata tokenURI,
        address[] calldata payees,
        uint256[] calldata basisPoints,
        uint256 royaltyBps
    ) external returns (uint256 tokenId);

    function getMetadata(uint256 tokenId) external view returns (CatalogMetadata memory);
    function updateMetadata(uint256 tokenId, CatalogMetadata calldata metadata) external;
}
