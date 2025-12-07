import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

// Aave V3 Sepolia Addresses (vérifiées sur https://docs.aave.com/developers/deployed-contracts/v3-testnet-addresses)
const SEPOLIA_ADDRESSES = {
  // Aave V3 Sepolia Pool
  AAVE_POOL: "0x6Ae43d3271ff6888e7Fc43Fd7321a503ff738951",
  // USDC Sepolia (Aave Faucet)
  USDC: "0x94a9D9AC8a22534E3FaCa9F4e7F2E2cf85d5E4C8",
  // aUSDC Sepolia (interest bearing token)
  AUSDC: "0x16dA4541aD1807f4443d92D26044C1147406EB80",
};

export const AequoVaultSepolia = buildModule("AequoVaultSepolia", (m) => {
  console.log("🚀 Deploying AequoVault on Sepolia...");
  console.log("📋 Aave Pool:", SEPOLIA_ADDRESSES.AAVE_POOL);
  console.log("💵 USDC:", SEPOLIA_ADDRESSES.USDC);
  console.log("🏦 aUSDC:", SEPOLIA_ADDRESSES.AUSDC);

  const aequoVault = m.contract("AequoVault", [
    SEPOLIA_ADDRESSES.AAVE_POOL,
    SEPOLIA_ADDRESSES.USDC,
    SEPOLIA_ADDRESSES.AUSDC,
  ]);

  return { aequoVault };
});

export default AequoVaultSepolia;