// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MuzixAIProvenance.sol";

/**
 * Minimal ERC-721-compatible stub used purely to exercise the ownerOf
 * auth path in MuzixAIProvenance. We intentionally do not depend on the
 * real MuzixCatalog here: issue #25 (MuzixCatalog.sol:17) currently blocks
 * MuzixCatalog from compiling standalone, and this test should not gate
 * the provenance-registry's ship.
 */
contract MockCatalog {
    mapping(uint256 => address) public owners;

    function mint(uint256 tokenId, address to) external {
        owners[tokenId] = to;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        address o = owners[tokenId];
        require(o != address(0), "no owner");
        return o;
    }
}

/**
 * Minimal ERC-1155 + ERC-165 catalog stub for the LABELTON branch of
 * MuzixAIProvenance._requireTokenOwner. Reports the ERC-1155 interface id
 * (0xd9b67a26) so the provenance registry takes the balanceOf path.
 */
contract MockERC1155Catalog {
    mapping(uint256 => mapping(address => uint256)) private _balances;

    function mint(uint256 id, address to, uint256 amount) external {
        _balances[id][to] += amount;
    }

    function balanceOf(address account, uint256 id) external view returns (uint256) {
        return _balances[id][account];
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        // ERC-1155 only — ERC-165 (0x01ffc9a7) intentionally omitted; the
        // registry only queries 0xd9b67a26.
        return interfaceId == 0xd9b67a26;
    }
}

/**
 * Reports ERC-165 conformance but explicitly NOT ERC-1155. Verifies the
 * registry falls through to the ERC-721 path even for catalogs that
 * speak ERC-165.
 */
contract MockERC165OnlyCatalog {
    mapping(uint256 => address) public owners;

    function mint(uint256 tokenId, address to) external {
        owners[tokenId] = to;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return owners[tokenId];
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        // ERC-165 itself yes; ERC-1155 no.
        return interfaceId == 0x01ffc9a7;
    }
}

/**
 * supportsInterface reverts — simulates a catalog that does not implement
 * ERC-165 at all. The registry must fall through to ERC-721 unconditionally.
 */
contract MockERC165RevertingCatalog {
    mapping(uint256 => address) public owners;

    function mint(uint256 tokenId, address to) external {
        owners[tokenId] = to;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return owners[tokenId];
    }

    function supportsInterface(bytes4) external pure returns (bool) {
        revert("no erc165");
    }
}

