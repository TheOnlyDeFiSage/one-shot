// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title Game
 * @dev A simple betting game with ownership functionality and adjustable bet amount
 * @notice Players must bet exactly the current betAmount and have a 50% chance to win double their bet
 */
contract Game is Ownable, ReentrancyGuard {
    address payable public contract2Address;
    
    // Default bet amount required to play the game (0.01 ETH)
    uint256 public betAmount = 0.01 ether;
    
    // Event emitted when a game is played
    event GamePlayed(address indexed player, uint256 amount, bool won, string message);
    
    // Event emitted when funds are deposited by the owner
    event FundsDeposited(address indexed owner, uint256 amount, string message);
    
    // Event emitted when the contract is initialized with funds
    event ContractInitialized(address indexed owner, uint256 initialBalance, string message);

    // Event emitted when bet amount is updated
    event BetAmountUpdated(uint256 oldAmount, uint256 newAmount);

    /**
     * @dev Constructor to initialize the contract with initial funds and contract2 address
     * @param _contract2Address The address of the second contract that receives fees
     * @param _initialBalance The initial balance to fund the contract with
     * @notice The deployer becomes the owner and must provide the specified initial funds
     */
    constructor(address payable _contract2Address, uint256 _initialBalance) Ownable(msg.sender) payable {
        require(msg.value == _initialBalance, "Must send exactly the initial balance specified");
        
        contract2Address = _contract2Address;
        
        // Emit event for initialization
        emit ContractInitialized(msg.sender, msg.value, "Contract initialized with funds");
    }

    /**
     * @dev Function to play the game
     * @notice Players must send exactly the current betAmount to play
     * @notice Winners receive double their bet amount
     */
    function play() external payable nonReentrant {
        require(msg.value == betAmount, "Must send exactly the current bet amount to play"); 
        require(address(this).balance >= 2 * betAmount, "Contract has insufficient funds for payouts");

        // Pseudo-random mechanism (not secure for production)
        bool won = (uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % 2) == 0; 

        if (won) {
            // Player wins, return double their bet
            uint256 winnings = 2 * betAmount;
            (bool success, ) = payable(msg.sender).call{value: winnings}("");
            require(success, "Transfer of winnings failed");
        } else {
            // Player loses, send 5% to Contract2 (BalanceTracker) for staking rewards
            uint256 fee = (betAmount * 5) / 100; // Calculate the fee (5% of the bet)
            (bool success, ) = contract2Address.call{value: fee}("");
            require(success, "Transfer of fee failed");
        }

        // Create result message based on win/loss outcome
        string memory resultMessage = won ? 
            "Congratulations! You won double your bet amount!" : 
            "Sorry, you lost this round. Try again!";
        
        emit GamePlayed(msg.sender, betAmount, won, resultMessage);
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
     * @notice Only the contract owner can call this function
     */
    function setBetAmount(uint256 _newBetAmount) external onlyOwner {
        require(_newBetAmount > 0, "Bet amount must be greater than 0");
        
        uint256 oldBetAmount = betAmount;
        betAmount = _newBetAmount;
        
        emit BetAmountUpdated(oldBetAmount, _newBetAmount);
    }
    
    /**
     * @dev Returns the current contract balance
     * @return The current balance of the contract in wei
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Fallback function to receive ETH
     * @notice Only the owner can send ETH directly to the contract
     */
    receive() external payable {
        require(msg.sender == owner(), "Only owner can send ETH directly");
        emit FundsDeposited(msg.sender, msg.value, "Funds received via direct transfer");
    }
}