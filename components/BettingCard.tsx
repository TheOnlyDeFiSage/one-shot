import React, { useState } from 'react';
import { RefreshCw, Coins, Info, ChevronDown, ChevronUp } from 'lucide-react';
import { useWallet } from '../contracts/WalletContext';

/**
 * Props for the BettingCard component
 * @property balance - User's current balance (optional, will use from wallet context if not provided)
 * @property betAmount - Fixed amount for each bet
 * @property onBet - Callback function for placing bets
 * @property isProcessing - Loading state during bet processing
 * @property currentStreak - Optional player's current win streak
 */
interface BettingCardProps {
  balance?: number;
  betAmount: number;
  onBet: () => void;
  isProcessing: boolean;
  currentStreak?: number;
}

/**
 * BettingCard component
 * Displays betting interface with current balance, bet amount,
 * potential winnings, and betting controls
 */
export const BettingCard: React.FC<BettingCardProps> = ({
  balance: propBalance,
  betAmount,
  onBet,
  isProcessing,
  currentStreak,
}) => {
  const { isConnected, networkCurrency, balance: walletBalance, isCorrectNetwork } = useWallet();
  const [showTooltip, setShowTooltip] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  
  // Use prop balance if provided, otherwise use wallet balance
  const balance = propBalance !== undefined ? propBalance : walletBalance;
  
  // Format balance to 4 decimal places
  const formatBalance = (val: number): string => {
    return val.toFixed(4);
  };

  // Calculate potential winnings
  const potentialWin = betAmount * 2;

  return (
    <div className="glass-card p-6 md:p-6 max-sm:p-4">
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 max-sm:mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-xl max-sm:text-lg font-semibold text-foreground mb-2 md:mb-0 flex items-center gap-2">
            <Coins className="w-5 h-5 text-primary" />
            Double or Nothing
          </h2>
          <div className="relative inline-block">
            <button
              className="text-foreground/60 hover:text-primary transition-colors duration-200"
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
              onClick={() => setShowTooltip(!showTooltip)}
              aria-label="Information about Double or Nothing"
            >
              <Info className="w-5 h-5" />
            </button>
            {showTooltip && (
              <div className="absolute z-10 w-64 max-sm:w-56 top-0 right-full mr-2 bg-background/95 glass-card p-3 rounded-lg shadow-lg border border-white/10 text-sm">
                <h3 className="text-md font-semibold mb-2">How it works</h3>
                <ul className="list-disc pl-4 space-y-1 text-sm text-foreground/80" style={{ listStyleType: 'disc', paddingInlineStart: '1.25rem' }}>
                  <li className="pl-1 ml-1">Bet the fixed amount for a 50% chance to double your money</li>
                  <li className="pl-1 ml-1">2% of all bets go to the jackpot pool</li>
                  <li className="pl-1 ml-1">Build a winning streak to qualify for jackpot tiers</li>
                  <li className="pl-1 ml-1">Win streaks of 4, 6, and 8 trigger jackpot rewards</li>
                </ul>
                <div className="tooltip-arrow absolute w-3 h-3 bg-background/95 border-r border-b border-white/10 transform rotate-45 top-2 -right-1.5"></div>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 bg-foreground/5 px-4 py-2 rounded-lg max-sm:mt-2 max-sm:text-sm">
          <span className="text-sm max-sm:text-xs text-foreground/70">Your Balance:</span>
          <span className="font-medium">{formatBalance(balance)} {networkCurrency}</span>
        </div>
      </div>

      {/* Mobile layout - Minimalist design */}
      <div className="md:hidden">
        <div className="glass-inner-card flex flex-col items-center p-4 text-center mb-3">
          <div className="mb-3">
            <p className="text-xs text-foreground/70 mb-1">Current Bet</p>
            <p className="text-2xl font-bold">{betAmount} {networkCurrency}</p>
          </div>
          
          <button
            onClick={onBet}
            disabled={!isConnected || isProcessing || balance < betAmount || !isCorrectNetwork}
            className={`w-full py-2.5 px-6 rounded-full font-bold transition-all duration-300 ${
              !isConnected || isProcessing || balance < betAmount || !isCorrectNetwork
                ? 'bg-foreground/20 text-foreground/40 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary to-secondary text-white hover:from-secondary hover:to-primary shadow-[0_4px_14px_rgba(0,255,178,0.3)]'
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processing...
              </span>
            ) : !isCorrectNetwork ? (
              'Wrong Network'
            ) : balance < betAmount ? (
              'Insufficient Balance'
            ) : (
              'Place Bet'
            )}
          </button>
        </div>
        
        {/* Collapsible details section */}
        <div 
          className="flex items-center justify-between py-2 border-b border-white/10 cursor-pointer"
          onClick={() => setShowDetails(!showDetails)}
        >
          <span className="text-sm font-medium text-foreground/80">Bet Details</span>
          {showDetails ? 
            <ChevronUp className="w-4 h-4 text-foreground/60" /> : 
            <ChevronDown className="w-4 h-4 text-foreground/60" />
          }
        </div>
        
        {showDetails && (
          <div className="py-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-foreground/70">Potential Win:</span>
              <span className="font-medium text-green-500">{potentialWin} {networkCurrency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-foreground/70">Win Chance:</span>
              <span className="font-medium">50%</span>
            </div>
            {currentStreak !== undefined && currentStreak > 0 && (
              <div className="flex justify-between">
                <span className="text-foreground/70">Current Streak:</span>
                <span className="font-medium text-primary">{currentStreak} {currentStreak == 1 ? 'win' : 'wins'}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop layout - Unchanged */}
      <div className="hidden md:grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-4">
          <p className="text-foreground/70">
            Place your bet with a 50% chance to double your money. Every bet adds to
            the jackpot pool!
          </p>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-foreground/70">Bet Amount:</span>
              <span className="font-medium">{betAmount} {networkCurrency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground/70">Potential Win:</span>
              <span className="font-medium text-green-500">{potentialWin} {networkCurrency}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-foreground/70">Win Chance:</span>
              <span className="font-medium">50%</span>
            </div>
            {currentStreak !== undefined && currentStreak > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-foreground/70">Current Streak:</span>
                <span className="font-medium text-primary">{currentStreak} {currentStreak == 1 ? 'win' : 'wins'}</span>
              </div>
            )}
          </div>
        </div>

        <div className="glass-inner-card flex flex-col justify-center items-center p-6 text-center">
          <div className="mb-4">
            <p className="text-sm text-foreground/70 mb-1">Current Bet</p>
            <p className="text-3xl font-bold">{betAmount} {networkCurrency}</p>
          </div>
          
          <button
            onClick={onBet}
            disabled={!isConnected || isProcessing || balance < betAmount || !isCorrectNetwork}
            className={`w-full py-3 px-6 rounded-full font-bold transition-all duration-300 ${
              !isConnected || isProcessing || balance < betAmount || !isCorrectNetwork
                ? 'bg-foreground/20 text-foreground/40 cursor-not-allowed'
                : 'bg-gradient-to-r from-primary to-secondary text-white hover:from-secondary hover:to-primary shadow-[0_4px_14px_rgba(0,255,178,0.3)] transform hover:-translate-y-0.5'
            }`}
          >
            {isProcessing ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Processing...
              </span>
            ) : !isCorrectNetwork ? (
              'Wrong Network'
            ) : balance < betAmount ? (
              'Insufficient Balance'
            ) : (
              'Place Bet'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};