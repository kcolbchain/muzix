// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MuzixCatalog.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import "@openzeppelin/contracts/token/common/ERC2981.sol";
import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";

/**
 * Recipient harness used as a royalty stakeholder. Unlike the test contract it
 * has a plain receive() so we can prank it as a streaming-revenue claimer and
 * assert on its ETH balance without the test contract's bookkeeping interfering.
 */
contract Stakeholder {
    receive() external payable {}
}

contract MuzixCatalogTest is Test {
    MuzixCatalog internal catalog;

    address internal owner;
    address internal stranger = address(0xBEEF);

    Stakeholder internal artist;
    Stakeholder internal label;

    string internal constant URI_1 = "ipfs://music-metadata";
    string internal constant ISRC_1 = "USRC17607839";

    function setUp() public {
        owner = address(this);
        catalog = new MuzixCatalog();
        artist = new Stakeholder();
        label = new Stakeholder();
    }

    // mintMusic uses _safeMint to msg.sender (the owner == this test contract),
    // so we must accept the ERC-721 receiver hook.
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        return this.onERC721Received.selector;
    }

    // Allow the test contract to receive ETH (e.g. as the ERC-2981 pool address
    // is the catalog itself, but defensive for any direct sends in tests).
    receive() external payable {}

    // ----------------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------------

    function _meta(string memory isrc, string memory name) internal pure returns (MuzixCatalog.MusicMetadata memory) {
        return MuzixCatalog.MusicMetadata({isrc: isrc, artist: name});
    }

    function _mint() internal returns (uint256) {
        return catalog.mintMusic(URI_1, _meta(ISRC_1, "Test Artist"));
    }

    function _split70_30(uint256 tokenId) internal {
        address[] memory recipients = new address[](2);
        recipients[0] = address(artist);
        recipients[1] = address(label);
        uint16[] memory shares = new uint16[](2);
        shares[0] = 7000;
        shares[1] = 3000;
        catalog.setRoyaltySplit(tokenId, recipients, shares);
    }

    // ----------------------------------------------------------------------
    // Construction / metadata
    // ----------------------------------------------------------------------

    function testNameAndSymbol() public view {
        assertEq(catalog.name(), "Muzix Catalog");
        assertEq(catalog.symbol(), "MUZIX");
        assertEq(catalog.owner(), owner);
    }

    // ----------------------------------------------------------------------
    // mintMusic
    // ----------------------------------------------------------------------

    function testMintAndMetadata() public {
        uint256 tokenId = _mint();

        assertEq(catalog.ownerOf(tokenId), owner);
        assertEq(catalog.tokenURI(tokenId), URI_1);

        (string memory isrc, string memory artistName) = catalog.musicRegistry(tokenId);
        assertEq(isrc, ISRC_1);
        assertEq(artistName, "Test Artist");
    }

    function testMintIncrementsTokenIds() public {
        uint256 id0 = _mint();
        uint256 id1 = catalog.mintMusic("ipfs://second", _meta("USRC0000002", "Second"));
        assertEq(id0, 0);
        assertEq(id1, 1);
    }

    function testMintOnlyOwnerReverts() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        catalog.mintMusic(URI_1, _meta(ISRC_1, "Test Artist"));
    }

    function testTokenURINonexistentReverts() public {
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, uint256(0)));
        catalog.tokenURI(0);
    }

    function testCatalogTokenIsTransferable() public {
        uint256 tokenId = _mint();
        catalog.transferFrom(owner, address(artist), tokenId);
        assertEq(catalog.ownerOf(tokenId), address(artist));
    }

    // ----------------------------------------------------------------------
    // setRoyaltySplit
    // ----------------------------------------------------------------------

    function testSetRoyaltySplitStoresRecipientsAndShares() public {
        uint256 tokenId = _mint();
        _split70_30(tokenId);

        (address[] memory recipients, uint16[] memory shares) = catalog.royaltySplits(tokenId);
        assertEq(recipients.length, 2);
        assertEq(recipients[0], address(artist));
        assertEq(recipients[1], address(label));
        assertEq(shares[0], 7000);
        assertEq(shares[1], 3000);
    }

    function testSetRoyaltySplitSetsPoolRoyalty() public {
        uint256 tokenId = _mint();
        _split70_30(tokenId);

        // 10% (1000 bps) pool royalty assigned to the catalog contract itself.
        (address receiver, uint256 royaltyAmount) = catalog.royaltyInfo(tokenId, 1 ether);
        assertEq(receiver, address(catalog));
        assertEq(royaltyAmount, 0.1 ether);
    }

    function testSetRoyaltySplitNotOwnerReverts() public {
        uint256 tokenId = _mint();
        address[] memory recipients = new address[](1);
        recipients[0] = address(artist);
        uint16[] memory shares = new uint16[](1);
        shares[0] = 10000;

        vm.prank(stranger);
        vm.expectRevert(bytes("Not the owner"));
        catalog.setRoyaltySplit(tokenId, recipients, shares);
    }

    function testSetRoyaltySplitMismatchedArraysReverts() public {
        uint256 tokenId = _mint();
        address[] memory recipients = new address[](2);
        recipients[0] = address(artist);
        recipients[1] = address(label);
        uint16[] memory shares = new uint16[](1);
        shares[0] = 10000;

        vm.expectRevert(bytes("Mismatched arrays"));
        catalog.setRoyaltySplit(tokenId, recipients, shares);
    }

    function testSetRoyaltySplitWrongTotalReverts() public {
        uint256 tokenId = _mint();
        address[] memory recipients = new address[](2);
        recipients[0] = address(artist);
        recipients[1] = address(label);
        uint16[] memory shares = new uint16[](2);
        shares[0] = 6000;
        shares[1] = 3000; // sums to 9000, not 10000

        vm.expectRevert(bytes("Total must be 100%"));
        catalog.setRoyaltySplit(tokenId, recipients, shares);
    }

    function testSetRoyaltySplitNonexistentTokenReverts() public {
        address[] memory recipients = new address[](1);
        recipients[0] = address(artist);
        uint16[] memory shares = new uint16[](1);
        shares[0] = 10000;

        // ownerOf reverts for a token that was never minted.
        vm.expectRevert(abi.encodeWithSelector(IERC721Errors.ERC721NonexistentToken.selector, uint256(0)));
        catalog.setRoyaltySplit(0, recipients, shares);
    }

    function testSetRoyaltySplitCanBeOverwritten() public {
        uint256 tokenId = _mint();
        _split70_30(tokenId);

        address[] memory recipients = new address[](1);
        recipients[0] = address(artist);
        uint16[] memory shares = new uint16[](1);
        shares[0] = 10000;
        catalog.setRoyaltySplit(tokenId, recipients, shares);

        (address[] memory r, uint16[] memory s) = catalog.royaltySplits(tokenId);
        assertEq(r.length, 1);
        assertEq(r[0], address(artist));
        assertEq(s[0], 10000);
    }

    // ----------------------------------------------------------------------
    // fractionalize view
    // ----------------------------------------------------------------------

    function testFractionalizeTrueForMultiRecipientSplit() public {
        uint256 tokenId = _mint();
        _split70_30(tokenId);
        assertTrue(catalog.fractionalize(tokenId));
    }

    function testFractionalizeFalseForSingleRecipientSplit() public {
        uint256 tokenId = _mint();
        address[] memory recipients = new address[](1);
        recipients[0] = address(artist);
        uint16[] memory shares = new uint16[](1);
        shares[0] = 10000;
        catalog.setRoyaltySplit(tokenId, recipients, shares);
        assertFalse(catalog.fractionalize(tokenId));
    }

    function testFractionalizeFalseWhenNoSplit() public {
        uint256 tokenId = _mint();
        assertFalse(catalog.fractionalize(tokenId));
    }

    // ----------------------------------------------------------------------
    // depositRevenue / claimStreamingRevenue (pull-payment, ETH)
    // ----------------------------------------------------------------------

    function testDepositRevenueAccumulates() public {
        uint256 tokenId = _mint();
        catalog.depositRevenue{value: 1 ether}(tokenId);
        catalog.depositRevenue{value: 2 ether}(tokenId);
        assertEq(catalog.totalStreamingRevenue(tokenId), 3 ether);
        assertEq(address(catalog).balance, 3 ether);
    }

    function testDepositRevenueAnyoneCanFund() public {
        uint256 tokenId = _mint();
        vm.deal(stranger, 5 ether);
        vm.prank(stranger);
        catalog.depositRevenue{value: 5 ether}(tokenId);
        assertEq(catalog.totalStreamingRevenue(tokenId), 5 ether);
    }

    function testClaimStreamingRevenueSplitsByShare() public {
        uint256 tokenId = _mint();
        _split70_30(tokenId);
        catalog.depositRevenue{value: 10 ether}(tokenId);

        vm.prank(address(artist));
        catalog.claimStreamingRevenue(tokenId);
        vm.prank(address(label));
        catalog.claimStreamingRevenue(tokenId);

        assertEq(address(artist).balance, 7 ether);
        assertEq(address(label).balance, 3 ether);
        assertEq(catalog.claimedBalance(tokenId, address(artist)), 7 ether);
        assertEq(catalog.claimedBalance(tokenId, address(label)), 3 ether);
        // All deposited revenue has been pulled out.
        assertEq(address(catalog).balance, 0);
    }

    function testClaimStreamingRevenueIncrementalAfterTopUp() public {
        uint256 tokenId = _mint();
        _split70_30(tokenId);

        catalog.depositRevenue{value: 10 ether}(tokenId);
        vm.prank(address(artist));
        catalog.claimStreamingRevenue(tokenId); // claims 7

        // More revenue arrives; artist can pull only the incremental share.
        catalog.depositRevenue{value: 10 ether}(tokenId);
        vm.prank(address(artist));
        catalog.claimStreamingRevenue(tokenId); // claims another 7

        assertEq(address(artist).balance, 14 ether);
        assertEq(catalog.claimedBalance(tokenId, address(artist)), 14 ether);
    }

    function testClaimStreamingRevenueTwiceWithoutNewRevenueReverts() public {
        uint256 tokenId = _mint();
        _split70_30(tokenId);
        catalog.depositRevenue{value: 10 ether}(tokenId);

        vm.prank(address(artist));
        catalog.claimStreamingRevenue(tokenId);

        // Nothing new to claim => "No balance to claim".
        vm.prank(address(artist));
        vm.expectRevert(bytes("No balance to claim"));
        catalog.claimStreamingRevenue(tokenId);
    }

    function testClaimStreamingRevenueNonStakeholderReverts() public {
        uint256 tokenId = _mint();
        _split70_30(tokenId);
        catalog.depositRevenue{value: 10 ether}(tokenId);

        vm.prank(stranger);
        vm.expectRevert(bytes("Not a stakeholder"));
        catalog.claimStreamingRevenue(tokenId);
    }

    function testClaimStreamingRevenueNoSplitReverts() public {
        uint256 tokenId = _mint();
        catalog.depositRevenue{value: 10 ether}(tokenId);

        // No split configured => empty recipients loop => "Not a stakeholder".
        vm.prank(address(artist));
        vm.expectRevert(bytes("Not a stakeholder"));
        catalog.claimStreamingRevenue(tokenId);
    }

    function testClaimStreamingRevenueZeroRevenueReverts() public {
        uint256 tokenId = _mint();
        _split70_30(tokenId);
        // No deposit; share computes to 0 => "No balance to claim".
        vm.prank(address(artist));
        vm.expectRevert(bytes("No balance to claim"));
        catalog.claimStreamingRevenue(tokenId);
    }

    // ----------------------------------------------------------------------
    // ERC-2981 / ERC-165 introspection
    // ----------------------------------------------------------------------

    function testSupportsERC721Interface() public view {
        assertTrue(catalog.supportsInterface(type(IERC721).interfaceId));
    }

    function testSupportsERC2981Interface() public view {
        assertTrue(catalog.supportsInterface(type(IERC2981).interfaceId));
    }

    function testSupportsERC165Interface() public view {
        assertTrue(catalog.supportsInterface(type(IERC165).interfaceId));
    }

    function testDoesNotSupportRandomInterface() public view {
        assertFalse(catalog.supportsInterface(0xdeadbeef));
    }

    function testRoyaltyInfoZeroBeforeSplit() public {
        uint256 tokenId = _mint();
        // No default royalty configured until setRoyaltySplit runs.
        (address receiver, uint256 amount) = catalog.royaltyInfo(tokenId, 1 ether);
        assertEq(receiver, address(0));
        assertEq(amount, 0);
    }
}
