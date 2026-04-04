// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title IMUSD
 * @notice Interface for the MUSD USD-pegged stablecoin with royalty split hooks.
 */
interface IMUSD is IERC20 {
    /// @notice Emitted when tokens are minted.
    event Minted(address indexed to, uint256 amount);

    /// @notice Emitted when tokens are burned.
    event Burned(address indexed from, uint256 amount);

    /// @notice Emitted when a minter role is granted.
    event MinterAdded(address indexed account);

    /// @notice Emitted when a minter role is revoked.
    event MinterRemoved(address indexed account);

    /// @notice Emitted when a royalty splitter contract is registered.
    event RoyaltySplitterRegistered(address indexed splitter);

    /// @notice Emitted when a royalty splitter contract is unregistered.
    event RoyaltySplitterUnregistered(address indexed splitter);

    /// @notice Mint `amount` MUSD to `to`. Caller must be an authorized minter.
    function mint(address to, uint256 amount) external;

    /// @notice Burn `amount` MUSD from the caller's balance.
    function burn(uint256 amount) external;

    /// @notice Grant minter role to `account`. Caller must be admin.
    function addMinter(address account) external;

    /// @notice Revoke minter role from `account`. Caller must be admin.
    function removeMinter(address account) external;

    /// @notice Check whether `account` is an authorized minter.
    function isMinter(address account) external view returns (bool);

    /// @notice Register a RoyaltySplitter contract address for automatic split hooks.
    function registerSplitter(address splitter) external;

    /// @notice Unregister a RoyaltySplitter contract address.
    function unregisterSplitter(address splitter) external;

    /// @notice Check whether `account` is a registered royalty splitter.
    function isRegisteredSplitter(address account) external view returns (bool);

    /// @notice Pause all token transfers.
    function pause() external;

    /// @notice Unpause token transfers.
    function unpause() external;
}
