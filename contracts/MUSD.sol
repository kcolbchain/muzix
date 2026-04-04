// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title MUSD
 * @dev USD-pegged stablecoin with built-in royalty split hooks
 * @notice When MUSD moves as a royalty payment, splits execute atomically
 * @author BountyClaw
 */
contract MUSD is ERC20, ERC20Burnable, Ownable, Pausable, ReentrancyGuard {
    
    /// @notice Basis points denominator (100% = 10000)
    uint256 public constant BASIS_POINTS = 10000;
    
    /// @notice Maximum royalty recipients per transfer
    uint256 public constant MAX_RECIPIENTS = 10;
    
    /// @notice Mapping from content ID to royalty split configuration
    mapping(bytes32 => RoyaltySplit) public royaltySplits;
    
    /// @notice Mapping from address to authorized royalty operator status
    mapping(address => bool) public authorizedOperators;
    
    /// @notice Structure defining royalty split configuration
    struct RoyaltySplit {
        address[] recipients;
        uint256[] percentages; // In basis points (e.g., 5000 = 50%)
        bool active;
    }
    
    /// @notice Events
    event RoyaltySplitConfigured(
        bytes32 indexed contentId,
        address[] recipients,
        uint256[] percentages
    );
    event RoyaltySplitRemoved(bytes32 indexed contentId);
    event RoyaltyDistributed(
        bytes32 indexed contentId,
        address indexed from,
        uint256 amount,
        uint256 recipientCount
    );
    event OperatorAuthorized(address indexed operator, bool authorized);
    
    /// @notice Custom errors
    error InvalidRecipientCount();
    error InvalidPercentage();
    error PercentageMismatch();
    error TransferFailed();
    error NotAuthorized();
    error InvalidContentId();
    
    /**
     * @dev Constructor initializes the token with name and symbol
     * @param initialOwner Address of the contract owner
     */
    constructor(address initialOwner) 
        ERC20("Muzix USD", "MUSD") 
        Ownable(initialOwner) 
    {}
    
    /**
     * @notice Configure royalty split for a content ID
     * @dev Only owner or authorized operators can configure splits
     * @param contentId Unique identifier for the content (song/album)
     * @param recipients Array of recipient addresses
     * @param percentages Array of percentages in basis points
     */
    function configureRoyaltySplit(
        bytes32 contentId,
        address[] calldata recipients,
        uint256[] calldata percentages
    ) external whenNotPaused {
        if (msg.sender != owner() && !authorizedOperators[msg.sender]) {
            revert NotAuthorized();
        }
        
        if (contentId == bytes32(0)) {
            revert InvalidContentId();
        }
        
        if (recipients.length == 0 || recipients.length > MAX_RECIPIENTS) {
            revert InvalidRecipientCount();
        }
        
        if (recipients.length != percentages.length) {
            revert InvalidRecipientCount();
        }
        
        uint256 totalPercentage;
        for (uint256 i = 0; i < percentages.length; i++) {
            if (percentages[i] == 0 || percentages[i] > BASIS_POINTS) {
                revert InvalidPercentage();
            }
            totalPercentage += percentages[i];
        }
        
        if (totalPercentage != BASIS_POINTS) {
            revert PercentageMismatch();
        }
        
        royaltySplits[contentId] = RoyaltySplit({
            recipients: recipients,
            percentages: percentages,
            active: true
        });
        
        emit RoyaltySplitConfigured(contentId, recipients, percentages);
    }
    
    /**
     * @notice Remove royalty split configuration
     * @param contentId Unique identifier for the content
     */
    function removeRoyaltySplit(bytes32 contentId) external onlyOwner {
        delete royaltySplits[contentId];
        emit RoyaltySplitRemoved(contentId);
    }
    
    /**
     * @notice Transfer MUSD with automatic royalty split
     * @dev Atomically splits payment among configured recipients
     * @param contentId Content identifier for royalty lookup
     * @param amount Total amount to transfer (will be split)
     * @return success Whether the transfer succeeded
     */
    function transferWithRoyalty(
        bytes32 contentId,
        uint256 amount
    ) external whenNotPaused nonReentrant returns (bool success) {
        RoyaltySplit storage split = royaltySplits[contentId];
        
        if (!split.active) {
            // No split configured, transfer directly to sender's intended recipient
            return transfer(msg.sender, amount);
        }
        
        // Transfer total amount from sender to this contract first
        _transfer(msg.sender, address(this), amount);
        
        // Distribute to recipients atomically
        for (uint256 i = 0; i < split.recipients.length; i++) {
            uint256 share = (amount * split.percentages[i]) / BASIS_POINTS;
            if (share > 0) {
                _transfer(address(this), split.recipients[i], share);
            }
        }
        
        emit RoyaltyDistributed(contentId, msg.sender, amount, split.recipients.length);
        
        return true;
    }
    
    /**
     * @notice Batch transfer with royalty splits for multiple content IDs
     * @param contentIds Array of content identifiers
     * @param amounts Array of amounts for each transfer
     */
    function batchTransferWithRoyalty(
        bytes32[] calldata contentIds,
        uint256[] calldata amounts
    ) external whenNotPaused nonReentrant {
        if (contentIds.length != amounts.length) {
            revert InvalidRecipientCount();
        }
        
        for (uint256 i = 0; i < contentIds.length; i++) {
            this.transferWithRoyalty(contentIds[i], amounts[i]);
        }
    }
    
    /**
     * @notice Authorize or revoke operator status
     * @param operator Address to authorize
     * @param authorized Authorization status
     */
    function setOperatorAuthorization(
        address operator, 
        bool authorized
    ) external onlyOwner {
        authorizedOperators[operator] = authorized;
        emit OperatorAuthorized(operator, authorized);
    }
    
    /**
     * @notice Mint new MUSD tokens (only owner)
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }
    
    /**
     * @notice Pause token transfers (only owner)
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause token transfers (only owner)
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Get royalty split details for a content ID
     * @param contentId Content identifier
     * @return recipients Array of recipient addresses
     * @return percentages Array of percentages in basis points
     * @return active Whether the split is active
     */
    function getRoyaltySplit(bytes32 contentId) 
        external 
        view 
        returns (
            address[] memory recipients,
            uint256[] memory percentages,
            bool active
        ) 
    {
        RoyaltySplit storage split = royaltySplits[contentId];
        return (split.recipients, split.percentages, split.active);
    }
    
    /**
     * @notice Calculate royalty share for a specific recipient
     * @param contentId Content identifier
     * @param amount Total amount
     * @param recipientIndex Index of recipient in split configuration
     * @return share Amount the recipient would receive
     */
    function calculateRoyaltyShare(
        bytes32 contentId,
        uint256 amount,
        uint256 recipientIndex
    ) external view returns (uint256 share) {
        RoyaltySplit storage split = royaltySplits[contentId];
        if (!split.active || recipientIndex >= split.recipients.length) {
            return 0;
        }
        return (amount * split.percentages[recipientIndex]) / BASIS_POINTS;
    }
    
    /**
     * @dev Override transfer to include pause functionality
     */
    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal override whenNotPaused {
        super._beforeTokenTransfer(from, to, amount);
    }
}
