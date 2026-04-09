// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/MUSD.sol";

contract MockCatalog {
    function royaltySplits(uint256) external pure returns (address[] memory recipients, uint16[] memory shares) {
        address[] memory r = new address[](2);
        r[0] = address(0xAAA);
        r[1] = address(0xBBB);
        uint16[] memory s = new uint16[](2);
        s[0] = 7000; // 70%
        s[1] = 3000; // 30%
        return (r, s);
    }
}

contract MUSDTest is Test {
    MUSD musd;
    MockCatalog catalog;
    address user = address(0x1);

    function setUp() public {
        catalog = new MockCatalog();
        musd = new MUSD(address(catalog));
        musd.mint(address(this), 1000 ether);
        musd.mint(user, 1000 ether);
    }

    function testBatchRoyaltyDistribution() public {
        uint256[] memory ids = new uint256[](2);
        ids[0] = 1;
        ids[1] = 2;
        
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 100 ether;
        amounts[1] = 200 ether;

        musd.batchRoyaltyDistribution(ids, amounts);
        
        // 70% de 300 = 210
        assertEq(musd.pendingWithdrawals(address(0xAAA)), 210 ether);
        // 30% de 300 = 90
        assertEq(musd.pendingWithdrawals(address(0xBBB)), 90 ether);
    }

    function testClaimPayments() public {
        vm.prank(user);
        musd.transferWithRoyalty(1, 100 ether);
        
        address artist = address(0xAAA);
        vm.prank(artist);
        musd.claimPayments();
        assertEq(musd.balanceOf(artist), 70 ether);
    }
}
