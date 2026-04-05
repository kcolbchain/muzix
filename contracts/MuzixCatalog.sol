// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/interfaces/IERC2981.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

/**
 * @title MuzixCatalog
 * @notice ERC-721 token standard for music catalog tokenization with royalty extensions.
 *
 * Each token represents a song, album, or catalog with:
 *   - Ownership metadata (artist, ISRC/ISWC codes, territory)
 *   - Royalty split configuration (up to 8 beneficiaries)
 *   - Streaming revenue claims
 *   - EIP-2981 on-chain royalty info for secondary sales
 *   - Fractional ownership support via split beneficiaries
 */
contract MuzixCatalog is ERC721, ERC721Enumerable, ERC721URIStorage, IERC2981, Ownable {
    using Counters for Counters.Counter;

    // ─── Types ────────────────────────────────────────────────────────

    enum CatalogType {
        SINGLE,    // Individual song
        ALBUM,     // Album / EP
        CATALOG    // Full artist catalog
    }

    enum LicenseType {
        MASTER,       // Sound recording rights
        COMPOSITION,  // Publishing / songwriting rights
        BOTH          // Master + Composition bundle
    }

    struct RoyaltySplit {
        address payable beneficiary;
        uint16 basisPoints; // out of 10000
        string role;        // e.g. "artist", "producer", "label", "investor"
    }

    struct CatalogMetadata {
        string isrc;          // International Standard Recording Code
        string iswc;          // International Standard Musical Work Code
        string title;
        string artist;
        CatalogType catalogType;
        LicenseType licenseType;
        string territory;     // ISO 3166-1 or "WORLDWIDE"
        uint256 releaseDate;  // Unix timestamp
        uint256 mintedAt;     // When tokenized
    }

    // ─── State ────────────────────────────────────────────────────────

    Counters.Counter private _tokenIdCounter;

    /// @notice On-chain metadata per token
    mapping(uint256 => CatalogMetadata) public catalogMetadata;

    /// @notice Royalty splits per token (up to 8 beneficiaries)
    mapping(uint256 => RoyaltySplit[]) private _royaltySplits;

    /// @notice Secondary sale royalty percentage (basis points)
    mapping(uint256 => uint16) public secondaryRoyaltyBps;

    /// @notice Accumulated claimable revenue per token per beneficiary
    mapping(uint256 => mapping(address => uint256)) public claimable;

    /// @notice Total revenue deposited per token
    mapping(uint256 => uint256) public totalRevenue;

    uint8 public constant MAX_SPLITS = 8;
    uint16 public constant BPS_DENOMINATOR = 10000;

    // ─── Events ───────────────────────────────────────────────────────

    event CatalogMinted(uint256 indexed tokenId, string title, string artist, CatalogType catalogType);
    event RevenueDeposited(uint256 indexed tokenId, uint256 amount);
    event RoyaltyClaimed(uint256 indexed tokenId, address indexed beneficiary, uint256 amount);
    event SplitsUpdated(uint256 indexed tokenId);

    // ─── Constructor ──────────────────────────────────────────────────

    constructor() ERC721("Muzix Catalog", "MUZIX") Ownable() {}

    // ─── Minting ──────────────────────────────────────────────────────

    /**
     * @notice Mint a new catalog token.
     * @param to           Recipient (typically the primary rights holder)
     * @param metadata     On-chain catalog metadata
     * @param splits       Royalty split configuration (must sum to 10000 bps)
     * @param _secondaryBps  Secondary sale royalty in basis points (e.g. 500 = 5%)
     * @param uri          Token metadata URI (IPFS or HTTPS)
     */
    function mint(
        address to,
        CatalogMetadata calldata metadata,
        RoyaltySplit[] calldata splits,
        uint16 _secondaryBps,
        string calldata uri
    ) external onlyOwner returns (uint256) {
        require(splits.length > 0 && splits.length <= MAX_SPLITS, "Invalid split count");
        require(_secondaryBps <= 2000, "Secondary royalty too high"); // max 20%

        uint16 totalBps;
        for (uint8 i = 0; i < splits.length; i++) {
            require(splits[i].beneficiary != address(0), "Zero address beneficiary");
            require(splits[i].basisPoints > 0, "Zero bps split");
            totalBps += splits[i].basisPoints;
        }
        require(totalBps == BPS_DENOMINATOR, "Splits must sum to 10000");

        _tokenIdCounter.increment();
        uint256 tokenId = _tokenIdCounter.current();

        _safeMint(to, tokenId);
        _setTokenURI(tokenId, uri);

        CatalogMetadata storage stored = catalogMetadata[tokenId];
        stored.isrc = metadata.isrc;
        stored.iswc = metadata.iswc;
        stored.title = metadata.title;
        stored.artist = metadata.artist;
        stored.catalogType = metadata.catalogType;
        stored.licenseType = metadata.licenseType;
        stored.territory = metadata.territory;
        stored.releaseDate = metadata.releaseDate;
        stored.mintedAt = block.timestamp;

        for (uint8 i = 0; i < splits.length; i++) {
            _royaltySplits[tokenId].push(splits[i]);
        }

        secondaryRoyaltyBps[tokenId] = _secondaryBps;

        emit CatalogMinted(tokenId, metadata.title, metadata.artist, metadata.catalogType);
        return tokenId;
    }

    // ─── Revenue Distribution ─────────────────────────────────────────

    /**
     * @notice Deposit revenue for a tokenized catalog. Splits are calculated
     *         and made claimable by each beneficiary.
     */
    function depositRevenue(uint256 tokenId) external payable {
        require(_exists(tokenId), "Token does not exist");
        require(msg.value > 0, "No revenue sent");

        RoyaltySplit[] storage splits = _royaltySplits[tokenId];
        uint256 remaining = msg.value;

        for (uint8 i = 0; i < splits.length; i++) {
            uint256 share;
            if (i == splits.length - 1) {
                share = remaining; // Last beneficiary gets remainder (avoids rounding dust)
            } else {
                share = (msg.value * splits[i].basisPoints) / BPS_DENOMINATOR;
                remaining -= share;
            }
            claimable[tokenId][splits[i].beneficiary] += share;
        }

        totalRevenue[tokenId] += msg.value;
        emit RevenueDeposited(tokenId, msg.value);
    }

    /**
     * @notice Claim accumulated revenue for a specific token.
     */
    function claimRevenue(uint256 tokenId) external {
        uint256 amount = claimable[tokenId][msg.sender];
        require(amount > 0, "Nothing to claim");

        claimable[tokenId][msg.sender] = 0;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");

        emit RoyaltyClaimed(tokenId, msg.sender, amount);
    }

    // ─── Views ────────────────────────────────────────────────────────

    function getRoyaltySplits(uint256 tokenId) external view returns (RoyaltySplit[] memory) {
        require(_exists(tokenId), "Token does not exist");
        return _royaltySplits[tokenId];
    }

    function totalMinted() external view returns (uint256) {
        return _tokenIdCounter.current();
    }

    // ─── EIP-2981 ─────────────────────────────────────────────────────

    /**
     * @notice Returns royalty info for secondary sales (EIP-2981).
     *         Royalty receiver is the token owner; they can redistribute
     *         via depositRevenue.
     */
    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        require(_exists(tokenId), "Token does not exist");
        receiver = ownerOf(tokenId);
        royaltyAmount = (salePrice * secondaryRoyaltyBps[tokenId]) / BPS_DENOMINATOR;
    }

    // ─── Required Overrides ───────────────────────────────────────────

    function _beforeTokenTransfer(address from, address to, uint256 tokenId, uint256 batchSize)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._beforeTokenTransfer(from, to, tokenId, batchSize);
    }

    function _burn(uint256 tokenId) internal override(ERC721, ERC721URIStorage) {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721Enumerable, IERC165)
        returns (bool)
    {
        return interfaceId == type(IERC2981).interfaceId || super.supportsInterface(interfaceId);
    }
}
