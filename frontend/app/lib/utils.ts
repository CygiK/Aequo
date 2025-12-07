import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const isProduction = process.env.NODE_ENV === "production";

/**
 * Retourne le nom du réseau en fonction du chainId
 */
export function getNetworkName(chainId: number): string {
  switch (chainId) {
    case 1:
      return 'Ethereum Mainnet';
    case 11155111:
      return 'Sepolia Testnet';
    case 31337:
      return 'Hardhat Fork (Mainnet)';
    default:
      return `Unknown Network (${chainId})`;
  }
}

/**
 * Vérifie si on est sur un fork mainnet local
 */
export function isMainnetFork(chainId: number): boolean {
  return chainId === 31337;
}

/**
 * Vérifie si on est sur un testnet
 */
export function isTestnet(chainId: number): boolean {
  return chainId === 11155111 || chainId === 31337;
}