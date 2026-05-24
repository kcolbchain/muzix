// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title  Labelton
 * @author kcolbchain — Patty + Abhi
 * @notice The rights-tokenization product of the Muzix protocol.
 *
 *         A *Master* is the canonical rights record for a piece of music. It
 *         anchors the industry's legal identifiers (ISRC, UPC, ISWC), commits
 *         to off-chain MIR / legal / financial-ID payloads by content-hash,
 *         and pins an immutable cap-table.
 *
 *         A *Variant* is an ERC-1155 token class derived from a master
 *         (Master, Single, Album, Remix, Stem, SyncEdit, Cover, Instrumental,
 *         Live, Other). Every variant mints `VARIANT_SUPPLY_BPS` (10000)
 *         units, fanned across the master's cap-table in proportion to each
 *         holder's basis-point share. ERC-1155 balance IS the share — no
 *         parallel cap-table mapping needed.
 *
 *         Issuance is *wallet-sovereign*: the artist or any cap-table member
 *         calls `registerMaster` / `mintVariant` directly. The protocol owner
 *         (Muzix DAO) does not gate issuance — it only configures which
 *         variant kinds are mintable, the verifier addresses, and the pause
 *         switch.
 *
 *         The root mint of a master always lands at the same set of wallet
 *         holders defined by the cap-table; variants of that master inherit
 *         the cap-table by construction.
 *
 *         Off-chain payloads (MIR fingerprint, legal-entity dossier,
 *         financial-routing record) are referenced by content-hash; the
 *         on-chain record commits to those hashes at master registration and
 *         is immutable thereafter. Replacing a hash means registering a new
 *         master.
 */
