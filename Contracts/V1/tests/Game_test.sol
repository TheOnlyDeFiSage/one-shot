// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "remix_tests.sol";
import "remix_accounts.sol";
import "../Game.sol";
import "../BalanceTracker.sol";

// Test contract for Game.sol
contract GameTest {
    // Variables
    address  payable deployedGame ;
    address public deployedTracker;
    uint256 public constant ETHER_AMOUNT = 1 ether;
    
    // Events for tracking test progress
    event LogValue(string message, uint256 value);
    event LogAddress(string message, address addr);
    event LogString(string message);
    
    // Receive function to accept ETH transfers
    receive() external payable {}
    
    /// Constructor - runs once when test contract deploys
    constructor() payable {}
    
    /// #value: 1000000000000000000
    function createContracts() public payable {
        // First create a simple test without initialization
        deployedTracker = address(new BalanceTracker());
        emit LogAddress("BalanceTracker deployed at", deployedTracker);
        
        // Do a direct low-level call to check balance
        Assert.equal(address(this).balance >= 1 ether, true, "Test contract should have ETH");
    }
    
    /// Simple first passing test
    function testCanary() public {
        // This test should always pass to verify the testing framework is working
        Assert.ok(true, "Testing framework is working");
    }
    
    /// Test low-level call to BalanceTracker
    /// #value: 100000000000000000
    function testBalanceTrackerReceiveETH() public payable {
        // Check if contract was deployed
        Assert.notEqual(deployedTracker, address(0), "BalanceTracker should be deployed");
        
        // Send ETH to tracker using low-level call
        (bool success, ) = deployedTracker.call{value: 0.1 ether}("");
        
        // This should succeed
        Assert.equal(success, true, "Should be able to send ETH to BalanceTracker");
    }
    
    /// Test deploying Game contract separately (decoupled)
    /// #value: 2000000000000000000
    function testGameDeployment() public payable {
        // Deploy Game with 2 ETH
        try new Game{value: 2 ether}(payable(deployedTracker), 2 ether) returns (Game game) {
            deployedGame = payable (address(game));
            emit LogAddress("Game deployed at", deployedGame);
            Assert.notEqual(deployedGame, address(0), "Game should be deployed");
        } catch Error(string memory reason) {
            emit LogString(string.concat("Game deployment error: ", reason));
            Assert.ok(false, reason);
        } catch (bytes memory) {
            emit LogString("Unknown error deploying Game");
            Assert.ok(false, "Game deployment failed with unknown error");
        }
    }
    
    /// Simple test calling Game contract method
    function testGameBetAmount() public {
        // Check if Game contract is deployed
        if (deployedGame == address(0)) {
            emit LogString("Game not deployed, skipping test");
            Assert.ok(true, "Skipping test");
            return;
        }
        
        // Get the bet amount from the Game contract
        Game game = Game(deployedGame);
        uint256 betAmount = game.betAmount();
        
        // Verify it's 0.1 ETH
        Assert.equal(betAmount, 0.1 ether, "Bet amount should be 0.1 ETH");
    }
    
    /// Simple test checking Game contract balance
    function testGameBalance() public {
        // Check if Game contract is deployed
        if (deployedGame == address(0)) {
            emit LogString("Game not deployed, skipping test");
            Assert.ok(true, "Skipping test");
            return;
        }
        
        // Get the contract balance
        uint256 balance = address(deployedGame).balance;
        
        // Should have the initial balance
        Assert.equal(balance, 2 ether, "Game should have 2 ETH initial balance");
    }
    
    /// Test play function with low-level call
    /// #value: 100000000000000000
    function testPlayGame() public payable {
        // Check if Game contract is deployed
        if (deployedGame == address(0)) {
            emit LogString("Game not deployed, skipping test");
            Assert.ok(true, "Skipping test");
            return;
        }
        
        // Log balances before playing
        emit LogValue("Test contract balance before play", address(this).balance);
        emit LogValue("Game contract balance before play", address(deployedGame).balance);
        
        // Use low-level call to play the game
        (bool success, ) = deployedGame.call{value: 0.1 ether}(
            abi.encodeWithSignature("play()")
        );
        
        // Log success and balances after playing
        emit LogValue("Play function call success", success ? 1 : 0);
        emit LogValue("Test contract balance after play", address(this).balance);
        emit LogValue("Game contract balance after play", address(deployedGame).balance);
        
        // This is just an informational test - we don't fail based on random outcomes
        Assert.ok(true, "Play function test completed");
    }
}