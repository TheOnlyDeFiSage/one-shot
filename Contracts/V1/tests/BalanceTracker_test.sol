// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "remix_tests.sol";
import "remix_accounts.sol";
import "../BalanceTracker.sol";

// Test contract for BalanceTracker.sol
contract BalanceTrackerTest {
    // Variables
    address payable public deployedTracker;
    
    // Events for logging
    event LogValue(string message, uint256 value);
    event LogAddress(string message, address addr);
    event LogString(string message);
    
    // Receive function to accept ETH transfers
    receive() external payable {}
    
    /// Constructor - runs once when test contract deploys
    constructor() payable {}
    
    /// Simple first passing test
    function testCanary() public {
        // This test should always pass to verify the testing framework is working
        Assert.ok(true, "Testing framework is working");
    }
    
    /// Test contract deployment
    function testDeployment() public {
        // Create a new BalanceTracker instance
        deployedTracker = payable ( address(new BalanceTracker()));
        
        // Log the address
        emit LogAddress("BalanceTracker deployed at", deployedTracker);
        
        // Should not be zero address
        Assert.notEqual(deployedTracker, address(0), "BalanceTracker should be deployed");
    }
    
    /// Test initial state
    function testInitialState() public {
        // Skip if not deployed
        if (deployedTracker == address(0)) {
            emit LogString("BalanceTracker not deployed, skipping test");
            Assert.ok(true, "Skipping test");
            return;
        }
        
        // Check initial balance
        uint256 balance = address(deployedTracker).balance;
        Assert.equal(balance, 0, "Initial balance should be 0");
        
        // Check owner
        BalanceTracker tracker = BalanceTracker(deployedTracker);
        address owner = tracker.owner();
        Assert.equal(owner, deployedTracker, "Owner should be the contract itself");
    }
    
    /// Test sending ETH
    /// #value: 500000000000000000
    function testSendETH() public payable {
        // Skip if not deployed
        if (deployedTracker == address(0)) {
            emit LogString("BalanceTracker not deployed, skipping test");
            Assert.ok(true, "Skipping test");
            return;
        }
        
        // Initial balance
        uint256 initialBalance = address(deployedTracker).balance;
        emit LogValue("Initial balance", initialBalance);
        
        // Send ETH using low-level call
        (bool success, ) = deployedTracker.call{value: 0.5 ether}("");
        
        // Log result
        emit LogValue("Send ETH success", success ? 1 : 0);
        
        // This should succeed
        Assert.equal(success, true, "Should be able to send ETH to BalanceTracker");
        
        // Check final balance
        uint256 finalBalance = address(deployedTracker).balance;
        emit LogValue("Final balance", finalBalance);
        
        // Should increase by 0.5 ETH
        Assert.equal(finalBalance, initialBalance + 0.5 ether, "Balance should increase by 0.5 ETH");
    }
    
    /// Test getBalance function
    function testGetBalance() public {
        // Skip if not deployed
        if (deployedTracker == address(0)) {
            emit LogString("BalanceTracker not deployed, skipping test");
            Assert.ok(true, "Skipping test");
            return;
        }
        
        // Get the current balance from the contract
        BalanceTracker tracker = BalanceTracker(deployedTracker);
        uint256 reportedBalance = tracker.getBalance();
        
        // Get the actual balance
        uint256 actualBalance = address(deployedTracker).balance;
        
        // Log balances
        emit LogValue("Reported balance", reportedBalance);
        emit LogValue("Actual balance", actualBalance);
        
        // Should match
        Assert.equal(reportedBalance, actualBalance, "getBalance should match actual balance");
    }
}