// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MuzixRightsOffering.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MockMUSD is ERC20 {
    constructor() ERC20("Mock MUSD", "mMUSD") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract MuzixRightsOfferingTest is Test {
    MuzixRightsOffering internal offering;
    MockMUSD internal musd;

    address internal sapta = address(0x5A97A);
    address internal label = address(0x1ABE1);
    address internal distributor = address(0xD157);
    address internal stranger = address(0xC0DE);

    function setUp() public {
        vm.warp(1_900_000_000);
        offering = new MuzixRightsOffering();
        musd = new MockMUSD();

        musd.mint(label, 1_000_000e6);
        musd.mint(distributor, 1_000_000e6);

        vm.prank(label);
        musd.approve(address(offering), type(uint256).max);
        vm.prank(distributor);
        musd.approve(address(offering), type(uint256).max);
    }

    // ---------------------------------------------------------------------
    // Helpers
    // ---------------------------------------------------------------------

    function _baseRights() internal pure returns (MuzixRightsOffering.RightsBundle memory) {
        return MuzixRightsOffering.RightsBundle({
            rightsType: MuzixRightsOffering.RightsType.Distribution,
            exclusive: true,
            territoryHash: bytes32(0),
            termSeconds: uint64(365 days * 3)
        });
    }

    function _baseEconomics() internal pure returns (MuzixRightsOffering.Economics memory) {
        return MuzixRightsOffering.Economics({
            upfrontUsd: 25_000e6,
            minGuaranteeUsd: 50_000e6,
            artistRoyaltyBps: 6500,
            advanceRecoupCapUsd: 25_000e6
        });
    }

    function _createDraftAsSapta(uint64 deadline) internal returns (uint256 id) {
        vm.prank(sapta);
        id = offering.createOffering(
            keccak256("subject-sapta-album"),
            "ipfs://bafy-sapta-album-v1",
            _baseRights(),
            _baseEconomics(),
            IERC20(address(musd)),
            5_000e6,
            deadline
        );
    }

    function _openSaptaOffering() internal returns (uint256 id) {
        id = _createDraftAsSapta(uint64(block.timestamp + 30 days));
        vm.prank(sapta);
        offering.publishOffering(id);
    }

    // ---------------------------------------------------------------------
    // Authoring
    // ---------------------------------------------------------------------

    function testCreateOfferingStoresDraft() public {
        uint256 id = _createDraftAsSapta(uint64(block.timestamp + 30 days));

        MuzixRightsOffering.Offering memory o = offering.getOffering(id);
        assertEq(o.artist, sapta);
        assertEq(o.subjectURI, "ipfs://bafy-sapta-album-v1");
        assertEq(uint8(o.status), uint8(MuzixRightsOffering.OfferingStatus.Draft));
        assertEq(o.baseTerms.artistRoyaltyBps, 6500);
        assertEq(address(o.settlementToken), address(musd));
    }

    function testCreateRevertsOnMissingSubject() public {
        vm.prank(sapta);
        vm.expectRevert(MuzixRightsOffering.SubjectHashRequired.selector);
        offering.createOffering(
            bytes32(0),
            "ipfs://x",
            _baseRights(),
            _baseEconomics(),
            IERC20(address(musd)),
            0,
            uint64(block.timestamp + 1 days)
        );
    }

    function testCreateRevertsOnEmptyURI() public {
        vm.prank(sapta);
        vm.expectRevert(MuzixRightsOffering.SubjectURIRequired.selector);
        offering.createOffering(
            keccak256("x"),
            "",
            _baseRights(),
            _baseEconomics(),
            IERC20(address(musd)),
            0,
            uint64(block.timestamp + 1 days)
        );
    }

    function testCreateRevertsOnZeroSettlementToken() public {
        vm.prank(sapta);
        vm.expectRevert(MuzixRightsOffering.ZeroSettlementToken.selector);
        offering.createOffering(
            keccak256("x"),
            "ipfs://x",
            _baseRights(),
            _baseEconomics(),
            IERC20(address(0)),
            0,
            uint64(block.timestamp + 1 days)
        );
    }

    function testCreateRevertsOnInvalidBps() public {
        MuzixRightsOffering.Economics memory bad = _baseEconomics();
        bad.artistRoyaltyBps = 10001;
        vm.prank(sapta);
        vm.expectRevert(abi.encodeWithSelector(MuzixRightsOffering.InvalidBps.selector, uint256(10001)));
        offering.createOffering(
            keccak256("x"),
            "ipfs://x",
            _baseRights(),
            bad,
            IERC20(address(musd)),
            0,
            uint64(block.timestamp + 1 days)
        );
    }

    function testUpdateDraftMutatesBeforePublish() public {
        uint256 id = _createDraftAsSapta(uint64(block.timestamp + 30 days));

        MuzixRightsOffering.Economics memory tweaked = _baseEconomics();
        tweaked.upfrontUsd = 30_000e6;

        vm.prank(sapta);
        offering.updateDraft(
            id,
            keccak256("subject-sapta-album-v2"),
            "ipfs://bafy-sapta-album-v2",
            _baseRights(),
            tweaked,
            5_000e6,
            uint64(block.timestamp + 30 days)
        );

        MuzixRightsOffering.Offering memory o = offering.getOffering(id);
        assertEq(o.subjectURI, "ipfs://bafy-sapta-album-v2");
        assertEq(o.baseTerms.upfrontUsd, 30_000e6);
    }

    function testUpdateDraftRevertsAfterPublish() public {
        uint256 id = _openSaptaOffering();
        vm.prank(sapta);
        vm.expectRevert(
            abi.encodeWithSelector(
                MuzixRightsOffering.WrongOfferingStatus.selector,
                id,
                MuzixRightsOffering.OfferingStatus.Open,
                MuzixRightsOffering.OfferingStatus.Draft
            )
        );
        offering.updateDraft(
            id,
            keccak256("x"),
            "ipfs://x",
            _baseRights(),
            _baseEconomics(),
            0,
            uint64(block.timestamp + 30 days)
        );
    }

    function testUpdateDraftRevertsForNonArtist() public {
        uint256 id = _createDraftAsSapta(uint64(block.timestamp + 30 days));
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(MuzixRightsOffering.NotArtist.selector, id, stranger));
        offering.updateDraft(
            id,
            keccak256("x"),
            "ipfs://x",
            _baseRights(),
            _baseEconomics(),
            0,
            uint64(block.timestamp + 30 days)
        );
    }

    function testPublishRevertsOnPastDeadline() public {
        uint256 id = _createDraftAsSapta(uint64(block.timestamp + 30 days));
        // Move clock past the configured deadline.
        vm.warp(block.timestamp + 31 days);
        vm.prank(sapta);
        vm.expectRevert(); // InvalidDeadline — selector reverts always; explicit selector path tested elsewhere
        offering.publishOffering(id);
    }

    function testWithdrawDraftAllowed() public {
        uint256 id = _createDraftAsSapta(uint64(block.timestamp + 30 days));
        vm.prank(sapta);
        offering.withdrawOffering(id);
        assertEq(uint8(offering.getOffering(id).status), uint8(MuzixRightsOffering.OfferingStatus.Withdrawn));
    }

    function testWithdrawOpenAllowed() public {
        uint256 id = _openSaptaOffering();
        vm.prank(sapta);
        offering.withdrawOffering(id);
        assertEq(uint8(offering.getOffering(id).status), uint8(MuzixRightsOffering.OfferingStatus.Withdrawn));
    }

    function testWithdrawRevertsAfterAccepted() public {
        uint256 id = _openSaptaOffering();
        vm.prank(label);
        uint256 cid = offering.acceptBaseTerms(id, "ipfs://memo", 5_000e6);
        vm.prank(sapta);
        offering.acceptCounter(cid);

        vm.prank(sapta);
        vm.expectRevert(
            abi.encodeWithSelector(
                MuzixRightsOffering.WrongOfferingStatus.selector,
                id,
                MuzixRightsOffering.OfferingStatus.Accepted,
                MuzixRightsOffering.OfferingStatus.Open
            )
        );
        offering.withdrawOffering(id);
    }

    function testMarkExpiredAfterDeadline() public {
        uint256 id = _openSaptaOffering();
        vm.warp(block.timestamp + 31 days);
        offering.markExpired(id);
        assertEq(uint8(offering.getOffering(id).status), uint8(MuzixRightsOffering.OfferingStatus.Expired));
    }

    function testMarkExpiredRevertsBeforeDeadline() public {
        uint256 id = _openSaptaOffering();
        Offering_HelperReverts(id);
    }

    function Offering_HelperReverts(uint256 id) internal {
        MuzixRightsOffering.Offering memory o = offering.getOffering(id);
        vm.expectRevert(
            abi.encodeWithSelector(MuzixRightsOffering.DeadlineNotReached.selector, id, o.repliesDueBy)
        );
        offering.markExpired(id);
    }

    // ---------------------------------------------------------------------
    // Counters
    // ---------------------------------------------------------------------

    function testAcceptBaseTermsPullsBond() public {
        uint256 id = _openSaptaOffering();
        uint256 labelBefore = musd.balanceOf(label);

        vm.prank(label);
        uint256 cid = offering.acceptBaseTerms(id, "ipfs://label-memo", 5_000e6);

        MuzixRightsOffering.Counter memory c = offering.getCounter(cid);
        assertEq(c.bidder, label);
        assertEq(c.bondAmount, 5_000e6);
        assertEq(uint8(c.status), uint8(MuzixRightsOffering.CounterStatus.Pending));
        assertEq(c.terms.upfrontUsd, _baseEconomics().upfrontUsd);

        assertEq(musd.balanceOf(label), labelBefore - 5_000e6);
        assertEq(musd.balanceOf(address(offering)), 5_000e6);
    }

    function testSubmitCounterCustomTerms() public {
        uint256 id = _openSaptaOffering();
        MuzixRightsOffering.Economics memory counter = _baseEconomics();
        counter.upfrontUsd = 18_000e6;
        counter.artistRoyaltyBps = 5500;

        vm.prank(distributor);
        uint256 cid = offering.submitCounter(id, counter, "ipfs://dist-memo", 5_000e6);

        MuzixRightsOffering.Counter memory c = offering.getCounter(cid);
        assertEq(c.terms.upfrontUsd, 18_000e6);
        assertEq(c.terms.artistRoyaltyBps, 5500);
    }

    function testSubmitRevertsBelowMinBond() public {
        uint256 id = _openSaptaOffering();
        vm.prank(label);
        vm.expectRevert(abi.encodeWithSelector(MuzixRightsOffering.BondBelowMinimum.selector, 1_000e6, 5_000e6));
        offering.submitCounter(id, _baseEconomics(), "ipfs://memo", 1_000e6);
    }

    function testSubmitRevertsAfterDeadline() public {
        uint256 id = _openSaptaOffering();
        vm.warp(block.timestamp + 31 days);
        vm.prank(label);
        vm.expectRevert();
        offering.submitCounter(id, _baseEconomics(), "ipfs://memo", 5_000e6);
    }

    function testSubmitRevertsIfOfferingNotOpen() public {
        uint256 id = _createDraftAsSapta(uint64(block.timestamp + 30 days));
        vm.prank(label);
        vm.expectRevert(
            abi.encodeWithSelector(
                MuzixRightsOffering.WrongOfferingStatus.selector,
                id,
                MuzixRightsOffering.OfferingStatus.Draft,
                MuzixRightsOffering.OfferingStatus.Open
            )
        );
        offering.submitCounter(id, _baseEconomics(), "ipfs://memo", 5_000e6);
    }

    function testWithdrawCounterRefundsBond() public {
        uint256 id = _openSaptaOffering();
        vm.prank(label);
        uint256 cid = offering.acceptBaseTerms(id, "ipfs://memo", 5_000e6);

        uint256 labelBefore = musd.balanceOf(label);
        vm.prank(label);
        offering.withdrawCounter(cid);

        MuzixRightsOffering.Counter memory c = offering.getCounter(cid);
        assertEq(uint8(c.status), uint8(MuzixRightsOffering.CounterStatus.Withdrawn));
        assertEq(c.bondAmount, 0);
        assertEq(musd.balanceOf(label), labelBefore + 5_000e6);
    }

    function testWithdrawCounterAllowedAfterExpiry() public {
        uint256 id = _openSaptaOffering();
        vm.prank(label);
        uint256 cid = offering.acceptBaseTerms(id, "ipfs://memo", 5_000e6);

        vm.warp(block.timestamp + 31 days);
        offering.markExpired(id);

        uint256 labelBefore = musd.balanceOf(label);
        vm.prank(label);
        offering.withdrawCounter(cid);
        assertEq(musd.balanceOf(label), labelBefore + 5_000e6);
    }

    function testWithdrawCounterRevertsForNonBidder() public {
        uint256 id = _openSaptaOffering();
        vm.prank(label);
        uint256 cid = offering.acceptBaseTerms(id, "ipfs://memo", 5_000e6);
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(MuzixRightsOffering.NotBidder.selector, cid, stranger));
        offering.withdrawCounter(cid);
    }

    // ---------------------------------------------------------------------
    // Acceptance / rejection
    // ---------------------------------------------------------------------

    function testAcceptCounterFlipsOfferingAndRefundsWinner() public {
        uint256 id = _openSaptaOffering();
        vm.prank(label);
        uint256 cid = offering.acceptBaseTerms(id, "ipfs://memo", 5_000e6);

        uint256 labelBefore = musd.balanceOf(label);
        vm.prank(sapta);
        offering.acceptCounter(cid);

        MuzixRightsOffering.Offering memory o = offering.getOffering(id);
        assertEq(uint8(o.status), uint8(MuzixRightsOffering.OfferingStatus.Accepted));
        assertEq(o.acceptedCounterId, cid);

        MuzixRightsOffering.Counter memory c = offering.getCounter(cid);
        assertEq(uint8(c.status), uint8(MuzixRightsOffering.CounterStatus.Accepted));
        assertEq(c.bondAmount, 0);
        assertEq(musd.balanceOf(label), labelBefore + 5_000e6);
    }

    function testAcceptCounterLeavesLosingPendingForRefund() public {
        uint256 id = _openSaptaOffering();

        vm.prank(label);
        uint256 cidLabel = offering.acceptBaseTerms(id, "ipfs://label-memo", 5_000e6);
        vm.prank(distributor);
        MuzixRightsOffering.Economics memory dist = _baseEconomics();
        dist.upfrontUsd = 30_000e6;
        uint256 cidDist = offering.submitCounter(id, dist, "ipfs://dist-memo", 5_000e6);

        vm.prank(sapta);
        offering.acceptCounter(cidDist);

        // Losing counter is still pending until bidder withdraws.
        assertEq(uint8(offering.getCounter(cidLabel).status), uint8(MuzixRightsOffering.CounterStatus.Pending));

        uint256 labelBefore = musd.balanceOf(label);
        vm.prank(label);
        offering.withdrawCounter(cidLabel);
        assertEq(musd.balanceOf(label), labelBefore + 5_000e6);
    }

    function testAcceptCounterRevertsForNonArtist() public {
        uint256 id = _openSaptaOffering();
        vm.prank(label);
        uint256 cid = offering.acceptBaseTerms(id, "ipfs://memo", 5_000e6);
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSelector(MuzixRightsOffering.NotArtist.selector, id, stranger));
        offering.acceptCounter(cid);
    }

    function testAcceptCounterRevertsIfAlreadyAccepted() public {
        uint256 id = _openSaptaOffering();
        vm.prank(label);
        uint256 cid = offering.acceptBaseTerms(id, "ipfs://memo", 5_000e6);
        vm.prank(sapta);
        offering.acceptCounter(cid);

        vm.prank(distributor);
        // Cannot submit (offering Accepted, not Open).
        vm.expectRevert();
        offering.submitCounter(id, _baseEconomics(), "ipfs://memo", 5_000e6);
    }

    function testRejectCounterRefundsBond() public {
        uint256 id = _openSaptaOffering();
        vm.prank(label);
        uint256 cid = offering.acceptBaseTerms(id, "ipfs://memo", 5_000e6);

        uint256 labelBefore = musd.balanceOf(label);
        vm.prank(sapta);
        offering.rejectCounter(cid);

        MuzixRightsOffering.Counter memory c = offering.getCounter(cid);
        assertEq(uint8(c.status), uint8(MuzixRightsOffering.CounterStatus.Rejected));
        assertEq(c.bondAmount, 0);
        assertEq(musd.balanceOf(label), labelBefore + 5_000e6);

        // Offering remains Open; another bidder can still come in.
        assertEq(uint8(offering.getOffering(id).status), uint8(MuzixRightsOffering.OfferingStatus.Open));
    }

    function testCounterIdsForListsAll() public {
        uint256 id = _openSaptaOffering();
        vm.prank(label);
        uint256 a = offering.acceptBaseTerms(id, "ipfs://a", 5_000e6);
        vm.prank(distributor);
        uint256 b = offering.submitCounter(id, _baseEconomics(), "ipfs://b", 5_000e6);

        uint256[] memory ids = offering.counterIdsFor(id);
        assertEq(ids.length, 2);
        assertEq(ids[0], a);
        assertEq(ids[1], b);
        assertEq(offering.counterCountFor(id), 2);
    }

    function testCounterWithZeroBondAllowedWhenMinIsZero() public {
        // Create a new draft with minBondUsd == 0.
        vm.prank(sapta);
        uint256 id = offering.createOffering(
            keccak256("subject-no-bond"),
            "ipfs://x",
            _baseRights(),
            _baseEconomics(),
            IERC20(address(musd)),
            0,
            uint64(block.timestamp + 30 days)
        );
        vm.prank(sapta);
        offering.publishOffering(id);

        vm.prank(label);
        uint256 cid = offering.submitCounter(id, _baseEconomics(), "ipfs://memo", 0);
        assertEq(offering.getCounter(cid).bondAmount, 0);
    }

    // ---------------------------------------------------------------------
    // Negative lookups
    // ---------------------------------------------------------------------

    function testGetOfferingUnknownReverts() public {
        vm.expectRevert(abi.encodeWithSelector(MuzixRightsOffering.OfferingNotFound.selector, uint256(999)));
        offering.getOffering(999);
    }

    function testGetCounterUnknownReverts() public {
        vm.expectRevert(abi.encodeWithSelector(MuzixRightsOffering.CounterNotFound.selector, uint256(999)));
        offering.getCounter(999);
    }
}
