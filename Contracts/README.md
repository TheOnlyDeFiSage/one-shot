# 🎰 V3 Project Overview

## 🚀 Introduction

Welcome to the V3 project! This is an advanced iteration of an Ethereum-based betting game, building upon the foundations laid in V1 and V2. This version introduces a comprehensive jackpot system and maintains the staking functionality from V2. The key contracts in this version are `GameWithJackpot` and `BalanceTracker`.

## 📖 Story Behind the Project

The idea for this project originated from a fun conversation on Twitter with Daniel Marini, the CEO of Nexus Labs. When asked what decentralized application (dapp) he'd like to see on his devnet, Daniel suggested a "1-button test casino." 🎲 The concept was simple yet intriguing: a button that gives users a 50% chance of doubling their NEX points or losing them. To expand on this idea, the project also allows users to stake their NEX points and earn rewards from casino users trying out the casino.

## 🔍 Key Differences Between V1, V2, and V3

### 🎯 1. Jackpot System

- **V1**: No jackpot feature.
- **V2**: Adjustable bet amounts and staking, but no jackpot.
- **V3**: Introduces a jackpot system where players can win a portion of the jackpot based on their win streaks. The jackpot is funded by a percentage of each bet, creating an additional incentive for players.

### 🏆 2. Jackpot Tiers

- **V1**: No tier system.
- **V2**: No tier system.
- **V3**: Implements a tiered jackpot system with specific thresholds for consecutive wins, allowing players to win different percentages of the jackpot based on their performance. This adds a strategic element to gameplay.

### 📈 3. Enhanced Event Emission

- **V1**: Basic events for actions like playing the game and depositing funds.
- **V2**: Additional events like `BetAmountUpdated` and `RewardDistributed`.
- **V3**: Emits events when contributions to the jackpot are made, enhancing transparency and allowing players to track jackpot growth.

### 🔧 4. Functions for Managing Jackpot Tiers

- **V1**: No functions to manage jackpot tiers.
- **V2**: No functions to manage jackpot tiers.
- **V3**: Includes functions to add and update jackpot tiers, allowing the owner to manage the jackpot system dynamically.

## 📜 Contracts

### 1. BalanceTracker

The `BalanceTracker` contract, which is the same as the `BalanceTracker` from V2, manages Ether balances and allows users to stake their Ether while tracking contributions to the jackpot.

#### Key Features:
- **💰 Staking**: Users can stake Ether and earn rewards from game fees.
- **💸 Withdrawals**: Users can withdraw their stakes and any accrued rewards.
- **🔄 Reward Distribution**: Automatically distributes rewards to stakers when fees are received.

### 2. GameWithJackpot

The `GameWithJackpot` contract implements a betting game with a jackpot system, where players can win based on their performance and win streaks.

#### Key Features:
- **🎰 Jackpot System**: Players can win a portion of the jackpot based on their win streaks.
- **🏅 Tiered Rewards**: Different jackpot tiers with specific thresholds for consecutive wins.
- **📊 Event Emission**: Emits events for jackpot contributions and tier updates.

## 🧪 Testing

The project includes comprehensive tests for both contracts to ensure their functionality and correctness. The tests cover various scenarios, including jackpot contributions, staking, and game plays.

### 1. GameWithJackpot Tests

- **✅ Deployment Test**: Ensures the `GameWithJackpot` contract is deployed correctly.
- **🎯 Jackpot Functionality Tests**: Verifies the jackpot system and tiered rewards.
- **🎮 Game Play Tests**: Tests the play functionality and checks for correct outcomes.

### 2. BalanceTracker Tests

- **🔍 Initial State Test**: Verifies the initial state of the `BalanceTracker`.
- **💼 Staking Tests**: Tests for staking, withdrawing, and checking stakes.
- **🔄 Reward Distribution Tests**: Ensures rewards are distributed correctly.

## 🎉 Conclusion

The V3 project enhances the original betting game by introducing a jackpot system and tiered rewards. These improvements provide a more engaging experience for players and allow for greater flexibility in gameplay. The `BalanceTracker` remains a crucial component, maintaining its functionality from V2 while supporting the new features introduced in this version. Further enhancements can be made to improve security, randomness, and user experience.
