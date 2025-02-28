import React, { useEffect, useState, useCallback } from 'react';
import { Trophy, Crown, Star } from 'lucide-react';
import { useWallet } from '../contracts/WalletContext';
import { ethers } from 'ethers';

interface JackpotCardProps {
  currentStreak: number;
  betAmount: number;
}

export const JackpotCard: React.FC<JackpotCardProps> = ({
  currentStreak,
  betAmount,
}) => {
  const { isConnected, gameService, networkCurrency } = useWallet();
  const [jackpotPool, setJackpotPool] = useState<number>(0);
  const [jackpotTiers, setJackpotTiers] = useState<{
    thresholds: number[];
    payouts: number[];
    amounts: number[];
  }>({
    thresholds: [4, 6, 8],
    payouts: [10, 25, 100],
    amounts: [0, 0, 0]
  });

  // Format amount to 4 decimal places
  const formatAmount = (val: number): string => {
    return val.toFixed(4);
  };

  // Function to fetch jackpot data from the contract
  const fetchJackpotData = useCallback(async () => {
    if (isConnected && gameService) {
      try {
        console.log("JackpotCard: Fetching jackpot data from contract");
        // Get the real jackpot pool amount directly from the contract
        const pool = await gameService.getJackpotPool();
        console.log("JackpotCard: Current jackpot pool:", pool);
        setJackpotPool(pool);
        
        // Get jackpot tier information
        const info = await gameService.getJackpotInfo();
        console.log("JackpotCard: Jackpot tiers updated");
        
        setJackpotTiers({
          thresholds: info.tierThresholds,
          payouts: info.tierPayouts,
          amounts: info.tierAmounts
        });
      } catch (error) {
        console.error("JackpotCard: Error fetching jackpot data:", error);
      }
    }
  }, [isConnected, gameService]);

  // Fetch jackpot info initially and set up polling
  useEffect(() => {
    // Initial fetch
    fetchJackpotData();
    
    // Set up interval to refresh jackpot data every 5 seconds (short interval for responsive UI)
    const intervalId = setInterval(fetchJackpotData, 5000);
    
    // Clean up the interval on component unmount
    return () => clearInterval(intervalId);
  }, [fetchJackpotData]);

  // Listen for game events to update jackpot data
  useEffect(() => {
    if (isConnected && gameService) {
      console.log("JackpotCard: Setting up game event listener");
      
      const cleanup = gameService.onGamePlayed(() => {
        console.log("JackpotCard: Game event received, refreshing data");
        // Refresh jackpot data whenever a game is played
        fetchJackpotData();
      });
      
      // Also listen for manual refresh event
      const handleManualRefresh = () => {
        console.log("JackpotCard: Manual refresh event received");
        fetchJackpotData();
      };
      
      window.addEventListener('refresh_game_data', handleManualRefresh);
      
      return () => {
        console.log("JackpotCard: Cleaning up event listeners");
        cleanup();
        window.removeEventListener('refresh_game_data', handleManualRefresh);
      };
    }
  }, [isConnected, gameService, fetchJackpotData]);

  // Effect to respond to currentStreak changes from props
  useEffect(() => {
    console.log("JackpotCard: Current streak updated to", currentStreak);
  }, [currentStreak]);

  // Helper to get visual elements based on streak progress
  const getWinStreakIndicators = (max: number = 8) => {
    return Array.from({ length: max }, (_, i) => (
      <div 
        key={i} 
        className={`w-3 h-3 rounded-full transition-all duration-300 ${
          i < currentStreak 
            ? 'bg-gradient-to-r from-primary to-secondary shadow-[0_0_10px_rgba(0,255,178,0.5)]' 
            : 'bg-foreground/20'
        }`}
      />
    ));
  };

  // Get visual style for a tier based on importance
  const getTierStyle = (index: number, isActive: boolean) => {
    const baseClasses = "glass-inner-card p-4 rounded-lg border-2 transition-all duration-300 ";
    
    if (isActive) {
      if (index === 2) { // Top tier (100%)
        return baseClasses + "border-primary bg-gradient-to-br from-primary/20 to-secondary/10 shadow-[0_0_15px_rgba(0,255,178,0.3)]";
      } else if (index === 1) { // Middle tier (25%)
        return baseClasses + "border-primary/70 bg-gradient-to-br from-primary/15 to-secondary/5 shadow-[0_0_12px_rgba(0,255,178,0.2)]";
      } else { // Lower tier (10%)
        return baseClasses + "border-primary/50 bg-gradient-to-br from-primary/10 to-secondary/5 shadow-[0_0_10px_rgba(0,255,178,0.15)]";
      }
    }
    
    return baseClasses + "border-transparent hover:border-white/10 hover:bg-foreground/5";
  };

  const getJackpotLabel = (index: number) => {
    if (index === 2) return "GRAND JACKPOT";
    if (index === 1) return "MAJOR JACKPOT";
    return "MINI JACKPOT";
  };

  return (
    <div className="glass-card p-6 relative overflow-hidden">
      {/* Decorative elements - using primary and secondary color scheme */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-16 -left-16 w-40 h-40 bg-secondary/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute top-1/2 right-0 w-24 h-24 bg-primary/5 rounded-full blur-2xl pointer-events-none"></div>
      <div className="absolute bottom-1/3 left-1/4 w-16 h-16 bg-secondary/5 rounded-full blur-xl pointer-events-none"></div>
      
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2 mb-2 md:mb-0">
          <Trophy className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Jackpot System</h2>
        </div>
        <div className="flex items-center gap-2 bg-foreground/5 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/5">
          <span className="text-sm text-foreground/70">Current Jackpot:</span>
          <span className="font-bold text-gradient bg-gradient-to-r from-primary to-secondary">
            {formatAmount(jackpotPool)} {networkCurrency}
          </span>
        </div>
      </div>

      <div className="space-y-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {jackpotTiers.thresholds.map((threshold, index) => {
            // Define tier-specific styles for better visual distinction
            const tierStyles = {
              mini: {
                bgGradient: 'from-blue-400/20 to-blue-500/10',
                activeBorder: 'border-blue-400',
                iconColor: 'text-blue-400',
                fillColor: 'fill-blue-400/40',
                badge: 'bg-blue-500/20 text-blue-100',
                title: 'text-blue-300'
              },
              major: {
                bgGradient: 'from-purple-400/20 to-purple-500/10',
                activeBorder: 'border-purple-400',
                iconColor: 'text-purple-400',
                fillColor: 'fill-purple-400/40',
                badge: 'bg-purple-500/20 text-purple-100',
                title: 'text-purple-300'
              },
              grand: {
                bgGradient: 'from-primary/20 to-secondary/10',
                activeBorder: 'border-primary',
                iconColor: 'text-primary',
                fillColor: 'fill-primary/40',
                badge: 'bg-primary/20 text-green-100',
                title: 'text-primary'
              }
            };

            // Select the appropriate tier style
            const tierStyle = index === 0 ? tierStyles.mini : 
                             index === 1 ? tierStyles.major : 
                             tierStyles.grand;

            const baseClasses = "glass-inner-card p-4 rounded-lg border-2 transition-all duration-300 ";
            
            // Apply active or inactive styling
            const cardClass = currentStreak >= threshold
              ? `${baseClasses} ${tierStyle.activeBorder} bg-gradient-to-br ${tierStyle.bgGradient} shadow-[0_0_15px_rgba(0,255,178,0.3)]`
              : `${baseClasses} border-transparent hover:border-white/10 hover:bg-foreground/5`;

            return (
              <div key={index} className={cardClass}>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-1.5">
                    {index === 0 && <span className="w-2 h-2 rounded-full bg-blue-400"></span>}
                    {index === 1 && <span className="w-2 h-2 rounded-full bg-purple-400"></span>}
                    {index === 2 && <span className="w-2 h-2 rounded-full bg-primary"></span>}
                    <span className={`text-xs font-bold tracking-wider ${tierStyle.title}`}>
                      {getJackpotLabel(index)}
                    </span>
                  </div>
                  <div className="flex items-center">
                    {[...Array(index + 1)].map((_, i) => (
                      <Star key={i} className={`w-3 h-3 ${tierStyle.iconColor} ${tierStyle.fillColor}`} />
                    ))}
                  </div>
                </div>
                
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold flex items-center gap-1">
                    <Crown className={tierStyle.iconColor} size={16} />
                    {threshold}-Win Streak
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${tierStyle.badge}`}>
                    {jackpotTiers.payouts[index]}% Payout
                  </span>
                </div>
                
                <div className="text-2xl font-bold mb-1 text-gradient bg-gradient-to-r from-primary to-secondary">
                  {formatAmount(jackpotTiers.amounts[index])} {networkCurrency}
                </div>
                
                <div className="text-xs text-foreground/60 flex items-center gap-1">
                  <span className="px-2 py-0.5 rounded-full bg-foreground/10 text-foreground/80">
                    {betAmount > 0 ? (jackpotTiers.amounts[index] / betAmount).toFixed(0) : '0'}x your bet
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className="glass-inner-card p-4 rounded-lg border border-white/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-all duration-300 ${
                currentStreak > 0 
                  ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-[0_0_10px_rgba(0,255,178,0.3)]' 
                  : 'bg-foreground/20 text-foreground/40'
              }`}>
                {currentStreak}
              </div>
              <div>
                <div className="text-sm font-semibold">Win Streak</div>
                {currentStreak > 0 ? (
                  <div className="text-xs text-primary/90">{
                    currentStreak < 4 ? `${4-currentStreak} more to Mini Jackpot` :
                    currentStreak < 6 ? `${6-currentStreak} more to Major Jackpot` :
                    currentStreak < 8 ? `${8-currentStreak} more to Grand Jackpot` : 
                    'Grand Jackpot Ready!'
                  }</div>
                ) : (
                  <div className="text-xs text-foreground/60">Start winning to build</div>
                )}
              </div>
            </div>
          </div>
          
          {/* Win streak progress visualization - simplified and more elegant */}
          <div className="relative h-6 w-full bg-foreground/10 rounded-full overflow-hidden">
            {/* Progress bar that fills based on current streak */}
            <div 
              className="absolute h-full bg-gradient-to-r from-primary/80 to-secondary/80 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${Math.min((currentStreak / 8) * 100, 100)}%` }}
            ></div>
            
            {/* Milestone markers */}
            <div className="absolute top-0 left-0 w-full h-full flex justify-between px-2 items-center pointer-events-none">
              {/* Empty flex container for spacing */}
              <div></div>
              
              {/* Tier markers with visual indicators */}
              <div className={`h-4 w-4 rounded-full flex items-center justify-center z-10 
                ${currentStreak >= 4 ? 'bg-white text-primary' : 'bg-foreground/30 text-foreground/60'} 
                text-[10px] font-bold transition-all duration-300`}>
                4
              </div>
              
              <div className={`h-4 w-4 rounded-full flex items-center justify-center z-10 
                ${currentStreak >= 6 ? 'bg-white text-primary' : 'bg-foreground/30 text-foreground/60'} 
                text-[10px] font-bold transition-all duration-300`}>
                6
              </div>
              
              <div className={`h-4 w-4 rounded-full flex items-center justify-center z-10 
                ${currentStreak >= 8 ? 'bg-white text-primary' : 'bg-foreground/30 text-foreground/60'} 
                text-[10px] font-bold transition-all duration-300`}>
                8
              </div>
              
              {/* Empty flex container for spacing */}
              <div></div>
            </div>
          </div>
          
          <div className="flex justify-between mt-2 text-xs text-foreground/60">
            <span>Start</span>
            <span className="text-xs">Mini</span>
            <span className="text-xs">Major</span>
            <span className="text-xs">Grand</span>
          </div>
        </div>
      </div>
    </div>
  );
};