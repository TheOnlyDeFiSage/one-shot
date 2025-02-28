import React, { useState, useCallback, useEffect, useRef } from 'react';
import { WalletButton } from './components/WalletButton';
import { BettingCard } from './components/BettingCard';
import { StakingCard } from './components/StakingCard';
import { BetHistory } from './components/BetHistory';
import { JackpotCard } from './components/JackpotCard';
import { Toast } from './components/Toast';
import { FAQs } from './components/FAQs';
import { BettingAnimation } from './components/BettingAnimation';
import { StakingAnimation } from './components/StakingAnimation';
import { DonationPopup } from './components/DonationPopup';
import { Github, Twitter, Box, Coffee } from 'lucide-react';
import { useWallet } from './contracts/WalletContext';
import { BET_AMOUNT } from './contracts/config';
import { ethers } from 'ethers';

/**
 * Main App component that manages the casino dApp's state and UI
 * Handles wallet connection, betting, staking, and notifications
 */
function App() {
  // Get wallet and contract services from context
  const { isConnected, address, balance, gameService, stakingService, provider, isCorrectNetwork, networkCurrency } = useWallet();
  
  // Staking state
  const [stakedAmount, setStakedAmount] = useState(0);
  const [rewards, setRewards] = useState(0);
  
  // Player state
  const [currentStreak, setCurrentStreak] = useState(0);
  
  // Bet history state
  const [bets, setBets] = useState<Array<{ timestamp: Date; amount: number; won: boolean }>>([]);
  
  // UI state
  const [isProcessing, setIsProcessing] = useState(false);
  const [isStakingProcessing, setIsStakingProcessing] = useState(false);
  const [stakingOperation, setStakingOperation] = useState<'stake' | 'withdraw'>('stake');
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(
    null
  );
  
  // Donation popup state
  const [isDonationOpen, setIsDonationOpen] = useState(false);
  const [showCoffeeTooltip, setShowCoffeeTooltip] = useState(false);

  // Add a ref to track the event listener cleanup function
  const gamePlayedListenerRef = useRef<any>(null);

  // Update balance from provider
  const updateWalletBalance = useCallback(async () => {
    if (isConnected && address && provider) {
      try {
        const balanceWei = await provider.getBalance(address);
        console.log("Updated balance: ", ethers.utils.formatEther(balanceWei));
      } catch (error) {
        console.error("Error updating balance:", error);
      }
    }
  }, [isConnected, address, provider]);

  // Function to refresh staking data
  const refreshStakingData = useCallback(async () => {
    if (isConnected && address && stakingService) {
      try {
        console.log("Refreshing staking data...");
        
        // Fetch staking data with retry mechanism
        let retries = 3;
        let success = false;
        
        while (retries > 0 && !success) {
          try {
            // Get fresh staked amount
            const staked = await stakingService.getStakedAmount(address);
            console.log("Updated staked amount:", staked);
            setStakedAmount(staked);
            
            // Get fresh rewards
            const pendingRewards = await stakingService.getPendingRewards(address);
            console.log("Updated rewards:", pendingRewards);
            setRewards(pendingRewards);
            
            // Broadcast a custom event for staking data update
            window.dispatchEvent(new CustomEvent('refresh_staking_data'));
            
            success = true;
          } catch (err) {
            console.warn(`Error refreshing staking data, retries left: ${retries-1}`, err);
            retries--;
            // Small delay before retry
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }
        }
        
        if (!success) {
          console.error("Failed to refresh staking data after multiple attempts");
        }
      } catch (error) {
        console.error("Error in refreshStakingData:", error);
      }
    }
  }, [isConnected, address, stakingService]);

  // Set up interval to update balance periodically
  useEffect(() => {
    if (isConnected) {
      // Update once right away
      updateWalletBalance();
      
      // Then set up interval (every 30 seconds)
      const intervalId = setInterval(updateWalletBalance, 30000);
      
      return () => {
        clearInterval(intervalId);
      };
    }
  }, [isConnected, updateWalletBalance]);

  // Load contract data when connected
  useEffect(() => {
    // Only fetch data if wallet is connected and services are available
    if (isConnected && address && gameService && stakingService) {
      const fetchData = async () => {
        try {
          console.log("App: Fetching contract data");
          
          // Fetch player streak
          const streak = await gameService.getPlayerStreak(address);
          setCurrentStreak(streak);
          
          // Fetch staking data
          const staked = await stakingService.getStakedAmount(address);
          setStakedAmount(staked);
          
          // Fetch rewards
          const pendingRewards = await stakingService.getPendingRewards(address);
          setRewards(pendingRewards);
          
          // Fetch bet history
          const history = await gameService.getBetHistory(address);
          const formattedHistory = history.map(bet => ({
            timestamp: new Date(bet.timestamp * 1000),
            amount: bet.amount,
            won: bet.won
          }));
          setBets(formattedHistory);
          
        } catch (error) {
          console.error("Error fetching contract data:", error);
          setToast({
            type: 'error',
            message: 'Error loading data from the blockchain'
          });
        }
      };
      
      fetchData();
      
      // Clean up previous event listener if it exists
      if (gamePlayedListenerRef.current) {
        try {
          console.log("Cleaning up previous GamePlayed event listener");
          gamePlayedListenerRef.current();
          gamePlayedListenerRef.current = null;
        } catch (err) {
          console.error("Error cleaning up previous event listener:", err);
        }
      }
      
      // Set up event listeners with retry mechanism
      if (gameService) {
        console.log("App: Setting up GamePlayed event listener");
        
        try {
          const cleanupFunction = gameService.onGamePlayed((event) => {
            console.log("App: GamePlayed event received:", event);
            
            if (event.player.toLowerCase() === address.toLowerCase()) {
              console.log("App: Event is for current user, refreshing data");
              
              // Refresh data after playing
              fetchData();
              updateWalletBalance();
              
              // Ensure toast is shown for game results
              setToast({
                type: event.won ? 'success' : 'error',
                message: event.won ? 'You won!' : 'You lost. Try again!'
              });
              
              // Trigger refresh for all components
              window.dispatchEvent(new CustomEvent('refresh_game_data'));
            } else {
              console.log("App: Event is for different user, ignoring");
            }
          });
          
          // Store the cleanup function in the ref
          gamePlayedListenerRef.current = cleanupFunction;
          
        } catch (error) {
          console.error("Error setting up GamePlayed event listener:", error);
        }
      }
      
      return () => {
        // Clean up on unmount or when dependencies change
        if (gamePlayedListenerRef.current) {
          try {
            console.log("Cleaning up GamePlayed event listener on unmount");
            gamePlayedListenerRef.current();
            gamePlayedListenerRef.current = null;
          } catch (err) {
            console.error("Error removing event listeners:", err);
          }
        }
      };
    }
  }, [isConnected, address, gameService, stakingService, updateWalletBalance]);

  /**
   * Handles placing a bet by calling the Game contract
   */
  const handleBet = useCallback(async () => {
    if (!isConnected || !gameService) {
      setToast({
        type: 'error',
        message: 'Please connect your wallet first'
      });
      return;
    }

    if (!isCorrectNetwork) {
      setToast({
        type: 'error',
        message: 'Please switch to the correct network first'
      });
      return;
    }
    
    try {
      setIsProcessing(true);
      
      // Call the play function on the contract
      const tx = await gameService.placeBet();
      
      // Show pending toast
      setToast({
        type: 'info',
        message: 'Bet transaction submitted...'
      });
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log("Transaction confirmed:", receipt.transactionHash);
      
      // Wait a small delay to ensure blockchain state is updated
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Extract game result from transaction receipt logs
      let gameWon = false;
      let resultShown = false;
      
      // Try to extract result directly from transaction logs
      try {
        if (receipt.logs && receipt.logs.length > 0) {
          // Decode the GamePlayed event from logs
          for (const log of receipt.logs) {
            try {
              // The GamePlayed event is likely the first event emitted
              const parsedLog = gameService.contract.interface.parseLog(log);
              if (parsedLog.name === 'GamePlayed') {
                // Event parameters: player, amount, won, message
                const won = parsedLog.args[2]; // The 'won' parameter
                gameWon = won;
                console.log("DIRECT LOG: Game result extracted from tx logs:", won ? "WON" : "LOST");
                
                // Immediately show the result toast
                setToast({
                  type: won ? 'success' : 'error',
                  message: won ? 'You won!' : 'You lost. Try again!'
                });
                resultShown = true;
                break;
              }
            } catch (err) {
              console.log("Could not parse this log, continuing to next one");
            }
          }
        }
      } catch (err) {
        console.error("Error extracting game result from logs:", err);
      }
      
      // Update balance immediately
      updateWalletBalance();
      
      // First refresh cycle - force refresh all data regardless of event listener status
      console.log("FIRST REFRESH CYCLE - Immediate refresh");
      
      if (address && gameService) {
        try {
          console.log("Forcing immediate data refresh after bet");
          
          // Get fresh streak data - critical for UI correctness
          const streak = await gameService.getPlayerStreak(address);
          console.log("Updated streak:", streak, "Previous streak:", currentStreak);
          setCurrentStreak(streak);
          
          // Get fresh player stats for bet history
          const playerStats = await gameService.getPlayerStats(address);
          console.log("Updated player stats:", playerStats);
          
          // Get fresh bet history
          const history = await gameService.getBetHistory(address);
          if (history && history.length > 0) {
            console.log("New bet history received, updating UI");
            const formattedHistory = history.map(bet => ({
              timestamp: new Date(bet.timestamp * 1000),
              amount: bet.amount,
              won: bet.won
            }));
            setBets(formattedHistory);
            
            // If we couldn't get result from logs, use history
            if (!resultShown && history.length > 0) {
              const latestBet = history[0]; // Most recent bet
              
              // Set toast with result
              setToast({
                type: latestBet.won ? 'success' : 'error',
                message: latestBet.won ? 'You won!' : 'You lost. Try again!'
              });
              gameWon = latestBet.won;
              resultShown = true;
              console.log("FALLBACK: Game result from history:", latestBet.won ? "WON" : "LOST");
            }
          }
          
          // Force refresh all components with the custom event
          console.log("Broadcasting refresh_game_data event to all components");
          window.dispatchEvent(new CustomEvent('refresh_game_data'));
        } catch (err) {
          console.error("Error during first data refresh cycle:", err);
        }
      }
      
      // Wait a bit longer and do a second refresh to ensure consistency
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Second refresh cycle - in case blockchain state wasn't fully updated in first cycle
      console.log("SECOND REFRESH CYCLE - Delayed verification");
      
      if (address && gameService) {
        try {
          // Verify streak data is correct (important for UI)
          const verifyStreak = await gameService.getPlayerStreak(address);
          if (verifyStreak !== currentStreak) {
            console.log("Streak needed correction in second cycle:", verifyStreak);
            setCurrentStreak(verifyStreak);
          }
          
          // Refresh bet history again to be sure
          const verifyHistory = await gameService.getBetHistory(address);
          if (verifyHistory && verifyHistory.length > 0) {
            const formattedHistory = verifyHistory.map(bet => ({
              timestamp: new Date(bet.timestamp * 1000),
              amount: bet.amount,
              won: bet.won
            }));
            setBets(formattedHistory);
          }
          
          // Final fallback for result notification
          if (!resultShown && verifyHistory && verifyHistory.length > 0) {
            const latestBet = verifyHistory[0];
            setToast({
              type: latestBet.won ? 'success' : 'error',
              message: latestBet.won ? 'You won!' : 'You lost. Try again!'
            });
            console.log("FINAL FALLBACK: Game result:", latestBet.won ? "WON" : "LOST");
          } else if (!resultShown) {
            // Absolute last resort
            setToast({
              type: 'info',
              message: 'Bet completed. Check history for results.'
            });
          }
          
          // One final broadcast
          window.dispatchEvent(new CustomEvent('refresh_game_data'));
        } catch (err) {
          console.error("Error during second data refresh cycle:", err);
        }
      }
    } catch (error: any) {
      console.error("Error placing bet:", error);
      
      // Handle user rejection - expanded detection for different wallet types
      if (
        error.code === 4001 || // MetaMask user rejected
        error.code === -32603 || // Some wallets use this for rejection
        (error.message && (
          error.message.includes("User denied") ||
          error.message.includes("User rejected") ||
          error.message.includes("user rejected") ||
          error.message.includes("user denied") ||
          error.message.includes("cancelled") ||
          error.message.includes("canceled") ||
          error.message.includes("Transaction was rejected")
        ))
      ) {
        console.log("Detected transaction cancellation by user");
        // Don't show any toast for cancellations
        return;
      } else {
        // Show error toast only for actual errors, not cancellations
        setToast({
          type: 'error',
          message: 'Error placing bet. Please try again.'
        });
      }
    } finally {
      setIsProcessing(false);
    }
  }, [isConnected, gameService, updateWalletBalance, address, isCorrectNetwork, currentStreak]);

  /**
   * Handles staking tokens by calling the BalanceTracker contract
   */
  const handleStake = useCallback(async () => {
    if (!isConnected || !stakingService) {
      setToast({
        type: 'error',
        message: 'Please connect your wallet first'
      });
      return;
    }

    if (!isCorrectNetwork) {
      setToast({
        type: 'error',
        message: 'Please switch to the correct network first'
      });
      return;
    }
    
    try {
      // Fixed 0.1 ETH stake for now
      const stakeAmount = 0.1;
      
      if (balance < stakeAmount) {
        setToast({
          type: 'error',
          message: 'Insufficient balance for staking'
        });
        return;
      }
      
      // Set staking operation type and activate loading animation
      setStakingOperation('stake');
      setIsStakingProcessing(true);
      
      // Call the stake function
      const tx = await stakingService.stake(stakeAmount);
      
      // Show pending toast
      setToast({
        type: 'info',
        message: 'Staking transaction submitted...'
      });
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log("Staking transaction confirmed:", receipt.transactionHash);
      
      // Wait a moment to ensure blockchain state update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // First data refresh cycle
      console.log("FIRST REFRESH CYCLE - Immediate staking refresh");
      
      // Update balance manually after staking
      updateWalletBalance();
      
      // First attempt to update staking data
      await refreshStakingData();
      
      // Wait a bit longer and do a second refresh to ensure consistency
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Second refresh cycle - to ensure data consistency
      console.log("SECOND REFRESH CYCLE - Delayed staking verification");
      await refreshStakingData();
      
      setToast({
        type: 'success',
        message: `Successfully staked ${stakeAmount} ${networkCurrency}`
      });
      
    } catch (error: any) {
      console.error("Error staking:", error);
      
      // Handle user rejection - expanded detection for different wallet types
      if (
        error.code === 4001 || // MetaMask user rejected
        error.code === -32603 || // Some wallets use this for rejection
        (error.message && (
          error.message.includes("User denied") ||
          error.message.includes("User rejected") ||
          error.message.includes("user rejected") ||
          error.message.includes("user denied") ||
          error.message.includes("cancelled") ||
          error.message.includes("canceled") ||
          error.message.includes("Transaction was rejected")
        ))
      ) {
        console.log("Detected staking cancellation by user");
        // Don't show any toast for cancellations
        return;
      } else {
        // Show error toast only for actual errors, not cancellations
        setToast({
          type: 'error',
          message: 'Error staking tokens. Please try again.'
        });
      }
    } finally {
      setIsStakingProcessing(false);
    }
  }, [isConnected, stakingService, balance, address, updateWalletBalance, refreshStakingData, isCorrectNetwork, networkCurrency]);

  /**
   * Handles withdrawing staked tokens and rewards
   */
  const handleWithdraw = useCallback(async () => {
    if (!isConnected || !stakingService) {
      setToast({
        type: 'error',
        message: 'Please connect your wallet first'
      });
      return;
    }

    if (!isCorrectNetwork) {
      setToast({
        type: 'error',
        message: 'Please switch to the correct network first'
      });
      return;
    }
    
    try {
      if (stakedAmount <= 0) {
        setToast({
          type: 'error',
          message: 'No tokens to withdraw'
        });
        return;
      }
      
      // Set withdrawal operation type and activate loading animation
      setStakingOperation('withdraw');
      setIsStakingProcessing(true);
      
      // Call the withdraw function
      const tx = await stakingService.withdraw();
      
      // Show pending toast
      setToast({
        type: 'info',
        message: 'Withdrawal transaction submitted...'
      });
      
      // Wait for transaction to be mined
      const receipt = await tx.wait();
      console.log("Withdrawal transaction confirmed:", receipt.transactionHash);
      
      // Wait a moment to ensure blockchain state update
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // First data refresh cycle
      console.log("FIRST REFRESH CYCLE - Immediate withdrawal refresh");
      
      // Update balance manually after withdrawal
      updateWalletBalance();
      
      // First attempt to update staking data
      await refreshStakingData();
      
      // Wait a bit longer and do a second refresh to ensure consistency
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Second refresh cycle - to ensure data consistency
      console.log("SECOND REFRESH CYCLE - Delayed withdrawal verification");
      await refreshStakingData();
      
      // Update UI - We'll still set these for immediate feedback, even though refreshStakingData should have updated them
      setStakedAmount(0);
      setRewards(0);
      
      setToast({
        type: 'success',
        message: `Successfully withdrawn staked tokens and rewards in ${networkCurrency}`
      });
      
    } catch (error: any) {
      console.error("Error withdrawing:", error);
      
      // Handle user rejection - expanded detection for different wallet types
      if (
        error.code === 4001 || // MetaMask user rejected
        error.code === -32603 || // Some wallets use this for rejection
        (error.message && (
          error.message.includes("User denied") ||
          error.message.includes("User rejected") ||
          error.message.includes("user rejected") ||
          error.message.includes("user denied") ||
          error.message.includes("cancelled") ||
          error.message.includes("canceled") ||
          error.message.includes("Transaction was rejected")
        ))
      ) {
        console.log("Detected withdrawal cancellation by user");
        // Don't show any toast for cancellations
        return;
      } else {
        // Show error toast only for actual errors, not cancellations
        setToast({
          type: 'error',
          message: 'Error withdrawing tokens. Please try again.'
        });
      }
    } finally {
      setIsStakingProcessing(false);
    }
  }, [isConnected, stakingService, stakedAmount, address, updateWalletBalance, refreshStakingData, isCorrectNetwork, networkCurrency]);

  // Main UI layout with responsive design
  // Uses fixed header and footer with scrollable main content
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="fixed top-0 left-0 right-0 glass-card border-b border-white/10 z-20">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Box className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Nexus One-Shot
            </h1>
          </div>
          <WalletButton />
        </div>
      </header>

      <main className="flex-1 pt-28 pb-24 px-4 overflow-x-hidden">
        <div className="max-w-7xl mx-auto">
          {!isConnected ? (
            <div className="text-center py-32 max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-foreground mb-4">
                Welcome to Nexus One-Shot
              </h2>
              <p className="text-foreground/70 mb-8 max-w-md mx-auto">
                Connect your wallet to start playing and earning rewards through our
                provably fair gaming system and staking pool.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold mb-2 text-primary">50/50 Betting</h3>
                  <p className="text-foreground/70 text-sm">
                    Place bets with a 50% chance to double your tokens. All outcomes are
                    provably fair and verified on-chain.
                  </p>
                </div>
                <div className="glass-card p-6">
                  <h3 className="text-lg font-semibold mb-2 text-primary">Stake & Earn</h3>
                  <p className="text-foreground/70 text-sm">
                    Stake your tokens to earn passive rewards from casino fees.
                    5% of all losses are distributed to stakers.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {/* Main content grid - fixed to ensure proper layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left column - betting card */}
                <div className="lg:col-span-8">
                  <BettingCard
                    betAmount={BET_AMOUNT}
                    currentStreak={currentStreak}
                    onBet={handleBet}
                    isProcessing={isProcessing}
                  />
                  
                  {/* Jackpot card - positioned below betting card in left column */}
                  <div className="mt-8">
                    <JackpotCard
                      currentStreak={currentStreak}
                      betAmount={BET_AMOUNT}
                    />
                  </div>
                </div>
                
                {/* Right column - staking and bet history */}
                <div className="lg:col-span-4 space-y-6">
                  <StakingCard
                    stakedAmount={stakedAmount}
                    rewards={rewards}
                    apr={5}
                    onStake={handleStake}
                    onWithdraw={handleWithdraw}
                  />
                  
                  {/* Bet history - visible on desktop in right column */}
                  <div className="hidden lg:block">
                    <BetHistory bets={bets} />
                  </div>
                </div>
              </div>
              
              {/* Mobile bet history - below betting card on mobile only */}
              <div className="lg:hidden">
                <BetHistory bets={bets} />
              </div>
            </div>
          )}
        </div>
      </main>

      {toast && (
        <Toast
          type={toast.type}
          message={toast.message}
          onClose={() => setToast(null)}
        />
      )}
      <BettingAnimation isVisible={isProcessing} />
      <StakingAnimation isVisible={isStakingProcessing} operationType={stakingOperation} />
      <footer className="fixed bottom-0 left-0 right-0 glass-card border-t border-white/10 z-20 mt-auto">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-center gap-6">
          <a
            href="https://x.com/DeFi_Sage"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/70 hover:text-foreground transition-colors"
          >
            <Twitter className="w-6 h-6"  />
          </a>
          <a
            href="https://github.com/TheOnlyDeFiSage/one-shot"
            target="_blank"
            rel="noopener noreferrer"
            className="text-foreground/70 hover:text-foreground transition-colors"
          >
            <Github className="w-6 h-6" />
          </a>
          <div className="relative inline-block">
            <button
              onClick={() => setIsDonationOpen(true)}
              onMouseEnter={() => setShowCoffeeTooltip(true)}
              onMouseLeave={() => setShowCoffeeTooltip(false)}
              className="text-foreground/70 hover:text-primary transition-colors"
              aria-label="Buy me a coffee"
            >
              <Coffee className="w-6 h-6" />
            </button>
            {showCoffeeTooltip && (
              <div className="absolute z-10 w-44 bottom-full mb-2 left-1/2 -translate-x-1/2 bg-background/95 glass-card p-2 rounded-lg shadow-lg border border-white/10 text-sm text-center">
                Like it? Please support the Dev.
                <div className="tooltip-arrow absolute w-3 h-3 bg-background/95 border-r border-b border-white/10 transform rotate-45 -bottom-1.5 left-1/2 -translate-x-1/2"></div>
              </div>
            )}
          </div>
        </div>
      </footer>
      <FAQs isConnected={isConnected} />
      <DonationPopup isOpen={isDonationOpen} onClose={() => setIsDonationOpen(false)} />
    </div>
  );
}

export default App