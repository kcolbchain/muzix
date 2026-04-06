// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface IMuzixCatalog {
    function royaltySplits(uint256 tokenId) external view returns (address[] memory recipients, uint16[] memory shares);
}

contract MUSD is ERC20, ERC20Permit, Ownable, ReentrancyGuard {
    IMuzixCatalog public catalog;
    mapping(address => uint256) public pendingWithdrawals;

    event RoyaltyDistributed(uint256 indexed tokenId, uint256 totalAmount);
    event BatchRoyaltyProcessed(uint256 totalTokensProcessed, uint256 totalVolume);
    event Withdrawal(address indexed payee, uint256 amount);

    constructor(address _catalog) 
        ERC20("Muzix USD", "MUSD") 
        ERC20Permit("Muzix USD") 
        Ownable(msg.sender) 
    {
        catalog = IMuzixCatalog(_catalog);
    }

    function mint(address to, uint256 amount) public onlyOwner {
        _mint(to, amount);
    }

    /**
     * @dev Processa royalties para uma única música (Atomic Hook)
     */
    function transferWithRoyalty(uint256 tokenId, uint256 amount) public nonReentrant returns (bool) {
        _distribute(tokenId, amount);
        return true;
    }

    /**
     * @dev Diferencial Sênior: Processamento em Lote (Batch Payouts)
     * Ideal para relatórios de Spotify/Apple Music.
     */
    function batchRoyaltyDistribution(uint256[] calldata tokenIds, uint256[] calldata amounts) public nonReentrant onlyOwner {
        require(tokenIds.length == amounts.length, "Mismatched arrays");
        uint256 totalVolume;

        for (uint i = 0; i < tokenIds.length; i++) {
            _distribute(tokenIds[i], amounts[i]);
            totalVolume += amounts[i];
        }

        emit BatchRoyaltyProcessed(tokenIds.length, totalVolume);
    }

    // Lógica interna de distribuição (Internal helper)
    function _distribute(uint256 tokenId, uint256 amount) internal {
        (address[] memory recipients, uint16[] memory shares) = catalog.royaltySplits(tokenId);
        require(recipients.length > 0, "No splits defined");

        _transfer(msg.sender, address(this), amount);

        for (uint i = 0; i < recipients.length; i++) {
            uint256 shareAmount = (amount * shares[i]) / 10000;
            pendingWithdrawals[recipients[i]] += shareAmount;
        }

        emit RoyaltyDistributed(tokenId, amount);
    }

    function claimPayments() public nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "No funds to claim");

        pendingWithdrawals[msg.sender] = 0;
        _transfer(address(this), msg.sender, amount);

        emit Withdrawal(msg.sender, amount);
    }
}