contract MuzixAIProvenanceTest is Test {
    MuzixAIProvenance internal registry;
    MockCatalog internal catalog;

    address internal artist = address(0xA11CE);
    address internal stranger = address(0xBEEF);

    address internal modelA = address(0xAABB);
    address internal modelB = address(0xCCDD);

    function setUp() public {
        registry = new MuzixAIProvenance();
        catalog = new MockCatalog();
        catalog.mint(1, artist);
    }

    function _hash(
        bool humanOnly,
        address[] memory models,
        string[] memory uris
    ) internal pure returns (bytes32) {
        return keccak256(abi.encode(humanOnly, models, uris));
    }

    function testSetAndGetAIProvenance() public {
        address[] memory models = new address[](2);
        models[0] = modelA;
        models[1] = modelB;
        string[] memory uris = new string[](1);
        uris[0] = "ipfs://bafy-lineage-doc";

        bytes32 h = _hash(false, models, uris);

        vm.prank(artist);
        registry.setProvenance(address(catalog), 1, false, models, uris, h);

        MuzixAIProvenance.AIProvenance memory rec =
            registry.getProvenance(address(catalog), 1);

        assertTrue(rec.set);
        assertFalse(rec.humanOnly);
        assertEq(rec.aiModelTokens.length, 2);
        assertEq(rec.aiModelTokens[0], modelA);
        assertEq(rec.aiModelTokens[1], modelB);
        assertEq(rec.ipLineageURIs.length, 1);
        assertEq(rec.ipLineageURIs[0], "ipfs://bafy-lineage-doc");
        assertEq(rec.provenanceHash, h);
        assertGt(rec.updatedAt, 0);
        assertTrue(registry.hasProvenance(address(catalog), 1));
    }

    function testSetHumanOnlyProvenance() public {
        address[] memory models = new address[](0);
        string[] memory uris = new string[](1);
        uris[0] = "ipfs://bafy-human-attestation";

        bytes32 h = _hash(true, models, uris);

        vm.prank(artist);
        registry.setProvenance(address(catalog), 1, true, models, uris, h);

        MuzixAIProvenance.AIProvenance memory rec =
            registry.getProvenance(address(catalog), 1);

        assertTrue(rec.set);
        assertTrue(rec.humanOnly);
        assertEq(rec.aiModelTokens.length, 0);
    }

    function testRevertWhenCallerNotOwner() public {
        address[] memory models = new address[](0);
        string[] memory uris = new string[](0);
        bytes32 h = _hash(true, models, uris);

        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(
                MuzixAIProvenance.NotTokenOwner.selector,
                address(catalog),
                1,
                stranger
            )
        );
        registry.setProvenance(address(catalog), 1, true, models, uris, h);
    }

    function testRevertWhenHumanOnlyHasModels() public {
        address[] memory models = new address[](1);
        models[0] = modelA;
        string[] memory uris = new string[](0);
        bytes32 h = _hash(true, models, uris);

        vm.prank(artist);
        vm.expectRevert(MuzixAIProvenance.HumanOnlyMustHaveNoModels.selector);
        registry.setProvenance(address(catalog), 1, true, models, uris, h);
    }

    function testRevertWhenProvenanceHashZero() public {
        address[] memory models = new address[](0);
        string[] memory uris = new string[](0);

        vm.prank(artist);
        vm.expectRevert(MuzixAIProvenance.ZeroProvenanceHash.selector);
        registry.setProvenance(address(catalog), 1, true, models, uris, bytes32(0));
    }

    function testRevertWhenTooManyModels() public {
        // Read constants before the prank — calls on `registry` would otherwise
        // consume vm.prank before the target setProvenance call.
        uint256 maxModels = registry.MAX_AI_MODEL_TOKENS();
        uint256 n = maxModels + 1;
        address[] memory models = new address[](n);
        for (uint256 i = 0; i < n; i++) {
            models[i] = address(uint160(i + 1));
        }
        string[] memory uris = new string[](0);
        bytes32 h = _hash(false, models, uris);
        bytes memory expectedRevert =
            abi.encodeWithSelector(MuzixAIProvenance.TooManyModels.selector, n, maxModels);

        vm.prank(artist);
        vm.expectRevert(expectedRevert);
        registry.setProvenance(address(catalog), 1, false, models, uris, h);
    }

    function testReplaceExistingRecord() public {
        address[] memory models1 = new address[](1);
        models1[0] = modelA;
        string[] memory uris1 = new string[](0);
        bytes32 h1 = _hash(false, models1, uris1);

        vm.prank(artist);
        registry.setProvenance(address(catalog), 1, false, models1, uris1, h1);

        address[] memory models2 = new address[](2);
        models2[0] = modelA;
        models2[1] = modelB;
        string[] memory uris2 = new string[](1);
        uris2[0] = "ipfs://updated";
        bytes32 h2 = _hash(false, models2, uris2);

        vm.prank(artist);
        registry.setProvenance(address(catalog), 1, false, models2, uris2, h2);

        MuzixAIProvenance.AIProvenance memory rec =
            registry.getProvenance(address(catalog), 1);
        assertEq(rec.aiModelTokens.length, 2);
        assertEq(rec.ipLineageURIs.length, 1);
        assertEq(rec.provenanceHash, h2);
    }

    function testClearProvenance() public {
        address[] memory models = new address[](0);
        string[] memory uris = new string[](0);
        bytes32 h = _hash(true, models, uris);

        vm.prank(artist);
        registry.setProvenance(address(catalog), 1, true, models, uris, h);
        assertTrue(registry.hasProvenance(address(catalog), 1));

        vm.prank(artist);
        registry.clearProvenance(address(catalog), 1);
        assertFalse(registry.hasProvenance(address(catalog), 1));

        MuzixAIProvenance.AIProvenance memory rec =
            registry.getProvenance(address(catalog), 1);
        assertFalse(rec.set);
        assertEq(rec.aiModelTokens.length, 0);
    }

    function testRevertClearWhenNoRecord() public {
        vm.prank(artist);
        vm.expectRevert(
            abi.encodeWithSelector(
                MuzixAIProvenance.NoRecord.selector,
                address(catalog),
                1
            )
        );
        registry.clearProvenance(address(catalog), 1);
    }

    function testRevertClearWhenCallerNotOwner() public {
        address[] memory models = new address[](0);
        string[] memory uris = new string[](0);
        bytes32 h = _hash(true, models, uris);

        vm.prank(artist);
        registry.setProvenance(address(catalog), 1, true, models, uris, h);

        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(
                MuzixAIProvenance.NotTokenOwner.selector,
                address(catalog),
                1,
                stranger
            )
        );
        registry.clearProvenance(address(catalog), 1);
    }

    function testComputeProvenanceHashMatchesEncode() public {
        address[] memory models = new address[](1);
        models[0] = modelA;
        string[] memory uris = new string[](1);
        uris[0] = "ipfs://u";

        bytes32 got = registry.computeProvenanceHash(false, models, uris);
        bytes32 expected = keccak256(abi.encode(false, models, uris));
        assertEq(got, expected);
    }

    // ------------------------------------------------------------------
    // ERC-1155 catalog auth path (issue #44 — LABELTON variant tokens)
    // ------------------------------------------------------------------

    function testERC1155HolderCanSetProvenance() public {
        MockERC1155Catalog labelton = new MockERC1155Catalog();
        labelton.mint(1, artist, 100); // artist holds 100 shares of variant 1

        address[] memory models = new address[](1);
        models[0] = modelA;
        string[] memory uris = new string[](1);
        uris[0] = "ipfs://labelton-lineage";
        bytes32 h = _hash(false, models, uris);

        vm.prank(artist);
        registry.setProvenance(address(labelton), 1, false, models, uris, h);

        MuzixAIProvenance.AIProvenance memory rec =
            registry.getProvenance(address(labelton), 1);
        assertTrue(rec.set);
        assertEq(rec.provenanceHash, h);
    }

    function testERC1155AnyNonZeroBalanceAuthorizes() public {
        // LABELTON cap-table: many holders own shares of the same variant.
        // The registry must authorize ANY non-zero holder, not just a 100%
        // owner, because ERC-1155 has no single `ownerOf`.
        MockERC1155Catalog labelton = new MockERC1155Catalog();
        labelton.mint(1, artist, 5000);
        labelton.mint(1, stranger, 5000); // stranger is a co-cap-holder here

        address[] memory models = new address[](0);
        string[] memory uris = new string[](1);
        uris[0] = "ipfs://shared-lineage";
        bytes32 h = _hash(true, models, uris);

        vm.prank(stranger);
        registry.setProvenance(address(labelton), 1, true, models, uris, h);

        assertTrue(registry.hasProvenance(address(labelton), 1));
    }

    function testERC1155ZeroBalanceRevertsNotTokenOwner() public {
        MockERC1155Catalog labelton = new MockERC1155Catalog();
        labelton.mint(1, artist, 10_000);

        address[] memory models = new address[](0);
        string[] memory uris = new string[](0);
        bytes32 h = _hash(true, models, uris);

        vm.prank(stranger); // holds zero of variant 1
        vm.expectRevert(
            abi.encodeWithSelector(
                MuzixAIProvenance.NotTokenOwner.selector,
                address(labelton),
                1,
                stranger
            )
        );
        registry.setProvenance(address(labelton), 1, true, models, uris, h);
    }

    function testERC165CatalogThatIsNotERC1155FallsThroughToERC721() public {
        // Catalog speaks ERC-165 but does NOT report ERC-1155. The registry
        // must take the ERC-721 ownerOf path.
        MockERC165OnlyCatalog cat = new MockERC165OnlyCatalog();
        cat.mint(1, artist);

        address[] memory models = new address[](0);
        string[] memory uris = new string[](0);
        bytes32 h = _hash(true, models, uris);

        vm.prank(artist);
        registry.setProvenance(address(cat), 1, true, models, uris, h);
        assertTrue(registry.hasProvenance(address(cat), 1));
    }

    function testNonERC165CatalogFallsThroughToERC721() public {
        // supportsInterface reverts (catalog isn't ERC-165 at all). Registry
        // must still authorize via ownerOf — preserves legacy MuzixCatalog
        // behaviour.
        MockERC165RevertingCatalog cat = new MockERC165RevertingCatalog();
        cat.mint(1, artist);

        address[] memory models = new address[](0);
        string[] memory uris = new string[](0);
        bytes32 h = _hash(true, models, uris);

        vm.prank(artist);
        registry.setProvenance(address(cat), 1, true, models, uris, h);
        assertTrue(registry.hasProvenance(address(cat), 1));

        // And stranger still fails on the ERC-721 path.
        vm.prank(stranger);
        vm.expectRevert(
            abi.encodeWithSelector(
                MuzixAIProvenance.NotTokenOwner.selector,
                address(cat),
                1,
                stranger
            )
        );
        registry.setProvenance(address(cat), 1, true, models, uris, h);
    }
}
