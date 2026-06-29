// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MUSD.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/interfaces/draft-IERC6093.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * Configurable catalog stub for MUSD. Each tokenId can be given its own split
 * so a single test contract can exercise multi-recipient, single-recipient,
 * empty-split and partial-split (<100%) distribution paths.
 *
 * We deliberately avoid wiring the real MuzixCatalog here: MUSD only depends on
 * the `royaltySplits(uint256) -> (address[], uint16[])` slice of its ABI, and a
 * focused stub keeps these unit tests independent of catalog mint/auth logic.
 */
contract MockCatalog {
    mapping(uint256 => address[]) internal _recipients;
    mapping(uint256 => uint16[]) internal _shares;

    function setSplit(uint256 tokenId, address[] memory recipients, uint16[] memory shares) external {
        _recipients[tokenId] = recipients;
        _shares[tokenId] = shares;
    }

    function royaltySplits(uint256 tokenId)
        external
        view
        returns (address[] memory recipients, uint16[] memory shares)
    {
        return (_recipients[tokenId], _shares[tokenId]);
    }
}

contract MUSDTest is Test {
    MUSD internal musd;
    MockCatalog internal catalog;

    address internal owner;
    address internal user = address(0x1);
    address internal artistA = address(0xAAA);
    address internal artistB = address(0xBBB);
    address internal stranger = address(0xBEEF);

    // Default 70/30 split lives on tokenId 1.
    uint256 internal constant TOKEN_1 = 1;
    uint256 internal constant TOKEN_2 = 2;
    uint256 internal constant TOKEN_EMPTY = 99;

    event RoyaltyDistributed(uint256 indexed tokenId, uint256 totalAmount);
    event BatchRoyaltyProcessed(uint256 totalTokensProcessed, uint256 totalVolume);
    event Withdrawal(address indexed payee, uint256 amount);

    function setUp() public {
        owner = address(this);
        catalog = new MockCatalog();
        musd = new MUSD(address(catalog));

        // tokenId 1: 70% artistA / 30% artistB.
        _setSplit(TOKEN_1, artistA, 7000, artistB, 3000);
        // tokenId 2: 50/50 between the two artists.
        _setSplit(TOKEN_2, artistA, 5000, artistB, 5000);

        musd.mint(owner, 1000 ether);
        musd.mint(user, 1000 ether);
    }

    // ----------------------------------------------------------------------
    // Helpers
    // ----------------------------------------------------------------------

    function _setSplit(uint256 tokenId, address r0, uint16 s0, address r1, uint16 s1) internal {
        address[] memory r = new address[](2);
        r[0] = r0;
        r[1] = r1;
        uint16[] memory s = new uint16[](2);
        s[0] = s0;
        s[1] = s1;
        catalog.setSplit(tokenId, r, s);
    }

    function _setSingleSplit(uint256 tokenId, address r0, uint16 s0) internal {
        address[] memory r = new address[](1);
        r[0] = r0;
        uint16[] memory s = new uint16[](1);
        s[0] = s0;
        catalog.setSplit(tokenId, r, s);
    }

    // ----------------------------------------------------------------------
    // Metadata / construction
    // ----------------------------------------------------------------------

    function testNameSymbolDecimals() public view {
        assertEq(musd.name(), "Muzix USD");
        assertEq(musd.symbol(), "MUSD");
        assertEq(musd.decimals(), 18);
    }

    function testConstructorSetsCatalogAndOwner() public view {
        assertEq(address(musd.catalog()), address(catalog));
        assertEq(musd.owner(), owner);
    }

    // ----------------------------------------------------------------------
    // mint
    // ----------------------------------------------------------------------

    function testMintIncreasesBalanceAndSupply() public {
        uint256 supplyBefore = musd.totalSupply();
        musd.mint(user, 500 ether);
        assertEq(musd.balanceOf(user), 1500 ether);
        assertEq(musd.totalSupply(), supplyBefore + 500 ether);
    }

    function testMintOnlyOwnerReverts() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        musd.mint(stranger, 1 ether);
    }

    // ----------------------------------------------------------------------
    // transfer (vanilla ERC20)
    // ----------------------------------------------------------------------

    function testTransferMovesTokens() public {
        vm.prank(user);
        bool ok = musd.transfer(artistA, 100 ether);
        assertTrue(ok);
        assertEq(musd.balanceOf(user), 900 ether);
        assertEq(musd.balanceOf(artistA), 100 ether);
    }

    function testTransferInsufficientBalanceReverts() public {
        vm.prank(stranger); // stranger holds 0
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, stranger, 0, 1 ether));
        musd.transfer(artistA, 1 ether);
    }

    function testTransferFromRespectsAllowance() public {
        vm.prank(user);
        musd.approve(owner, 100 ether);
        assertEq(musd.allowance(user, owner), 100 ether);

        musd.transferFrom(user, artistA, 40 ether);
        assertEq(musd.balanceOf(artistA), 40 ether);
        assertEq(musd.allowance(user, owner), 60 ether);
    }

    function testTransferFromInsufficientAllowanceReverts() public {
        vm.prank(user);
        musd.approve(owner, 10 ether);
        vm.expectRevert(
            abi.encodeWithSelector(IERC20Errors.ERC20InsufficientAllowance.selector, owner, 10 ether, 20 ether)
        );
        musd.transferFrom(user, artistA, 20 ether);
    }

    // ----------------------------------------------------------------------
    // transferWithRoyalty (single distribution / atomic hook)
    // ----------------------------------------------------------------------

    function testTransferWithRoyaltyCreditsPendingWithdrawals() public {
        vm.prank(user);
        bool ok = musd.transferWithRoyalty(TOKEN_1, 100 ether);
        assertTrue(ok);

        // 70 / 30 of 100.
        assertEq(musd.pendingWithdrawals(artistA), 70 ether);
        assertEq(musd.pendingWithdrawals(artistB), 30 ether);
        // Funds are escrowed in the MUSD contract until claimed.
        assertEq(musd.balanceOf(address(musd)), 100 ether);
        assertEq(musd.balanceOf(user), 900 ether);
    }

    function testTransferWithRoyaltyEmitsEvent() public {
        vm.expectEmit(true, false, false, true, address(musd));
        emit RoyaltyDistributed(TOKEN_1, 100 ether);
        vm.prank(user);
        musd.transferWithRoyalty(TOKEN_1, 100 ether);
    }

    function testTransferWithRoyaltyAccumulatesAcrossCalls() public {
        vm.startPrank(user);
        musd.transferWithRoyalty(TOKEN_1, 100 ether);
        musd.transferWithRoyalty(TOKEN_1, 100 ether);
        vm.stopPrank();
        assertEq(musd.pendingWithdrawals(artistA), 140 ether);
        assertEq(musd.pendingWithdrawals(artistB), 60 ether);
    }

    function testTransferWithRoyaltyNoSplitReverts() public {
        vm.prank(user);
        vm.expectRevert(bytes("No splits defined"));
        musd.transferWithRoyalty(TOKEN_EMPTY, 100 ether);
    }

    function testTransferWithRoyaltyInsufficientBalanceReverts() public {
        // stranger has no MUSD; the internal _transfer to the contract must fail.
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(IERC20Errors.ERC20InsufficientBalance.selector, stranger, 0, 100 ether));
        musd.transferWithRoyalty(TOKEN_1, 100 ether);
    }

    function testTransferWithRoyaltySingleRecipientGetsAll() public {
        _setSingleSplit(7, artistA, 10000);
        vm.prank(user);
        musd.transferWithRoyalty(7, 250 ether);
        assertEq(musd.pendingWithdrawals(artistA), 250 ether);
    }

    function testTransferWithRoyaltyPartialSplitEscrowsRemainder() public {
        // Shares summing below 100% leave a remainder escrowed in the contract.
        _setSingleSplit(8, artistA, 9000); // only 90% credited
        vm.prank(user);
        musd.transferWithRoyalty(8, 100 ether);
        assertEq(musd.pendingWithdrawals(artistA), 90 ether);
        // Full amount still moved into escrow; 10 ether is unallocated dust.
        assertEq(musd.balanceOf(address(musd)), 100 ether);
    }

    // ----------------------------------------------------------------------
    // batchRoyaltyDistribution
    // ----------------------------------------------------------------------

    function testBatchRoyaltyDistribution() public {
        uint256[] memory ids = new uint256[](2);
        ids[0] = TOKEN_1; // 70/30
        ids[1] = TOKEN_2; // 50/50

        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100 ether;
        amounts[1] = 200 ether;

        musd.batchRoyaltyDistribution(ids, amounts);

        // artistA: 70 (token1) + 100 (token2) = 170
        assertEq(musd.pendingWithdrawals(artistA), 170 ether);
        // artistB: 30 (token1) + 100 (token2) = 130
        assertEq(musd.pendingWithdrawals(artistB), 130 ether);
        assertEq(musd.balanceOf(address(musd)), 300 ether);
    }

    function testBatchRoyaltyEmitsAggregateEvent() public {
        uint256[] memory ids = new uint256[](2);
        ids[0] = TOKEN_1;
        ids[1] = TOKEN_2;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100 ether;
        amounts[1] = 200 ether;

        vm.expectEmit(false, false, false, true, address(musd));
        emit BatchRoyaltyProcessed(2, 300 ether);
        musd.batchRoyaltyDistribution(ids, amounts);
    }

    function testBatchRoyaltyOnlyOwnerReverts() public {
        uint256[] memory ids = new uint256[](1);
        ids[0] = TOKEN_1;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 10 ether;

        vm.prank(user);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, user));
        musd.batchRoyaltyDistribution(ids, amounts);
    }

    function testBatchRoyaltyMismatchedArraysReverts() public {
        uint256[] memory ids = new uint256[](2);
        ids[0] = TOKEN_1;
        ids[1] = TOKEN_2;
        uint256[] memory amounts = new uint256[](1);
        amounts[0] = 10 ether;

        vm.expectRevert(bytes("Mismatched arrays"));
        musd.batchRoyaltyDistribution(ids, amounts);
    }

    function testBatchRoyaltyEmptyArraysIsNoop() public {
        uint256[] memory ids = new uint256[](0);
        uint256[] memory amounts = new uint256[](0);

        vm.expectEmit(false, false, false, true, address(musd));
        emit BatchRoyaltyProcessed(0, 0);
        musd.batchRoyaltyDistribution(ids, amounts);

        assertEq(musd.pendingWithdrawals(artistA), 0);
        assertEq(musd.balanceOf(address(musd)), 0);
    }

    function testBatchRoyaltyRevertsOnUndefinedSplitMidway() public {
        // Whole batch reverts (atomic) if any token lacks a split.
        uint256[] memory ids = new uint256[](2);
        ids[0] = TOKEN_1;
        ids[1] = TOKEN_EMPTY;
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100 ether;
        amounts[1] = 100 ether;

        vm.expectRevert(bytes("No splits defined"));
        musd.batchRoyaltyDistribution(ids, amounts);

        // Nothing should have been credited because the call reverted atomically.
        assertEq(musd.pendingWithdrawals(artistA), 0);
    }

    // ----------------------------------------------------------------------
    // claimPayments (pull-payment)
    // ----------------------------------------------------------------------

    function testClaimPaymentsTransfersAndZeroesPending() public {
        vm.prank(user);
        musd.transferWithRoyalty(TOKEN_1, 100 ether);

        vm.prank(artistA);
        musd.claimPayments();

        assertEq(musd.balanceOf(artistA), 70 ether);
        assertEq(musd.pendingWithdrawals(artistA), 0);
        // Escrow drops by the claimed amount.
        assertEq(musd.balanceOf(address(musd)), 30 ether);
    }

    function testClaimPaymentsEmitsWithdrawal() public {
        vm.prank(user);
        musd.transferWithRoyalty(TOKEN_1, 100 ether);

        vm.expectEmit(true, false, false, true, address(musd));
        emit Withdrawal(artistA, 70 ether);
        vm.prank(artistA);
        musd.claimPayments();
    }

    function testClaimPaymentsNoFundsReverts() public {
        vm.prank(stranger);
        vm.expectRevert(bytes("No funds to claim"));
        musd.claimPayments();
    }

    function testDoubleClaimReverts() public {
        vm.prank(user);
        musd.transferWithRoyalty(TOKEN_1, 100 ether);

        vm.prank(artistA);
        musd.claimPayments();

        // Second claim has nothing pending.
        vm.prank(artistA);
        vm.expectRevert(bytes("No funds to claim"));
        musd.claimPayments();
    }

    function testIndependentRecipientsClaimSeparately() public {
        vm.prank(user);
        musd.transferWithRoyalty(TOKEN_1, 100 ether);

        vm.prank(artistA);
        musd.claimPayments();
        vm.prank(artistB);
        musd.claimPayments();

        assertEq(musd.balanceOf(artistA), 70 ether);
        assertEq(musd.balanceOf(artistB), 30 ether);
        assertEq(musd.balanceOf(address(musd)), 0);
    }

    function testClaimAfterMultipleDistributions() public {
        vm.startPrank(user);
        musd.transferWithRoyalty(TOKEN_1, 100 ether);
        musd.transferWithRoyalty(TOKEN_2, 100 ether);
        vm.stopPrank();

        // artistA: 70 + 50 = 120.
        vm.prank(artistA);
        musd.claimPayments();
        assertEq(musd.balanceOf(artistA), 120 ether);
        assertEq(musd.pendingWithdrawals(artistA), 0);
    }

    // ----------------------------------------------------------------------
    // ERC20Permit surface
    // ----------------------------------------------------------------------

    function testPermitSetsAllowance() public {
        uint256 pk = 0xA11CE;
        address signer = vm.addr(pk);
        musd.mint(signer, 10 ether);

        uint256 deadline = block.timestamp + 1 days;
        bytes32 structHash = keccak256(
            abi.encode(
                keccak256("Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"),
                signer,
                owner,
                5 ether,
                musd.nonces(signer),
                deadline
            )
        );
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", musd.DOMAIN_SEPARATOR(), structHash));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);

        musd.permit(signer, owner, 5 ether, deadline, v, r, s);
        assertEq(musd.allowance(signer, owner), 5 ether);
        assertEq(musd.nonces(signer), 1);
    }
}
