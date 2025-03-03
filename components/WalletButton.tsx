import React, { useState } from 'react';
import { useWallet } from '../contracts/WalletContext';

/**
 * WalletButton component
 * Handles wallet connection and displays wallet status
 * Shows truncated address when connected
 */
export const WalletButton: React.FC = () => {
  const { isConnected, address, connect, disconnect, isCorrectNetwork, switchNetwork } = useWallet();
  const [isHovering, setIsHovering] = useState(false);

  // Format address to truncated form (0x1234...5678)
  const formatAddress = (address: string): string => {
    return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  };

  // Handle connect/disconnect
  const handleToggle = async () => {
    if (isConnected) {
      // Just disconnect without forcing page reload
      disconnect();
    } else {
      await connect();
    }
  };

  // Handle network switch
  const handleSwitchNetwork = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await switchNetwork();
  };

  // Return proper button based on connection state
  return (
    <div className="flex items-center">
      {isConnected && !isCorrectNetwork && (
        <button
          onClick={handleSwitchNetwork}
          className="mr-4 px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-bold rounded-full transition-colors duration-200 shadow-[0_4px_10px_rgba(255,0,0,0.2)]"
        >
          Switch Network
        </button>
      )}
      
      <button
        onClick={handleToggle}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
        className={`px-4 py-2 rounded-full font-bold transition-all duration-200 ${
          isConnected
            ? isHovering 
              ? 'bg-red-500 text-white hover:bg-red-600 shadow-[0_4px_10px_rgba(255,0,0,0.2)]' 
              : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 shadow-[0_4px_14px_rgba(0,0,0,0.25)]'
            : 'bg-gradient-to-r from-primary to-secondary text-white hover:from-secondary hover:to-primary shadow-[0_4px_14px_rgba(0,255,178,0.3)]'
        }`}
      >
        {isConnected 
          ? isHovering 
            ? 'Disconnect' 
            : formatAddress(address!) 
          : 'Connect Wallet'
        }
      </button>
    </div>
  );
};