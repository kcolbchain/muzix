// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interfaces/IMusicCatalog.sol";

/// @title MuzixCatalog
/// @notice ERC-721 music catalog token with royalty splits, EIP-2981 secondary sale
///         royalties, and on-chain revenue distribution.
contract MuzixCatalog is
    ERC721Enumerable,
    ERC721URIStorage,
    Ownable,
    ReentrancyGuard,
    IMusicCatalog
{
    uint256 public constant MAX_ROYALTY_BPS = 2000;
    uint256 public constant TOTAL_BPS = 10000;

    struct TokenState {
        CatalogMetadata metadata;
        uint256 royaltyBps;
        address royaltyReceiver;
        SplitRecipient[] splits;
        mapping(address => uint256) pendingRevenue;
    }

    mapping(uint256 => TokenState) private _tokenStates;
    uint256 private _nextId;

    error ZeroAddress();
    error NotTokenOwner();
    error InvalidSplitTotal(uint256 actual, uint256 expected);
    error RoyaltyExceedsMax(uint256 actual, uint256 max);
    error NoRevenueToClaim();
    error SplitLengthMismatch();
    error TokenNotMinted();

    constructor() ERC721("Muzix Catalog", "MUZIX") Ownable(msg.sender) {}

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721Enumerable, ERC721URIStorage)
        returns (bool)
    {
        return
            interfaceId == type(IMusicCatalog).interfaceId ||
            interfaceId == type(IERC2981).interfaceId ||
            interfaceId == type(IERC721).interfaceId ||
            super.supportsInterface(interfaceId);
    }

    // ─── Minting ──────────────────────────────────────────────

    function mint(
        address to,
        CatalogMetadata calldata metadata,
        string calldata _tokenURI,
        address[] calldata payees,
        uint256[] calldata basisPoints,
        uint256 royaltyBps
    ) external returns (uint256 tokenId) {
        if (to == address(0)) revert ZeroAddress();
        if (payees.length == 0) revert SplitLengthMismatch();
        if (payees.length != basisPoints.length) revert SplitLengthMismatch();
        if (royaltyBps > MAX_ROYALTY_BPS) revert RoyaltyExceedsMax(royaltyBps, MAX_ROYALTY_BPS);

        uint256 totalBps;
        for (uint256 i = 0; i < basisPoints.length; i++) {
            if (payees[i] == address(0)) revert ZeroAddress();
            totalBps += basisPoints[i];
        }
        if (totalBps != TOTAL_BPS) revert InvalidSplitTotal(totalBps, TOTAL_BPS);

        _nextId++;
        tokenId = _nextId;
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, _tokenURI);

        TokenState storage state = _tokenStates[tokenId];
        state.metadata = metadata;
        state.royaltyBps = royaltyBps;
        state.royaltyReceiver = to;

        for (uint256 i = 0; i < payees.length; i++) {
            state.splits.push(SplitRecipient({
                payee: payable(payees[i]),
                basisPoints: basisPoints[i],
                claimed: 0
            }));
        }

        emit CatalogMinted(tokenId, to, metadata.catalogType, metadata.title);
        emit SplitConfigured(tokenId, msg.sender);
    }

    // ─── Metadata ─────────────────────────────────────────────

    function getMetadata(uint256 tokenId) external view returns (CatalogMetadata memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenNotMinted();
        return _tokenStates[tokenId].metadata;
    }

    function updateMetadata(uint256 tokenId, CatalogMetadata calldata metadata) external {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        _tokenStates[tokenId].metadata = metadata;
        emit MetadataUpdated(tokenId, metadata.title);
    }

    // ─── ERC-2981 ─────────────────────────────────────────────

    function royaltyInfo(uint256 tokenId, uint256 salePrice)
        external
        view
        override
        returns (address receiver, uint256 royaltyAmount)
    {
        TokenState storage state = _tokenStates[tokenId];
        receiver = state.royaltyReceiver;
        royaltyAmount = (salePrice * state.royaltyBps) / TOTAL_BPS;
    }

    // ─── Split Configuration ──────────────────────────────────

    function configureSplit(
        uint256 tokenId,
        address[] calldata payees,
        uint256[] calldata basisPoints
    ) external override {
        if (ownerOf(tokenId) != msg.sender) revert NotTokenOwner();
        if (payees.length == 0) revert SplitLengthMismatch();
        if (payees.length != basisPoints.length) revert SplitLengthMismatch();

        uint256 totalBps;
        for (uint256 i = 0; i < basisPoints.length; i++) {
            if (payees[i] == address(0)) revert ZeroAddress();
            totalBps += basisPoints[i];
        }
        if (totalBps != TOTAL_BPS) revert InvalidSplitTotal(totalBps, TOTAL_BPS);

        TokenState storage state = _tokenStates[tokenId];

        // Preserve pending revenue for existing payees
        for (uint256 i = 0; i < state.splits.length; i++) {
            // pendingRevenue mapping entries are preserved automatically
        }

        delete state.splits;
        for (uint256 i = 0; i < payees.length; i++) {
            state.splits.push(SplitRecipient({
                payee: payable(payees[i]),
                basisPoints: basisPoints[i],
                claimed: state.pendingRevenue[payees[i]]
            }));
        }

        emit SplitConfigured(tokenId, msg.sender);
    }

    // ─── Revenue Distribution ─────────────────────────────────

    function distributeRevenue(uint256 tokenId, uint256) external payable override nonReentrant {
        uint256 totalAmount = msg.value;
        if (totalAmount == 0) revert NoRevenueToClaim();

        TokenState storage state = _tokenStates[tokenId];
        if (state.splits.length == 0) revert TokenNotMinted();

        for (uint256 i = 0; i < state.splits.length; i++) {
            SplitRecipient storage split = state.splits[i];
            uint256 share = (totalAmount * split.basisPoints) / TOTAL_BPS;
            if (share > 0) {
                split.claimed += share;
                state.pendingRevenue[split.payee] += share;
            }
        }

        emit RevenueDistributed(tokenId, totalAmount, state.splits.length);
    }

    function claimRevenue(uint256 tokenId, address payee) external override nonReentrant returns (uint256 amount) {
        amount = _tokenStates[tokenId].pendingRevenue[payee];
        if (amount == 0) revert NoRevenueToClaim();

        _tokenStates[tokenId].pendingRevenue[payee] = 0;

        (bool success,) = payable(payee).call{value: amount}("");
        require(success, "Transfer failed");

        emit RevenueClaimed(tokenId, payee, amount);
    }

    // ─── Views ────────────────────────────────────────────────

    function getSplits(uint256 tokenId) external view override returns (SplitRecipient[] memory) {
        return _tokenStates[tokenId].splits;
    }

    function getUnclaimedRevenue(uint256 tokenId) external view override returns (uint256 total) {
        TokenState storage state = _tokenStates[tokenId];
        for (uint256 i = 0; i < state.splits.length; i++) {
            total += state.pendingRevenue[state.splits[i].payee];
        }
    }

    function getPendingForPayee(uint256 tokenId, address payee) external view returns (uint256) {
        return _tokenStates[tokenId].pendingRevenue[payee];
    }

    // ─── Internal ─────────────────────────────────────────────

    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721, ERC721Enumerable)
        returns (address)
    {
        return super._update(to, tokenId, auth);
    }

    function _increaseBalance(address account, uint128 value)
        internal
        override(ERC721, ERC721Enumerable)
    {
        super._increaseBalance(account, value);
    }
}
