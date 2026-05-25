// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title  MuzixRightsOffering
 * @author kcolbchain
 * @notice On-chain "term sheet" registry. An artist publishes a draft offering
 *         of distribution / sync / master-licensing / publishing rights — for a
 *         single asset or a whole catalogue — with base economics. Labels,
 *         IP buyers, distributors, and sync agencies submit counters: either
 *         accept the base outright, or propose modified economics with an
 *         off-chain memo. Each counter may post a refundable MUSD bond as
 *         earnest. The artist picks one counter to accept; the on-chain
 *         record is the commitment, and downstream settlement contracts
 *         consume it for payment and rights-transfer execution.
 *
 *         The contract intentionally tracks only the commitment surface:
 *           - Draft authoring + open publication.
 *           - Counter intake with optional bonded earnest.
 *           - Acceptance / withdrawal / expiry lifecycle.
 *           - Bond escrow + refund flows.
 *
 *         Out of scope (downstream contracts wire these against an accepted
 *         offering's terms):
 *           - Upfront / minimum-guarantee payment execution.
 *           - Royalty stream settlement (handled by MUSD / oracle).
 *           - KYC / accreditation gating of bidders.
 *           - Rights NFT issuance (an accepted offering id is itself the
 *             canonical on-chain commitment reference).
 *
 *         All monetary fields are denominated in the offering's settlement
 *         token (MUSD by convention) with that token's native decimals.
 */
contract MuzixRightsOffering is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // -----------------------------------------------------------------------
    // Types
    // -----------------------------------------------------------------------

    enum RightsType {
        Distribution,
        Sync,
        MasterLicense,
        Publishing,
        FullRights
    }

    enum OfferingStatus {
        Draft,
        Open,
        Accepted,
        Withdrawn,
        Expired
    }

    enum CounterStatus {
        Pending,
        Accepted,
        Rejected,
        Withdrawn
    }

    /// @notice Scope of rights being licensed. `termSeconds == 0` means
    ///         perpetual; `territoryHash == 0` means worldwide.
    struct RightsBundle {
        RightsType rightsType;
        bool exclusive;
        bytes32 territoryHash;
        uint64 termSeconds;
    }

    /// @notice Economic terms — base terms set by the artist; counters
    ///         propose alternates of the same shape.
    struct Economics {
        uint256 upfrontUsd;
        uint256 minGuaranteeUsd;
        uint16 artistRoyaltyBps;
        uint256 advanceRecoupCapUsd;
    }

    struct Offering {
        address artist;
        bytes32 subjectHash;
        string subjectURI;
        RightsBundle rights;
        Economics baseTerms;
        IERC20 settlementToken;
        uint256 minBondUsd;
        uint64 repliesDueBy;
        uint64 createdAt;
        OfferingStatus status;
        uint256 acceptedCounterId;
    }

    struct Counter {
        uint256 offeringId;
        address bidder;
        Economics terms;
        string memoURI;
        uint256 bondAmount;
        CounterStatus status;
        uint64 submittedAt;
    }

    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------

    uint16 public constant BPS_DENOM = 10000;

    // -----------------------------------------------------------------------
    // Storage
    // -----------------------------------------------------------------------

    uint256 public nextOfferingId = 1;
    uint256 public nextCounterId = 1;

    mapping(uint256 => Offering) internal _offerings;
    mapping(uint256 => Counter) internal _counters;
    mapping(uint256 => uint256[]) internal _offeringCounters;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event OfferingCreated(uint256 indexed offeringId, address indexed artist, bytes32 subjectHash, string subjectURI);
    event OfferingDraftUpdated(uint256 indexed offeringId);
    event OfferingPublished(uint256 indexed offeringId, uint64 repliesDueBy);
    event OfferingWithdrawn(uint256 indexed offeringId);
    event OfferingExpired(uint256 indexed offeringId);

    event CounterSubmitted(
        uint256 indexed counterId,
        uint256 indexed offeringId,
        address indexed bidder,
        bool acceptedBaseTerms,
        uint256 bondAmount
    );
    event CounterWithdrawn(uint256 indexed counterId);
    event CounterAccepted(uint256 indexed counterId, uint256 indexed offeringId);
    event CounterRejected(uint256 indexed counterId);
    event BondRefunded(uint256 indexed counterId, address indexed bidder, uint256 amount);

    // -----------------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------------

    error NotArtist(uint256 offeringId, address caller);
    error NotBidder(uint256 counterId, address caller);
    error OfferingNotFound(uint256 offeringId);
    error CounterNotFound(uint256 counterId);
    error WrongOfferingStatus(uint256 offeringId, OfferingStatus current, OfferingStatus required);
    error WrongCounterStatus(uint256 counterId, CounterStatus current);
    error InvalidBps(uint256 bps);
    error InvalidDeadline(uint64 repliesDueBy, uint256 nowTs);
    error DeadlinePassed(uint256 offeringId, uint64 repliesDueBy);
    error DeadlineNotReached(uint256 offeringId, uint64 repliesDueBy);
    error BondBelowMinimum(uint256 provided, uint256 required);
    error SubjectURIRequired();
    error SubjectHashRequired();
    error ZeroSettlementToken();

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------

    modifier onlyArtist(uint256 offeringId) {
        Offering storage o = _offerings[offeringId];
        if (o.artist == address(0)) revert OfferingNotFound(offeringId);
        if (o.artist != msg.sender) revert NotArtist(offeringId, msg.sender);
        _;
    }

    // -----------------------------------------------------------------------
    // Authoring & lifecycle
    // -----------------------------------------------------------------------

    /**
     * @notice Create a new draft offering. Caller becomes the artist.
     *         The draft is not visible to bidders until `publish` is called.
     */
    function createOffering(
        bytes32 subjectHash,
        string calldata subjectURI,
        RightsBundle calldata rights,
        Economics calldata baseTerms,
        IERC20 settlementToken,
        uint256 minBondUsd,
        uint64 repliesDueBy
    ) external returns (uint256 offeringId) {
        if (subjectHash == bytes32(0)) revert SubjectHashRequired();
        if (bytes(subjectURI).length == 0) revert SubjectURIRequired();
        if (address(settlementToken) == address(0)) revert ZeroSettlementToken();
        if (baseTerms.artistRoyaltyBps > BPS_DENOM) revert InvalidBps(baseTerms.artistRoyaltyBps);

        offeringId = nextOfferingId++;
        Offering storage o = _offerings[offeringId];
        o.artist = msg.sender;
        o.subjectHash = subjectHash;
        o.subjectURI = subjectURI;
        o.rights = rights;
        o.baseTerms = baseTerms;
        o.settlementToken = settlementToken;
        o.minBondUsd = minBondUsd;
        o.repliesDueBy = repliesDueBy;
        o.createdAt = uint64(block.timestamp);
        o.status = OfferingStatus.Draft;

        emit OfferingCreated(offeringId, msg.sender, subjectHash, subjectURI);
    }

    /**
     * @notice Edit a draft offering. Only allowed while in `Draft` state;
     *         once published, the artist must withdraw and republish.
     */
    function updateDraft(
        uint256 offeringId,
        bytes32 subjectHash,
        string calldata subjectURI,
        RightsBundle calldata rights,
        Economics calldata baseTerms,
        uint256 minBondUsd,
        uint64 repliesDueBy
    ) external onlyArtist(offeringId) {
        Offering storage o = _offerings[offeringId];
        if (o.status != OfferingStatus.Draft) {
            revert WrongOfferingStatus(offeringId, o.status, OfferingStatus.Draft);
        }
        if (subjectHash == bytes32(0)) revert SubjectHashRequired();
        if (bytes(subjectURI).length == 0) revert SubjectURIRequired();
        if (baseTerms.artistRoyaltyBps > BPS_DENOM) revert InvalidBps(baseTerms.artistRoyaltyBps);

        o.subjectHash = subjectHash;
        o.subjectURI = subjectURI;
        o.rights = rights;
        o.baseTerms = baseTerms;
        o.minBondUsd = minBondUsd;
        o.repliesDueBy = repliesDueBy;

        emit OfferingDraftUpdated(offeringId);
    }

    /**
     * @notice Move a draft offering to `Open`, making it eligible to receive
     *         counters. Deadline must be in the future.
     */
    function publishOffering(uint256 offeringId) external onlyArtist(offeringId) {
        Offering storage o = _offerings[offeringId];
        if (o.status != OfferingStatus.Draft) {
            revert WrongOfferingStatus(offeringId, o.status, OfferingStatus.Draft);
        }
        if (o.repliesDueBy <= block.timestamp) {
            revert InvalidDeadline(o.repliesDueBy, block.timestamp);
        }
        o.status = OfferingStatus.Open;
        emit OfferingPublished(offeringId, o.repliesDueBy);
    }

    /**
     * @notice Cancel an offering. Allowed in `Draft` or `Open`. Any pending
     *         counters become bond-refundable via `withdrawCounter`.
     */
    function withdrawOffering(uint256 offeringId) external onlyArtist(offeringId) {
        Offering storage o = _offerings[offeringId];
        if (o.status != OfferingStatus.Draft && o.status != OfferingStatus.Open) {
            revert WrongOfferingStatus(offeringId, o.status, OfferingStatus.Open);
        }
        o.status = OfferingStatus.Withdrawn;
        emit OfferingWithdrawn(offeringId);
    }

    /**
     * @notice Mark a passed-deadline open offering as expired. Permissionless
     *         so any bidder can clear the way for bond refunds without
     *         depending on the artist to do bookkeeping.
     */
    function markExpired(uint256 offeringId) external {
        Offering storage o = _offerings[offeringId];
        if (o.artist == address(0)) revert OfferingNotFound(offeringId);
        if (o.status != OfferingStatus.Open) {
            revert WrongOfferingStatus(offeringId, o.status, OfferingStatus.Open);
        }
        if (block.timestamp <= o.repliesDueBy) revert DeadlineNotReached(offeringId, o.repliesDueBy);
        o.status = OfferingStatus.Expired;
        emit OfferingExpired(offeringId);
    }

    // -----------------------------------------------------------------------
    // Counters
    // -----------------------------------------------------------------------

    /**
     * @notice Submit a counter with custom economics. Pulls `bondAmount` of
     *         the offering's settlement token from the caller (must be
     *         pre-approved). Counter is held in escrow and refundable via
     *         `withdrawCounter` until the offering closes.
     */
    function submitCounter(
        uint256 offeringId,
        Economics calldata terms,
        string calldata memoURI,
        uint256 bondAmount
    ) external nonReentrant returns (uint256 counterId) {
        return _submitCounter(offeringId, terms, memoURI, bondAmount, false);
    }

    /**
     * @notice Shortcut: submit a counter that exactly matches the artist's
     *         base terms. Equivalent to `submitCounter(offeringId, base, memo, bond)`
     *         but the counter is flagged as "accepted base" in its event, so
     *         downstream UIs can group these distinctly from price-discovery
     *         counters.
     */
    function acceptBaseTerms(uint256 offeringId, string calldata memoURI, uint256 bondAmount)
        external
        nonReentrant
        returns (uint256 counterId)
    {
        Offering storage o = _offerings[offeringId];
        if (o.artist == address(0)) revert OfferingNotFound(offeringId);
        Economics memory base = o.baseTerms;
        return _submitCounter(offeringId, base, memoURI, bondAmount, true);
    }

    function _submitCounter(
        uint256 offeringId,
        Economics memory terms,
        string memory memoURI,
        uint256 bondAmount,
        bool acceptedBase
    ) internal returns (uint256 counterId) {
        Offering storage o = _offerings[offeringId];
        if (o.artist == address(0)) revert OfferingNotFound(offeringId);
        if (o.status != OfferingStatus.Open) {
            revert WrongOfferingStatus(offeringId, o.status, OfferingStatus.Open);
        }
        if (block.timestamp > o.repliesDueBy) revert DeadlinePassed(offeringId, o.repliesDueBy);
        if (terms.artistRoyaltyBps > BPS_DENOM) revert InvalidBps(terms.artistRoyaltyBps);
        if (bondAmount < o.minBondUsd) revert BondBelowMinimum(bondAmount, o.minBondUsd);

        counterId = nextCounterId++;
        Counter storage c = _counters[counterId];
        c.offeringId = offeringId;
        c.bidder = msg.sender;
        c.terms = terms;
        c.memoURI = memoURI;
        c.bondAmount = bondAmount;
        c.status = CounterStatus.Pending;
        c.submittedAt = uint64(block.timestamp);

        _offeringCounters[offeringId].push(counterId);

        if (bondAmount > 0) {
            o.settlementToken.safeTransferFrom(msg.sender, address(this), bondAmount);
        }

        emit CounterSubmitted(counterId, offeringId, msg.sender, acceptedBase, bondAmount);
    }

    /**
     * @notice Bidder withdraws their pending counter. Bond refunded.
     *         Allowed regardless of the parent offering's current status, so
     *         bidders can recover their bond after expiry or withdrawal.
     */
    function withdrawCounter(uint256 counterId) external nonReentrant {
        Counter storage c = _counters[counterId];
        if (c.bidder == address(0)) revert CounterNotFound(counterId);
        if (c.bidder != msg.sender) revert NotBidder(counterId, msg.sender);
        if (c.status != CounterStatus.Pending) revert WrongCounterStatus(counterId, c.status);

        c.status = CounterStatus.Withdrawn;
        emit CounterWithdrawn(counterId);
        _refundBond(counterId);
    }

    /**
     * @notice Artist accepts a counter. The offering flips to `Accepted` and
     *         the accepted counter's `acceptedCounterId` is recorded.
     *         Losing counters remain `Pending` until their bidders call
     *         `withdrawCounter` to recover their bonds.
     *
     * @dev The accepted counter's bond is also refunded to the bidder. The
     *      bond is purely earnest; upfront settlement is handled by a
     *      downstream contract that reads `acceptedCounterId`.
     */
    function acceptCounter(uint256 counterId) external nonReentrant {
        Counter storage c = _counters[counterId];
        if (c.bidder == address(0)) revert CounterNotFound(counterId);

        uint256 offeringId = c.offeringId;
        Offering storage o = _offerings[offeringId];
        if (o.artist != msg.sender) revert NotArtist(offeringId, msg.sender);
        if (o.status != OfferingStatus.Open) {
            revert WrongOfferingStatus(offeringId, o.status, OfferingStatus.Open);
        }
        if (c.status != CounterStatus.Pending) revert WrongCounterStatus(counterId, c.status);

        c.status = CounterStatus.Accepted;
        o.status = OfferingStatus.Accepted;
        o.acceptedCounterId = counterId;

        emit CounterAccepted(counterId, offeringId);
        _refundBond(counterId);
    }

    /**
     * @notice Artist explicitly rejects a counter. Bond refunded. Other
     *         counters remain pending and the offering remains `Open` for
     *         further submissions until the deadline.
     */
    function rejectCounter(uint256 counterId) external nonReentrant {
        Counter storage c = _counters[counterId];
        if (c.bidder == address(0)) revert CounterNotFound(counterId);

        uint256 offeringId = c.offeringId;
        Offering storage o = _offerings[offeringId];
        if (o.artist != msg.sender) revert NotArtist(offeringId, msg.sender);
        if (c.status != CounterStatus.Pending) revert WrongCounterStatus(counterId, c.status);

        c.status = CounterStatus.Rejected;
        emit CounterRejected(counterId);
        _refundBond(counterId);
    }

    function _refundBond(uint256 counterId) internal {
        Counter storage c = _counters[counterId];
        uint256 amount = c.bondAmount;
        if (amount == 0) return;
        c.bondAmount = 0;
        _offerings[c.offeringId].settlementToken.safeTransfer(c.bidder, amount);
        emit BondRefunded(counterId, c.bidder, amount);
    }

    // -----------------------------------------------------------------------
    // Reads
    // -----------------------------------------------------------------------

    function getOffering(uint256 offeringId) external view returns (Offering memory) {
        Offering storage o = _offerings[offeringId];
        if (o.artist == address(0)) revert OfferingNotFound(offeringId);
        return o;
    }

    function getCounter(uint256 counterId) external view returns (Counter memory) {
        Counter storage c = _counters[counterId];
        if (c.bidder == address(0)) revert CounterNotFound(counterId);
        return c;
    }

    function counterIdsFor(uint256 offeringId) external view returns (uint256[] memory) {
        return _offeringCounters[offeringId];
    }

    function counterCountFor(uint256 offeringId) external view returns (uint256) {
        return _offeringCounters[offeringId].length;
    }
}
