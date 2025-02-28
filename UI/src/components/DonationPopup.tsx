import React, { useState } from 'react';
import { X, Coffee, ExternalLink, AlertCircle, Check } from 'lucide-react';
import { useWallet } from '../contracts/WalletContext';
import { NETWORKS } from '../contracts/WalletContext';
import { ethers } from 'ethers';

// Network configurations
const NETWORK_OPTIONS = [
  { 
    id: 1, 
    name: 'Ethereum', 
    chainId: NETWORKS.ETHEREUM.chainId, 
    symbol: NETWORKS.ETHEREUM.currency.symbol,
    address: '0xe64Fbb605c74f194BffB64Ba33911023aAFa98a5' // Dev donation address
  },
  { 
    id: 2, 
    name: 'Base', 
    chainId: NETWORKS.BASE.chainId, 
    symbol: NETWORKS.BASE.currency.symbol,
    address: '0xe64Fbb605c74f194BffB64Ba33911023aAFa98a5' // Dev donation address
  }
];

// Donation amount options
const AMOUNT_OPTIONS = [
  { value: 0.001, label: '0.001' },
  { value: 0.005, label: '0.005' },
  { value: 0.01, label: '0.01' },
  { value: 0.05, label: '0.05' },
  { value: 0.1, label: '0.1' }
];

type TransactionStatus = 'idle' | 'pending' | 'success' | 'error';

interface DonationPopupProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DonationPopup({ isOpen, onClose }: DonationPopupProps) {
  const { provider, isConnected, connect, chainId, switchNetwork } = useWallet();
  const [selectedNetwork, setSelectedNetwork] = useState(NETWORK_OPTIONS[1]); // Default to Base
  const [amount, setAmount] = useState(AMOUNT_OPTIONS[2].value); // Default to 0.01 ETH
  const [customAmount, setCustomAmount] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [txStatus, setTxStatus] = useState<TransactionStatus>('idle');
  const [txHash, setTxHash] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Handle network switch
  const handleNetworkSwitch = async (network: typeof NETWORK_OPTIONS[0]) => {
    setSelectedNetwork(network);
    
    // Only attempt to switch if connected
    if (isConnected && chainId !== network.chainId) {
      try {
        await switchNetwork(network.chainId);
      } catch (error) {
        console.error("Failed to switch network:", error);
        setErrorMessage(`Failed to switch to ${network.name} network. Please try switching manually.`);
      }
    }
  };

  // Handle donation
  const handleDonate = async () => {
    if (!isConnected) {
      await connect();
      return;
    }

    // Check if on correct network
    if (chainId !== selectedNetwork.chainId) {
      setErrorMessage(`Please switch to ${selectedNetwork.name} Network first`);
      return;
    }

    const donationAmount = isCustom ? 
      parseFloat(customAmount) : 
      amount;

    if (isNaN(donationAmount) || donationAmount <= 0) {
      setErrorMessage('Please enter a valid amount');
      return;
    }

    try {
      setTxStatus('pending');
      setErrorMessage('');

      // Create transaction
      const signer = provider?.getSigner();
      if (!signer) throw new Error('No signer available');

      const tx = await signer.sendTransaction({
        to: selectedNetwork.address,
        value: ethers.utils.parseEther(donationAmount.toString())
      });

      setTxHash(tx.hash);

      // Wait for transaction to be mined
      await tx.wait();
      setTxStatus('success');
    } catch (error: any) {
      console.error("Donation error:", error);
      setTxStatus('error');
      
      // Enhanced error handling with more specific messages
      if (error.code === 4001 || 
          (error.message && (
            error.message.includes("User denied") || 
            error.message.includes("User rejected") ||
            error.message.includes("user rejected") ||
            error.message.includes("cancelled") ||
            error.message.includes("canceled")
          ))) {
        // User rejected transaction
        setErrorMessage('Transaction was cancelled');
      } else if (error.code === -32603 && error.message?.includes('insufficient funds')) {
        // Insufficient funds error
        setErrorMessage(`Insufficient funds in your wallet to complete this donation`);
      } else if (error.code === 'NETWORK_ERROR' || 
                error.message?.includes('network') || 
                error.message?.includes('disconnected')) {
        // Network connectivity issues
        setErrorMessage('Network connection issue. Please check your internet connection and try again');
      } else if (error.message?.includes('gas') || error.message?.includes('fee')) {
        // Gas/fee estimation issues
        setErrorMessage('Error calculating transaction fee. Please try a different amount or try again later');
      } else if (error.message?.includes('nonce')) {
        // Nonce errors
        setErrorMessage('Transaction sequence error. Please refresh your page and try again');
      } else if (error.message?.includes('execution reverted')) {
        // Contract execution errors
        setErrorMessage('Transaction failed. The donation could not be processed at this time');
      } else if (!provider) {
        // Wallet connection issues
        setErrorMessage('Wallet connection error. Please try reconnecting your wallet');
      } else {
        // Fallback generic error message instead of showing raw error
        setErrorMessage('Something went wrong with your donation. Please try again later');
      }
    }
  };

