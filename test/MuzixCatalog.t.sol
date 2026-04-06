// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MuzixCatalog.sol";

contract MuzixCatalogTest is Test {
    MuzixCatalog public catalog;
    address public artist = address(0x1);

    function setUp() public {
        catalog = new MuzixCatalog();
    }

    function testMintAndRoyalty() public {
        uint256 tokenId = catalog.mintMusic(artist, "ipfs://music-metadata", 500); // 5% royalty
        assertEq(catalog.ownerOf(tokenId), artist);
        
        (address receiver, uint256 royaltyAmount) = catalog.royaltyInfo(tokenId, 1 ether);
        assertEq(receiver, artist);
        assertEq(royaltyAmount, 0.05 ether);
    }
}
