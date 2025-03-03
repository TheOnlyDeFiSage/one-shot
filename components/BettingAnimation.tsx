import React from 'react';
import { Coins } from 'lucide-react';

type BettingAnimationProps = {
  isVisible: boolean;
};

export function BettingAnimation({ isVisible }: BettingAnimationProps) {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="relative">
        <div className="w-32 h-32 rounded-full glass-card border-4 border-t-primary border-r-primary border-b-secondary border-l-secondary animate-spin flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-center">
            <Coins className="w-12 h-12 text-primary animate-pulse" />
          </div>
        </div>
        <div className="text-center mt-6 text-xl font-bold animate-pulse">
          Placing Bet...
        </div>
      </div>
    </div>
  );
}