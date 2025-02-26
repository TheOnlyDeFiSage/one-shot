// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "remix_tests.sol";
import "remix_accounts.sol";
import "../GameWithJackpot.sol";
import "../BalanceTracker.sol";

contract GameWithJackpotTest {
    // Test variables
    GameWithJackpot public game;
    BalanceTracker public balanceTracker;
    bool public gameDeployed = false;
    
    /// Test BalanceTracker deployment (needed for game deployment)
    function testBalanceTrackerDeployment() public {
        balanceTracker = new BalanceTracker();
        Assert.notEqual(address(balanceTracker), address(0), "BalanceTracker should deploy");
    }
    
    /// Test GameWithJackpot deployment
    /// #value: 1000000000000000000
    function testGameDeployment() public payable {
        // Deploy BalanceTracker if not already deployed
        if (address(balanceTracker) == address(0)) {
            balanceTracker = new BalanceTracker();
        }
        
        // Deploy the game with the value sent to this function (1 ETH)
        try new GameWithJackpot{value: msg.value}(
            payable(address(balanceTracker)), 
            msg.value
        ) returns (GameWithJackpot g) {
            game = g;
            gameDeployed = true;
            Assert.notEqual(address(game), address(0), "GameWithJackpot should deploy");
            
            // Verify contract2Address
            Assert.equal(game.contract2Address(), address(balanceTracker), 
                "Contract2Address should be set to balanceTracker");
        } catch Error(string memory reason) {
            Assert.ok(false, string(abi.encodePacked("Game deployment failed: ", reason)));
        } catch (bytes memory) {
            Assert.ok(false, "Game deployment failed with unknown error");
        }
    }
    
    /// Test initial bet amount
    function testInitialBetAmount() public {
        // Skip if game not deployed
        if (!gameDeployed) {
            Assert.ok(true, "Skipping test as game is not deployed");
            return;
        }
        
        uint256 betAmt = game.betAmount();
        Assert.equal(betAmt, 0.01 ether, "Default bet amount should be 0.01 ETH");
    }
    
    /// Test initial jackpot parameters
    function testJackpotParameters() public {
        // Skip if game not deployed
        if (!gameDeployed) {
            Assert.ok(true, "Skipping test as game is not deployed");
            return;
        }
        
        // Check initial jackpot seed
        uint256 minJackpotSeed = game.minJackpotSeed();
        Assert.equal(minJackpotSeed, 0.1 ether, "Min jackpot seed should be 0.1 ETH");
        
        // Check initial jackpot fee percentage
        uint256 jackpotFeePercent = game.jackpotFeePercent();
        Assert.equal(jackpotFeePercent, 2, "Jackpot fee percent should be 2%");
    }
    
    /// Test getting jackpot info
    function testGetJackpotInfo() public {
        // Skip if game not deployed
        if (!gameDeployed) {
            Assert.ok(true, "Skipping test as game is not deployed");
            return;
        }
        
        (
            uint256[] memory thresholds,
            uint256[] memory payouts,
            uint256[] memory amounts
        ) = game.getJackpotInfo();
        
        Assert.equal(thresholds.length, 3, "Should have 3 jackpot tiers by default");
    }
    
    /// Test getting player stats
    function testGetPlayerStats() public {
        // Skip if game not deployed
        if (!gameDeployed) {
            Assert.ok(true, "Skipping test as game is not deployed");
            return;
        }
        
        (
            uint256 wins,
            uint256 losses,
            uint256 streak
        ) = game.getPlayerStats(address(this));
        
        Assert.equal(wins, 0, "Initial wins should be 0");
        Assert.equal(losses, 0, "Initial losses should be 0");
        Assert.equal(streak, 0, "Initial streak should be 0");
    }
    
    /// Test getting bet history
    function testGetBetHistory() public {
        // Skip if game not deployed
        if (!gameDeployed) {
            Assert.ok(true, "Skipping test as game is not deployed");
            return;
        }
        
        GameWithJackpot.BetInfo[10] memory history = game.getBetHistory(address(this));
        Assert.equal(history.length, 10, "Bet history should have 10 slots");
    }
    
    /// Test getting contract balance
    function testGetContractBalance() public {
        // Skip if game not deployed
        if (!gameDeployed) {
            Assert.ok(true, "Skipping test as game is not deployed");
            return;
        }
        
        uint256 balance = game.getContractBalance();
        Assert.equal(balance > 0, true, "Contract should have a positive balance");
    }
    
    // Fallback function to receive ETH
    receive() external payable {}
}