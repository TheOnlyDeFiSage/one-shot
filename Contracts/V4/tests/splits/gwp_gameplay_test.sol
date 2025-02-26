// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "remix_tests.sol";
import "remix_accounts.sol";
import "../GameWithJackpot.sol";
import "../BalanceTracker.sol";

contract GameplayTest {
    GameWithJackpot public game;
    BalanceTracker public balanceTracker;
    bool public gameDeployed = false;
    
    // Test accounts
    address payable public acc0;
    address payable public acc1;
    
    /// #value: 5000000000000000000
    /// Deploy the contracts with funding
    function testDeployment() public payable {
        acc0 = payable(TestsAccounts.getAccount(0));
        acc1 = payable(TestsAccounts.getAccount(1));
        
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
    
    /// #value: 10000000000000000
    /// Test playing the game
    function testPlay() public payable {
        // Skip if not deployed
        if (!gameDeployed) {
            testDeployment();
            
            // If still not deployed, skip test
            if (!gameDeployed) {
                Assert.ok(true, "Skipping test due to deployment failure");
                return;
            }
        }
        
        // Verify the bet amount
        Assert.equal(msg.value, game.betAmount(), "Value should match bet amount");
        
        // Get initial stats and balance
        (uint256 initialWins, uint256 initialLosses, ) = game.getPlayerStats(address(this));
        uint256 initialStreak = game.getPlayerStreak(address(this));
        uint256 initialJackpotPool = game.jackpotPool();
        
        // Play the game
        try game.play{value: msg.value}() {
            // Get updated stats
            (uint256 updatedWins, uint256 updatedLosses, ) = game.getPlayerStats(address(this));
            uint256 updatedStreak = game.getPlayerStreak(address(this));
            uint256 updatedJackpotPool = game.jackpotPool();
            
            // Verify either wins or losses increased
            bool statsChanged = (updatedWins > initialWins) || (updatedLosses > initialLosses);
            Assert.equal(statsChanged, true, "Either wins or losses should increase after playing");
            
            // Verify streak changed appropriately
            if (updatedWins > initialWins) {
                // Player won
                Assert.equal(updatedStreak, initialStreak + 1, "Streak should increase on win");
            } else {
                // Player lost
                Assert.equal(updatedStreak, 0, "Streak should reset to 0 on loss");
            }
            
            // Verify jackpot pool increased by fee
            Assert.equal(updatedJackpotPool > initialJackpotPool, true, "Jackpot pool should increase");
        } catch Error(string memory reason) {
            Assert.ok(false, string(abi.encodePacked("Play failed: ", reason)));
        } catch (bytes memory) {
            Assert.ok(false, "Play failed with unknown error");
        }
    }
    
    /// #value: 10000000000000000
    /// Test a second play to check streak tracking
    function testSecondPlay() public payable {
        // Skip if not deployed
        if (!gameDeployed) {
            Assert.ok(true, "Skipping test due to deployment failure");
            return;
        }
        
        // Get initial streak
        uint256 initialStreak = game.getPlayerStreak(address(this));
        
        // Play the game
        try game.play{value: msg.value}() {
            // Get updated streak
            uint256 updatedStreak = game.getPlayerStreak(address(this));
            
            // Check if we won or lost
            if (updatedStreak > initialStreak) {
                // Won - streak should increase
                Assert.equal(updatedStreak, initialStreak + 1, "Streak should increase on win");
            } else {
                // Lost - streak should reset
                Assert.equal(updatedStreak, 0, "Streak should reset to 0 on loss");
            }
            
            // Verify bet was recorded in history
            GameWithJackpot.BetInfo[10] memory history = game.getBetHistory(address(this));
            Assert.equal(history[0].timestamp > 0 || history[1].timestamp > 0, true, 
                "Bet should be recorded in history");
        } catch Error(string memory reason) {
            Assert.ok(false, string(abi.encodePacked("Second play failed: ", reason)));
        } catch (bytes memory) {
            Assert.ok(false, "Second play failed with unknown error");
        }
    }
    
    // Fallback to receive ETH
    receive() external payable {}
}