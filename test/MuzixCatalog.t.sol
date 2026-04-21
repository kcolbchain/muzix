// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MuzixCatalog.sol";

contract MuzixCatalogTest is Test {
    MuzixCatalog public catalog;
    address public artist = address(0x1);
    address public label = address(0x2);

    function setUp() public {
        catalog = new MuzixCatalog();
    }

    function testMintAndMetadata() public {
        MuzixCatalog.MusicMetadata memory metadata = MuzixCatalog.MusicMetadata({
            isrc: "USRC17607839",
            artist: "Test Artist"
        });

        uint256 tokenId = catalog.mintMusic("ipfs://music-metadata", metadata);

        // mintMusic is onlyOwner and mints to msg.sender (the test contract = deployer)
        assertEq(catalog.ownerOf(tokenId), address(this));
        assertEq(catalog.tokenURI(tokenId), "ipfs://music-metadata");

        (string memory isrc, string memory artistName) = catalog.musicRegistry(tokenId);
        assertEq(isrc, "USRC17607839");
        assertEq(artistName, "Test Artist");
    }

    function testRoyaltySplitSetsPoolRoyalty() public {
        MuzixCatalog.MusicMetadata memory metadata = MuzixCatalog.MusicMetadata({
            isrc: "USRC17607839",
            artist: "Test Artist"
        });

        uint256 tokenId = catalog.mintMusic("ipfs://music-metadata", metadata);

        address[] memory recipients = new address[](2);
        recipients[0] = artist;
        recipients[1] = label;

        uint16[] memory shares = new uint16[](2);
        shares[0] = 7000; // 70%
        shares[1] = 3000; // 30%

        catalog.setRoyaltySplit(tokenId, recipients, shares);

        // setRoyaltySplit configures a 10% (1000 bps) pool royalty to the contract address.
        (address receiver, uint256 royaltyAmount) = catalog.royaltyInfo(tokenId, 1 ether);
        assertEq(receiver, address(catalog));
        assertEq(royaltyAmount, 0.1 ether);
    }
}
