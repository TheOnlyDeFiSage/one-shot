import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { ethers } from 'ethers';
import { GameService } from './gameService';
import { StakingService } from './stakingService';
import { NETWORK_CONFIG } from './config';

// Connection timeout in milliseconds (4 hours)
const CONNECTION_TIMEOUT = 4 * 60 * 60 * 1000;

// Key for persistent storage of connection state
const WALLET_DISCONNECTED_KEY = 'walletDisconnected';
const WALLET_LAST_ADDRESS_KEY = 'walletLastAddress';
const WALLET_CONNECTED_AT_KEY = 'walletConnectedAt';

// Define network configurations
export const NETWORKS = {
  // Nexus Chain (your default network)
  NEXUS: {
    chainId: 393,
    name: 'Nexus Chain',
    rpcUrl: 'https://mainnet.nexuschain.info/rpc',
    currency: {
      name: 'Nexus',
      symbol: 'NEX',
      decimals: 18
    },
    blockExplorer: 'https://explorer.nexuschain.info'
  },
  // Ethereum Mainnet
  ETHEREUM: {
    chainId: 1,
    name: 'Ethereum Mainnet',
    rpcUrl: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161', // Public Infura endpoint
    currency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorer: 'https://etherscan.io'
  },
  // Base Network
  BASE: {
    chainId: 8453,
    name: 'Base',
    rpcUrl: 'https://mainnet.base.org',
    currency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18
    },
    blockExplorer: 'https://basescan.org'
  }
};

// Types
interface WalletContextType {
  provider: ethers.providers.Web3Provider | null;
  address: string | null;
  chainId: number | null;
  isConnected: boolean;
  balance: number;
  gameService: GameService | null;
  stakingService: StakingService | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isCorrectNetwork: boolean;
  switchNetwork: (targetChainId?: number) => Promise<void>;
  networkCurrency: string;
}

// Create context with default values
const WalletContext = createContext<WalletContextType>({
  provider: null,
  address: null,
  chainId: null,
  isConnected: false,
  balance: 0,
  gameService: null,
  stakingService: null,
  connect: async () => {},
  disconnect: () => {},
  isCorrectNetwork: false,
  switchNetwork: async () => {},
  networkCurrency: 'ETH',
});

