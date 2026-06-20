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

    // MuzixCatalog mints via _safeMint, which calls onERC721Received on contract
    // recipients. Since mintMusic() is onlyOwner and the owner here is this test
    // contract, we implement the receiver hook so the test contract can hold tokens.
    function onERC721Received(address, address, uint256, bytes calldata)
        external
        pure
        returns (bytes4)
    {
        return this.onERC721Received.selector;
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

        // setRoyaltySplit sets ERC2981 royalty to the recipient with the largest share.
        // artist has 70% (7000 bps) > label 30% (3000 bps), so artist is the royalty receiver.
        (address receiver, uint256 royaltyAmount) = catalog.royaltyInfo(tokenId, 1 ether);
        assertEq(receiver, artist);
        assertEq(royaltyAmount, 0.7 ether);
    }

    function testRoyaltySplitEqualShares() public {
        MuzixCatalog.MusicMetadata memory metadata = MuzixCatalog.MusicMetadata({
            isrc: "EQUAL-SPLIT",
            artist: "Test Artist"
        });

        uint256 tokenId = catalog.mintMusic("ipfs://equal", metadata);

        address[] memory recipients = new address[](2);
        recipients[0] = artist;
        recipients[1] = label;

        uint16[] memory shares = new uint16[](2);
        shares[0] = 5000;
        shares[1] = 5000;

        catalog.setRoyaltySplit(tokenId, recipients, shares);

        // Equal shares: first recipient with max share wins (artist).
        (address receiver, uint256 royaltyAmount) = catalog.royaltyInfo(tokenId, 1 ether);
        assertEq(receiver, artist);
        assertEq(royaltyAmount, 0.5 ether);
    }

    function testRoyaltySplitNoRecipients() public {
        MuzixCatalog.MusicMetadata memory metadata = MuzixCatalog.MusicMetadata({
            isrc: "NO-RECIPIENTS",
            artist: "Test Artist"
        });

        uint256 tokenId = catalog.mintMusic("ipfs://no-recipients", metadata);

        address[] memory recipients = new address[](0);
        uint16[] memory shares = new uint16[](0);

        // Should not revert — empty splits just means no royalty configured.
        catalog.setRoyaltySplit(tokenId, recipients, shares);

        // With no recipients, royalty defaults to 0.
        (address receiver, uint256 royaltyAmount) = catalog.royaltyInfo(tokenId, 1 ether);
        assertEq(receiver, address(0));
        assertEq(royaltyAmount, 0);
    }
}
