// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";

/**
 * @title Game
 * @dev A betting game with jackpot system and staking rewards
 * @notice Players bet the current betAmount with 50% chance to win double
 */
contract GameWithJackpot is Ownable, ReentrancyGuard {
    using SafeMath for uint256;
    
    address payable public contract2Address;
    
    // Default bet amount required to play the game (0.01 ETH)
    uint256 public betAmount = 0.01 ether;
    
    // Jackpot system variables
    uint256 public jackpotPool;                   // Current jackpot amount
    uint256 public minJackpotSeed = 0.1 ether;    // Minimum jackpot after grand win
    uint256 public jackpotFeePercent = 2;         // 2% of bets go to jackpot
    mapping(address => uint256) public winStreaks; // Track consecutive wins
    
    // Jackpot tier thresholds and percentages
    struct JackpotTier {
        uint256 streakThreshold; // Number of consecutive wins needed
        uint256 payoutPercent;   // Percentage of jackpot to pay
    }
    
    JackpotTier[] public jackpotTiers;
    
    // Events for game interactions
    event GamePlayed(address indexed player, uint256 amount, bool won, string message);
    event FundsDeposited(address indexed owner, uint256 amount, string message);
    event ContractInitialized(address indexed owner, uint256 initialBalance, string message);
    event BetAmountUpdated(uint256 oldAmount, uint256 newAmount);
    
    // Events for jackpot system
    event JackpotContribution(uint256 amount, uint256 newJackpotTotal);
    event JackpotWon(address indexed winner, uint256 amount, uint256 tierIndex, uint256 streak);
    event JackpotReseeded(uint256 amount);
    event JackpotTierAdded(uint256 streakThreshold, uint256 payoutPercent);
    event JackpotTierUpdated(uint256 tierIndex, uint256 streakThreshold, uint256 payoutPercent);

    /**
     * @dev Constructor to initialize the contract with initial funds and contract2 address
     * @param _contract2Address The address of the second contract that receives fees
     * @param _initialBalance The initial balance to fund the contract with
     */
    constructor(address payable _contract2Address, uint256 _initialBalance) Ownable(msg.sender) payable {
        require(msg.value == _initialBalance, "Must send exactly the initial balance specified");
        
        contract2Address = _contract2Address;
        
        // Setup jackpot tiers with 4, 6, and 8 win streaks only
        jackpotTiers.push(JackpotTier(4, 10)); // Tier 1: 4 wins, 10% of jackpot
        jackpotTiers.push(JackpotTier(6, 25)); // Tier 2: 6 wins, 25% of jackpot
        jackpotTiers.push(JackpotTier(8, 100)); // Tier 3: 8 wins, 100% of jackpot
        
        // Seed the initial jackpot pool
        jackpotPool = minJackpotSeed;
        
        // Emit event for initialization
        emit ContractInitialized(msg.sender, msg.value, "Contract initialized with funds");
        emit JackpotReseeded(minJackpotSeed);
    }

    /**
     * @dev Function to play the game with jackpot functionality
     * @notice Players must send exactly the current betAmount to play
     * @notice Winners receive double their bet and increase their winning streak
     * @notice Players can win jackpots based on configurable tier thresholds
     */
    function play() external payable nonReentrant {
        require(msg.value == betAmount, "Must send exactly the current bet amount to play"); 
        require(address(this).balance >= 2 * betAmount, "Contract has insufficient funds for payouts");

        // Add to jackpot pool regardless of outcome
        uint256 jackpotContribution = betAmount.mul(jackpotFeePercent).div(100);
        jackpotPool = jackpotPool.add(jackpotContribution);
        emit JackpotContribution(jackpotContribution, jackpotPool);
        
        // Pseudo-random mechanism (not secure for production)
        bool won = (uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % 2) == 0; 
        
        string memory resultMessage;
        uint256 payoutAmount = 0;

        if (won) {
            // Player wins
            
            // Increase win streak
            winStreaks[msg.sender] = winStreaks[msg.sender].add(1);
            uint256 currentStreak = winStreaks[msg.sender];
            
            // Check if player achieves any jackpot tier
            (bool jackpotWon, uint256 tierIndex, uint256 jackpotAmount) = checkJackpotWin(msg.sender);
            
            // Calculate total winnings (regular + jackpot)
            uint256 regularWinnings = betAmount.mul(2);
            payoutAmount = regularWinnings.add(jackpotAmount);
            
            // Send winnings to player
            (bool success, ) = payable(msg.sender).call{value: payoutAmount}("");
            require(success, "Transfer of winnings failed");
            
            // Create result message
            if (jackpotWon) {
                string memory tierName = getTierName(tierIndex);
                resultMessage = string(
                    abi.encodePacked(
                        "Congratulations! You won double your bet plus a ",
                        tierName,
                        " jackpot of ",
                        uintToString(jackpotAmount),
                        " wei! Current streak: ",
                        uintToString(currentStreak)
                    )
                );
                
                emit JackpotWon(msg.sender, jackpotAmount, tierIndex, currentStreak);
                
                // Check if this was the top tier (100% payout)
                if (jackpotTiers[tierIndex].payoutPercent == 100) {
                    // Reseed the jackpot
                    jackpotPool = minJackpotSeed;
                    emit JackpotReseeded(minJackpotSeed);
                }
            } else {
                resultMessage = string(
                    abi.encodePacked(
                        "Congratulations! You won double your bet! Current streak: ",
                        uintToString(currentStreak)
                    )
                );
            }
            
        } else {
            // Player loses
            
            // Reset win streak
            winStreaks[msg.sender] = 0;
            
            // Send 5% to Contract2 for staking rewards
            uint256 fee = betAmount.mul(5).div(100);
            (bool success, ) = contract2Address.call{value: fee}("");
            require(success, "Transfer of fee failed");
            
            resultMessage = "Sorry, you lost this round. Your win streak has been reset. Try again!";
        }
        
        emit GamePlayed(msg.sender, betAmount, won, resultMessage);
    }
    
    /**
     * @dev Checks if a player has won a jackpot based on their win streak
     * @param player The address of the player
     * @return hasWon True if player won any jackpot tier
     * @return tierIndex The index of the jackpot tier won
     * @return amount The amount of jackpot won
     */
    function checkJackpotWin(address player) internal returns (bool hasWon, uint256 tierIndex, uint256 amount) {
        uint256 playerStreak = winStreaks[player];
        
        // Check tiers from highest to lowest to award the best prize
        for (int i = int(jackpotTiers.length) - 1; i >= 0; i--) {
            uint256 index = uint256(i);
            JackpotTier memory tier = jackpotTiers[index];
            
            if (playerStreak == tier.streakThreshold) {
                // Player has achieved this tier
                uint256 jackpotAmount = jackpotPool.mul(tier.payoutPercent).div(100);
                
                // Ensure we don't underflow
                if (jackpotAmount > jackpotPool) {
                    jackpotAmount = jackpotPool;
                }
                
                // Reduce jackpot pool
                jackpotPool = jackpotPool.sub(jackpotAmount);
                
                return (true, index, jackpotAmount);
            }
        }
        
        // No jackpot won
        return (false, 0, 0);
    }
    
    /**
     * @dev Allows the contract owner to deposit funds into the contract
     * @notice Only the contract owner can call this function
     */
    function depositFunds() external payable onlyOwner {
        require(msg.value > 0, "Must send Ether to deposit");
        
        emit FundsDeposited(msg.sender, msg.value, "Funds successfully deposited to the contract");
    }
    
    /**
     * @dev Allows the owner to update the bet amount
     * @param _newBetAmount The new bet amount in wei
     */
    function setBetAmount(uint256 _newBetAmount) external onlyOwner {
        require(_newBetAmount > 0, "Bet amount must be greater than 0");
        
        uint256 oldBetAmount = betAmount;
        betAmount = _newBetAmount;
        
        emit BetAmountUpdated(oldBetAmount, _newBetAmount);
    }
    
    /**
     * @dev Allows the owner to update jackpot parameters
     * @param _minJackpotSeed New minimum jackpot seed amount
     * @param _jackpotFeePercent New percentage of bets that go to jackpot
     */
    function setJackpotParams(uint256 _minJackpotSeed, uint256 _jackpotFeePercent) external onlyOwner {
        require(_jackpotFeePercent <= 10, "Jackpot fee cannot exceed 10%");
        
        minJackpotSeed = _minJackpotSeed;
        jackpotFeePercent = _jackpotFeePercent;
    }
    
    /**
     * @dev Allows owner to add funds directly to the jackpot pool
     * @notice This can be used for special promotions
     */
    function addToJackpot() external payable onlyOwner {
        require(msg.value > 0, "Must send Ether to add to jackpot");
        
        jackpotPool = jackpotPool.add(msg.value);
        emit JackpotContribution(msg.value, jackpotPool);
    }
    
    /**
     * @dev Allows owner to add a new jackpot tier
     * @param _streakThreshold Number of consecutive wins required
     * @param _payoutPercent Percentage of jackpot to pay out
     */
    function addJackpotTier(uint256 _streakThreshold, uint256 _payoutPercent) external onlyOwner {
        require(_payoutPercent <= 100, "Payout percent cannot exceed 100%");
        require(_streakThreshold > 0, "Streak threshold must be greater than 0");
        
        // Check that this threshold doesn't already exist
        for (uint256 i = 0; i < jackpotTiers.length; i++) {
            require(jackpotTiers[i].streakThreshold != _streakThreshold, "Tier with this streak threshold already exists");
        }
        
        jackpotTiers.push(JackpotTier(_streakThreshold, _payoutPercent));
        emit JackpotTierAdded(_streakThreshold, _payoutPercent);
    }
    
    /**
     * @dev Allows owner to update an existing jackpot tier
     * @param _tierIndex Index of the tier to update
     * @param _streakThreshold New streak threshold
     * @param _payoutPercent New payout percentage
     */
    function updateJackpotTier(uint256 _tierIndex, uint256 _streakThreshold, uint256 _payoutPercent) external onlyOwner {
        require(_tierIndex < jackpotTiers.length, "Tier index out of bounds");
        require(_payoutPercent <= 100, "Payout percent cannot exceed 100%");
        require(_streakThreshold > 0, "Streak threshold must be greater than 0");
        
        // Check that this threshold doesn't already exist in another tier
        for (uint256 i = 0; i < jackpotTiers.length; i++) {
            if (i != _tierIndex) {
                require(jackpotTiers[i].streakThreshold != _streakThreshold, "Tier with this streak threshold already exists");
            }
        }
        
        jackpotTiers[_tierIndex].streakThreshold = _streakThreshold;
        jackpotTiers[_tierIndex].payoutPercent = _payoutPercent;
        
        emit JackpotTierUpdated(_tierIndex, _streakThreshold, _payoutPercent);
    }
    
    /**
     * @dev Get the name for a jackpot tier
     * @param tierIndex Index of the tier
     * @return The name of the tier (e.g., "Tier 1", "Tier 2", etc.)
     */
    function getTierName(uint256 tierIndex) internal pure returns (string memory) {
        if (tierIndex == 0) {
            return "Tier 1 (4-Win)";
        } else if (tierIndex == 1) {
            return "Tier 2 (6-Win)";
        } else if (tierIndex == 2) {
            return "Tier 3 (8-Win)";
        } else {
            return string(abi.encodePacked("Tier ", uintToString(tierIndex + 1)));
        }
    }
    
    /**
     * @dev Returns current jackpot amounts for all tiers
     * @return tierThresholds Array of streak thresholds for each tier
     * @return tierPayouts Array of payout percentages for each tier
     * @return tierAmounts Array of current jackpot amounts for each tier
     */
    function getJackpotInfo() external view returns (
        uint256[] memory tierThresholds,
        uint256[] memory tierPayouts,
        uint256[] memory tierAmounts
    ) {
        uint256 tiersCount = jackpotTiers.length;
        
        tierThresholds = new uint256[](tiersCount);
        tierPayouts = new uint256[](tiersCount);
        tierAmounts = new uint256[](tiersCount);
        
        for (uint256 i = 0; i < tiersCount; i++) {
            tierThresholds[i] = jackpotTiers[i].streakThreshold;
            tierPayouts[i] = jackpotTiers[i].payoutPercent;
            tierAmounts[i] = jackpotPool.mul(jackpotTiers[i].payoutPercent).div(100);
        }
        
        return (tierThresholds, tierPayouts, tierAmounts);
    }
    
    /**
     * @dev Returns the current win streak for a player
     * @param player The address of the player
     * @return The current win streak
     */
    function getPlayerStreak(address player) external view returns (uint256) {
        return winStreaks[player];
    }
    
    /**
     * @dev Returns the current contract balance
     * @return The current balance of the contract in wei
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Utility function to convert uint to string
     * @param _i The uint to convert
     * @return str The string representation of the uint
     */
    function uintToString(uint256 _i) internal pure returns (string memory str) {
        if (_i == 0) {
            return "0";
        }
        
        uint256 j = _i;
        uint256 length;
        
        while (j != 0) {
            length++;
            j /= 10;
        }
        
        bytes memory bstr = new bytes(length);
        uint256 k = length;
        
        while (_i != 0) {
            k = k - 1;
            uint8 temp = uint8(48 + _i % 10);
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        
        return string(bstr);
    }
    
    /**
     * @dev Fallback function to receive ETH
     * @notice Only the owner can send ETH directly
     */
    receive() external payable {
        require(msg.sender == owner(), "Only owner can send ETH directly");
        emit FundsDeposited(msg.sender, msg.value, "Funds received via direct transfer");
    }
}