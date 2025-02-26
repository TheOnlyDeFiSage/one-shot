// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24; // Specify the Solidity version

import "@openzeppelin/contracts/access/Ownable.sol"; // Import the Ownable contract from OpenZeppelin

// Define the BalanceTracker contract, inheriting from Ownable
contract BalanceTracker is Ownable(address(this)) {
    // This contract will hold the Ether sent to it

    // Function to receive Ether sent to the contract
    receive() external payable {} // Allow the contract to accept Ether

    // Function to get the current balance of the contract
    function getBalance() external view returns (uint256) {
        return address(this).balance; // Return the balance of the contract
    }
}