import abi from './abi/aequoVault.abi.json';

// Adresses des contrats AequoVault
const CONTRACT_ADDRESS_SEPOLIA = '0x8D9e07f9383bEd41289d83c00BE14d5B9b4243A8' as `0x${string}`;
const CONTRACT_ADDRESS_LOCAL = '0xAE246E208ea35B3F23dE72b697D47044FC594D5F' as `0x${string}`;

// Adresses USDC par réseau (Aave V3 Testnet Faucet)
const USDC_ADDRESS_MAINNET = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as `0x${string}`; // USDC sur Ethereum Mainnet (6 decimals)
const USDC_ADDRESS_SEPOLIA = '0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8' as `0x${string}`; // USDC Aave Sepolia Faucet
const USDC_ADDRESS_LOCAL = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' as `0x${string}`; // USDC Mainnet (pour fork mainnet)

const WALLETCONNECT_PROJECT_ID = 'c9de6b4d3ab99a864248856be3c2c85c' as string;
const AEQUO_ABI = abi;
const SEPOLIA_RPC_URL = 'https://sepolia.infura.io/v3/357843c8f7f940d2b68483811f755c31' as string;

const USDC_DECIMALS = 6;

// Mapping des adresses par chainId
const CONTRACT_ADDRESS_MAP = {
    1: CONTRACT_ADDRESS_SEPOLIA, // Mainnet (à mettre à jour avec la vraie adresse si déployé)
    11155111: CONTRACT_ADDRESS_SEPOLIA, // Sepolia
    31337: CONTRACT_ADDRESS_LOCAL, // Hardhat local / Fork Mainnet
} as const;

const USDC_ADDRESS_MAP = {
    1: USDC_ADDRESS_MAINNET, // Mainnet
    11155111: USDC_ADDRESS_SEPOLIA, // Sepolia
    31337: USDC_ADDRESS_LOCAL, // Hardhat local / Fork Mainnet (utilise l'adresse Mainnet)
} as const;

export const ERC20_ABI = [
    {
        "constant": true,
        "inputs": [],
        "name": "name",
        "outputs": [{"name": "", "type": "string"}],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [{"name": "_spender", "type": "address"}, {"name": "_value", "type": "uint256"}],
        "name": "approve",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "totalSupply",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [{"name": "_from", "type": "address"}, {"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}],
        "name": "transferFrom",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "balance", "type": "uint256"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [{"name": "", "type": "string"}],
        "type": "function"
    },
    {
        "constant": false,
        "inputs": [{"name": "_to", "type": "address"}, {"name": "_value", "type": "uint256"}],
        "name": "transfer",
        "outputs": [{"name": "", "type": "bool"}],
        "type": "function"
    },
    {
        "constant": true,
        "inputs": [{"name": "_owner", "type": "address"}, {"name": "_spender", "type": "address"}],
        "name": "allowance",
        "outputs": [{"name": "", "type": "uint256"}],
        "type": "function"
    },
    {
        "anonymous": false,
        "inputs": [{"indexed": true, "name": "owner", "type": "address"}, {"indexed": true, "name": "spender", "type": "address"}, {"indexed": false, "name": "value", "type": "uint256"}],
        "name": "Approval",
        "type": "event"
    },
    {
        "anonymous": false,
        "inputs": [{"indexed": true, "name": "from", "type": "address"}, {"indexed": true, "name": "to", "type": "address"}, {"indexed": false, "name": "value", "type": "uint256"}],
        "name": "Transfer",
        "type": "event"
    }
] as const;


export { WALLETCONNECT_PROJECT_ID, AEQUO_ABI, SEPOLIA_RPC_URL, CONTRACT_ADDRESS_MAP, USDC_ADDRESS_MAP, USDC_DECIMALS };