// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

/**
 * @title  MuzixStreamingOracle
 * @author kcolbchain
 * @notice On-chain streaming-revenue feed for music catalogs. Authorized
 *         pushers submit per-(catalog, DSP, period) revenue records produced
 *         off-chain by the Muzix oracle node network. Consumers (e.g. an MUSD
 *         royalty distributor) read the latest verified data per catalog to
 *         trigger settlement.
 *
 *         This contract implements the consumer-facing surface of
 *         `oracle/SPECIFICATION.md` Phase 1 (MVP):
 *           - Per-DSP registry with per-DSP min-confidence override.
 *           - Authorized pusher set (off-chain consensus is enforced by the
 *             node network; this contract trusts the post-consensus push).
 *           - Per-submission confidence floor (default 7500 bps) and
 *             freshness window (default 24h) — both admin-configurable.
 *           - Per-pusher submission cooldown (default 1h) per spec §2.
 *           - Append-only history for off-chain auditability; latest pointer
 *             per catalog and per (catalog, dsp) for cheap on-chain reads.
 *           - Pausable circuit breaker (spec §3 "Fail-Safes").
 *
 *         Out of scope for this contract (tracked separately):
 *           - On-chain node staking, slashing, and consensus aggregation.
 *           - Chainlink fallback wiring.
 *           - Dispute / challenge windows.
 *           - Cross-chain delivery.
 *
 *         Revenue is denominated in USD with 6 decimals — same convention
 *         the off-chain pipeline emits and downstream MUSD payouts consume.
 */
