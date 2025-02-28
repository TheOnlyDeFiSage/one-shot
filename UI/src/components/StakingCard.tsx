import React, { useState, useEffect } from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip,
  Label
} from 'recharts';
import { Lock, Info } from 'lucide-react';
import { useWallet } from '../contracts/WalletContext';

interface StakingCardProps {
  stakedAmount: number;
  rewards: number;
  apr: number;
  onStake: () => void;
  onWithdraw: () => void;
}

export const StakingCard: React.FC<StakingCardProps> = ({
  stakedAmount,
  rewards,
  apr,
  onStake,
  onWithdraw,
}) => {
  const { isConnected, stakingService, networkCurrency, isCorrectNetwork } = useWallet();
  const [totalStaked, setTotalStaked] = useState<number>(0);
  const [yourProportion, setYourProportion] = useState<number>(0);
  const [showTooltip, setShowTooltip] = useState(false);

  // Format amount to 4 decimal places
  const formatAmount = (val: number): string => {
    return val.toFixed(4);
  };

  // Calculate proportion of total staked
  useEffect(() => {
    const fetchStakingData = async () => {
      if (isConnected && stakingService) {
        try {
          const total = await stakingService.getTotalStaked();
          setTotalStaked(total);
          
          // Calculate proportion
          if (total > 0 && stakedAmount > 0) {
            setYourProportion((stakedAmount / total) * 100);
          } else {
            setYourProportion(0);
          }
        } catch (error) {
          console.error("Error fetching staking data:", error);
        }
      }
    };
    
    fetchStakingData();
  }, [isConnected, stakingService, stakedAmount]);

  // Listen for refresh events specifically for staking data
  useEffect(() => {
    const handleRefreshStakingData = async () => {
      console.log("StakingCard: Refresh staking data event received");
      
      if (isConnected && stakingService) {
        try {
          // Get total staked to recalculate proportion
          const total = await stakingService.getTotalStaked();
          setTotalStaked(total);
          
          // Recalculate proportion
          if (total > 0 && stakedAmount > 0) {
            setYourProportion((stakedAmount / total) * 100);
          } else {
            setYourProportion(0);
          }
          
          console.log("StakingCard: Updated data after refresh event", {
            totalStaked: total,
            yourStakedAmount: stakedAmount,
            proportion: total > 0 ? (stakedAmount / total) * 100 : 0
          });
        } catch (error) {
          console.error("StakingCard: Error refreshing staking data:", error);
        }
      }
    };
    
    // Add event listener for custom refresh event
    window.addEventListener('refresh_staking_data', handleRefreshStakingData);
    
    // Also listen for general game data refresh events
    window.addEventListener('refresh_game_data', handleRefreshStakingData);
    
    // Clean up listeners on unmount
    return () => {
      window.removeEventListener('refresh_staking_data', handleRefreshStakingData);
      window.removeEventListener('refresh_game_data', handleRefreshStakingData);
    };
  }, [isConnected, stakingService, stakedAmount]);

  // Prepare data for pie chart
  const data = [
    { name: 'Your Stake', value: stakedAmount > 0 ? stakedAmount : 0, color: '#3b82f6' },
    { name: 'Others', value: totalStaked - stakedAmount > 0 ? totalStaked - stakedAmount : 0, color: '#1e293b' },
  ];

  return (
    <div className="glass-card p-6">
      <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
        <Lock className="w-5 h-5 text-primary" />
        Staking Pool
        <div className="relative inline-block">
          <button
            className="text-foreground/60 hover:text-primary transition-colors duration-200"
            onMouseEnter={() => setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            onClick={() => setShowTooltip(!showTooltip)}
            aria-label="Information about Staking Pool"
          >
            <Info className="w-5 h-5" />
          </button>
          {showTooltip && (
            <div className="absolute z-10 w-64 max-sm:w-56 top-0 right-full mr-2 bg-background/95 glass-card p-3 rounded-lg shadow-lg border border-white/10 text-sm">
              <h3 className="text-md font-semibold mb-2">How it works</h3>
              <ul className="list-disc pl-4 space-y-1 text-sm text-foreground/80" style={{ listStyleType: 'disc', paddingInlineStart: '1.25rem' }}>
                <li className="pl-1 ml-1">Stake your tokens to earn passive rewards from the platform</li>
                <li className="pl-1 ml-1">When users lose bets, a portion goes to all stakers</li>
                <li className="pl-1 ml-1">Rewards are distributed proportionally to your stake</li>
                <li className="pl-1 ml-1">Withdraw your stake and rewards anytime</li>
              </ul>
              <div className="tooltip-arrow absolute w-3 h-3 bg-background/95 border-r border-b border-white/10 transform rotate-45 top-2 -right-1.5"></div>
            </div>
          )}
        </div>
      </h2>
      
      <div className="space-y-6 mb-6">
        {/* Primary stats section */}
        <div className="grid grid-cols-2 gap-2">
          <div className="glass-stat-container p-3">
            <span className="text-xs text-foreground/70">Your Staked</span>
            <div className="text-lg font-bold text-primary">
              {formatAmount(stakedAmount)} {networkCurrency}
            </div>
          </div>
          
          <div className="glass-stat-container p-3">
            <span className="text-xs text-foreground/70">Pool Share</span>
            <div className="text-lg font-bold text-foreground">
              {yourProportion.toFixed(2)}%
            </div>
          </div>
        </div>
        
        {/* Pool Size Stats - New section */}
        <div className="glass-stat-container p-3 text-center">
          <span className="text-xs text-foreground/70">Total Pool Size</span>
          <div className="text-lg font-bold text-blue-500">
            {formatAmount(totalStaked)} {networkCurrency}
          </div>
        </div>
        
        {/* Simple visualization */}
        {totalStaked > 0 && stakedAmount > 0 ? (
          <div className="flex items-center justify-center">
            <div className="h-24 w-24">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    innerRadius={25}
                    outerRadius={40}
                    paddingAngle={2}
                    dataKey="value"
                    animationBegin={0}
                    animationDuration={800}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="ml-4 flex flex-col">
              <div className="text-2xl font-bold text-green-500">
                +{formatAmount(rewards)}
              </div>
              <div className="text-sm text-foreground/70">
                Pending Rewards
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center text-foreground/50 py-4 text-sm">
            Stake tokens to earn rewards
          </div>
        )}
      </div>
      
      <div className="flex gap-4">
        <button
          onClick={onStake}
          disabled={!isConnected || !isCorrectNetwork}
          className={`flex-1 py-2 px-4 rounded-full font-bold transition-all duration-300 ${
            !isConnected || !isCorrectNetwork
              ? 'bg-foreground/20 text-foreground/40 cursor-not-allowed' 
              : 'bg-gradient-to-r from-primary to-secondary text-white hover:from-secondary hover:to-primary shadow-[0_4px_14px_rgba(0,255,178,0.3)] transform hover:-translate-y-0.5'
          }`}
        >
          {!isCorrectNetwork ? 'Wrong Network' : `Stake 0.1 ${networkCurrency}`}
        </button>
        <button
          onClick={onWithdraw}
          disabled={!isConnected || stakedAmount <= 0 || !isCorrectNetwork}
          className={`flex-1 py-2 px-4 rounded-full font-bold border transition-all duration-300 ${
            !isConnected || stakedAmount <= 0 || !isCorrectNetwork
              ? 'border-foreground/20 text-foreground/40 cursor-not-allowed'
              : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.25)] transform hover:-translate-y-0.5'
          }`}
        >
          {!isCorrectNetwork ? 'Wrong Network' : 'Withdraw All'}
        </button>
      </div>
    </div>
  );
};