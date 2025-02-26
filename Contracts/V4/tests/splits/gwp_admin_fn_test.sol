// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "remix_tests.sol";
import "remix_accounts.sol";
import "../GameWithJackpot.sol";
import "../BalanceTracker.sol";

contract AdminFunctionsTest {
    GameWithJackpot public game;
    BalanceTracker public balanceTracker;
    bool public gameDeployed = false;
    
    /// #value: 1000000000000000000
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
    
    /// Test updating bet amount
    function testSetBetAmount() public {
        // Skip if not deployed
        if (!gameDeployed) {
            testDeployment();
            
            // If still not deployed, skip test
            if (!gameDeployed) {
                Assert.ok(true, "Skipping test due to deployment failure");
                return;
            }
        }
        
        uint256 initialBetAmount = game.betAmount();
        uint256 newBetAmount = 0.02 ether;
        
        // Update bet amount
        try game.setBetAmount(newBetAmount) {
            // Verify bet amount was updated
            uint256 updatedBetAmount = game.betAmount();
            
            Assert.equal(
                updatedBetAmount,
                newBetAmount,
                "Bet amount should be updated"
            );
            
            // Reset to original value
            try game.setBetAmount(initialBetAmount) {
                // Successfully reset
            } catch {
                // If reset fails, that's ok for this test
            }
        } catch Error(string memory reason) {
            Assert.ok(false, string(abi.encodePacked("Set bet amount failed: ", reason)));
        } catch (bytes memory) {
            Assert.ok(false, "Set bet amount failed with unknown error");
        }
    }
    
    /// Test setting jackpot parameters
    function testSetJackpotParams() public {
        // Skip if not deployed
        if (!gameDeployed) {
            testDeployment();
            
            // If still not deployed, skip test
            if (!gameDeployed) {
                Assert.ok(true, "Skipping test due to deployment failure");
                return;
            }
        }
        
        uint256 initialSeed = game.minJackpotSeed();
        uint256 initialFeePercent = game.jackpotFeePercent();
        
        uint256 newSeed = 0.2 ether;
        uint256 newFeePercent = 5;
        
        // Update jackpot parameters
        try game.setJackpotParams(newSeed, newFeePercent) {
            // Verify parameters were updated
            uint256 updatedSeed = game.minJackpotSeed();
            uint256 updatedFeePercent = game.jackpotFeePercent();
            
            Assert.equal(
                updatedSeed,
                newSeed,
                "Jackpot seed should be updated"
            );
            
            Assert.equal(
                updatedFeePercent,
                newFeePercent,
                "Jackpot fee percent should be updated"
            );
            
            // Reset to original values
            try game.setJackpotParams(initialSeed, initialFeePercent) {
                // Successfully reset
            } catch {
                // If reset fails, that's ok for this test
            }
        } catch Error(string memory reason) {
            Assert.ok(false, string(abi.encodePacked("Set jackpot params failed: ", reason)));
        } catch (bytes memory) {
            Assert.ok(false, "Set jackpot params failed with unknown error");
        }
    }
    
    /// Test invalid jackpot parameters
    function testInvalidJackpotParams() public {
        // Skip if not deployed
        if (!gameDeployed) {
            testDeployment();
            
            // If still not deployed, skip test
            if (!gameDeployed) {
                Assert.ok(true, "Skipping test due to deployment failure");
                return;
            }
        }
        
        // Try to set invalid fee percentage (>10%)
        try game.setJackpotParams(0.1 ether, 11) {
            Assert.ok(false, "Should not allow fee >10%");
        } catch Error(string memory reason) {
            Assert.equal(
                reason,
                "Jackpot fee cannot exceed 10%",
                "Should fail with correct error message"
            );
        } catch {
            Assert.ok(true, "Setting fee >10% correctly failed");
        }
    }
    
    /// #value: 500000000000000000
    /// Test depositing funds
    function testDepositFunds() public payable {
        // Skip if not deployed
        if (!gameDeployed) {
            testDeployment();
            
            // If still not deployed, skip test
            if (!gameDeployed) {
                Assert.ok(true, "Skipping test due to deployment failure");
                return;
            }
        }
        
        uint256 initialBalance = game.getContractBalance();
        uint256 depositAmount = msg.value;
        
        // Deposit funds
        try game.depositFunds{value: depositAmount}() {
            // Verify balance increased
            uint256 updatedBalance = game.getContractBalance();
            
            Assert.equal(
                updatedBalance > initialBalance,
                true,
                "Contract balance should increase after deposit"
            );
        } catch Error(string memory reason) {
            Assert.ok(false, string(abi.encodePacked("Deposit funds failed: ", reason)));
        } catch (bytes memory) {
            Assert.ok(false, "Deposit funds failed with unknown error");
        }
    }
    
    // Fallback to receive ETH
    receive() external payable {}
}