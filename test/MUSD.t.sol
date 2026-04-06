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
        musd.mint(user, 1000 ether);
    }

    function testPullPaymentLogic() public {
        vm.prank(user);
        musd.transferWithRoyalty(1, 100 ether);
        
        assertEq(musd.pendingWithdrawals(address(0xAAA)), 70 ether);
        assertEq(musd.pendingWithdrawals(address(0xBBB)), 30 ether);
        
        vm.prank(address(0xAAA));
        musd.claimPayments();
        assertEq(musd.balanceOf(address(0xAAA)), 70 ether);
    }
}
