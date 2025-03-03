import { ethers } from 'ethers';
import { BalanceTrackerABI } from './contractABIs';
import { CONTRACT_ADDRESSES } from './config';

// Type for stake info
export type StakeInfo = {
  amount: number;
  lastUpdateTime: number;
};

/**
 * Service to interact with the BalanceTracker contract
 */
export class StakingService {
  private provider: ethers.providers.Web3Provider;
  private contract: ethers.Contract;
  
  constructor(provider: ethers.providers.Web3Provider) {
    this.provider = provider;
    this.contract = new ethers.Contract(
      CONTRACT_ADDRESSES.BALANCE_TRACKER,
      BalanceTrackerABI,
      provider.getSigner()
    );
  }
  
  /**
   * Get user's staked amount
   */
  async getStakedAmount(address: string): Promise<number> {
    const amount = await this.contract.getStake(address);
    return parseFloat(ethers.utils.formatEther(amount));
  }
  
  /**
   * Get user's pending rewards
   */
  async getPendingRewards(address: string): Promise<number> {
    const rewards = await this.contract.getPendingRewards(address);
    return parseFloat(ethers.utils.formatEther(rewards));
  }
  
  /**
   * Get total staked amount across all users
   */
  async getTotalStaked(): Promise<number> {
    const total = await this.contract.totalStaked();
    return parseFloat(ethers.utils.formatEther(total));
  }
  
  /**
   * Get user's total stake with rewards
   */
  async getTotalStakeWithRewards(address: string): Promise<number> {
    const total = await this.contract.getTotalStakeWithRewards(address);
    return parseFloat(ethers.utils.formatEther(total));
  }
  
  /**
   * Stake ETH
   */
  async stake(amount: number): Promise<ethers.providers.TransactionResponse> {
    const tx = await this.contract.stake({
      value: ethers.utils.parseEther(amount.toString())
    });
    
    return tx;
  }
  
  /**
   * Withdraw staked ETH and rewards
   */
  async withdraw(): Promise<ethers.providers.TransactionResponse> {
    const tx = await this.contract.withdraw();
    return tx;
  }
  
  /**
   * Get contract balance
   */
  async getContractBalance(): Promise<number> {
    const balance = await this.contract.getBalance();
    return parseFloat(ethers.utils.formatEther(balance));
  }
  
  /**
   * Listen for staking events
   */
  onStaked(
    callback: (event: { user: string; amount: number }) => void
  ): ethers.Contract {
    this.contract.on('Staked', 
      (user: string, amount: ethers.BigNumber) => {
        callback({
          user,
          amount: parseFloat(ethers.utils.formatEther(amount))
        });
      }
    );
    
    return this.contract;
  }
  
  /**
   * Listen for withdrawal events
   */
  onWithdrawn(
    callback: (event: { user: string; amount: number }) => void
  ): ethers.Contract {
    this.contract.on('Withdrawn',
      (user: string, amount: ethers.BigNumber) => {
        callback({
          user,
          amount: parseFloat(ethers.utils.formatEther(amount))
        });
      }
    );
    
    return this.contract;
  }
} 