// Provider component
export const WalletProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [provider, setProvider] = useState<ethers.providers.Web3Provider | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [balance, setBalance] = useState<number>(0);
  const [gameService, setGameService] = useState<GameService | null>(null);
  const [stakingService, setStakingService] = useState<StakingService | null>(null);
  const [isCorrectNetwork, setIsCorrectNetwork] = useState<boolean>(false);
  const [networkCurrency, setNetworkCurrency] = useState<string>(NETWORK_CONFIG.currency.symbol);
  const [isDisconnected, setIsDisconnected] = useState<boolean>(
    // Initialize with the saved disconnected state from localStorage
    localStorage.getItem(WALLET_DISCONNECTED_KEY) === 'true'
  );
  const [connectionAttempted, setConnectionAttempted] = useState<boolean>(false);
  const [lastKnownAddress, setLastKnownAddress] = useState<string | null>(
    localStorage.getItem(WALLET_LAST_ADDRESS_KEY)
  );

  // Function to check connection timeout
  const checkConnectionTimeout = () => {
    const connectionTime = localStorage.getItem(WALLET_CONNECTED_AT_KEY);
    
    if (connectionTime) {
      const connectTimestamp = parseInt(connectionTime, 10);
      const currentTime = Date.now();
      
      if (currentTime - connectTimestamp > CONNECTION_TIMEOUT) {
        // Connection has expired, disconnect
        console.log('Wallet connection timeout, disconnecting...');
        disconnect();
        return false;
      }
    }
    return true;
  };

  // Check if wallet is already connected on component mount
  useEffect(() => {
    const checkConnection = async () => {
      // Check if ethereum is available
      if (window.ethereum) {
        try {
          // Prevent multiple connection attempts
          if (connectionAttempted) {
            return;
          }
          setConnectionAttempted(true);
          
          // Check if manually disconnected - this is critical for wallet persistence
          const walletDisconnected = localStorage.getItem(WALLET_DISCONNECTED_KEY) === 'true';
          if (walletDisconnected) {
            console.log("User previously disconnected wallet, not reconnecting automatically");
            setIsDisconnected(true);
            return;
          }
          
          // Check for session timeout
          if (!checkConnectionTimeout()) {
            return;
          }
          
          // Get the currently selected active account in MetaMask
          const accounts = await window.ethereum.request({ method: 'eth_accounts' });
          
          if (accounts.length > 0) {
            // Compare with last known address to detect changes
            const savedAddress = localStorage.getItem(WALLET_LAST_ADDRESS_KEY);
            
            if (savedAddress && savedAddress.toLowerCase() !== accounts[0].toLowerCase()) {
              console.log("Active wallet changed since last visit:", accounts[0]);
              // Different address - update our saved address
              localStorage.setItem(WALLET_LAST_ADDRESS_KEY, accounts[0]);
            }
            
            console.log("Active wallet detected:", accounts[0]);
            const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
            await setupWallet(web3Provider, accounts[0]);
          } else {
            console.log("No active wallet detected");
            // Ensure we're marked as disconnected if no accounts are found
            disconnect();
          }
        } catch (error) {
          console.error("Error checking wallet connection:", error);
          // Safety disconnect on error
          disconnect();
        }
      }
    };
    
    checkConnection();
    
    // Set up interval to periodically check connection timeout
    const intervalId = setInterval(checkConnectionTimeout, 60000); // Check every minute
    
    return () => {
      clearInterval(intervalId);
    };
  }, [connectionAttempted]);

  // Effect to update balance when address changes
  useEffect(() => {
    if (provider && address) {
      updateBalance();
      
      // Set up interval to periodically update balance
      const balanceInterval = setInterval(updateBalance, 15000); // Update every 15 seconds
      
      return () => {
        clearInterval(balanceInterval);
      };
    }
  }, [provider, address]);

  // Listen for chain changes
  useEffect(() => {
    if (window.ethereum) {
      const handleChainChanged = () => {
        console.log("Network changed, refreshing wallet data...");
        // Don't reload completely, just refresh the wallet data
        if (window.ethereum && address) {
          try {
            const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
            setupWallet(web3Provider, address);
          } catch (error) {
            console.error("Error refreshing wallet data after chain change:", error);
            // Don't force a page reload, just disconnect
            disconnect();
          }
        }
      };

      window.ethereum?.on('chainChanged', handleChainChanged);
      
      return () => {
        window.ethereum?.removeListener('chainChanged', handleChainChanged);
      };
    }
  }, [address]);

  // Listen for account changes
  useEffect(() => {
    if (window.ethereum) {
      const handleAccountsChanged = async (accounts: string[]) => {
        console.log("Account changed detected:", accounts);
        
        if (accounts.length === 0) {
          // User disconnected wallet from MetaMask
          console.log("No accounts detected, disconnecting wallet");
          disconnect();
        } else if (!isDisconnected) {
          // Only proceed if we're not intentionally disconnected
          if (!address || accounts[0].toLowerCase() !== address.toLowerCase()) {
            // New account detected or different from current one
            console.log("Setting up wallet with new account:", accounts[0]);
            
            try {
              // Create a new provider instance to ensure we're getting fresh data
              const web3Provider = new ethers.providers.Web3Provider(window.ethereum as any);
              
              // Update the last known address
              localStorage.setItem(WALLET_LAST_ADDRESS_KEY, accounts[0]);
              setLastKnownAddress(accounts[0]);
              
              // Do complete wallet reinitializing
              await setupWallet(web3Provider, accounts[0]);
            } catch (error) {
              console.error("Error setting up wallet with new account:", error);
              disconnect();
            }
          } else {
            console.log("Same account detected, no changes needed");
          }
        } else {
          console.log("Account changed but wallet is disconnected, ignoring");
        }
      };

      // Add listener for account changes
      if (window.ethereum.on) {
        window.ethereum.on('accountsChanged', handleAccountsChanged);
      }
      
      // Check for current accounts immediately to make sure we're up to date
      const refreshCurrentAccount = async () => {
        try {
          if (window.ethereum && window.ethereum.request && !isDisconnected) {
            const accounts = await window.ethereum.request({ method: 'eth_accounts' });
            
            if (accounts.length > 0) {
              if (!address || accounts[0].toLowerCase() !== address.toLowerCase()) {
                console.log("Refreshing with current active account:", accounts[0]);
                handleAccountsChanged(accounts);
              }
            } else if (address) {
              // If we have an address but MetaMask shows no accounts, disconnect
              console.log("No accounts in MetaMask but we have an address, disconnecting");
              disconnect();
            }
          }
        } catch (error) {
          console.error("Error refreshing current account:", error);
        }
      };
      
      // Call immediately and also set an interval to periodically check
      if (!isDisconnected) {
        refreshCurrentAccount();
      }
      
      const accountCheckInterval = setInterval(() => {
        if (!isDisconnected) {
          refreshCurrentAccount();
        }
      }, 3000);
      
      return () => {
        if (window.ethereum && window.ethereum.removeListener) {
          window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        }
        clearInterval(accountCheckInterval);
      };
    }
  }, [address, isDisconnected]);

  // Update wallet balance
  const updateBalance = async () => {
    if (provider && address) {
      try {
        const balanceWei = await provider.getBalance(address);
        const newBalance = parseFloat(ethers.utils.formatEther(balanceWei));
        if (newBalance !== balance) {
          console.log("Balance updated:", newBalance);
          setBalance(newBalance);
        }
      } catch (error) {
        console.error("Error getting balance:", error);
      }
    }
  };

  // Setup wallet and services with specific account
  const setupWallet = async (web3Provider: ethers.providers.Web3Provider, userAddress: string) => {
    try {
      console.log("Setting up wallet for address:", userAddress);
      
      // Double-check if the user has actually disconnected
      if (isDisconnected) {
        console.log("User is marked as disconnected, not setting up wallet");
        return;
      }
      
      // Verify this account is still available in MetaMask
      try {
        const accounts = await web3Provider.listAccounts();
        if (accounts.length === 0 || !accounts.some(acc => acc.toLowerCase() === userAddress.toLowerCase())) {
          console.log("Account not available in wallet, not setting up");
          disconnect();
          return;
        }
      } catch (error) {
        console.error("Error verifying account availability:", error);
      }
      
      const network = await web3Provider.getNetwork();
      
      setProvider(web3Provider);
      setAddress(userAddress);
      setChainId(network.chainId);
      
      // Check if on correct network
      const onCorrectNetwork = network.chainId === NETWORK_CONFIG.chainId;
      setIsCorrectNetwork(onCorrectNetwork);
      
      // Set network currency
      if (onCorrectNetwork) {
        setNetworkCurrency(NETWORK_CONFIG.currency.symbol);
      } else {
        try {
          // Try to get network details for the current network
          const networkName = network.name !== "unknown" ? network.name : `Chain ID ${network.chainId}`;
          console.log(`Connected to ${networkName}`);
          
          // Default to ETH if we can't determine the currency
          setNetworkCurrency('ETH');
        } catch (error) {
          console.error("Error getting network details:", error);
          setNetworkCurrency('ETH');
        }
      }
      
      // Initialize services
      const game = new GameService(web3Provider);
      const staking = new StakingService(web3Provider);
      
      setGameService(game);
      setStakingService(staking);
      
      // Get initial balance
      const balanceWei = await web3Provider.getBalance(userAddress);
      setBalance(parseFloat(ethers.utils.formatEther(balanceWei)));
      
      // Set connection timestamp in local storage
      localStorage.setItem(WALLET_CONNECTED_AT_KEY, Date.now().toString());
      localStorage.removeItem(WALLET_DISCONNECTED_KEY);
      localStorage.setItem(WALLET_LAST_ADDRESS_KEY, userAddress);
      setLastKnownAddress(userAddress);
      setIsDisconnected(false);
      
    } catch (error) {
      console.error("Error setting up wallet:", error);
      disconnect();
    }
  };

  // Connect wallet
  const connect = async (): Promise<void> => {
    if (!window.ethereum) {
      alert('Please install a Web3 wallet like MetaMask to use this application');
      return;
    }

    try {
      // Reset the disconnected state first to allow connection
      setIsDisconnected(false);
      localStorage.removeItem(WALLET_DISCONNECTED_KEY);
      
      console.log("Requesting wallet connection...");
      // Request account access - this will prioritize the active account in MetaMask
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      
      if (accounts.length > 0) {
        console.log("Connecting to active wallet:", accounts[0]);
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum);
        
        // Store the wallet address for persistence
        localStorage.setItem(WALLET_LAST_ADDRESS_KEY, accounts[0]);
        setLastKnownAddress(accounts[0]);
        
        await setupWallet(web3Provider, accounts[0]);
      } else {
        console.error("No accounts returned after connection request");
        setIsDisconnected(true);
        localStorage.setItem(WALLET_DISCONNECTED_KEY, 'true');
      }
    } catch (error) {
      console.error("Error connecting wallet:", error);
      alert("Failed to connect wallet. Please try again.");
      setIsDisconnected(true);
      localStorage.setItem(WALLET_DISCONNECTED_KEY, 'true');
    }
  };

  // Disconnect wallet
  const disconnect = (): void => {
    console.log("Disconnecting wallet");
    setProvider(null);
    setAddress(null);
    setChainId(null);
    setBalance(0);
    setGameService(null);
    setStakingService(null);
    setIsCorrectNetwork(false);
    setIsDisconnected(true);
    
    // Clear storage - but keep the disconnected flag
    localStorage.removeItem(WALLET_CONNECTED_AT_KEY);
    localStorage.setItem(WALLET_DISCONNECTED_KEY, 'true');
    
    // Emit an event to make sure components are aware of disconnection
    window.dispatchEvent(new CustomEvent('wallet_disconnected'));
  };

  // Updated switchNetwork function to support multiple networks
  const switchNetwork = async (targetChainId?: number): Promise<void> => {
    if (!window.ethereum) {
      alert('Please install a Web3 wallet like MetaMask to use this application');
      return;
    }
    
    // Default to NETWORK_CONFIG.chainId if no targetChainId provided
    const chainIdToUse = targetChainId || NETWORK_CONFIG.chainId;
    
    // Find the network configuration based on the chain ID
    let networkConfig = NETWORK_CONFIG; // Default
    
    if (chainIdToUse === NETWORKS.ETHEREUM.chainId) {
      networkConfig = NETWORKS.ETHEREUM;
    } else if (chainIdToUse === NETWORKS.BASE.chainId) {
      networkConfig = NETWORKS.BASE;
    }
    
    // Format chainId as hex string with 0x prefix
    const chainIdHex = `0x${chainIdToUse.toString(16)}`;

    // Function to verify we've actually switched to the correct network
    const verifyNetworkSwitch = async (): Promise<boolean> => {
      if (!window.ethereum) return false;
      
      try {
        // Get current chain ID directly from the provider
        const currentChainIdHex = await window.ethereum.request({ method: 'eth_chainId' });
        const currentChainId = parseInt(currentChainIdHex, 16);
        
        console.log(`Verification - Current chain: ${currentChainId}, Target chain: ${chainIdToUse}`);
        return currentChainId === chainIdToUse;
      } catch (error) {
        console.error("Error verifying network switch:", error);
        return false;
      }
    };
    
    // Function to force wallet refresh after network switch
    const refreshWalletState = async (): Promise<void> => {
      if (!window.ethereum || !address) return;
      
      try {
        console.log("Refreshing wallet state after network switch...");
        // Force re-creating the provider to get fresh data from new network
        const web3Provider = new ethers.providers.Web3Provider(window.ethereum as any);
        await setupWallet(web3Provider, address);
        
        // Verify the network switch was successful in our app state
        if (chainId !== chainIdToUse) {
          console.warn("Chain ID in state doesn't match target after refresh, retrying setup...");
          // Force update chain ID
          setChainId(chainIdToUse);
          setIsCorrectNetwork(chainIdToUse === NETWORK_CONFIG.chainId);
          
          // Wait a moment and try one more refresh
          setTimeout(async () => {
            const finalProvider = new ethers.providers.Web3Provider(window.ethereum as any);
            await setupWallet(finalProvider, address);
          }, 500);
        }
      } catch (error) {
        console.error("Error refreshing wallet state:", error);
      }
    };
    
    try {
      console.log(`Requesting network switch to: ${networkConfig.name} (${chainIdToUse}, ${chainIdHex})`);
      
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIdHex }],
      });
      
      console.log(`Successfully requested switch to ${networkConfig.name}`);
      
      // Wait a moment for the switch to take effect, especially for MetaMask
      setTimeout(async () => {
        const switchSuccessful = await verifyNetworkSwitch();
        
        if (switchSuccessful) {
          console.log(`Verified switch to ${networkConfig.name} was successful`);
          await refreshWalletState();
        } else {
          console.warn(`Network switch verification failed, forcing refresh anyway`);
          await refreshWalletState();
        }
      }, 750); // Slightly longer delay for MetaMask
      
    } catch (switchError: any) {
      console.log("Switch network error:", switchError);
      
      // For Rabby and other wallets, always attempt to add the network first
      try {
        console.log(`Adding network ${networkConfig.name} before switching...`);
        
        // Try to add the network first
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [
            {
              chainId: chainIdHex,
              chainName: networkConfig.name,
              rpcUrls: [networkConfig.rpcUrl],
              nativeCurrency: networkConfig.currency,
              blockExplorerUrls: networkConfig.blockExplorer ? [networkConfig.blockExplorer] : [],
            },
          ],
        });
        
        console.log(`Network ${networkConfig.name} successfully added to wallet`);
        
        // Try switching again after adding
        setTimeout(async () => {
          try {
            if (!window.ethereum) return;
            
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: chainIdHex }],
            });
            
            console.log(`Successfully switched to ${networkConfig.name} after adding`);
            
            // After a successful switch, refresh connection with verification
            setTimeout(async () => {
              const switchSuccessful = await verifyNetworkSwitch();
              
              if (switchSuccessful) {
                console.log(`Verified switch was successful after adding network`);
                await refreshWalletState();
              } else {
                console.warn(`Network switch verification failed after adding, forcing refresh anyway`);
                await refreshWalletState();
              }
            }, 750);
            
          } catch (error: any) {
            console.error(`Error switching to ${networkConfig.name} after adding:`, error);
            
            // More specific error message based on error type
            if (error.code === 4001) {
              alert(`Network switch to ${networkConfig.name} was rejected. Please try again.`);
            } else {
              alert(`Failed to switch to ${networkConfig.name}. You may need to switch manually in your wallet.`);
            }
          }
        }, 1000);
        
      } catch (addError: any) {
        console.error("Error adding network:", addError);
        
        // More specific error message based on error type
        if (addError.code === 4001) {
          alert(`Adding ${networkConfig.name} to your wallet was rejected. Please try again.`);
        } else {
          alert(`Failed to add ${networkConfig.name} to your wallet. Error: ${addError.message}`);
        }
      }
    }
  };

  return (
    <WalletContext.Provider
      value={{
        provider,
        address,
        chainId,
        isConnected: !!address && !isDisconnected,
        balance,
        gameService,
        stakingService,
        connect,
        disconnect,
        isCorrectNetwork,
        switchNetwork,
        networkCurrency,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// Custom hook to use the wallet context
export const useWallet = () => useContext(WalletContext); 