contract MuzixStreamingOracle is Ownable, Pausable {
    // -----------------------------------------------------------------------
    // Constants
    // -----------------------------------------------------------------------

    /// @notice Basis-points denominator for confidence scores.
    uint256 public constant CONFIDENCE_BASIS = 10000;

    /// @notice Default minimum acceptable confidence score (75% per spec).
    uint256 public constant DEFAULT_MIN_CONFIDENCE = 7500;

    /// @notice Default freshness window for `isDataFresh` (24h per spec).
    uint256 public constant DEFAULT_FRESHNESS_WINDOW = 24 hours;

    /// @notice Per-pusher submission cooldown (spec §2 "Rate limiting").
    uint256 public constant SUBMISSION_COOLDOWN = 1 hours;

    // -----------------------------------------------------------------------
    // Types
    // -----------------------------------------------------------------------

    /// @notice Per-(catalog, DSP, period) verified revenue record. Layout
    ///         tracks `oracle/SPECIFICATION.md` §"Data Schema" exactly so
    ///         off-chain producers can re-encode without surprises.
    struct StreamingRevenue {
        bytes32 catalogId;
        bytes32 dspId;
        uint256 totalStreams;
        uint256 revenueUsd;
        uint256 periodStart;
        uint256 periodEnd;
        bytes32 territoryHash;
        bytes32 dataSourceHash;
        uint256 lastUpdated;
        uint256 confidenceScore;
    }

    /// @notice DSP registry entry. `minConfidenceScore == 0` falls back to
    ///         `DEFAULT_MIN_CONFIDENCE` at submission time so admins can
    ///         opt into the default without an explicit write.
    struct DSPInfo {
        bytes32 dspId;
        string name;
        uint256 weight;
        bool isActive;
        uint256 minConfidenceScore;
    }

    // -----------------------------------------------------------------------
    // Storage
    // -----------------------------------------------------------------------

    /// @notice Freshness window used by `isDataFresh`. Admin-configurable so
    ///         long-tail catalogs (monthly settlement) can opt into a wider
    ///         window without re-deploying.
    uint256 public freshnessWindow;

    mapping(bytes32 => DSPInfo) internal _dsps;
    bytes32[] internal _dspIds;
    mapping(bytes32 => bool) internal _dspRegistered;

    mapping(address => bool) public isPusher;
    mapping(address => uint256) public lastSubmissionAt;

    // catalog → dsp → latest record for that (catalog, DSP) pair.
    mapping(bytes32 => mapping(bytes32 => StreamingRevenue)) internal _latestByDsp;
    // catalog → most-recently-updated record across all DSPs.
    mapping(bytes32 => StreamingRevenue) internal _latest;
    // catalog → append-only history (one entry per accepted submission).
    mapping(bytes32 => StreamingRevenue[]) internal _history;
    // catalog → has at least one accepted record (distinguishes "never seen"
    // from "all-zero record").
    mapping(bytes32 => bool) internal _hasRecord;

    // -----------------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------------

    event RevenueUpdated(
        bytes32 indexed catalogId,
        bytes32 indexed dspId,
        uint256 revenueUsd,
        uint256 confidenceScore,
        uint256 periodEnd,
        uint256 timestamp
    );

    event DSPRegistered(bytes32 indexed dspId, string name, uint256 weight, uint256 minConfidenceScore);

    event DSPUpdated(bytes32 indexed dspId, uint256 weight, bool isActive, uint256 minConfidenceScore);

    event PusherUpdated(address indexed pusher, bool authorized);

    event FreshnessWindowUpdated(uint256 oldWindow, uint256 newWindow);

    event SubscribedToUpdates(bytes32 indexed catalogId, address indexed subscriber);

    // -----------------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------------

    error NotPusher(address caller);
    error CatalogIdRequired();
    error DspIdRequired();
    error DSPNotRegistered(bytes32 dspId);
    error DSPAlreadyRegistered(bytes32 dspId);
    error DSPInactive(bytes32 dspId);
    error InvalidPeriod(uint256 periodStart, uint256 periodEnd);
    error PeriodInFuture(uint256 periodEnd, uint256 nowTs);
    error ConfidenceOutOfRange(uint256 confidenceScore);
    error ConfidenceTooLow(uint256 got, uint256 min);
    error CooldownActive(address pusher, uint256 nextAllowed);
    error EmptyBatch();
    error ZeroAddress();
    error HistoryIndexOutOfBounds(uint256 idx, uint256 length);

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    constructor(address initialOwner) Ownable(initialOwner) {
        if (initialOwner == address(0)) revert ZeroAddress();
        freshnessWindow = DEFAULT_FRESHNESS_WINDOW;
    }

    // -----------------------------------------------------------------------
    // Modifiers
    // -----------------------------------------------------------------------

    modifier onlyPusher() {
        if (!isPusher[msg.sender]) revert NotPusher(msg.sender);
        _;
    }

    // -----------------------------------------------------------------------
    // Admin — DSP registry
    // -----------------------------------------------------------------------

    /**
     * @notice Register a new DSP. `minConfidenceScore` may be `0` to inherit
     *         `DEFAULT_MIN_CONFIDENCE` at submission time.
     */
    function registerDSP(bytes32 dspId, string calldata name, uint256 weight, uint256 minConfidenceScore)
        external
        onlyOwner
    {
        if (dspId == bytes32(0)) revert DspIdRequired();
        if (_dspRegistered[dspId]) revert DSPAlreadyRegistered(dspId);
        if (minConfidenceScore > CONFIDENCE_BASIS) revert ConfidenceOutOfRange(minConfidenceScore);

        _dsps[dspId] = DSPInfo({
            dspId: dspId,
            name: name,
            weight: weight,
            isActive: true,
            minConfidenceScore: minConfidenceScore
        });
        _dspIds.push(dspId);
        _dspRegistered[dspId] = true;

        emit DSPRegistered(dspId, name, weight, minConfidenceScore);
    }

    /**
     * @notice Update an existing DSP's weight, active flag, or min-confidence.
     */
    function updateDSP(bytes32 dspId, uint256 weight, bool isActive, uint256 minConfidenceScore) external onlyOwner {
        if (!_dspRegistered[dspId]) revert DSPNotRegistered(dspId);
        if (minConfidenceScore > CONFIDENCE_BASIS) revert ConfidenceOutOfRange(minConfidenceScore);

        DSPInfo storage info = _dsps[dspId];
        info.weight = weight;
        info.isActive = isActive;
        info.minConfidenceScore = minConfidenceScore;

        emit DSPUpdated(dspId, weight, isActive, minConfidenceScore);
    }

    // -----------------------------------------------------------------------
    // Admin — pushers & circuit breaker
    // -----------------------------------------------------------------------

    function setPusher(address pusher, bool authorized) external onlyOwner {
        if (pusher == address(0)) revert ZeroAddress();
        isPusher[pusher] = authorized;
        emit PusherUpdated(pusher, authorized);
    }

    function setFreshnessWindow(uint256 newWindow) external onlyOwner {
        uint256 old = freshnessWindow;
        freshnessWindow = newWindow;
        emit FreshnessWindowUpdated(old, newWindow);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    // -----------------------------------------------------------------------
    // Submission
    // -----------------------------------------------------------------------

    /**
     * @notice Submit a single verified revenue record. The off-chain node
     *         network is expected to have already reached consensus; this
     *         contract enforces only on-chain invariants (registry, confidence
     *         floor, period sanity, pusher auth, cooldown).
     */
    function submitRevenue(StreamingRevenue calldata data) external whenNotPaused onlyPusher {
        _checkCooldown(msg.sender);
        _submit(data);
        lastSubmissionAt[msg.sender] = block.timestamp;
    }

    /**
     * @notice Batch variant. Cooldown is applied once for the whole batch
     *         (a batch is one logical aggregation round per spec §"Consensus
     *         Mechanism"), so a pusher can land an arbitrary number of
     *         records per round without artificially serialising them.
     */
    function batchSubmitRevenue(StreamingRevenue[] calldata updates) external whenNotPaused onlyPusher {
        if (updates.length == 0) revert EmptyBatch();
        _checkCooldown(msg.sender);
        for (uint256 i = 0; i < updates.length; i++) {
            _submit(updates[i]);
        }
        lastSubmissionAt[msg.sender] = block.timestamp;
    }

    function _checkCooldown(address pusher) internal view {
        uint256 last = lastSubmissionAt[pusher];
        if (last == 0) return;
        uint256 nextAllowed = last + SUBMISSION_COOLDOWN;
        if (block.timestamp < nextAllowed) revert CooldownActive(pusher, nextAllowed);
    }

    function _submit(StreamingRevenue calldata data) internal {
        if (data.catalogId == bytes32(0)) revert CatalogIdRequired();
        if (data.dspId == bytes32(0)) revert DspIdRequired();
        if (!_dspRegistered[data.dspId]) revert DSPNotRegistered(data.dspId);

        DSPInfo memory dsp = _dsps[data.dspId];
        if (!dsp.isActive) revert DSPInactive(data.dspId);

        if (data.confidenceScore > CONFIDENCE_BASIS) revert ConfidenceOutOfRange(data.confidenceScore);
        uint256 minConf = dsp.minConfidenceScore == 0 ? DEFAULT_MIN_CONFIDENCE : dsp.minConfidenceScore;
        if (data.confidenceScore < minConf) revert ConfidenceTooLow(data.confidenceScore, minConf);

        if (data.periodStart >= data.periodEnd) revert InvalidPeriod(data.periodStart, data.periodEnd);
        if (data.periodEnd > block.timestamp) revert PeriodInFuture(data.periodEnd, block.timestamp);

        // Stamp lastUpdated server-side so the on-chain record is canonical
        // and off-chain clocks can't desync the freshness window.
        StreamingRevenue memory rec = data;
        rec.lastUpdated = block.timestamp;

        _latestByDsp[rec.catalogId][rec.dspId] = rec;
        _latest[rec.catalogId] = rec;
        _hasRecord[rec.catalogId] = true;
        _history[rec.catalogId].push(rec);

        emit RevenueUpdated(rec.catalogId, rec.dspId, rec.revenueUsd, rec.confidenceScore, rec.periodEnd, rec.lastUpdated);
    }

    // -----------------------------------------------------------------------
    // Consumer reads
    // -----------------------------------------------------------------------

    /**
     * @notice Most recently submitted record for a catalog (across all DSPs).
     *         Returns a zeroed struct if no record has ever been accepted —
     *         pair with `hasRecord` to disambiguate.
     */
    function getLatestRevenue(bytes32 catalogId) external view returns (StreamingRevenue memory) {
        return _latest[catalogId];
    }

    /**
     * @notice Most recently submitted record for a specific (catalog, DSP).
     */
    function getLatestRevenueByDsp(bytes32 catalogId, bytes32 dspId)
        external
        view
        returns (StreamingRevenue memory)
    {
        return _latestByDsp[catalogId][dspId];
    }

    /**
     * @notice Sum of `revenueUsd` over every historical record for this
     *         catalog whose `[periodStart, periodEnd]` is fully contained
     *         within the queried window.
     * @dev    Iterates the full history for `catalogId`. Intended for
     *         off-chain RPC consumers; on-chain callers should prefer
     *         `_latestByDsp` lookups or event indexing to avoid unbounded gas.
     */
    function getRevenueForPeriod(bytes32 catalogId, uint256 periodStart, uint256 periodEnd)
        external
        view
        returns (uint256 totalRevenue)
    {
        StreamingRevenue[] storage h = _history[catalogId];
        for (uint256 i = 0; i < h.length; i++) {
            if (h[i].periodStart >= periodStart && h[i].periodEnd <= periodEnd) {
                totalRevenue += h[i].revenueUsd;
            }
        }
    }

    /**
     * @notice True if the latest record for `catalogId` is within
     *         `freshnessWindow` seconds of `block.timestamp`.
     */
    function isDataFresh(bytes32 catalogId) external view returns (bool) {
        if (!_hasRecord[catalogId]) return false;
        return block.timestamp - _latest[catalogId].lastUpdated <= freshnessWindow;
    }

    /**
     * @notice Off-chain indexers can pre-filter their watch list by listening
     *         for `SubscribedToUpdates`. Pure on-chain bookkeeping — no
     *         callback, no storage write — so subscribing is gas-cheap and
     *         carries no economic commitment.
     */
    function subscribeToUpdates(bytes32 catalogId) external {
        if (catalogId == bytes32(0)) revert CatalogIdRequired();
        emit SubscribedToUpdates(catalogId, msg.sender);
    }

    // -----------------------------------------------------------------------
    // Introspection
    // -----------------------------------------------------------------------

    function hasRecord(bytes32 catalogId) external view returns (bool) {
        return _hasRecord[catalogId];
    }

    function historyLength(bytes32 catalogId) external view returns (uint256) {
        return _history[catalogId].length;
    }

    function historyAt(bytes32 catalogId, uint256 idx) external view returns (StreamingRevenue memory) {
        StreamingRevenue[] storage h = _history[catalogId];
        if (idx >= h.length) revert HistoryIndexOutOfBounds(idx, h.length);
        return h[idx];
    }

    function dspCount() external view returns (uint256) {
        return _dspIds.length;
    }

    function dspIdAt(uint256 idx) external view returns (bytes32) {
        return _dspIds[idx];
    }

    function getDSP(bytes32 dspId) external view returns (DSPInfo memory) {
        return _dsps[dspId];
    }

    function isDSPRegistered(bytes32 dspId) external view returns (bool) {
        return _dspRegistered[dspId];
    }
}
