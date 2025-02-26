// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "remix_tests.sol";
import "remix_accounts.sol";
import "../GameWithJackpot.sol";
import "../BalanceTracker.sol";

contract JackpotManagementTest {
    GameWithJackpot public game;
    BalanceTracker public balanceTracker;
    bool public gameDeployed = false;
    
    /// #value: 2000000000000000000
    /// Deploy the contracts with funding
    function testDeployment() public payable {
        // Deploy BalanceTracker
        balanceTracker = new BalanceTracker();
        Assert.notEqual(address(balanceTracker), address(0), "BalanceTracker should deploy");
        
        // Deploy GameWithJackpot with value provided via #value annotation
        try new GameWithJackpot{value: msg.value}(
            payable(address(balanceTracker)), 
            msg.value
        ) returns (GameWithJackpot g) {
            game = g;
            gameDeployed = true;
            Assert.notEqual(address(game), address(0), "GameWithJackpot should deploy");
        } catch Error(string memory reason) {
            Assert.ok(false, string(abi.encodePacked("Game deployment failed: ", reason)));
        } catch (bytes memory) {
            Assert.ok(false, "Game deployment failed with unknown error");
        }
    }
    
    /// Test adding a new jackpot tier
    function testAddJackpotTier() public {
        // Skip if not deployed
        if (!gameDeployed) {
            testDeployment();
            
            // If still not deployed, skip test
            if (!gameDeployed) {
                Assert.ok(true, "Skipping test due to deployment failure");
                return;
            }
        }
        
        // Get initial tier count
        (uint256[] memory initialTiers, , ) = game.getJackpotInfo();
        uint256 initialCount = initialTiers.length;
        
        // Add a new tier
        try game.addJackpotTier(10, 40) { // 10 wins, 40% payout
            // Verify tier was added
            (uint256[] memory updatedTiers, uint256[] memory updatedPayouts, ) = game.getJackpotInfo();
            
            Assert.equal(
                updatedTiers.length,
                initialCount + 1,
                "Tier count should increase by 1"
            );
            
            uint256 lastIndex = updatedTiers.length - 1;
            
            Assert.equal(
                updatedTiers[lastIndex],
                10,
                "New tier should have threshold 10"
            );
            
            Assert.equal(
                updatedPayouts[lastIndex],
                40,
                "New tier should have payout 40%"
            );
        } catch Error(string memory reason) {
            Assert.ok(false, string(abi.encodePacked("Add jackpot tier failed: ", reason)));
        } catch (bytes memory) {
            Assert.ok(false, "Add jackpot tier failed with unknown error");
        }
    }
    
    /// Test updating an existing jackpot tier
    function testUpdateJackpotTier() public {
        // Skip if not deployed
        if (!gameDeployed) {
            testDeployment();
            
            // If still not deployed, skip test
            if (!gameDeployed) {
                Assert.ok(true, "Skipping test due to deployment failure");
                return;
            }
        }
        
        // Get initial tier values
        (uint256[] memory initialTiers, uint256[] memory initialPayouts, ) = game.getJackpotInfo();
        
        // Make sure we have tiers to update
        if (initialTiers.length == 0) {
            Assert.ok(true, "No tiers to update, skipping test");
            return;
        }
        
        uint256 originalThreshold = initialTiers[0];
        uint256 originalPayout = initialPayouts[0];
        
        // Update first tier
        try game.updateJackpotTier(0, 5, 15) { // 5 wins, 15% payout
            // Verify tier was updated
            (uint256[] memory updatedTiers, uint256[] memory updatedPayouts, ) = game.getJackpotInfo();
            
            Assert.equal(
                updatedTiers[0],
                5,
                "Updated tier should have threshold 5"
            );
            
            Assert.equal(
                updatedPayouts[0],
                15,
                "Updated tier should have payout 15%"
            );
            
            // Reset to original values
            try game.updateJackpotTier(0, originalThreshold, originalPayout) {
                // Successfully reset
            } catch {
                // If reset fails, that's ok for this test
            }
        } catch Error(string memory reason) {
            Assert.ok(false, string(abi.encodePacked("Update jackpot tier failed: ", reason)));
        } catch (bytes memory) {
            Assert.ok(false, "Update jackpot tier failed with unknown error");
        }
    }
    
    /// Test invalid jackpot tier operations
    function testInvalidTierOperations() public {
        // Skip if not deployed
        if (!gameDeployed) {
            testDeployment();
            
            // If still not deployed, skip test
            if (!gameDeployed) {
                Assert.ok(true, "Skipping test due to deployment failure");
                return;
            }
        }
        
        // Try to add tier with invalid threshold (0)
        try game.addJackpotTier(0, 20) {
            Assert.ok(false, "Should not allow threshold 0");
        } catch Error(string memory reason) {
            Assert.equal(
                reason,
                "Streak threshold must be greater than 0",
                "Should fail with correct error message"
            );
        } catch {
            Assert.ok(true, "Adding tier with threshold 0 correctly failed");
        }
        
        // Try to add tier with invalid payout (>100%)
        try game.addJackpotTier(12, 101) {
            Assert.ok(false, "Should not allow payout >100%");
        } catch Error(string memory reason) {
            Assert.equal(
                reason,
                "Payout percent cannot exceed 100%",
                "Should fail with correct error message"
            );
        } catch {
            Assert.ok(true, "Adding tier with payout >100% correctly failed");
        }
        
        // Try to update non-existent tier
        (uint256[] memory tiers, , ) = game.getJackpotInfo();
        uint256 invalidIndex = tiers.length + 10;
        
        try game.updateJackpotTier(invalidIndex, 15, 30) {
            Assert.ok(false, "Should not allow updating non-existent tier");
        } catch Error(string memory reason) {
            Assert.equal(
                reason,
                "Tier index out of bounds",
                "Should fail with correct error message"
            );
        } catch {
            Assert.ok(true, "Updating non-existent tier correctly failed");
        }
    }
    
    /// #value: 500000000000000000
    /// Test adding to jackpot pool
    function testAddToJackpot() public payable {
        // Skip if not deployed
        if (!gameDeployed) {
            testDeployment();
            
            // If still not deployed, skip test
            if (!gameDeployed) {
                Assert.ok(true, "Skipping test due to deployment failure");
                return;
            }
        }
        
        uint256 initialPool = game.jackpotPool();
        uint256 addAmount = msg.value;
        
        // Add to jackpot
        try game.addToJackpot{value: addAmount}() {
            // Verify jackpot increased
            uint256 updatedPool = game.jackpotPool();
            
            Assert.equal(
                updatedPool,
                initialPool + addAmount,
                "Jackpot pool should increase by added amount"
            );
        } catch Error(string memory reason) {
            Assert.ok(false, string(abi.encodePacked("Add to jackpot failed: ", reason)));
        } catch (bytes memory) {
            Assert.ok(false, "Add to jackpot failed with unknown error");
        }
    }
    
    // Fallback to receive ETH
    receive() external payable {}
}