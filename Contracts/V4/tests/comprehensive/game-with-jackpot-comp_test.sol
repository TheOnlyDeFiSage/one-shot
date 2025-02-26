// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "remix_tests.sol"; // Import Remix testing library
import "remix_accounts.sol"; // Import Remix accounts for testing
import "../../GameWithJackpot.sol";
import "../../BalanceTracker.sol";

/**
 * @title EnhancedGameWithJackpotTest
 * @dev Comprehensive test contract for the enhanced GameWithJackpot with bet history and win/loss tracking
 * @notice Tests both structural integrity and interface correctness
 */
contract EnhancedGameWithJackpotTest {
    // Contracts to test
    GameWithJackpot private game;
    BalanceTracker private balanceTracker;
    
    // Test accounts
    address payable acc0; // Owner
    address payable acc1; // Player 1
    address payable acc2; // Player 2
    
    // Constants for testing
    uint256 constant DEFAULT_BET_AMOUNT = 0.01 ether;
    
    // Deployment status
    bool gameDeployed = false;
    bool trackerDeployed = false;
    
    /**
     * @dev Setup the testing environment before each test
     */
    function beforeAll() public {
        // Setup accounts for testing
        acc0 = payable(TestsAccounts.getAccount(0)); // Owner account
        acc1 = payable(TestsAccounts.getAccount(1)); // Player 1
        acc2 = payable(TestsAccounts.getAccount(2)); // Player 2
        
        // Deploy the balance tracker with try-catch
        try new BalanceTracker() returns (BalanceTracker bt) {
            balanceTracker = bt;
            trackerDeployed = true;
            Assert.ok(true, "BalanceTracker deployed successfully");
        } catch {
            trackerDeployed = false;
            Assert.ok(false, "Failed to deploy BalanceTracker");
        }
        
        // Only attempt to deploy game if tracker was successful
        if (trackerDeployed) {
            try new GameWithJackpot(payable(address(balanceTracker)), 0) returns (GameWithJackpot g) {
                game = g;
                gameDeployed = true;
                Assert.ok(true, "GameWithJackpot deployed successfully");
            } catch {
                gameDeployed = false;
                Assert.ok(false, "Failed to deploy GameWithJackpot");
            }
        }
    }
    
    //--------------------------------------------------------------------
    // DEPLOYMENT AND INITIAL STATE TESTS
    //--------------------------------------------------------------------
    
    /**
     * @dev Test initial state of the game contract
     */
    function testInitialState() public {
        // Skip if either contract failed to deploy
        if (!trackerDeployed || !gameDeployed) {
            Assert.ok(true, "Skipping test due to failed deployment");
            return;
        }
        
        // Verify the contract addresses are valid
        Assert.notEqual(address(game), address(0), "Game contract should be deployed");
        Assert.notEqual(address(balanceTracker), address(0), "BalanceTracker should be deployed");
        
        // Check initial configuration
        Assert.equal(game.betAmount(), DEFAULT_BET_AMOUNT, "Initial bet amount should be 0.01 ETH");
        Assert.equal(game.contract2Address(), address(balanceTracker), "Contract2Address should be set to balanceTracker");
    }
    
    /**
     * @dev Test initial ownership
     */
    function testOwnership() public {
        // Skip if contracts not deployed
        if (!trackerDeployed || !gameDeployed) {
            Assert.ok(true, "Skipping test due to failed deployment");
            return;
        }
        
        // Verify current owner is the test contract
        try game.owner() returns (address owner) {
            Assert.equal(owner, address(this), "Game contract owner should be test contract");
        } catch {
            Assert.ok(false, "Should be able to query owner");
        }
    }
    
    //--------------------------------------------------------------------
    // JACKPOT CONFIGURATION TESTS
    //--------------------------------------------------------------------
    
    /**
     * @dev Test initial jackpot configuration
     */
    function testJackpotConfiguration() public {
        // Skip if contracts not deployed
        if (!trackerDeployed || !gameDeployed) {
            Assert.ok(true, "Skipping test due to failed deployment");
            return;
        }
        
        // Get jackpot info
        try game.getJackpotInfo() returns (
            uint256[] memory thresholds,
            uint256[] memory payouts,
            uint256[] memory amounts
        ) {
            // Verify jackpot tiers
            Assert.equal(thresholds.length, 3, "Should have 3 jackpot tiers");
            
            // Verify the expected thresholds for tiers
            Assert.equal(thresholds[0], 4, "First tier should require 4 wins");
            Assert.equal(thresholds[1], 6, "Second tier should require 6 wins");
            Assert.equal(thresholds[2], 8, "Third tier should require 8 wins");
            
            // Verify payout percentages
            Assert.equal(payouts[0], 10, "First tier should pay 10%");
            Assert.equal(payouts[1], 25, "Second tier should pay 25%");
            Assert.equal(payouts[2], 100, "Third tier should pay 100%");
        } catch {
            Assert.ok(false, "Should be able to get jackpot info");
        }
    }
    
    //--------------------------------------------------------------------
    // BET HISTORY AND STATS TESTS
    //--------------------------------------------------------------------
    
    /**
     * @dev Test initial bet history
     */
    function testInitialBetHistory() public {
        // Skip if contracts not deployed
        if (!trackerDeployed || !gameDeployed) {
            Assert.ok(true, "Skipping test due to failed deployment");
            return;
        }
        
        // Get bet history for a player who hasn't played yet
        try game.getBetHistory(address(this)) returns (GameWithJackpot.BetInfo[10] memory history) {
            // Verify array is the right size
            Assert.equal(history.length, 10, "Bet history should have 10 slots");
            
            // All entries should be empty
            Assert.equal(history[0].timestamp, 0, "First entry should be empty");
            Assert.equal(history[1].timestamp, 0, "Second entry should be empty");
        } catch {
            Assert.ok(false, "Should be able to get bet history");
        }
    }
    
    /**
     * @dev Test initial player stats
     */
    function testInitialPlayerStats() public {
        // Skip if contracts not deployed
        if (!trackerDeployed || !gameDeployed) {
            Assert.ok(true, "Skipping test due to failed deployment");
            return;
        }
        
        // Get initial stats for a player who hasn't played yet
        try game.getPlayerStats(address(this)) returns (
            uint256 wins,
            uint256 losses,
            uint256 streak
        ) {
            // All values should be 0
            Assert.equal(wins, 0, "Initial wins should be 0");
            Assert.equal(losses, 0, "Initial losses should be 0");
            Assert.equal(streak, 0, "Initial streak should be 0");
        } catch {
            Assert.ok(false, "Should be able to get player stats");
        }
    }
    
    //--------------------------------------------------------------------
    // FUNCTION INTERFACE TESTS
    //--------------------------------------------------------------------
    
    /**
     * @dev Test play function interface
     */
    function testPlayFunctionInterface() public {
        // Skip if contracts not deployed
        if (!trackerDeployed || !gameDeployed) {
            Assert.ok(true, "Skipping test due to failed deployment");
            return;
        }
        
        // Attempt to play with incorrect value (should fail)
        try game.play{value: 0}() {
            Assert.ok(false, "Should not allow playing with zero bet amount");
        } catch Error(string memory reason) {
            // Expected revert with reason
            Assert.ok(true, "Play correctly reverts with zero bet");
        } catch {
            Assert.ok(true, "Play correctly reverts with zero bet");
        }
    }
    
    /**
     * @dev Test setBetAmount function interface
     */
    function testSetBetAmountInterface() public {
        // Skip if contracts not deployed
        if (!trackerDeployed || !gameDeployed) {
            Assert.ok(true, "Skipping test due to failed deployment");
            return;
        }
        
        // Attempt to set bet amount to zero (should fail)
        try game.setBetAmount(0) {
            Assert.ok(false, "Should not allow setting bet amount to zero");
        } catch Error(string memory reason) {
            // Expected revert with reason
            Assert.ok(true, "setBetAmount correctly reverts with zero amount");
        } catch {
            Assert.ok(true, "setBetAmount correctly reverts with zero amount");
        }
        
        // Attempt to set bet amount to valid value
        uint256 newBetAmount = 0.02 ether;
        try game.setBetAmount(newBetAmount) {
            // Check if bet amount was updated
            Assert.equal(game.betAmount(), newBetAmount, "Bet amount should be updated");
            
            // Reset to default for other tests
            game.setBetAmount(DEFAULT_BET_AMOUNT);
        } catch {
            Assert.ok(false, "Should allow setting valid bet amount");
        }
    }
    
    //--------------------------------------------------------------------
    // JACKPOT MANAGEMENT TESTS
    //--------------------------------------------------------------------
    
    /**
     * @dev Test adding jackpot tier
     */
    function testAddJackpotTier() public {
        // Skip if contracts not deployed
        if (!trackerDeployed || !gameDeployed) {
            Assert.ok(true, "Skipping test due to failed deployment");
            return;
        }
        
        // Get initial tier count
        (uint256[] memory initialTiers,,) = game.getJackpotInfo();
        uint256 initialTierCount = initialTiers.length;
        
        // Add a new tier for 10 wins with 50% payout
        try game.addJackpotTier(10, 50) {
            // Check that tier was added
            (uint256[] memory finalTiers, uint256[] memory payouts,) = game.getJackpotInfo();
            
            // Verify tier count increased
            Assert.equal(finalTiers.length, initialTierCount + 1, "Should have one more tier");
            
            // Verify new tier properties
            Assert.equal(finalTiers[initialTierCount], 10, "New tier should require 10 wins");
            Assert.equal(payouts[initialTierCount], 50, "New tier should pay 50%");
        } catch {
            Assert.ok(false, "Should be able to add new jackpot tier");
        }
    }
    
    /**
     * @dev Test updating jackpot tier
     */
    function testUpdateJackpotTier() public {
        // Skip if contracts not deployed
        if (!trackerDeployed || !gameDeployed) {
            Assert.ok(true, "Skipping test due to failed deployment");
            return;
        }
        
        // Get current tier config for reference
        (uint256[] memory initialTiers, uint256[] memory initialPayouts,) = game.getJackpotInfo();
        
        // Store original value to restore later
        uint256 originalThreshold = initialTiers[0];
        uint256 originalPayout = initialPayouts[0];
        
        // Update first tier (to 5 wins, 15% payout)
        try game.updateJackpotTier(0, 5, 15) {
            // Verify tier was updated
            (uint256[] memory updatedTiers, uint256[] memory updatedPayouts,) = game.getJackpotInfo();
            
            Assert.equal(updatedTiers[0], 5, "Tier threshold should be updated");
            Assert.equal(updatedPayouts[0], 15, "Tier payout should be updated");
            
            // Restore original values
            game.updateJackpotTier(0, originalThreshold, originalPayout);
        } catch {
            Assert.ok(false, "Should be able to update jackpot tier");
        }
    }
    
    /**
     * @dev Test setJackpotParams function
     */
    function testSetJackpotParams() public {
        // Skip if contracts not deployed
        if (!trackerDeployed || !gameDeployed) {
            Assert.ok(true, "Skipping test due to failed deployment");
            return;
        }
        
        // Test setting invalid jackpot fee (> 10%)
        try game.setJackpotParams(0.1 ether, 11) {
            Assert.ok(false, "Should not allow jackpot fee > 10%");
        } catch {
            Assert.ok(true, "Correctly rejects jackpot fee > 10%");
        }
        
        // Test setting valid values
        try game.setJackpotParams(0.2 ether, 3) {
            Assert.ok(true, "Should allow setting valid jackpot params");
            
            // We can't directly check the values since there are no getter functions
            // But we can verify the function executes successfully
        } catch {
            Assert.ok(false, "Should allow setting valid jackpot params");
        }
    }
    
    //--------------------------------------------------------------------
    // INTEGRATION TESTS
    //--------------------------------------------------------------------
    
    /**
     * @dev Test contract integration - verify address connections
     */
    function testContractIntegration() public {
        // Skip if contracts not deployed
        if (!trackerDeployed || !gameDeployed) {
            Assert.ok(true, "Skipping test due to failed deployment");
            return;
        }
        
        // Verify Game contract references BalanceTracker correctly
        Assert.equal(game.contract2Address(), address(balanceTracker), "Game should reference BalanceTracker");
    }
    
    //--------------------------------------------------------------------
    // EDGE CASE TESTS
    //--------------------------------------------------------------------
    
    /**
     * @dev Test with zero address player stats and history
     */
    function testZeroAddressStats() public {
        // Skip if contracts not deployed
        if (!trackerDeployed || !gameDeployed) {
            Assert.ok(true, "Skipping test due to failed deployment");
            return;
        }
        
        // Get stats for zero address
        try game.getPlayerStats(address(0)) returns (
            uint256 wins,
            uint256 losses,
            uint256 streak
        ) {
            // All values should be 0
            Assert.equal(wins, 0, "Zero address wins should be 0");
            Assert.equal(losses, 0, "Zero address losses should be 0");
            Assert.equal(streak, 0, "Zero address streak should be 0");
        } catch {
            Assert.ok(false, "Should handle zero address in getPlayerStats");
        }
        
        // Get history for zero address
        try game.getBetHistory(address(0)) returns (GameWithJackpot.BetInfo[10] memory history) {
            // All entries should be empty
            Assert.equal(history[0].timestamp, 0, "Zero address history should be empty");
        } catch {
            Assert.ok(false, "Should handle zero address in getBetHistory");
        }
    }
    
    /**
     * @dev Test getting win streak
     */
    function testWinStreak() public {
        // Skip if contracts not deployed
        if (!trackerDeployed || !gameDeployed) {
            Assert.ok(true, "Skipping test due to failed deployment");
            return;
        }
        
        // Get streak for this contract
        uint256 streak = game.getPlayerStreak(address(this));
        
        // Should be 0 for new player
        Assert.equal(streak, 0, "New player win streak should be 0");
    }
    
    //--------------------------------------------------------------------
    // VIEW FUNCTION INTEGRITY TESTS
    //--------------------------------------------------------------------
    
    /**
     * @dev Test view function integrity
     */
    function testViewFunctionIntegrity() public {
        // Skip if contracts not deployed
        if (!trackerDeployed || !gameDeployed) {
            Assert.ok(true, "Skipping test due to failed deployment");
            return;
        }
        
        // Call all view functions to ensure they don't modify state
        game.getContractBalance();
        game.getPlayerStreak(address(this));
        game.getBetHistory(address(this));
        game.getPlayerStats(address(this));
        game.getJackpotInfo();
        
        // We can't directly check state integrity, but we can verify functions don't revert
        Assert.ok(true, "All view functions execute without reverting");
    }
    
    /**
     * @dev Test contract balance function
     */
    function testContractBalance() public {
        // Skip if contracts not deployed
        if (!trackerDeployed || !gameDeployed) {
            Assert.ok(true, "Skipping test due to failed deployment");
            return;
        }
        
        // Get reported balance
        uint256 reportedBalance = game.getContractBalance();
        
        // Get actual balance
        uint256 actualBalance = address(game).balance;
        
        // They should match
        Assert.equal(reportedBalance, actualBalance, "Reported balance should match actual balance");
    }
    
    // Function to receive ETH
    receive() external payable {}
}
