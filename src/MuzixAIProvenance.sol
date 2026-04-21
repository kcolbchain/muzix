// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title  MuzixAIProvenance
 * @author kcolbchain
 * @notice Optional, opt-in on-chain AI-provenance registry for MuzixCatalog
 *         music tokens. Each record binds a catalog token (catalog address +
 *         tokenId) to either:
 *           - a "human-only" attestation (no AI model contributed), or
 *           - a set of ERC-721-AI model token contract addresses + IP-lineage
 *             URIs that describe the AI contribution.
 *
 *         The bridge is one-way: this contract references erc721-ai token
 *         contract addresses but does not modify them. erc721-ai is not a
 *         dependency here; the aiModelTokens array is a free-form list of
 *         addresses so that future AI-asset standards can also be referenced.
 *
 *         Writes are gated by ERC-721 `ownerOf(tokenId)` on the target
 *         catalog contract — only the catalog token owner (which in
 *         MuzixCatalog is the royalty-split authority by construction) may
 *         set, replace, or clear a provenance record.
 *
 *         Reads are public; the provenance is a view surface for UIs,
 *         downstream settlement contracts, and off-chain verifiers.
 *
 *         This contract is intentionally standalone (not an extension of
 *         MuzixCatalog) so it:
 *           - compiles independently of the open MuzixCatalog.sol:17 blocker
 *             (issue #25), and
 *           - can be deployed across multiple catalog instances.
 */

interface IERC721Minimal {
    function ownerOf(uint256 tokenId) external view returns (address);
}

contract MuzixAIProvenance {
    /// @notice Max count on bounded fields — keeps a pathological write from
    ///         consuming an unreasonable amount of gas / storage. Chosen to
    ///         comfortably cover real music-production credit lists.
    uint256 public constant MAX_AI_MODEL_TOKENS = 16;
    uint256 public constant MAX_LINEAGE_URIS = 16;
    uint256 public constant MAX_URI_BYTES = 512;

    /// @notice On-chain record describing a music token's AI-provenance.
    /// @dev `set` discriminates "no record" from "empty record"; a cleared
    ///      record is zeroed entirely and `set` returns false.
    struct AIProvenance {
        bool set;
        bool humanOnly;
        address[] aiModelTokens;
        string[] ipLineageURIs;
        bytes32 provenanceHash;
        uint64 updatedAt;
    }

    /// @dev catalog address => tokenId => provenance record.
    mapping(address => mapping(uint256 => AIProvenance)) internal _records;

    event ProvenanceSet(
        address indexed catalog,
        uint256 indexed tokenId,
        bytes32 provenanceHash,
        bool humanOnly,
        uint256 modelCount,
        uint256 uriCount
    );

    event ProvenanceCleared(address indexed catalog, uint256 indexed tokenId);

    error NotTokenOwner(address catalog, uint256 tokenId, address caller);
    error HumanOnlyMustHaveNoModels();
    error TooManyModels(uint256 got, uint256 max);
    error TooManyURIs(uint256 got, uint256 max);
    error URITooLong(uint256 index, uint256 length, uint256 max);
    error ZeroProvenanceHash();
    error NoRecord(address catalog, uint256 tokenId);

    // ---------------------------------------------------------------------
    // Writes
    // ---------------------------------------------------------------------

    /**
     * @notice Set or replace the AI-provenance record for a catalog token.
     * @dev    Caller must be the current ERC-721 owner of `tokenId` on
     *         `catalog`. Replacing an existing record is allowed (the most
     *         recent record wins); use `clearProvenance` to revoke entirely.
     */
    function setProvenance(
        address catalog,
        uint256 tokenId,
        bool humanOnly,
        address[] calldata aiModelTokens,
        string[] calldata ipLineageURIs,
        bytes32 provenanceHash
    ) external {
        _requireTokenOwner(catalog, tokenId);

        if (provenanceHash == bytes32(0)) revert ZeroProvenanceHash();
        if (aiModelTokens.length > MAX_AI_MODEL_TOKENS) {
            revert TooManyModels(aiModelTokens.length, MAX_AI_MODEL_TOKENS);
        }
        if (ipLineageURIs.length > MAX_LINEAGE_URIS) {
            revert TooManyURIs(ipLineageURIs.length, MAX_LINEAGE_URIS);
        }
        if (humanOnly && aiModelTokens.length != 0) {
            revert HumanOnlyMustHaveNoModels();
        }
        for (uint256 i = 0; i < ipLineageURIs.length; i++) {
            uint256 len = bytes(ipLineageURIs[i]).length;
            if (len > MAX_URI_BYTES) {
                revert URITooLong(i, len, MAX_URI_BYTES);
            }
        }

        AIProvenance storage rec = _records[catalog][tokenId];
        rec.set = true;
        rec.humanOnly = humanOnly;
        rec.provenanceHash = provenanceHash;
        rec.updatedAt = uint64(block.timestamp);

        // Replace the nested dynamic arrays element-by-element. Direct
        // assignment of `calldata -> storage` for nested dynamic arrays is
        // not supported by solc's legacy code generator.
        delete rec.aiModelTokens;
        for (uint256 i = 0; i < aiModelTokens.length; i++) {
            rec.aiModelTokens.push(aiModelTokens[i]);
        }
        delete rec.ipLineageURIs;
        for (uint256 i = 0; i < ipLineageURIs.length; i++) {
            rec.ipLineageURIs.push(ipLineageURIs[i]);
        }

        emit ProvenanceSet(
            catalog,
            tokenId,
            provenanceHash,
            humanOnly,
            aiModelTokens.length,
            ipLineageURIs.length
        );
    }

    /**
     * @notice Clear the AI-provenance record for a catalog token.
     * @dev    Caller must currently own the token. Reverts if no record is
     *         set, so a UI can tell whether the call would be a no-op.
     */
    function clearProvenance(address catalog, uint256 tokenId) external {
        _requireTokenOwner(catalog, tokenId);
        if (!_records[catalog][tokenId].set) {
            revert NoRecord(catalog, tokenId);
        }
        delete _records[catalog][tokenId];
        emit ProvenanceCleared(catalog, tokenId);
    }

    // ---------------------------------------------------------------------
    // Reads
    // ---------------------------------------------------------------------

    /**
     * @notice Read the provenance record for a catalog token.
     * @return record The on-chain record; `record.set == false` means no
     *                record has been attached.
     */
    function getProvenance(address catalog, uint256 tokenId)
        external
        view
        returns (AIProvenance memory record)
    {
        return _records[catalog][tokenId];
    }

    /**
     * @notice Convenience check: has a record ever been set (and not
     *         subsequently cleared)?
     */
    function hasProvenance(address catalog, uint256 tokenId) external view returns (bool) {
        return _records[catalog][tokenId].set;
    }

    /**
     * @notice Canonical off-chain → on-chain provenance-hash binding.
     * @dev    `keccak256(abi.encode(...))` so that off-chain signers and
     *         verifiers can reproduce the exact binding. Callers are free to
     *         use a different scheme and pass any non-zero `provenanceHash`
     *         to `setProvenance`; this helper just documents the recommended
     *         binding.
     */
    function computeProvenanceHash(
        bool humanOnly,
        address[] calldata aiModelTokens,
        string[] calldata ipLineageURIs
    ) external pure returns (bytes32) {
        return keccak256(abi.encode(humanOnly, aiModelTokens, ipLineageURIs));
    }

    // ---------------------------------------------------------------------
    // Internals
    // ---------------------------------------------------------------------

    function _requireTokenOwner(address catalog, uint256 tokenId) internal view {
        address owner = IERC721Minimal(catalog).ownerOf(tokenId);
        if (owner != msg.sender) {
            revert NotTokenOwner(catalog, tokenId, msg.sender);
        }
    }
}
