import React, { useMemo, useState, useEffect } from 'react';
import { History, ArrowUpRight, ArrowDownRight, Trophy, Target } from 'lucide-react';
import { GameService } from '../contracts/gameService';
import { useWallet } from '../contracts/WalletContext';

type Bet = {
  timestamp: Date;
  amount: number;
  won: boolean;
};

type BetHistoryProps = {
  bets: Bet[];
};

type StatsType = {
  wins: number;
  losses: number;
  totalWon: number;
  totalLost: number;
};

// This function is kept for calculating totalWon and totalLost from local bets
const calculateStats = (bets: Bet[]) => {
  return bets.reduce(
    (acc, bet) => ({
      wins: acc.wins + (bet.won ? 1 : 0),
      losses: acc.losses + (bet.won ? 0 : 1),
      totalWon: acc.totalWon + (bet.won ? bet.amount : 0),
      totalLost: acc.totalLost + (bet.won ? 0 : bet.amount),
    }),
    { wins: 0, losses: 0, totalWon: 0, totalLost: 0 }
  );
};

export function BetHistory({ bets }: BetHistoryProps) {
  // State to store the actual stats from contract
  const [stats, setStats] = useState<StatsType>({ wins: 0, losses: 0, totalWon: 0, totalLost: 0 });
  const { isConnected, address, gameService } = useWallet();
  
  // Calculate total amounts from local bets for display
  const amounts = useMemo(() => {
    return bets.reduce(
      (acc, bet) => ({
        totalWon: acc.totalWon + (bet.won ? bet.amount : 0),
        totalLost: acc.totalLost + (bet.won ? 0 : bet.amount),
      }),
      { totalWon: 0, totalLost: 0 }
    );
  }, [bets]);
  
  // Effect to fetch accurate stats from the contract
  useEffect(() => {
    const fetchStats = async () => {
      if (isConnected && address && gameService) {
        try {
          console.log("BetHistory: Fetching latest player stats from contract");
          const playerStats = await gameService.getPlayerStats(address);
          console.log("BetHistory: Received updated stats -", 
            `Wins: ${playerStats.wins}, Losses: ${playerStats.losses}`);
          
          setStats({
            wins: playerStats.wins,
            losses: playerStats.losses,
            totalWon: amounts.totalWon,
            totalLost: amounts.totalLost
          });
        } catch (error) {
          console.error("BetHistory: Error fetching player stats:", error);
        }
      }
    };
    
    // Fetch stats on mount and when bets change
    fetchStats();
    
    // Set up listener for game events to refresh stats
    if (isConnected && gameService) {
      console.log("BetHistory: Setting up game event listener");
      
      const cleanup = gameService.onGamePlayed(() => {
        console.log("BetHistory: Game event received, refreshing stats");
        fetchStats();
      });
      
      // Also listen for manual refresh event
      const handleManualRefresh = () => {
        console.log("BetHistory: Manual refresh event received");
        fetchStats();
      };
      
      window.addEventListener('refresh_game_data', handleManualRefresh);
      
      return () => {
        console.log("BetHistory: Cleaning up event listeners");
        cleanup();
        window.removeEventListener('refresh_game_data', handleManualRefresh);
      };
    }
  }, [isConnected, address, gameService, amounts.totalWon, amounts.totalLost]);

  // Effect to respond to bets prop changes
  useEffect(() => {
    console.log("BetHistory: Received updated bets array, length:", bets.length);
  }, [bets]);
  
  // Sort bets by timestamp in descending order (newest first)
  const sortedBets = useMemo(() => 
    [...bets].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()),
    [bets]
  );
  
  const recentBets = sortedBets.slice(0, 10);

  return (
    <div className="glass-card p-8 w-full">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <History className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">Bet History</h2>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-4 h-4 text-green-500" />
            <span className="text-sm text-foreground/70">Wins</span>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-2xl font-bold text-green-500">{stats.wins}</span>
            <span className="text-sm text-green-500">+{stats.totalWon.toFixed(2)} NEX</span>
          </div>
        </div>
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-red-500" />
            <span className="text-sm text-foreground/70">Losses</span>
          </div>
          <div className="flex justify-between items-end">
            <span className="text-2xl font-bold text-red-500">{stats.losses}</span>
            <span className="text-sm text-red-500">-{stats.totalLost.toFixed(2)} NEX</span>
          </div>
        </div>
      </div>

      <div className="text-sm text-foreground/70 mb-2">Last 10 Bets</div>
      <div className="h-[300px] overflow-y-auto pr-2 custom-scrollbar">
        {recentBets.length === 0 ? (
          <div className="text-center text-foreground/50 py-8">
            No bets placed yet
          </div>
        ) : (
          <div className="space-y-3">
            {recentBets.map((bet, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 glass-card"
              >
                <div className="flex items-center gap-3">
                  {bet.won ? (
                    <ArrowUpRight className="w-5 h-5 text-green-500" />
                  ) : (
                    <ArrowDownRight className="w-5 h-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">
                      {bet.won ? '+' : '-'}{bet.amount.toFixed(2)} NEX
                    </p>
                    <p className="text-sm text-foreground/50">
                      {bet.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <span
                  className={`text-sm font-medium ${
                    bet.won ? 'text-green-500' : 'text-red-500'
                  }`}
                >
                  {bet.won ? 'Won' : 'Lost'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}