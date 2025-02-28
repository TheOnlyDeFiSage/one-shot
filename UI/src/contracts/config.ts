// Contract addresses for Base Sepolia testnet
// export const CONTRACT_ADDRESSES = {
//   GAME_WITH_JACKPOT: "0x621831Cfa1E6078625Df5e17E598736CD4B7Ac41",
//   BALANCE_TRACKER: "0x7A68AcE94b7BdbE56d31D3103eF2F1c2B8a22938"
// };

// Network configuration
// export const NETWORK_CONFIG = {
//   chainId: 84532, // Base Sepolia
//   name: "Base Sepolia",
//   currency: {
//     name: "ETH",
//     symbol: "ETH",
//     decimals: 18
//   },
//   rpcUrl: "https://sepolia.base.org",
//   blockExplorer: "https://sepolia-explorer.base.org"
// };

// Nexus Chain
export const CONTRACT_ADDRESSES = {
  GAME_WITH_JACKPOT: "0x7D8ded9cDdEced4Ff3b85E62E1e5B0cD74686472",
  BALANCE_TRACKER: "0x3E019983C7BE92757Aa795A49D13fb3F3b7EF24D"
};

export const NETWORK_CONFIG = {
  chainId: 393, // Nexus Devnet
  name: "Nexus Chain",
  currency: {
    name: "NEX",
    symbol: "NEX",
    decimals: 18
  },
  rpcUrl: "https://rpc.nexus.xyz/http",
  blockExplorer: "https://explorer.nexus.xyz"
};

// Game constants
export const BET_AMOUNT = 0.01; // in ETH 