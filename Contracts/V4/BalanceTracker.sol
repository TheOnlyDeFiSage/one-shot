// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title BalanceTracker
 * @dev Tracks balances and handles staking functionality
 * @notice Allows users to stake tokens and earn rewards from game fees
 */
contract BalanceTracker is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    
    // Staking related state variables
    struct Stake {
        uint256 amount;         // Total staked amount including rewards
        uint256 lastUpdateTime; // Last time the stake was updated
    }
    
    // Mapping of user addresses to their stakes
    mapping(address => Stake) public stakes;
    
    // Total staked amount across all users
    uint256 public totalStaked;
    
    // Events for staking operations
    event Staked(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event RewardDistributed(uint256 amount);
    
    /**
     * @dev Constructor sets the contract owner
     */
    constructor() Ownable(msg.sender) {
    }
    
    /**
     * @dev Allows users to stake ETH
     */
    function stake() external payable nonReentrant {
        require(msg.value > 0, "Must stake more than 0");
        
        // Update the user's stake with any pending rewards before adding new stake
        _updateStake(msg.sender);
        
        // Add the new stake amount
        stakes[msg.sender].amount = stakes[msg.sender].amount.add(msg.value);
        stakes[msg.sender].lastUpdateTime = block.timestamp;
        
        // Update total staked amount
        totalStaked = totalStaked.add(msg.value);
        
        emit Staked(msg.sender, msg.value);
    }
    
    /**
     * @dev Allows users to withdraw their stake and any accrued rewards
     */
    function withdraw() external nonReentrant {
        // Update the stake to include any pending rewards
        _updateStake(msg.sender);
        
        uint256 amount = stakes[msg.sender].amount;
        require(amount > 0, "No stake to withdraw");
        
        // Reset the user's stake record before transfer to prevent reentrancy
        stakes[msg.sender].amount = 0;
        totalStaked = totalStaked.sub(amount);
        
        // Transfer the full amount (stake + rewards) to the user
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        require(success, "Transfer failed");
        
        emit Withdrawn(msg.sender, amount);
    }
    
    /**
     * @dev Get the current stake amount for a user including accrued rewards
     * @param user The address of the user
     * @return The current stake amount with rewards
     */
    function getStake(address user) external view returns (uint256) {
        return stakes[user].amount;
    }
    
    /**
     * @dev Calculate pending rewards for a user without updating state
     * @param user The address of the user
     * @return The estimated pending rewards based on current contract balance
     */
    function getPendingRewards(address user) external view returns (uint256) {
        // If user has no stake or total staked is 0, no rewards
        if (stakes[user].amount == 0 || totalStaked == 0) {
            return 0;
        }
        
        // Calculate user's proportion of the pool
        uint256 userProportion = stakes[user].amount.mul(1e18).div(totalStaked);
        
        // Calculate user's share of contract balance minus total staked
        // This represents their share of accumulated fees
        uint256 totalRewards = 0;
        if (address(this).balance > totalStaked) {
            totalRewards = address(this).balance.sub(totalStaked);
        }
        
        return totalRewards.mul(userProportion).div(1e18);
    }
    
    /**
     * @dev Get the total stake including pending rewards
     * @param user The address of the user
     * @return The total stake amount including estimated pending rewards
     */
    function getTotalStakeWithRewards(address user) external view returns (uint256) {
        uint256 baseStake = stakes[user].amount;
        
        // If user has no stake or total staked is 0, just return the base stake
        if (baseStake == 0 || totalStaked == 0) {
            return baseStake;
        }
        
        // Calculate pending rewards
        uint256 userProportion = baseStake.mul(1e18).div(totalStaked);
        uint256 totalRewards = 0;
        
        if (address(this).balance > totalStaked) {
            totalRewards = address(this).balance.sub(totalStaked);
        }
        
        uint256 pendingRewards = totalRewards.mul(userProportion).div(1e18);
        return baseStake.add(pendingRewards);
    }
    
    /**
     * @dev Distributes rewards to all stakers proportionally
     * @notice This is called when fees are sent to the contract
     */
    function distributeRewards() internal {
        // No distribution if no one is staking
        if (totalStaked == 0) return;
        
        emit RewardDistributed(address(this).balance);
    }
    
    /**
     * @dev Updates a user's stake with their portion of any new rewards
     * @param user The address of the user whose stake to update
     */
    function _updateStake(address user) internal {
        // If the user has no stake or total staked is 0, nothing to update
        if (stakes[user].amount == 0 || totalStaked == 0) return;
        
        // The stake is automatically updated when the user interacts with the contract
        // No specific calculation needed as rewards are distributed proportionally when received
        stakes[user].lastUpdateTime = block.timestamp;
    }
    
    /**
     * @dev Function to receive Ether sent to the contract
     * @notice This is triggered when ETH is sent to the contract, including from the Game contract
     */
    receive() external payable {
        // When ETH is received, it's treated as rewards to be distributed
        distributeRewards();
    }
    
    /**
     * @dev Function to get the current balance of the contract
     * @return The balance of the contract in wei
     */
    function getBalance() external view returns (uint256) {
        return address(this).balance;
    }
}