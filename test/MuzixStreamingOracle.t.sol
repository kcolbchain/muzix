// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MuzixStreamingOracle.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";

contract MuzixStreamingOracleTest is Test {
    MuzixStreamingOracle internal oracle;

    address internal owner = address(0xA11CE);
    address internal pusher = address(0xBEEF);
    address internal stranger = address(0xC0DE);
    address internal subscriber = address(0xD00D);

    bytes32 internal constant SPOTIFY = keccak256("spotify");
    bytes32 internal constant APPLE = keccak256("apple_music");
    bytes32 internal constant CATALOG_A = keccak256("catalog/A");

    uint256 internal periodStart;
    uint256 internal periodEnd;

    function setUp() public {
        // Warp far enough that we can submit "past" periods that start at
        // non-trivial timestamps without underflow.
        vm.warp(1_900_000_000);
        periodStart = block.timestamp - 30 days;
        periodEnd = block.timestamp - 1 days;

        vm.prank(owner);
        oracle = new MuzixStreamingOracle(owner);

        vm.startPrank(owner);
        oracle.registerDSP(SPOTIFY, "Spotify", 5000, 0);              // 0 ⇒ default min confidence (7500)
        oracle.registerDSP(APPLE, "Apple Music", 3000, 8000);          // explicit override
        oracle.setPusher(pusher, true);
        vm.stopPrank();
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    function _rec(bytes32 dsp, uint256 revenueUsd, uint256 confidence)
        internal
        view
        returns (MuzixStreamingOracle.StreamingRevenue memory r)
    {
        r.catalogId = CATALOG_A;
        r.dspId = dsp;
        r.totalStreams = 1_000_000;
        r.revenueUsd = revenueUsd;
        r.periodStart = periodStart;
        r.periodEnd = periodEnd;
        r.territoryHash = keccak256("US,UK,DE");
        r.dataSourceHash = keccak256("source-hash-v1");
        r.lastUpdated = 0; // overwritten on-chain
        r.confidenceScore = confidence;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    function testConstructorRejectsZeroOwner() public {
        vm.expectRevert(
            abi.encodeWithSelector(Ownable.OwnableInvalidOwner.selector, address(0))
        );
        new MuzixStreamingOracle(address(0));
    }

    function testConstructorSetsDefaults() public view {
        assertEq(oracle.freshnessWindow(), oracle.DEFAULT_FRESHNESS_WINDOW());
        assertEq(oracle.owner(), owner);
    }

    // ---------------------------------------------------------------------
    // DSP registry
    // ---------------------------------------------------------------------

    function testRegisterDSPStoresRecord() public view {
        MuzixStreamingOracle.DSPInfo memory info = oracle.getDSP(SPOTIFY);
        assertEq(info.dspId, SPOTIFY);
        assertEq(info.name, "Spotify");
        assertEq(info.weight, 5000);
        assertTrue(info.isActive);
        assertEq(info.minConfidenceScore, 0);
        assertEq(oracle.dspCount(), 2);
        assertEq(oracle.dspIdAt(0), SPOTIFY);
        assertEq(oracle.dspIdAt(1), APPLE);
        assertTrue(oracle.isDSPRegistered(SPOTIFY));
    }

    function testRegisterDSPRevertsOnZeroId() public {
        vm.prank(owner);
        vm.expectRevert(MuzixStreamingOracle.DspIdRequired.selector);
        oracle.registerDSP(bytes32(0), "x", 0, 0);
    }

    function testRegisterDSPRevertsOnDuplicate() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(MuzixStreamingOracle.DSPAlreadyRegistered.selector, SPOTIFY));
        oracle.registerDSP(SPOTIFY, "Spotify-2", 1, 0);
    }

    function testRegisterDSPRevertsOnInvalidConfidence() public {
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(MuzixStreamingOracle.ConfidenceOutOfRange.selector, 10001));
        oracle.registerDSP(keccak256("youtube"), "YouTube", 1, 10001);
    }

    function testUpdateDSPRevertsWhenNotRegistered() public {
        bytes32 unknown = keccak256("tidal");
        vm.prank(owner);
        vm.expectRevert(abi.encodeWithSelector(MuzixStreamingOracle.DSPNotRegistered.selector, unknown));
        oracle.updateDSP(unknown, 1, true, 0);
    }

    function testUpdateDSPMutatesFields() public {
        vm.prank(owner);
        oracle.updateDSP(SPOTIFY, 7000, false, 9000);

        MuzixStreamingOracle.DSPInfo memory info = oracle.getDSP(SPOTIFY);
        assertEq(info.weight, 7000);
        assertFalse(info.isActive);
        assertEq(info.minConfidenceScore, 9000);
    }

    // ---------------------------------------------------------------------
    // Pushers / circuit breaker / access control
    // ---------------------------------------------------------------------

    function testRegisterDSPRevertsForNonOwner() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        oracle.registerDSP(keccak256("amazon"), "Amazon", 1, 0);
    }

    function testSetPusherRevertsForNonOwner() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        oracle.setPusher(stranger, true);
    }

    function testSetPusherZeroAddress() public {
        vm.prank(owner);
        vm.expectRevert(MuzixStreamingOracle.ZeroAddress.selector);
        oracle.setPusher(address(0), true);
    }

    function testSubmitRevertsForUnauthorized() public {
        MuzixStreamingOracle.StreamingRevenue memory r = _rec(SPOTIFY, 1_000_000, 8000);
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(MuzixStreamingOracle.NotPusher.selector, stranger));
        oracle.submitRevenue(r);
    }

    function testPauseBlocksSubmission() public {
        vm.prank(owner);
        oracle.pause();

        MuzixStreamingOracle.StreamingRevenue memory r = _rec(SPOTIFY, 1_000_000, 8000);
        vm.prank(pusher);
        vm.expectRevert(Pausable.EnforcedPause.selector);
        oracle.submitRevenue(r);

        vm.prank(owner);
        oracle.unpause();

        vm.prank(pusher);
        oracle.submitRevenue(r); // succeeds after unpause
        assertTrue(oracle.hasRecord(CATALOG_A));
    }

    // ---------------------------------------------------------------------
    // Submission validation
    // ---------------------------------------------------------------------

    function testSubmitRevenueHappyPath() public {
        MuzixStreamingOracle.StreamingRevenue memory r = _rec(SPOTIFY, 1_234_000_000, 9500);

        vm.prank(pusher);
        oracle.submitRevenue(r);

        MuzixStreamingOracle.StreamingRevenue memory latest = oracle.getLatestRevenue(CATALOG_A);
        assertEq(latest.revenueUsd, 1_234_000_000);
        assertEq(latest.confidenceScore, 9500);
        assertEq(latest.dspId, SPOTIFY);
        assertEq(latest.lastUpdated, block.timestamp);

        MuzixStreamingOracle.StreamingRevenue memory byDsp = oracle.getLatestRevenueByDsp(CATALOG_A, SPOTIFY);
        assertEq(byDsp.revenueUsd, 1_234_000_000);

        assertEq(oracle.historyLength(CATALOG_A), 1);
        assertEq(oracle.historyAt(CATALOG_A, 0).revenueUsd, 1_234_000_000);
        assertTrue(oracle.hasRecord(CATALOG_A));
        assertTrue(oracle.isDataFresh(CATALOG_A));
    }

    function testSubmitRevertsOnUnregisteredDSP() public {
        bytes32 unknown = keccak256("tidal");
        MuzixStreamingOracle.StreamingRevenue memory r = _rec(unknown, 1, 9500);
        vm.prank(pusher);
        vm.expectRevert(abi.encodeWithSelector(MuzixStreamingOracle.DSPNotRegistered.selector, unknown));
        oracle.submitRevenue(r);
    }

    function testSubmitRevertsOnInactiveDSP() public {
        vm.prank(owner);
        oracle.updateDSP(SPOTIFY, 5000, false, 0);

        MuzixStreamingOracle.StreamingRevenue memory r = _rec(SPOTIFY, 1, 9500);
        vm.prank(pusher);
        vm.expectRevert(abi.encodeWithSelector(MuzixStreamingOracle.DSPInactive.selector, SPOTIFY));
        oracle.submitRevenue(r);
    }

    function testSubmitRevertsOnZeroCatalog() public {
        MuzixStreamingOracle.StreamingRevenue memory r = _rec(SPOTIFY, 1, 9500);
        r.catalogId = bytes32(0);
        vm.prank(pusher);
        vm.expectRevert(MuzixStreamingOracle.CatalogIdRequired.selector);
        oracle.submitRevenue(r);
    }

    function testSubmitRevertsOnZeroDsp() public {
        MuzixStreamingOracle.StreamingRevenue memory r = _rec(SPOTIFY, 1, 9500);
        r.dspId = bytes32(0);
        vm.prank(pusher);
        vm.expectRevert(MuzixStreamingOracle.DspIdRequired.selector);
        oracle.submitRevenue(r);
    }

    function testSubmitConfidenceTooLowUsesDefault() public {
        // Spotify has minConfidenceScore == 0, which falls back to DEFAULT_MIN_CONFIDENCE (7500).
        MuzixStreamingOracle.StreamingRevenue memory r = _rec(SPOTIFY, 1, 7499);
        vm.prank(pusher);
        vm.expectRevert(abi.encodeWithSelector(MuzixStreamingOracle.ConfidenceTooLow.selector, 7499, 7500));
        oracle.submitRevenue(r);
    }

    function testSubmitConfidenceTooLowUsesPerDspOverride() public {
        // Apple has minConfidenceScore == 8000.
        MuzixStreamingOracle.StreamingRevenue memory r = _rec(APPLE, 1, 7999);
        vm.prank(pusher);
        vm.expectRevert(abi.encodeWithSelector(MuzixStreamingOracle.ConfidenceTooLow.selector, 7999, 8000));
        oracle.submitRevenue(r);
    }

    function testSubmitConfidenceOutOfRange() public {
        MuzixStreamingOracle.StreamingRevenue memory r = _rec(SPOTIFY, 1, 10001);
        vm.prank(pusher);
        vm.expectRevert(abi.encodeWithSelector(MuzixStreamingOracle.ConfidenceOutOfRange.selector, 10001));
        oracle.submitRevenue(r);
    }

    function testSubmitInvalidPeriod() public {
        MuzixStreamingOracle.StreamingRevenue memory r = _rec(SPOTIFY, 1, 9500);
        r.periodStart = periodEnd;
        r.periodEnd = periodStart;
        vm.prank(pusher);
        vm.expectRevert(abi.encodeWithSelector(MuzixStreamingOracle.InvalidPeriod.selector, periodEnd, periodStart));
        oracle.submitRevenue(r);
    }

    function testSubmitPeriodInFuture() public {
        MuzixStreamingOracle.StreamingRevenue memory r = _rec(SPOTIFY, 1, 9500);
        r.periodEnd = block.timestamp + 1 days;
        vm.prank(pusher);
        vm.expectRevert(
            abi.encodeWithSelector(MuzixStreamingOracle.PeriodInFuture.selector, r.periodEnd, block.timestamp)
        );
        oracle.submitRevenue(r);
    }

    // ---------------------------------------------------------------------
    // Cooldown
    // ---------------------------------------------------------------------

    function testCooldownBlocksFastResubmit() public {
        MuzixStreamingOracle.StreamingRevenue memory r = _rec(SPOTIFY, 1, 9500);
        vm.prank(pusher);
        oracle.submitRevenue(r);

        uint256 nextAllowed = block.timestamp + oracle.SUBMISSION_COOLDOWN();
        vm.warp(block.timestamp + 30 minutes);
        vm.prank(pusher);
        vm.expectRevert(abi.encodeWithSelector(MuzixStreamingOracle.CooldownActive.selector, pusher, nextAllowed));
        oracle.submitRevenue(r);
    }

    function testCooldownLiftsAfterWindow() public {
        MuzixStreamingOracle.StreamingRevenue memory r = _rec(SPOTIFY, 1, 9500);
        vm.prank(pusher);
        oracle.submitRevenue(r);

        vm.warp(block.timestamp + 1 hours + 1);
        vm.prank(pusher);
        oracle.submitRevenue(r); // second submission ok
        assertEq(oracle.historyLength(CATALOG_A), 2);
    }

    function testBatchSharesCooldown() public {
        MuzixStreamingOracle.StreamingRevenue[] memory batch = new MuzixStreamingOracle.StreamingRevenue[](2);
        batch[0] = _rec(SPOTIFY, 1_000, 9500);
        batch[1] = _rec(APPLE, 2_000, 8500);

        vm.prank(pusher);
        oracle.batchSubmitRevenue(batch);
        // Cooldown applies to subsequent calls; calling again immediately reverts.
        uint256 nextAllowed = block.timestamp + oracle.SUBMISSION_COOLDOWN();
        vm.prank(pusher);
        vm.expectRevert(abi.encodeWithSelector(MuzixStreamingOracle.CooldownActive.selector, pusher, nextAllowed));
        oracle.batchSubmitRevenue(batch);
    }

    function testBatchEmptyReverts() public {
        MuzixStreamingOracle.StreamingRevenue[] memory empty;
        vm.prank(pusher);
        vm.expectRevert(MuzixStreamingOracle.EmptyBatch.selector);
        oracle.batchSubmitRevenue(empty);
    }

    function testBatchUpdatesAllPointers() public {
        MuzixStreamingOracle.StreamingRevenue[] memory batch = new MuzixStreamingOracle.StreamingRevenue[](2);
        batch[0] = _rec(SPOTIFY, 1_000, 9500);
        batch[1] = _rec(APPLE, 2_000, 8500);

        vm.prank(pusher);
        oracle.batchSubmitRevenue(batch);

        assertEq(oracle.getLatestRevenueByDsp(CATALOG_A, SPOTIFY).revenueUsd, 1_000);
        assertEq(oracle.getLatestRevenueByDsp(CATALOG_A, APPLE).revenueUsd, 2_000);
        // Latest-across is the last one submitted in the batch.
        assertEq(oracle.getLatestRevenue(CATALOG_A).dspId, APPLE);
        assertEq(oracle.historyLength(CATALOG_A), 2);
    }

    // ---------------------------------------------------------------------
    // Period sum, freshness, subscription
    // ---------------------------------------------------------------------

    function testGetRevenueForPeriodSumsMatching() public {
        MuzixStreamingOracle.StreamingRevenue memory inside = _rec(SPOTIFY, 1_000, 9500);
        MuzixStreamingOracle.StreamingRevenue memory outside = _rec(APPLE, 9_999, 9500);
        outside.periodStart = periodStart - 60 days; // fully before window — should not count
        outside.periodEnd = periodStart - 30 days;

        MuzixStreamingOracle.StreamingRevenue[] memory batch = new MuzixStreamingOracle.StreamingRevenue[](2);
        batch[0] = inside;
        batch[1] = outside;

        vm.prank(pusher);
        oracle.batchSubmitRevenue(batch);

        uint256 sum = oracle.getRevenueForPeriod(CATALOG_A, periodStart - 1, periodEnd + 1);
        assertEq(sum, 1_000);
    }

    function testIsDataFreshFalseAfterStale() public {
        MuzixStreamingOracle.StreamingRevenue memory r = _rec(SPOTIFY, 1, 9500);
        vm.prank(pusher);
        oracle.submitRevenue(r);
        assertTrue(oracle.isDataFresh(CATALOG_A));

        vm.warp(block.timestamp + oracle.DEFAULT_FRESHNESS_WINDOW() + 1);
        assertFalse(oracle.isDataFresh(CATALOG_A));
    }

    function testIsDataFreshFalseWhenNoRecord() public view {
        assertFalse(oracle.isDataFresh(keccak256("never-seen")));
    }

    function testSetFreshnessWindowAdminOnly() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, stranger));
        oracle.setFreshnessWindow(1 days);

        vm.prank(owner);
        oracle.setFreshnessWindow(7 days);
        assertEq(oracle.freshnessWindow(), 7 days);
    }

    function testSubscribeEmitsEvent() public {
        vm.expectEmit(true, true, false, true);
        emit MuzixStreamingOracle.SubscribedToUpdates(CATALOG_A, subscriber);
        vm.prank(subscriber);
        oracle.subscribeToUpdates(CATALOG_A);
    }

    function testSubscribeRevertsOnZeroCatalog() public {
        vm.expectRevert(MuzixStreamingOracle.CatalogIdRequired.selector);
        oracle.subscribeToUpdates(bytes32(0));
    }

    function testHistoryAtOutOfBounds() public {
        vm.expectRevert(abi.encodeWithSelector(MuzixStreamingOracle.HistoryIndexOutOfBounds.selector, 0, 0));
        oracle.historyAt(CATALOG_A, 0);
    }
}