  // Reset state when closing
  const handleClose = () => {
    // Wait a bit before resetting states if successful to allow user to see confirmation
    if (txStatus === 'success') {
      setTimeout(() => {
        setTxStatus('idle');
        setTxHash('');
        setErrorMessage('');
        onClose();
      }, 3000);
    } else {
      setTxStatus('idle');
      setTxHash('');
      setErrorMessage('');
      onClose();
    }
  };

  // Handle custom amount input
  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers and decimals
    if (/^\d*\.?\d*$/.test(value) || value === '') {
      setCustomAmount(value);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-md overflow-hidden flex flex-col animate-slide-up">
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <Coffee className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold">Buy Me a Coffee</h2>
          </div>
          <button
            onClick={handleClose}
            className="hover:bg-white/10 p-2 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="p-6 space-y-6">
          {txStatus === 'success' ? (
            <div className="text-center space-y-4">
              <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto">
                <Check className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold">Thank You!</h3>
              <p className="text-foreground/70">
                Your coffee donation has been received. Your support means a lot!
              </p>
              {txHash && (
                <a 
                  href={`${selectedNetwork.id === 1 ? 'https://etherscan.io/tx/' : 'https://basescan.org/tx/'}${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary flex items-center justify-center gap-1 hover:underline"
                >
                  View transaction <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          ) : (
            <>
              {/* Network Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/70">Select Network</label>
                <div className="grid grid-cols-2 gap-3">
                  {NETWORK_OPTIONS.map((network) => (
                    <button
                      key={network.id}
                      className={`py-2 px-4 rounded-lg font-medium transition-all duration-200 ${
                        selectedNetwork.id === network.id
                          ? 'bg-primary/20 border border-primary/50 text-white'
                          : 'bg-white/5 border border-white/10 text-foreground/70 hover:bg-white/10'
                      }`}
                      onClick={() => handleNetworkSwitch(network)}
                    >
                      {network.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground/70">Donation Amount ({selectedNetwork.symbol})</label>
                <div className="grid grid-cols-3 gap-2">
                  {AMOUNT_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      className={`py-2 px-3 rounded-lg font-medium transition-all duration-200 ${
                        !isCustom && amount === option.value
                          ? 'bg-primary/20 border border-primary/50 text-white'
                          : 'bg-white/5 border border-white/10 text-foreground/70 hover:bg-white/10'
                      }`}
                      onClick={() => {
                        setAmount(option.value);
                        setIsCustom(false);
                      }}
                    >
                      {option.label} {selectedNetwork.symbol}
                    </button>
                  ))}
                  
                  {/* Custom Amount Toggle */}
                  <button
                    className={`py-2 px-3 rounded-lg font-medium transition-all duration-200 ${
                      isCustom
                        ? 'bg-primary/20 border border-primary/50 text-white'
                        : 'bg-white/5 border border-white/10 text-foreground/70 hover:bg-white/10'
                    }`}
                    onClick={() => setIsCustom(true)}
                  >
                    Custom
                  </button>
                </div>
                
                {/* Custom Amount Input */}
                {isCustom && (
                  <div className="mt-3">
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={customAmount}
                        onChange={handleCustomAmountChange}
                        placeholder="Enter amount"
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary/50 text-white"
                      />
                      <span className="ml-2">{selectedNetwork.symbol}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-red-300">{errorMessage}</p>
                </div>
              )}

              {/* Donate Button */}
              <button
                onClick={handleDonate}
                disabled={txStatus === 'pending'}
                className={`w-full py-3 px-6 rounded-full font-bold transition-all duration-300 ${
                  txStatus === 'pending'
                    ? 'bg-foreground/20 text-foreground/40 cursor-not-allowed'
                    : 'bg-gradient-to-r from-primary to-secondary text-white hover:from-secondary hover:to-primary shadow-[0_4px_14px_rgba(0,255,178,0.3)] transform hover:-translate-y-0.5'
                }`}
              >
                {!isConnected ? 'Connect Wallet' : 
                  txStatus === 'pending' ? 'Processing...' : 
                  `Donate ${isCustom ? customAmount : amount} ${selectedNetwork.symbol}`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
} 