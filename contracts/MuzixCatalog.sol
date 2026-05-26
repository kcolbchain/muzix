// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

contract MuzixCatalog is ERC721Enumerable {
    uint256 private _nextTokenId;
    mapping(uint256 => string) private _tokenUris;
    mapping(uint256 => address) public creators;

    event TokenRegistered(uint256 indexed tokenId, address indexed creator, string uri);

    constructor() ERC721("MuzixCatalog", "MZXC") {}

    function registerToken(string memory uri) external returns (uint256) {
        uint256 tokenId = ++_nextTokenId;
        _safeMint(msg.sender, tokenId);
        _tokenUris[tokenId] = uri;
        creators[tokenId] = msg.sender;
        emit TokenRegistered(tokenId, msg.sender, uri);
        return tokenId;
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        return _tokenUris[tokenId];
    }

    function nextTokenId() external view returns (uint256) { return _nextTokenId; }
}
