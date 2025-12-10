import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import {AaveV3Sepolia } from "@bgd-labs/aave-address-book";

// Utilisation
const pool = AaveV3Sepolia.POOL;
const USDC = AaveV3Sepolia.ASSETS.USDC.UNDERLYING;
const aUSDC = AaveV3Sepolia.ASSETS.USDC.A_TOKEN;

export const AequoVaultSepolia = buildModule("AequoVaultSepolia", (m) => {
  console.log("Deploying AequoVault on Sepolia...");
  console.log("Aave Pool:", pool);
  console.log("USDC:", USDC);
  console.log("aUSDC:", aUSDC);

  const aequoVault = m.contract("AequoVault", [
    pool,
    USDC,
    aUSDC,
  ]);

  return { aequoVault };
});

export default AequoVaultSepolia;