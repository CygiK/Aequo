import {
  createPublicClient,
  createWalletClient,
  createTestClient,
  http,
  parseUnits,
} from "viem";
import { hardhat } from "viem/chains";
import fs from "fs";

// ============================================================================
// CONFIG
// ============================================================================

const HARDHAT_URL = "http://127.0.0.1:8545";
const WHALE_USDC = "0xF977814e90dA44bFA03b6295A0616a897441aceC";
const USDC = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";

// ⚠️ Adresse de votre AequoVault déployé sur le fork
const VAULT_ADDRESS = "0xAE246E208ea35B3F23dE72b697D47044FC594D5F";

// Chargement des associations depuis le JSON
// supporte à la fois :
//  - [ { name, address }, ... ]
//  - { associations: [ { name, address }, ... ] }
const associationsRaw = JSON.parse(
  fs.readFileSync("../data/association.json", "utf8")
) as any;

const associations: { nom: string; id: `0x${string}` }[] =
  Array.isArray(associationsRaw)
    ? associationsRaw
    : associationsRaw.associations ?? [];

// Comptes locaux Hardhat
const LOCAL_ACCOUNTS: `0x${string}`[] = [
  "0x3c44cdddb6a900fa2b585dd299e03d12fa4293bc",
  "0x90f79bf6eb2c4f870365e785982e1f101e93b906",
  "0x15d34aaf54267db7d7c367839aaf71a00a2c6a65",
  "0x9965507d1a55bcc2695c58ba16fb37d819b0a4dc",
  "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
  "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266"
];

// Montants
const SEND_ETH_AMOUNT = parseUnits("50", 18);
const SEND_USDC_AMOUNT = parseUnits("10000", 6);

// ============================================================================
// ABI
// ============================================================================

// ERC20 minimal
const ERC20_ABI = [
  {
    name: "transfer",
    type: "function",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
    stateMutability: "nonpayable",
  },
  {
    name: "balanceOf",
    type: "function",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
    stateMutability: "view",
  },
] as const;

// AequoVault minimal (seulement ce dont on a besoin)
const VAULT_ABI = [
  {
    name: "setAssociationWhitelist",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "assoAddress", type: "address" },
      { name: "whitelisted", type: "bool" },
    ],
    outputs: [],
  },
] as const;

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function main() {
  console.log("🚀 Initialisation du client Hardhat…");

  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(HARDHAT_URL),
  });

  const testClient = createTestClient({
    chain: hardhat,
    transport: http(HARDHAT_URL),
    mode: "hardhat",
  });

  // ========================================================================
  // IMPERSONATE WHALE
  // ========================================================================

  console.log(`\n🐋 Impersonation du whale USDC : ${WHALE_USDC}`);

  await testClient.impersonateAccount({ address: WHALE_USDC });

  await testClient.setBalance({
    address: WHALE_USDC,
    value: parseUnits("1000000", 18),
  });

  const whaleWallet = createWalletClient({
    account: WHALE_USDC,
    chain: hardhat,
    transport: http(HARDHAT_URL),
  });

  console.log("✔️ Whale impersonated + 1,000,000 ETH ajoutés.\n");

  // ========================================================================
  // SEND ETH TO LOCAL ACCOUNTS
  // ========================================================================

  console.log("💸 Distribution d'ETH aux comptes…\n");

  for (const account of LOCAL_ACCOUNTS) {
    await whaleWallet.sendTransaction({
      to: account,
      value: SEND_ETH_AMOUNT,
    });
    console.log(`→ 50 ETH envoyés à ${account}`);
  }

  console.log("✔️ Distribution ETH terminée.\n");

  // ========================================================================
  // SEND USDC TO LOCAL ACCOUNTS
  // ========================================================================

  console.log("💰 Distribution USDC aux comptes…\n");

  for (const account of LOCAL_ACCOUNTS) {
    await whaleWallet.writeContract({
      address: USDC,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [account, SEND_USDC_AMOUNT],
    });

    console.log(`→ 10,000 USDC envoyés à ${account}`);
  }

  console.log("✔️ Distribution USDC terminée.\n");

  // ========================================================================
  // ADD ASSOCIATIONS TO VAULT WHITELIST
  // ========================================================================

  console.log("\n🏛️ Ajout des associations à la whitelist du Vault…");

  const ownerAddress: `0x${string}` =
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";

  await testClient.impersonateAccount({ address: ownerAddress });
  await testClient.setBalance({
    address: ownerAddress,
    value: parseUnits("100000", 18),
  });

  const ownerWallet = createWalletClient({
    account: ownerAddress,
    chain: hardhat,
    transport: http(HARDHAT_URL),
  });

  if (!associations.length) {
    console.warn("⚠️ Aucune association trouvée dans association.json");
  }

  for (const asso of associations) {
    await ownerWallet.writeContract({
      address: VAULT_ADDRESS,
      abi: VAULT_ABI,
      functionName: "setAssociationWhitelist",
      args: [asso.id, true],
    });

    console.log(`→ Association whitelisted : ${asso.nom} (${asso.id})`);
  }

  console.log("✔️ Associations whitelisted.\n");

  // ========================================================================
  // CHECK BALANCES
  // ========================================================================

  console.log("\n📊 Vérification des balances USDC :");

  for (const account of LOCAL_ACCOUNTS) {
    const bal = await publicClient.readContract({
      address: USDC,
      abi: ERC20_ABI,
      functionName: "balanceOf",
      args: [account],
    });

    console.log(`- ${account} : ${Number(bal) / 1_000_000} USDC`);
  }

  console.log("\n🎉 Setup complet + whitelist associations terminée !\n");

  await testClient.stopImpersonatingAccount({ address: WHALE_USDC });
  await testClient.stopImpersonatingAccount({ address: ownerAddress });
}

main().catch((err) => {
  console.error("❌ ERREUR DANS LE SCRIPT :", err);
  process.exit(1);
});