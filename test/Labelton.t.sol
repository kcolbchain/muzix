// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/Labelton.sol";

contract LabeltonTest is Test {
    Labelton labelton;
    address owner = address(this);
    address holder1 = address(0x101);
    address holder2 = address(0x102);
    address holder3 = address(0x103);
    
    function setUp() public {
        labelton = new Labelton("ipfs://");
    }

    function createMasterParams(string memory isrc, string memory upc, string memory iswc) internal pure returns (Labelton.MasterParams memory) {
        return Labelton.MasterParams({
            isrcRoot: isrc,
            upc: upc,
            iswc: iswc,
            mirHash: bytes32(uint256(1)),
            legalIdHash: bytes32(uint256(2)),
            financialIdHash: bytes32(uint256(3))
        });
    }

    function test_RegisterMaster_HappyPath_SingleHolder() public {
        Labelton.MasterParams memory p = createMasterParams("US-123-456", "UPC-1", "ISWC-1");
        
        Labelton.CapTableEntry[] memory cap = new Labelton.CapTableEntry[](1);
        cap[0] = Labelton.CapTableEntry({holder: holder1, shareBps: 10000});

        uint256 masterId = labelton.registerMaster(p, cap);
        assertEq(masterId, 1);

        Labelton.CapTableEntry[] memory savedCap = labelton.capTableOf(masterId);
        assertEq(savedCap.length, 1);
        assertEq(savedCap[0].holder, holder1);
        assertEq(savedCap[0].shareBps, 10000);

        // Check reverse lookups
        assertEq(labelton.masterByIsrcRoot("US-123-456"), masterId);
        assertEq(labelton.masterByUpc("UPC-1"), masterId);
        assertEq(labelton.masterByIswc("ISWC-1"), masterId);

        // dataHash check
        bytes32 expectedDataHash = keccak256(abi.encode(p, cap));
        (, bytes32 savedHash, , , , , , , , ) = labelton.masters(masterId);
        assertEq(savedHash, expectedDataHash);

        // Root variant checks
        uint256 variantId = 1;
        assertEq(labelton.balanceOf(holder1, variantId), 10000);
        assertEq(labelton.masterOf(variantId), masterId);
        assertEq(labelton.variantByIsrc("US-123-456"), variantId);
    }

    function test_RegisterMaster_HappyPath_MultiHolder() public {
        Labelton.MasterParams memory p = createMasterParams("US-MULTI", "", "");
        
        Labelton.CapTableEntry[] memory cap = new Labelton.CapTableEntry[](3);
        cap[0] = Labelton.CapTableEntry({holder: holder1, shareBps: 5000});
        cap[1] = Labelton.CapTableEntry({holder: holder2, shareBps: 3000});
        cap[2] = Labelton.CapTableEntry({holder: holder3, shareBps: 2000});

        uint256 masterId = labelton.registerMaster(p, cap);
        assertEq(masterId, 1);

        uint256 variantId = 1;
        assertEq(labelton.balanceOf(holder1, variantId), 5000);
        assertEq(labelton.balanceOf(holder2, variantId), 3000);
        assertEq(labelton.balanceOf(holder3, variantId), 2000);
    }

    // --- Reverts for registerMaster ---

    function test_Revert_RegisterMaster_LabeltonPaused() public {
        labelton.setPaused(true);
        Labelton.MasterParams memory p = createMasterParams("US-1", "", "");
        Labelton.CapTableEntry[] memory cap = new Labelton.CapTableEntry[](1);
        cap[0] = Labelton.CapTableEntry({holder: holder1, shareBps: 10000});

        vm.expectRevert(Labelton.LabeltonPaused.selector);
        labelton.registerMaster(p, cap);
    }

    function test_Revert_RegisterMaster_CapTableSizeOutOfRange_Zero() public {
        Labelton.MasterParams memory p = createMasterParams("US-1", "", "");
        Labelton.CapTableEntry[] memory cap = new Labelton.CapTableEntry[](0);

        vm.expectRevert(abi.encodeWithSelector(Labelton.CapTableSizeOutOfRange.selector, 0));
        labelton.registerMaster(p, cap);
    }

    function test_Revert_RegisterMaster_CapTableSizeOutOfRange_Over() public {
        Labelton.MasterParams memory p = createMasterParams("US-1", "", "");
        Labelton.CapTableEntry[] memory cap = new Labelton.CapTableEntry[](65);

        vm.expectRevert(abi.encodeWithSelector(Labelton.CapTableSizeOutOfRange.selector, 65));
        labelton.registerMaster(p, cap);
    }

    function test_Revert_RegisterMaster_IsrcRootEmpty() public {
        Labelton.MasterParams memory p = createMasterParams("", "", "");
        Labelton.CapTableEntry[] memory cap = new Labelton.CapTableEntry[](1);
        cap[0] = Labelton.CapTableEntry({holder: holder1, shareBps: 10000});

        vm.expectRevert(Labelton.IsrcRootEmpty.selector);
        labelton.registerMaster(p, cap);
    }

    function test_Revert_RegisterMaster_IsrcRootAlreadyRegistered() public {
        Labelton.MasterParams memory p = createMasterParams("US-DUP", "", "");
        Labelton.CapTableEntry[] memory cap = new Labelton.CapTableEntry[](1);
        cap[0] = Labelton.CapTableEntry({holder: holder1, shareBps: 10000});

        labelton.registerMaster(p, cap);

        vm.expectRevert(abi.encodeWithSelector(Labelton.IsrcRootAlreadyRegistered.selector, "US-DUP"));
        labelton.registerMaster(p, cap);
    }

    function test_Revert_RegisterMaster_UpcAlreadyRegistered() public {
        Labelton.MasterParams memory p1 = createMasterParams("US-1", "UPC-DUP", "");
        Labelton.CapTableEntry[] memory cap = new Labelton.CapTableEntry[](1);
        cap[0] = Labelton.CapTableEntry({holder: holder1, shareBps: 10000});
        labelton.registerMaster(p1, cap);

        Labelton.MasterParams memory p2 = createMasterParams("US-2", "UPC-DUP", "");
        vm.expectRevert(abi.encodeWithSelector(Labelton.UpcAlreadyRegistered.selector, "UPC-DUP"));
        labelton.registerMaster(p2, cap);
    }

    function test_Revert_RegisterMaster_IswcAlreadyRegistered() public {
        Labelton.MasterParams memory p1 = createMasterParams("US-1", "", "ISWC-DUP");
        Labelton.CapTableEntry[] memory cap = new Labelton.CapTableEntry[](1);
        cap[0] = Labelton.CapTableEntry({holder: holder1, shareBps: 10000});
        labelton.registerMaster(p1, cap);

        Labelton.MasterParams memory p2 = createMasterParams("US-2", "", "ISWC-DUP");
        vm.expectRevert(abi.encodeWithSelector(Labelton.IswcAlreadyRegistered.selector, "ISWC-DUP"));
        labelton.registerMaster(p2, cap);
    }

    function test_Revert_RegisterMaster_CapTableHolderInvalid() public {
        Labelton.MasterParams memory p = createMasterParams("US-1", "", "");
        Labelton.CapTableEntry[] memory cap = new Labelton.CapTableEntry[](2);
        cap[0] = Labelton.CapTableEntry({holder: holder1, shareBps: 5000});
        cap[1] = Labelton.CapTableEntry({holder: address(0), shareBps: 5000});

        vm.expectRevert(abi.encodeWithSelector(Labelton.CapTableHolderInvalid.selector, 1));
        labelton.registerMaster(p, cap);
    }

    function test_Revert_RegisterMaster_CapTableShareInvalid() public {
        Labelton.MasterParams memory p = createMasterParams("US-1", "", "");
        Labelton.CapTableEntry[] memory cap = new Labelton.CapTableEntry[](2);
        cap[0] = Labelton.CapTableEntry({holder: holder1, shareBps: 10000});
        cap[1] = Labelton.CapTableEntry({holder: holder2, shareBps: 0});

        vm.expectRevert(abi.encodeWithSelector(Labelton.CapTableShareInvalid.selector, 1));
        labelton.registerMaster(p, cap);
    }

    function test_Revert_RegisterMaster_CapTableSharesDoNotSum_Over() public {
        Labelton.MasterParams memory p = createMasterParams("US-1", "", "");
        Labelton.CapTableEntry[] memory cap = new Labelton.CapTableEntry[](2);
        cap[0] = Labelton.CapTableEntry({holder: holder1, shareBps: 5000});
        cap[1] = Labelton.CapTableEntry({holder: holder2, shareBps: 5001});

        vm.expectRevert(abi.encodeWithSelector(Labelton.CapTableSharesDoNotSum.selector, 10001));
        labelton.registerMaster(p, cap);
    }

    function test_Revert_RegisterMaster_CapTableSharesDoNotSum_Under() public {
        Labelton.MasterParams memory p = createMasterParams("US-1", "", "");
        Labelton.CapTableEntry[] memory cap = new Labelton.CapTableEntry[](2);
        cap[0] = Labelton.CapTableEntry({holder: holder1, shareBps: 5000});
        cap[1] = Labelton.CapTableEntry({holder: holder2, shareBps: 4999});

        vm.expectRevert(abi.encodeWithSelector(Labelton.CapTableSharesDoNotSum.selector, 9999));
        labelton.registerMaster(p, cap);
    }

    // --- mintVariant ---

    function setupMaster() internal returns (uint256) {
        Labelton.MasterParams memory p = createMasterParams("US-M", "", "");
        Labelton.CapTableEntry[] memory cap = new Labelton.CapTableEntry[](2);
        cap[0] = Labelton.CapTableEntry({holder: holder1, shareBps: 7000});
        cap[1] = Labelton.CapTableEntry({holder: holder2, shareBps: 3000});
        return labelton.registerMaster(p, cap);
    }

    function test_MintVariant_HappyPath() public {
        uint256 masterId = setupMaster();

        labelton.setVariantKindAllowed(Labelton.VariantKind.Remix, true);

        vm.prank(holder1);
        uint256 variantId = labelton.mintVariant(masterId, Labelton.VariantKind.Remix, "US-REMIX", "ipfs://remix");
        
        assertEq(variantId, 2);
        assertEq(labelton.balanceOf(holder1, variantId), 7000);
        assertEq(labelton.balanceOf(holder2, variantId), 3000);
        assertEq(labelton.variantByIsrc("US-REMIX"), variantId);
    }

    function test_Revert_MintVariant_LabeltonPaused() public {
        uint256 masterId = setupMaster();
        labelton.setVariantKindAllowed(Labelton.VariantKind.Remix, true);
        labelton.setPaused(true);

        vm.prank(holder1);
        vm.expectRevert(Labelton.LabeltonPaused.selector);
        labelton.mintVariant(masterId, Labelton.VariantKind.Remix, "US-REMIX", "");
    }

    function test_Revert_MintVariant_MasterDoesNotExist() public {
        labelton.setVariantKindAllowed(Labelton.VariantKind.Remix, true);

        vm.prank(holder1);
        vm.expectRevert(abi.encodeWithSelector(Labelton.MasterDoesNotExist.selector, 999));
        labelton.mintVariant(999, Labelton.VariantKind.Remix, "US-REMIX", "");
    }

    function test_Revert_MintVariant_VariantKindNotAllowed() public {
        uint256 masterId = setupMaster();
        
        vm.prank(holder1);
        vm.expectRevert(abi.encodeWithSelector(Labelton.VariantKindNotAllowed.selector, Labelton.VariantKind.Remix));
        labelton.mintVariant(masterId, Labelton.VariantKind.Remix, "US-REMIX", "");
    }

    function test_Revert_MintVariant_NotMasterMember() public {
        uint256 masterId = setupMaster();
        labelton.setVariantKindAllowed(Labelton.VariantKind.Remix, true);

        vm.prank(holder3); // Not in cap table
        vm.expectRevert(abi.encodeWithSelector(Labelton.NotMasterMember.selector, masterId, holder3));
        labelton.mintVariant(masterId, Labelton.VariantKind.Remix, "US-REMIX", "");
    }

    function test_Revert_MintVariant_VariantIsrcAlreadyRegistered() public {
        uint256 masterId = setupMaster();
        labelton.setVariantKindAllowed(Labelton.VariantKind.Remix, true);

        vm.prank(holder1);
        labelton.mintVariant(masterId, Labelton.VariantKind.Remix, "US-REMIX", "");

        vm.prank(holder1);
        vm.expectRevert(abi.encodeWithSelector(Labelton.VariantIsrcAlreadyRegistered.selector, "US-REMIX"));
        labelton.mintVariant(masterId, Labelton.VariantKind.Remix, "US-REMIX", "");
    }

    // --- DAO Config Endpoints ---

    function test_SetVariantKindAllowed() public {
        labelton.setVariantKindAllowed(Labelton.VariantKind.Album, true);
        assertTrue(labelton.variantKindAllowed(Labelton.VariantKind.Album));
    }

    function test_SetMirVerifier() public {
        address v = address(0x555);
        labelton.setMirVerifier(v);
        assertEq(labelton.mirVerifier(), v);
    }

    function test_SetLegalIdVerifier() public {
        address v = address(0x666);
        labelton.setLegalIdVerifier(v);
        assertEq(labelton.legalIdVerifier(), v);
    }

    function test_SetFinancialIdVerifier() public {
        address v = address(0x777);
        labelton.setFinancialIdVerifier(v);
        assertEq(labelton.financialIdVerifier(), v);
    }

    function test_SetPaused() public {
        labelton.setPaused(true);
        assertTrue(labelton.paused());
    }

    // --- Invariants (Fuzzing) ---

    function testFuzz_Invariants(uint16 share1, uint16 share2) public {
        share1 = uint16(bound(share1, 1, 9998));
        share2 = uint16(bound(share2, 1, 9999 - share1));
        uint16 share3 = 10000 - share1 - share2;

        Labelton.MasterParams memory p = createMasterParams("US-FUZZ", "", "");
        Labelton.CapTableEntry[] memory cap = new Labelton.CapTableEntry[](3);
        cap[0] = Labelton.CapTableEntry({holder: holder1, shareBps: share1});
        cap[1] = Labelton.CapTableEntry({holder: holder2, shareBps: share2});
        cap[2] = Labelton.CapTableEntry({holder: holder3, shareBps: share3});

        uint256 masterId = labelton.registerMaster(p, cap);
        uint256 variantId = 1; // Root variant

        // Invariant: sum of balances == 10000
        uint256 sum = labelton.balanceOf(holder1, variantId) +
                      labelton.balanceOf(holder2, variantId) +
                      labelton.balanceOf(holder3, variantId);
        assertEq(sum, 10000);

        // Invariant: masterOf(variantId) round trips
        assertEq(labelton.masterOf(variantId), masterId);
    }

    // --- capTableOfVariant ---
    
    function test_capTableOfVariant_Exists() public {
        setupMaster();
        Labelton.CapTableEntry[] memory cap = labelton.capTableOfVariant(1);
        assertEq(cap.length, 2);
        assertEq(cap[0].holder, holder1);
        assertEq(cap[1].holder, holder2);
    }

    function test_capTableOfVariant_DoesNotExist() public {
        vm.expectRevert(abi.encodeWithSelector(Labelton.VariantDoesNotExist.selector, 999));
        labelton.capTableOfVariant(999);
    }
}
