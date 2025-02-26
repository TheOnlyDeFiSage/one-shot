// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "remix_tests.sol";
import "remix_accounts.sol";
import "../BalanceTracker.sol";

contract BalanceTrackerTest {
    // Test variables
    BalanceTracker public balanceTracker;
    
    /// Test deployment
    function testDeployment() public {
        balanceTracker = new BalanceTracker();
        Assert.notEqual(address(balanceTracker), address(0), "BalanceTracker should deploy");
    }
    
    /// Test initial state
    function testInitialState() public {
        if (address(balanceTracker) == address(0)) {
            balanceTracker = new BalanceTracker();
        }
        
        // Initial total staked
        uint256 totalStaked = balanceTracker.totalStaked();
        Assert.equal(totalStaked, 0, "Initial totalStaked should be 0");
        
        // Initial balance
        uint256 balance = balanceTracker.getBalance();
        Assert.equal(balance, 0, "Initial balance should be 0");
    }
    
    /// Test ownership
    function testOwnership() public {
        if (address(balanceTracker) == address(0)) {
            balanceTracker = new BalanceTracker();
        }
        
        address owner = balanceTracker.owner();
        Assert.equal(owner, address(this), "Test contract should be the owner");
    }
    
    /// Test getting stake
    function testGetStake() public {
        if (address(balanceTracker) == address(0)) {
            balanceTracker = new BalanceTracker();
        }
        
        uint256 stake = balanceTracker.getStake(address(this));
        Assert.equal(stake, 0, "Initial stake should be 0");
    }
    
    /// Test getting pending rewards
    function testGetPendingRewards() public {
        if (address(balanceTracker) == address(0)) {
            balanceTracker = new BalanceTracker();
        }
        
        uint256 rewards = balanceTracker.getPendingRewards(address(this));
        Assert.equal(rewards, 0, "Initial rewards should be 0");
    }
    
    /// Test staking
    /// #value: 100000000000000000
    function testStake() public payable {
        if (address(balanceTracker) == address(0)) {
            balanceTracker = new BalanceTracker();
        }
        
        uint256 stakeAmount = msg.value; // 0.1 ETH
        
        uint256 initialTotalStaked = balanceTracker.totalStaked();
        
        // Stake funds
        balanceTracker.stake{value: stakeAmount}();
        
        // Verify total staked increased
        uint256 newTotalStaked = balanceTracker.totalStaked();
        Assert.equal(newTotalStaked, initialTotalStaked + stakeAmount, "Total staked should increase");
        
        // Verify user stake updated
        uint256 userStake = balanceTracker.getStake(address(this));
        Assert.equal(userStake, stakeAmount, "User stake should match staked amount");
    }
    
    /// Test getting total stake with rewards
    function testGetTotalStakeWithRewards() public {
        if (address(balanceTracker) == address(0)) {
            balanceTracker = new BalanceTracker();
        }
        
        uint256 totalStake = balanceTracker.getTotalStakeWithRewards(address(this));
        
        // If we've staked, total stake should be at least the staked amount
        if (balanceTracker.getStake(address(this)) > 0) {
            Assert.equal(totalStake >= balanceTracker.getStake(address(this)), true, 
                "Total stake with rewards should be at least the base stake");
        } else {
            Assert.equal(totalStake, 0, "Total stake with rewards should be 0 when not staked");
        }
    }
    
    // Fallback function to receive ETH
    receive() external payable {}
}