import React from 'react';
import { Lock } from 'lucide-react';

type StakingAnimationProps = {
  isVisible: boolean;
  operationType: 'stake' | 'withdraw';
};

export function StakingAnimation({ isVisible, operationType }: StakingAnimationProps) {
  if (!isVisible) return null;

  // Determine the animation text based on operation type
  const actionText = operationType === 'stake' ? 'Staking Tokens...' : 'Withdrawing Tokens...';

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="relative">
        <div className="w-32 h-32 rounded-full glass-card border-4 border-t-primary border-r-primary border-b-secondary border-l-secondary animate-spin flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center">
            <Lock className="w-12 h-12 text-primary animate-pulse" />
          </div>
        </div>
        <div className="text-center mt-6 text-xl font-bold animate-pulse">
          {actionText}
        </div>
      </div>
    </div>
  );
} 