contract Labelton is ERC1155, ReentrancyGuard, Ownable {
    /// @notice ERC-1155 supply per variant — matches basis-point granularity
    ///         (100% == 10000). Each cap-table holder receives a balance equal
    ///         to their basis-point share.
    uint256 public constant VARIANT_SUPPLY_BPS = 10_000;
    uint16 public constant TOTAL_BPS = 10_000;

    /// @notice Hard cap on cap-table entries per master. Keeps registration
    ///         gas bounded.
    uint256 public constant MAX_CAP_TABLE = 64;

    /// @dev The kinds a Variant may take. The DAO toggles which are mintable
    ///      via `setVariantKindAllowed`. `Master` is mintable by default — it
    ///      is the root mint issued at `registerMaster`.
    enum VariantKind {
        Master,
        Single,
        Album,
        Remix,
        Stem,
        SyncEdit,
        Cover,
        Instrumental,
        Live,
        Other
    }

    struct Master {
        bool exists;
        bytes32 dataHash;
        string isrcRoot;
        string upc;
        string iswc;
        bytes32 mirHash;
        bytes32 legalIdHash;
        bytes32 financialIdHash;
        address registrant;
        uint64 createdAt;
    }

    struct CapTableEntry {
        address holder;
        uint16 shareBps;
    }

    struct Variant {
        bool exists;
        uint256 masterId;
        VariantKind kind;
        string isrc;
        string uri;
        address minter;
        uint64 mintedAt;
    }

    /// @dev Calldata wrapper for `registerMaster` to keep the stack shallow.
    ///      Inlining these as positional args overflows the EVM's 16-slot
    ///      local-variable budget when the event emit is reached.
    struct MasterParams {
        string isrcRoot;
        string upc;
        string iswc;
        bytes32 mirHash;
        bytes32 legalIdHash;
        bytes32 financialIdHash;
    }

    uint256 public nextMasterId = 1;
    uint256 public nextVariantId = 1;

    mapping(uint256 => Master) public masters;
    mapping(uint256 => CapTableEntry[]) internal _capTables;
    mapping(uint256 => Variant) public variants;

    mapping(string => uint256) public masterByIsrcRoot;
    mapping(string => uint256) public masterByUpc;
    mapping(string => uint256) public masterByIswc;
    mapping(string => uint256) public variantByIsrc;

    mapping(VariantKind => bool) public variantKindAllowed;

    address public mirVerifier;
    address public legalIdVerifier;
    address public financialIdVerifier;

    bool public paused;

    // -----------------------------------------------------------------
    // Events
    // -----------------------------------------------------------------

    event MasterRegistered(uint256 indexed masterId, address indexed registrant, bytes32 dataHash);

    event VariantMinted(
        uint256 indexed variantId,
        uint256 indexed masterId,
        VariantKind kind,
        string isrc,
        address indexed minter
    );

    event VariantKindAllowedSet(VariantKind kind, bool allowed);
    event VerifierSet(string which, address verifier);
    event PausedSet(bool paused);

    // -----------------------------------------------------------------
    // Errors
    // -----------------------------------------------------------------

    error LabeltonPaused();
    error CapTableSizeOutOfRange(uint256 size);
    error CapTableSharesDoNotSum(uint256 totalBps);
    error CapTableHolderInvalid(uint256 index);
    error CapTableShareInvalid(uint256 index);
    error IsrcRootEmpty();
    error IsrcRootAlreadyRegistered(string isrcRoot);
    error UpcAlreadyRegistered(string upc);
    error IswcAlreadyRegistered(string iswc);
    error VariantIsrcAlreadyRegistered(string isrc);
    error MasterDoesNotExist(uint256 masterId);
    error VariantKindNotAllowed(VariantKind kind);
    error NotMasterMember(uint256 masterId, address caller);

    // -----------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------

    constructor(string memory uri_) ERC1155(uri_) Ownable(msg.sender) {
        // `Master` is the root mint and is always allowed; other kinds must
        // be turned on by the DAO as the protocol matures.
        variantKindAllowed[VariantKind.Master] = true;
    }

    // -----------------------------------------------------------------
    // Registration
    // -----------------------------------------------------------------

    /**
     * @notice Register a new master. Wallet-sovereign: anyone with a
     *         prepared master may call. The cap-table is set once here and
     *         is immutable; variants minted under this master fan ERC-1155
     *         supply across these holders in proportion to their basis-point
     *         shares.
     *
     *         Mints the root `Master` variant in the same transaction —
     *         hence "the root mint always lands at the same set of wallet
     *         holders."
     *
     * @param  p         Master identifier + dossier-hash payload. See `MasterParams`.
     * @param  capTable  Sequence of {holder, shareBps}; shares must sum to 10000.
     * @return masterId  The new master id.
     */
    function registerMaster(MasterParams calldata p, CapTableEntry[] calldata capTable)
        external
        nonReentrant
        returns (uint256 masterId)
    {
        if (paused) revert LabeltonPaused();

        if (capTable.length == 0 || capTable.length > MAX_CAP_TABLE) {
            revert CapTableSizeOutOfRange(capTable.length);
        }
        if (bytes(p.isrcRoot).length == 0) revert IsrcRootEmpty();
        if (masterByIsrcRoot[p.isrcRoot] != 0) revert IsrcRootAlreadyRegistered(p.isrcRoot);
        if (bytes(p.upc).length != 0 && masterByUpc[p.upc] != 0) {
            revert UpcAlreadyRegistered(p.upc);
        }
        if (bytes(p.iswc).length != 0 && masterByIswc[p.iswc] != 0) {
            revert IswcAlreadyRegistered(p.iswc);
        }

        uint256 totalBps;
        for (uint256 i = 0; i < capTable.length; i++) {
            if (capTable[i].holder == address(0)) revert CapTableHolderInvalid(i);
            if (capTable[i].shareBps == 0) revert CapTableShareInvalid(i);
            totalBps += capTable[i].shareBps;
        }
        if (totalBps != TOTAL_BPS) revert CapTableSharesDoNotSum(totalBps);

        bytes32 dataHash = keccak256(abi.encode(p, capTable));

        masterId = nextMasterId++;
        masters[masterId] = Master({
            exists: true,
            dataHash: dataHash,
            isrcRoot: p.isrcRoot,
            upc: p.upc,
            iswc: p.iswc,
            mirHash: p.mirHash,
            legalIdHash: p.legalIdHash,
            financialIdHash: p.financialIdHash,
            registrant: msg.sender,
            createdAt: uint64(block.timestamp)
        });
        for (uint256 i = 0; i < capTable.length; i++) {
            _capTables[masterId].push(capTable[i]);
        }
        masterByIsrcRoot[p.isrcRoot] = masterId;
        if (bytes(p.upc).length != 0) masterByUpc[p.upc] = masterId;
        if (bytes(p.iswc).length != 0) masterByIswc[p.iswc] = masterId;

        emit MasterRegistered(masterId, msg.sender, dataHash);

        // Root mint: always issued at registration. Same cap-table, same
        // wallets — by construction.
        _mintRootVariant(masterId);
    }

    function _mintRootVariant(uint256 masterId) internal {
        Master storage m = masters[masterId];
        uint256 variantId = nextVariantId++;
        variants[variantId] = Variant({
            exists: true,
            masterId: masterId,
            kind: VariantKind.Master,
            isrc: m.isrcRoot,
            uri: "",
            minter: msg.sender,
            mintedAt: uint64(block.timestamp)
        });
        variantByIsrc[m.isrcRoot] = variantId;

        CapTableEntry[] storage cap = _capTables[masterId];
        for (uint256 i = 0; i < cap.length; i++) {
            _mint(cap[i].holder, variantId, cap[i].shareBps, "");
        }

        emit VariantMinted(variantId, masterId, VariantKind.Master, m.isrcRoot, msg.sender);
    }

    // -----------------------------------------------------------------
    // Variant minting
    // -----------------------------------------------------------------

    /**
     * @notice Mint a new variant of an existing master. Callable by any
     *         cap-table member of the master. The variant's 10000-unit
     *         supply fans across the same cap-table in the same proportions
     *         — preserving the root-mint invariant.
     *
     * @param  masterId  The master to derive from.
     * @param  kind      Variant kind. Must be enabled by the DAO.
     * @param  isrc      Per-variant ISRC. Often a sibling of the master's ISRC.
     *                   Must be unique across variants if non-empty.
     * @param  uri_      Off-chain metadata URI for this variant.
     */
    function mintVariant(
        uint256 masterId,
        VariantKind kind,
        string calldata isrc,
        string calldata uri_
    ) external nonReentrant returns (uint256 variantId) {
        if (paused) revert LabeltonPaused();
        Master storage m = masters[masterId];
        if (!m.exists) revert MasterDoesNotExist(masterId);
        if (!variantKindAllowed[kind]) revert VariantKindNotAllowed(kind);

        CapTableEntry[] storage cap = _capTables[masterId];
        bool isMember;
        for (uint256 i = 0; i < cap.length; i++) {
            if (cap[i].holder == msg.sender) {
                isMember = true;
                break;
            }
        }
        if (!isMember) revert NotMasterMember(masterId, msg.sender);

        if (bytes(isrc).length != 0 && variantByIsrc[isrc] != 0) {
            revert VariantIsrcAlreadyRegistered(isrc);
        }

        variantId = nextVariantId++;
        variants[variantId] = Variant({
            exists: true,
            masterId: masterId,
            kind: kind,
            isrc: isrc,
            uri: uri_,
            minter: msg.sender,
            mintedAt: uint64(block.timestamp)
        });
        if (bytes(isrc).length != 0) variantByIsrc[isrc] = variantId;

        for (uint256 i = 0; i < cap.length; i++) {
            _mint(cap[i].holder, variantId, cap[i].shareBps, "");
        }

        emit VariantMinted(variantId, masterId, kind, isrc, msg.sender);
    }

    // -----------------------------------------------------------------
    // Reads
    // -----------------------------------------------------------------

    /// @notice Read the cap-table for a master.
    function capTableOf(uint256 masterId)
        external
        view
        returns (CapTableEntry[] memory)
    {
        return _capTables[masterId];
    }

    /// @notice Read the cap-table for a variant (delegates to the variant's master).
    function capTableOfVariant(uint256 variantId)
        external
        view
        returns (CapTableEntry[] memory)
    {
        Variant storage v = variants[variantId];
        if (!v.exists) revert MasterDoesNotExist(v.masterId);
        return _capTables[v.masterId];
    }

    function masterOf(uint256 variantId) external view returns (uint256) {
        return variants[variantId].masterId;
    }

    // -----------------------------------------------------------------
    // Governance configuration (Muzix DAO)
    // -----------------------------------------------------------------

    function setVariantKindAllowed(VariantKind kind, bool allowed) external onlyOwner {
        variantKindAllowed[kind] = allowed;
        emit VariantKindAllowedSet(kind, allowed);
    }

    function setMirVerifier(address v) external onlyOwner {
        mirVerifier = v;
        emit VerifierSet("mir", v);
    }

    function setLegalIdVerifier(address v) external onlyOwner {
        legalIdVerifier = v;
        emit VerifierSet("legalId", v);
    }

    function setFinancialIdVerifier(address v) external onlyOwner {
        financialIdVerifier = v;
        emit VerifierSet("financialId", v);
    }

    function setPaused(bool p) external onlyOwner {
        paused = p;
        emit PausedSet(p);
    }
}
