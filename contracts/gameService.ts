import { ethers } from 'ethers';
import { GameWithJackpotABI } from './contractABIs';
import { CONTRACT_ADDRESSES, BET_AMOUNT } from './config';

// Type for bet history
export type BetInfo = {
  amount: number;
  timestamp: number;
  won: boolean;
  payout: number;
  jackpotWon: number;
};

// Type for player stats
export type PlayerStats = {
  wins: number;
  losses: number;
  currentStreak: number;
};

// Type for jackpot info
export type JackpotInfo = {
  tierThresholds: number[];
  tierPayouts: number[];
  tierAmounts: number[];
};

// Type for bet history item from contract
interface BetHistoryItem {
  amount: ethers.BigNumber;
  timestamp: ethers.BigNumber;
  won: boolean;
  payout: ethers.BigNumber;
  jackpotWon: ethers.BigNumber;
}

/**
 * Service to interact with the GameWithJackpot contract
 */
export class GameService {
  private provider: ethers.providers.Web3Provider;
  private signer: ethers.Signer;
  contract: ethers.Contract;
  
  constructor(provider: ethers.providers.Web3Provider) {
    this.provider = provider;
    this.signer = provider.getSigner();
    this.contract = new ethers.Contract(
      CONTRACT_ADDRESSES.GAME_WITH_JACKPOT,
      GameWithJackpotABI,
      provider.getSigner()
    );
  }
  
  /**
   * Get the current bet amount from the contract
   */
  async getBetAmount(): Promise<number> {
    const amount = await this.contract.betAmount();
    return parseFloat(ethers.utils.formatEther(amount));
  }
  
  /**
   * Get the jackpot pool amount
   */
  async getJackpotPool(): Promise<number> {
    const pool = await this.contract.jackpotPool();
    return parseFloat(ethers.utils.formatEther(pool));
  }
  
  /**
   * Get the player's win streak
   */
  async getPlayerStreak(address: string): Promise<number> {
    const streak = await this.contract.getPlayerStreak(address);
    return streak.toNumber();
  }
  
  /**
   * Get player stats (wins, losses, streak)
   */
  async getPlayerStats(address: string): Promise<PlayerStats> {
    const stats = await this.contract.getPlayerStats(address);
    return {
      wins: stats.wins.toNumber(),
      losses: stats.losses.toNumber(),
      currentStreak: stats.currentStreak.toNumber()
    };
  }
  
  /**
   * Get bet history for a player
   */
  async getBetHistory(address: string): Promise<BetInfo[]> {
    const history = await this.contract.getBetHistory(address);
    
    // The contract returns a fixed array of 10 items, we need to filter out empty ones
    return history
      .filter((bet: BetHistoryItem) => bet.timestamp.toNumber() > 0)
      .map((bet: BetHistoryItem) => ({
        amount: parseFloat(ethers.utils.formatEther(bet.amount)),
        timestamp: bet.timestamp.toNumber(),
        won: bet.won,
        payout: parseFloat(ethers.utils.formatEther(bet.payout)),
        jackpotWon: parseFloat(ethers.utils.formatEther(bet.jackpotWon))
      }));
  }
  
  /**
   * Get jackpot information including tiers and amounts
   */
  async getJackpotInfo(): Promise<JackpotInfo> {
    const info = await this.contract.getJackpotInfo();
    
    return {
      tierThresholds: info.tierThresholds.map((t: ethers.BigNumber) => t.toNumber()),
      tierPayouts: info.tierPayouts.map((p: ethers.BigNumber) => p.toNumber()),
      tierAmounts: info.tierAmounts.map((a: ethers.BigNumber) => parseFloat(ethers.utils.formatEther(a)))
    };
  }
  
  /**
   * Place a bet
   */
  async placeBet(): Promise<ethers.providers.TransactionResponse> {
    const tx = await this.contract.play({
      value: ethers.utils.parseEther(BET_AMOUNT.toString())
    });
    
    return tx;
  }
  
  /**
   * Listen for game events
   */
  onGamePlayed(
    callback: (event: {
      player: string;
      amount: number;
      won: boolean;
      message: string;
    }) => void
  ): () => void {
    console.log("Setting up GamePlayed event listener on contract");
    
    // Handler function to process events
    const handleEvent = (
      player: string, 
      amount: ethers.BigNumber, 
      won: boolean, 
      message: string
    ) => {
      console.log(`GamePlayed event received for ${player}, won: ${won}, message: ${message}`);
      
      // Convert amount to ETH and call the callback
      callback({
        player,
        amount: parseFloat(ethers.utils.formatEther(amount)),
        won,
        message
      });
    };
    
    // Add the event listener
    this.contract.on('GamePlayed', handleEvent);
    
    // Return a cleanup function that removes the listener
    return () => {
      console.log("Removing GamePlayed event listener");
      if (this.contract && this.contract.removeAllListeners) {
        this.contract.removeAllListeners('GamePlayed');
      }
    };
  }
} 