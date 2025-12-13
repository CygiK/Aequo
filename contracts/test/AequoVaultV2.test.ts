/**
 * AequoVault Smart Contract Test Suite
 * 
 * This test suite validates the functionality of the AequoVault contract,
 * which integrates with Aave V3 to generate yield on USDC deposits and
 * distributes interest between users and charitable associations.
 * 
 * Test Categories:
 * 1. Initialization - Contract deployment and configuration
 * 2. Deposit and Withdrawal - Core vault operations
 * 3. Interest Calculation - Aave yield distribution (80/20 split)
 * 4. Association Management - Whitelist and fee configuration
 * 5. Aave Integration - Protocol interaction validation
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseUnits, formatUnits, toEventHash } from "viem";
import { network } from "hardhat";

// ══════════════════════════════════════════════════════════════════════════
// Constants - Mainnet Addresses
// ══════════════════════════════════════════════════════════════════════════

const AAVE_POOL_ADDRESS = "0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2"; // Aave V3 Pool
const USDC_ADDRESS = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48";
const AUSDC_ADDRESS = "0x98C23E9d8f34FEFb1B7BD6a91B7FF122F4e16F5c"; // Aave V3 aUSDC
const WHALE_ADDRESS = "0xF977814e90dA44bFA03b6295A0616a897441aceC"; // USDC whale for funding tests

// ══════════════════════════════════════════════════════════════════════════
// ERC20 ABI - Minimal interface for USDC interactions
// ══════════════════════════════════════════════════════════════════════════

const ERC20_ABI = [
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "transfer",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ══════════════════════════════════════════════════════════════════════════
// ERC4626 ABI - Interface complète pour les vaults tokenisés
// ══════════════════════════════════════════════════════════════════════════

const ERC4626_ABI = [
  // ═══ Fonctions de vue ERC4626 ═══
  {
    inputs: [],
    name: "asset",
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalAssets",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "assets", type: "uint256" }],
    name: "convertToShares",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "shares", type: "uint256" }],
    name: "convertToAssets",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "receiver", type: "address" }],
    name: "maxDeposit",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "receiver", type: "address" }],
    name: "maxMint",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "maxWithdraw",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "owner", type: "address" }],
    name: "maxRedeem",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "assets", type: "uint256" }],
    name: "previewDeposit",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "shares", type: "uint256" }],
    name: "previewMint",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "assets", type: "uint256" }],
    name: "previewWithdraw",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ name: "shares", type: "uint256" }],
    name: "previewRedeem",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  // ═══ Fonctions de mutation ERC4626 ═══
  {
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    name: "deposit",
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "receiver", type: "address" },
    ],
    name: "mint",
    outputs: [{ name: "assets", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "assets", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    name: "withdraw",
    outputs: [{ name: "shares", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "shares", type: "uint256" },
      { name: "receiver", type: "address" },
      { name: "owner", type: "address" },
    ],
    name: "redeem",
    outputs: [{ name: "assets", type: "uint256" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  // ═══ Événements ERC4626 ═══
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "sender", type: "address" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "assets", type: "uint256" },
      { indexed: false, name: "shares", type: "uint256" },
    ],
    name: "Deposit",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "sender", type: "address" },
      { indexed: true, name: "receiver", type: "address" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "assets", type: "uint256" },
      { indexed: false, name: "shares", type: "uint256" },
    ],
    name: "Withdraw",
    type: "event",
  },
  // ═══ Fonctions ERC20 héritées ═══
  {
    inputs: [{ name: "account", type: "address" }],
    name: "balanceOf",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "totalSupply",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

// ══════════════════════════════════════════════════════════════════════════
// Test Suite Setup

// ══════════════════════════════════════════════════════════════════════════
describe("AequoVaultV2 Contract", async function () {
  // Network setup
  const { viem } = await network.connect("hardhatMainnet");
  const testClient = await viem.getTestClient({ mode: "hardhat" });
  const publicClient = await viem.getPublicClient();

  /**
   * Deploy fixture - Sets up the test environment
   * 
   * @returns Contract instances, wallet clients, and test utilities
   * 
   * Process:
   * 1. Deploys AequoVault contract with Aave V3 integration
   * 2. Impersonates USDC whale account to fund test wallets
   * 3. Transfers 10,000 USDC to each test wallet
   */
  async function deployFixture() {
    const [ownerWallet, assoWallet, assoWallet2, nonOwner, nonOwner2, whaleWallet] = await viem.getWalletClients();

    // Deploy AequoVault with Aave V3 configuration
    const AequoVaultV2 = await viem.deployContract(
      "AequoVaultV2",
      [AAVE_POOL_ADDRESS, USDC_ADDRESS, AUSDC_ADDRESS, "Aequo Vault", "AEQ"],
    );

    // Setup whale account for USDC funding
    await testClient.impersonateAccount({ address: WHALE_ADDRESS });
    await testClient.setBalance({
      address: WHALE_ADDRESS,
      value: parseUnits("100", 18), // ETH for gas
    });

    const whaleWalletClient = await viem.getWalletClient(WHALE_ADDRESS);

    // Fund test wallets with USDC
    const usdcAmount = parseUnits("10000", 6); // 10,000 USDC
    const usdcWhaleBalance = parseUnits("1000000", 6); // 1,000,000 USDC

    await whaleWalletClient.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [ownerWallet.account.address, usdcAmount],
    });

    await whaleWalletClient.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [nonOwner.account.address, usdcAmount],
    });

    await whaleWalletClient.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: "transfer",
      args: [whaleWallet.account.address, usdcWhaleBalance],
    });

    await testClient.stopImpersonatingAccount({ address: WHALE_ADDRESS });

    return {
      AequoVaultV2,
      ownerWallet,
      assoWallet,
      assoWallet2,
      publicClient,
      nonOwner,
      nonOwner2,
      testClient,
      whaleWallet,
    };
  }

  async function getEventFromLogs(hash: `0x${string}`, eventHash: string) {
      const receipt = await publicClient.waitForTransactionReceipt({ hash });
      const associacteWithelistEvent = receipt.logs.find(log => log.topics[0] === toEventHash(eventHash));
      return associacteWithelistEvent;
  }

  describe("Initialization", function () {
    it("Should deploy the AequoVault contract", async function () {
      const { AequoVaultV2 } = await deployFixture();

      assert.ok(AequoVaultV2.address);
      assert.match(AequoVaultV2.address, /^0x[a-fA-F0-9]{40}$/);
    });

    it("Should have correct initial configuration", async function () {
      const { AequoVaultV2 } = await deployFixture();
      const asset = await AequoVaultV2.read.asset();
      const totalAssets = await AequoVaultV2.read.totalAssets();
      const aToken = await AequoVaultV2.read.aToken();

      assert.equal(asset.toLowerCase(), USDC_ADDRESS.toLowerCase());
      assert.equal(aToken.toLowerCase(), AUSDC_ADDRESS.toLowerCase());
      assert.equal(totalAssets, 0n);
    });

    it("Should verify USDC balance after setup", async function () {
      const { ownerWallet, publicClient, nonOwner, nonOwner2, assoWallet, whaleWallet } = await deployFixture();

      const ownerBalance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [ownerWallet.account.address],
      });

      const nonOwnerBalance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [nonOwner.account.address],
      });

      const nonOwner2Balance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [nonOwner2.account.address],
      });

      const whaleBalance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [WHALE_ADDRESS],
      });

      const whaleWalletBalance2 = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [whaleWallet.account.address],
      });

      const assoBalance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [assoWallet.account.address],
      });

      assert.ok(ownerBalance > 0n, "Wallet should have USDC balance");
      console.log(`Wallet USDC Balance: ${formatUnits(ownerBalance, 6)} USDC`);

      assert.ok(whaleBalance > 0n, "Whale should have USDC balance");
      console.log(`Whale USDC Balance: ${formatUnits(whaleBalance, 6)} USDC`);

      assert.ok(whaleWalletBalance2 > 0n, "Whale should have USDC balance");
      console.log(`Whale USDC Balance: ${formatUnits(whaleWalletBalance2, 6)} USDC`);

      assert.ok(nonOwnerBalance > 0n, "Non-owner should have USDC balance");
      console.log(`Non-owner USDC Balance: ${formatUnits(nonOwnerBalance, 6)} USDC`);

      assert.ok(nonOwner2Balance == 0n, "Non-owner2 should not have positive USDC balance");
      console.log(`Non-owner USDC Balance: ${formatUnits(nonOwner2Balance, 6)} USDC`);

      assert.ok(assoBalance == 0n, "Association should not have positive USDC balance");
      console.log(`Association USDC Balance: ${formatUnits(assoBalance, 6)} USDC`);
    });
  });


    // ---------------------------------------------------------------------------
    // Withdraw and Deposit tests
    // ---------------------------------------------------------------------------

    describe("Deposit and Withdrawal", async function () {
        it("Should allow deposits into the vault", async function () {
            const { AequoVaultV2, ownerWallet, publicClient, nonOwner } = await deployFixture();
            const depositAmount = parseUnits('100', 6); // 100,000 USDC
            const depositAmountLess = parseUnits('10', 6); // 10 USDC

            const approveTx = await ownerWallet.writeContract({
                address: USDC_ADDRESS,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [AequoVaultV2.address, depositAmount],
            });

            const approveReceipt = await publicClient.waitForTransactionReceipt({ hash: approveTx });
            assert.ok(approveReceipt.status === "success", "Approval transaction should succeed");

            const allowance = await publicClient.readContract({
                address: USDC_ADDRESS,
                abi: ERC20_ABI,
                functionName: "allowance",
                args: [ownerWallet.account.address, AequoVaultV2.address],
            });

            assert.strictEqual(allowance, depositAmount, "Allowance should be equal to approved amount");

            const depositTx = await AequoVaultV2.write.depositFundIntoVault([depositAmountLess], { account: ownerWallet.account }); // Deposit 1 USDC
            const depositReceipt = await publicClient.waitForTransactionReceipt({ hash: depositTx });
            assert.ok(depositReceipt.status === "success", "Deposit transaction should succeed");
            assert.ok(depositReceipt.logs.length > 0, "Deposit transaction should emit events");

            const userShare = await publicClient.readContract({
                address: AequoVaultV2.address,
                abi: ERC4626_ABI,
                functionName: "balanceOf",
                args: [ownerWallet.account.address],
            });

            assert.equal(userShare, depositAmountLess, `Deposited amount should be ${formatUnits(depositAmountLess, 6)} shares`);

            const userAssets = await publicClient.readContract({
                address: AequoVaultV2.address,
                abi: ERC4626_ABI,
                functionName: "maxWithdraw",
                args: [ownerWallet.account.address],
            });
        
            assert.equal(userAssets, depositAmountLess, `Deposited amount should be ${formatUnits(depositAmountLess, 6)} USDC`);

            const approveTx2 = await nonOwner.writeContract({
                address: USDC_ADDRESS,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [AequoVaultV2.address, depositAmount],
            });

            const approveReceipt2 = await publicClient.waitForTransactionReceipt({ hash: approveTx2 });
            assert.ok(approveReceipt2.status === "success", "Approval transaction should succeed");

            const allowance2 = await publicClient.readContract({
                address: USDC_ADDRESS,
                abi: ERC20_ABI,
                functionName: "allowance",
                args: [nonOwner.account.address, AequoVaultV2.address],
            });

            assert.strictEqual(allowance2, depositAmount, "Allowance should be equal to approved amount");

            const depositTX2 = await AequoVaultV2.write.depositFundIntoVault([depositAmount], { account: nonOwner.account }); // Deposit 10 USDC
            const depositReceipt2 = await publicClient.waitForTransactionReceipt({ hash: depositTX2 });
            assert.ok(depositReceipt2.status === "success", "Deposit transaction should succeed");
            assert.ok(depositReceipt2.logs.length > 0, "Deposit transaction should emit events");

            const userShare2 = await publicClient.readContract({
                address: AequoVaultV2.address,
                abi: ERC4626_ABI,
                functionName: "maxRedeem",
                args: [nonOwner.account.address],
            });

            assert.equal(userShare2, depositAmount, "Deposited amount should be 10 USDC");
            
            const totalAssets = await publicClient.readContract({
                address: AequoVaultV2.address,
                abi: ERC4626_ABI,
                functionName: "totalAssets",
                args: [],
            });

            assert.equal(totalAssets, depositAmount + depositAmountLess, "Total assets should equal total deposits");
        });

        it("Should allow withdrawals from the vault", async function () {
            const { AequoVaultV2, ownerWallet, publicClient, nonOwner } = await deployFixture();
            const depositAmount = parseUnits('10', 6); // 10 USDC
            const withdrawAmount = parseUnits('5', 6); // 5 USDC

            // Approve and deposit first
            await ownerWallet.writeContract({
                address: USDC_ADDRESS,
                abi: ERC20_ABI,
                functionName: "approve",
                args: [AequoVaultV2.address, depositAmount],
            });

            const allowance = await publicClient.readContract({
                address: USDC_ADDRESS,
                abi: ERC20_ABI,
                functionName: "allowance",
                args: [ownerWallet.account.address, AequoVaultV2.address],
            });

            assert.strictEqual(allowance, depositAmount, "Allowance should be equal to approved amount");

            await AequoVaultV2.write.depositFundIntoVault([depositAmount], { account: ownerWallet.account });

            const vaultUserBefore = await AequoVaultV2.read.vaultUserInfo([ownerWallet.account.address]);
            assert.equal(vaultUserBefore[0], depositAmount, "Deposited amount should be 10 USDC");

            const ownerBalanceBefore = await publicClient.readContract({
                address: USDC_ADDRESS,
                abi: ERC20_ABI,
                functionName: "balanceOf",
                args: [ownerWallet.account.address],
            });

            console.log(`Owner USDC Balance Before Withdrawal: ${formatUnits(ownerBalanceBefore, 6)} USDC`);
            // Now withdraw
            await AequoVaultV2.write.withdrawFundFromVault([withdrawAmount]);
            const vaultUser = await AequoVaultV2.read.vaultUserInfo([ownerWallet.account.address]);
            assert.equal(vaultUser[0], depositAmount - withdrawAmount, "Remaining amount should be 5 USDC");
        });
    });
});