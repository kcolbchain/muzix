// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IMUSD.sol";
import "./interfaces/IRoyaltySplitter.sol";

/**
 * @title MUSD
 * @notice USD-pegged stablecoin for the Muzix music-finance platform.
 *
 * Key features:
 *  - Authorised minters can mint/burn (USD peg maintained off-chain).
 *  - Transfers to registered RoyaltySplitter contracts automatically trigger
 *    an atomic royalty split to the splitter's beneficiaries.
 *  - Pausable by admin for emergency stops.
 *  - Role-based access control (ADMIN_ROLE, MINTER_ROLE).
 */
contract MUSD is ERC20, AccessControl, Pausable, IMUSD {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    /// @dev Set of addresses recognised as RoyaltySplitter contracts.
    mapping(address => bool) private _registeredSplitters;

    /// @dev Guard to prevent recursive split hooks.
    bool private _inSplitHook;

    constructor(address admin) ERC20("Muzix USD", "MUSD") {
        require(admin != address(0), "MUSD: zero admin");
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(MINTER_ROLE, admin);
    }

    // ──────────────────────────── Minting / Burning ────────────────────────────

    /// @inheritdoc IMUSD
    function mint(address to, uint256 amount) external override onlyRole(MINTER_ROLE) {
        require(to != address(0), "MUSD: mint to zero");
        require(amount > 0, "MUSD: zero amount");
        _mint(to, amount);
        emit Minted(to, amount);
    }

    /// @inheritdoc IMUSD
    function burn(uint256 amount) external override {
        require(amount > 0, "MUSD: zero amount");
        _burn(msg.sender, amount);
        emit Burned(msg.sender, amount);
    }

    // ──────────────────────────── Minter Management ────────────────────────────

    /// @inheritdoc IMUSD
    function addMinter(address account) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(account != address(0), "MUSD: zero address");
        _grantRole(MINTER_ROLE, account);
        emit MinterAdded(account);
    }

    /// @inheritdoc IMUSD
    function removeMinter(address account) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _revokeRole(MINTER_ROLE, account);
        emit MinterRemoved(account);
    }

    /// @inheritdoc IMUSD
    function isMinter(address account) external view override returns (bool) {
        return hasRole(MINTER_ROLE, account);
    }

    // ─────────────────────── Royalty Splitter Registry ──────────────────────────

    /// @inheritdoc IMUSD
    function registerSplitter(address splitter) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(splitter != address(0), "MUSD: zero address");
        require(!_registeredSplitters[splitter], "MUSD: already registered");
        _registeredSplitters[splitter] = true;
        emit RoyaltySplitterRegistered(splitter);
    }

    /// @inheritdoc IMUSD
    function unregisterSplitter(address splitter) external override onlyRole(DEFAULT_ADMIN_ROLE) {
        require(_registeredSplitters[splitter], "MUSD: not registered");
        _registeredSplitters[splitter] = false;
        emit RoyaltySplitterUnregistered(splitter);
    }

    /// @inheritdoc IMUSD
    function isRegisteredSplitter(address account) external view override returns (bool) {
        return _registeredSplitters[account];
    }

    // ──────────────────────────── Pause Controls ───────────────────────────────

    /// @inheritdoc IMUSD
    function pause() external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /// @inheritdoc IMUSD
    function unpause() external override onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    // ────────────────────────── Transfer Override ───────────────────────────────

    /**
     * @dev Override ERC-20 _update to enforce pause and trigger royalty split
     *      hooks when the recipient is a registered splitter.
     */
    function _update(
        address from,
        address to,
        uint256 amount
    ) internal virtual override whenNotPaused {
        super._update(from, to, amount);

        // Trigger split hook when recipient is a registered splitter and we are
        // not already inside a split callback (prevents recursion).
        if (to != address(0) && _registeredSplitters[to] && !_inSplitHook) {
            _inSplitHook = true;
            IRoyaltySplitter(to).onRoyaltyReceived(from, amount);
            _inSplitHook = false;
        }
    }

    // ────────────────────────── ERC-165 Support ────────────────────────────────

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(AccessControl)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
