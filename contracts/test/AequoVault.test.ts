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
// Test Suite
// ══════════════════════════════════════════════════════════════════════════

describe("AequoVault Contract", async function () {
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
    const AequoVault = await viem.deployContract(
      "AequoVault",
      [AAVE_POOL_ADDRESS, USDC_ADDRESS, AUSDC_ADDRESS],
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
      AequoVault,
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

  // ════════════════════════════════════════════════════════════════════════
  // Test Suite: Initialization
  // ════════════════════════════════════════════════════════════════════════

  describe("Initialization", function () {
    it("Should deploy the AequoVault contract", async function () {
      const { AequoVault } = await deployFixture();

      assert.ok(AequoVault.address);
      assert.match(AequoVault.address, /^0x[a-fA-F0-9]{40}$/);
    });

    it("Should have correct initial configuration", async function () {
      const { AequoVault } = await deployFixture();

      const asset = await AequoVault.read.asset();
      const totalAssets = await AequoVault.read.totalAssets();
      const aToken = await AequoVault.read.aToken();

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

    // ════════════════════════════════════════════════════════════════════════
  // Test Suite: Association Management
  // ════════════════════════════════════════════════════════════════════════

  describe("Association Management", function () {
    it("As owner i should be allow setting an associated association into whitelist", async function () {
      const { AequoVault, assoWallet } = await deployFixture();

      // Whitelist the association first
      const txHash = await AequoVault.write.setAssociationWhitelist([assoWallet.account.address, true]);

      const associacteWitheListEvent = await getEventFromLogs(txHash, "event AssociationWhitelistUpdated(address,bool)");
      assert.ok(associacteWitheListEvent, "AssociationWhitelisted event should be emitted");

      // Check if whitelisted
      const whiteListed = await AequoVault.read.whitelistedAssociations([assoWallet.account.address]);

      assert.equal(whiteListed, true,
        "Association should be whitelisted"
      );
    });
    
    it("As non-owner i should not be allow setting an associated association into whitelist", async function () {
      const { AequoVault, assoWallet, nonOwner } = await deployFixture();
      await assert.rejects(
        async () => {
          await AequoVault.write.setAssociationWhitelist([assoWallet.account.address, true], { account: nonOwner.account });
        },
        (error: any) => {
          return error.message.includes("OwnableUnauthorizedAccount");
        },
        "Should revert with ownable unauthorized error : OwnableUnauthorizedAccount"
      );
    });

    it("As user i should be allow setting an associated association with him", async function () {
      const { AequoVault, assoWallet, nonOwner } = await deployFixture();

      // Whitelist the association first
      await AequoVault.write.setAssociationWhitelist([assoWallet.account.address, true]);

      // Set the association for the user
      const txHash = await AequoVault.write.setAssociatedAssoWithUser([assoWallet.account.address], { account: nonOwner.account });

      const userSetAssociateAssoEvent = await getEventFromLogs(txHash, "event UserSetAssociatedAsso(address,address)");
      assert.ok(userSetAssociateAssoEvent, "UserSetAssociatedAsso event should be emitted");

      const userInfo = await AequoVault.read.vaultUserInfo([
        nonOwner.account.address,
      ]);

      assert.equal(
        userInfo[1].toLowerCase(),
        assoWallet.account.address.toLowerCase(),
        "Association should be set"
      );
    });

    it("As user i should not be allow setting an associated association with me if not whitelisted", async function () {
      const { AequoVault, nonOwner, assoWallet2 } = await deployFixture();
      await assert.rejects(
        async () => {
          await AequoVault.write.setAssociatedAssoWithUser([assoWallet2.account.address], { account: nonOwner.account });
        },
        (error: any) => {
          return error.message.includes("Association is not whitelisted");
        },
        "Should revert with \"Association is not whitelisted\""
      );
    });

    it("should be allow to get total donated to an association", async function () {
      const { AequoVault, assoWallet, nonOwner } = await deployFixture();

      const depositAmount1 = parseUnits("100", 6); // 100 USDC

      await nonOwner.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AequoVault.address, depositAmount1],
      });
      
      await AequoVault.write.deposit([depositAmount1], { account: nonOwner.account });
      await AequoVault.write.setAssociationWhitelist([assoWallet.account.address, true]);
      await AequoVault.write.setAssociatedAssoWithUser([assoWallet.account.address], { account: nonOwner.account });

      const userInfo = await AequoVault.read.vaultUserInfo([nonOwner.account.address]);
      assert.equal(
        userInfo[1].toLowerCase(),
        assoWallet.account.address.toLowerCase(),
        "Association should be set"
      );

      await testClient.increaseTime({ seconds: 2592000 });
      await testClient.mine({ blocks: 1 });

      await AequoVault.write.withdraw([depositAmount1], { account: nonOwner.account });
      const assoTotalReceived = await AequoVault.read.associationTotalReceived([assoWallet.account.address]);
      assert.ok(assoTotalReceived > 0n, "Association should have received donations");
      console.log(`Association total received: ${formatUnits(assoTotalReceived, 6)} USDC`);
    });

  });
  // ════════════════════════════════════════════════════════════════════════
  // Test Suite: Fees Configuration
  // ════════════════════════════════════════════════════════════════════════
  
  describe("Fees Configuration", function () {
    it("Should allow user to set custom fees percentage", async function () {
      const { AequoVault, nonOwner } = await deployFixture();

      const customFees = 1000n; // 10%

      const txHash = await AequoVault.write.setUserFeesPercentage([customFees], { account: nonOwner.account });
      const userSetFeesEvent = await getEventFromLogs(txHash, "event UserFeesPercentageUpdated(address,uint256)");

      assert.ok(userSetFeesEvent, "UserFeesPercentageUpdated event should be emitted");

      const userInfo = await AequoVault.read.vaultUserInfo([
        nonOwner.account.address,
      ]);

      assert.equal(userInfo[2], customFees, "Custom fees should be set");
    });

    it("Should revert when setting fees above maximum", async function () {
      const { AequoVault } = await deployFixture();

      const tooHighFees = 6000n; // 60% > 50% max

      await assert.rejects(
        async () => {
          await AequoVault.write.setUserFeesPercentage([tooHighFees]);
        },
        (error: any) => {
          return error.message.includes("User fees percentage exceeds maximum");
        },
        "Should revert with FeesTooHigh error"
      );
    });

    it("Owner should allow setting default fees percentage", async function () {
      const { AequoVault, ownerWallet } = await deployFixture();

      const newDefaultFees = 3000n; // 30%

      const txHash = await AequoVault.write.setDefaultFeesPercentage([newDefaultFees], { account: ownerWallet.account });
      const defaultFeesEvent = await getEventFromLogs(txHash, "event FeesPercentageUpdated(uint256, uint256)");

      assert.ok(defaultFeesEvent, "FeesPercentageUpdated event should be emitted");

      const defaultFees = await AequoVault.read.defaultFeesPercentage();

      assert.equal(defaultFees, newDefaultFees, "Default fees percentage should be updated");
    });

    it("Should revert when owner sets default fees above maximum", async function () {
        const { AequoVault, ownerWallet } = await deployFixture();

        const tooHighFees = 6000n; // 60% > 50% max

        await assert.rejects(
          async () => {
            await AequoVault.write.setDefaultFeesPercentage([tooHighFees], { account: ownerWallet.account });
          },
          (error: any) => {
            return error.message.includes("Default fees percentage exceeds maximum");
          },
          "Should revert with FeesTooHigh error"
        );
      });

    it("Non-owner should not allow setting default fees percentage", async function () {
      const { AequoVault, nonOwner } = await deployFixture();

      const newDefaultFees = 3000n; // 30%

      await assert.rejects(
        async () => {
          await AequoVault.write.setDefaultFeesPercentage([newDefaultFees], { account: nonOwner.account });
        },
        (error: any) => {
          return error.message.includes("OwnableUnauthorizedAccount");
        },
        "Should revert with Ownable error : OwnableUnauthorizedAccount"
      );
    });
  });
  // ════════════════════════════════════════════════════════════════════════
  // Test Suite: Deposit Operations
  // ════════════════════════════════════════════════════════════════════════

  describe("Deposit operations :", function () {
    it("should not be able to deposite zero amount", async function () {
      const { AequoVault, nonOwner } = await deployFixture();

      const zeroAmount = 0n;

      await assert.rejects(
        async () => {
          await AequoVault.write.deposit([zeroAmount], { account: nonOwner.account });
        },
        (error: any) => {
          return error.message.includes("Deposit amount must be greater than zero");
        },
        "Should revert with InvalidAmount error"
      );
    });

    it("Should be able to deposit assets into the vault", async function () {
      const { AequoVault, publicClient, nonOwner } = await deployFixture();

      const depositAmount = parseUnits("100", 6); // 100 USDC

      //Step 1: Approve vault to spend USDC (ERC20 approval pattern)
      const approveTx = await nonOwner.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AequoVault.address, depositAmount],
      });
  
      await publicClient.waitForTransactionReceipt({ hash: approveTx });

      // Step 2: Verify allowance is set correctly
      const allowance = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "allowance",
        args: [nonOwner.account.address, AequoVault.address],
      });
      assert.equal(allowance, depositAmount, "Allowance should be set");

      // Step 3: Deposit into vault (vault will use transferFrom)
      const depositTx = await AequoVault.write.deposit([depositAmount], { account: nonOwner.account });
      const depositEvent = await getEventFromLogs(depositTx, "event Deposit(address,uint256)");
      assert.ok(depositEvent, "Deposit event should be emitted");

      // Verify deposit was recorded correctly
      const userInfo = await AequoVault.read.vaultUserInfo([
        nonOwner.account.address,
      ]);
      const totalAssets = await AequoVault.read.totalAssets();

      assert.equal(userInfo[0], depositAmount, "User deposit should match");
      assert.equal(
        totalAssets,
        depositAmount,
        "Total assets should match deposit amount"
      );

      console.log(`Deposited amount: ${formatUnits(userInfo[0], 6)} USDC`);
      console.log(`Total assets: ${formatUnits(totalAssets, 6)} USDC`);
    });

    it("Should handle multiple deposits correctly", async function () {
      const { AequoVault, nonOwner } = await deployFixture();

      const depositAmount1 = parseUnits("100", 6);
      const depositAmount2 = parseUnits("50", 6);

      // Approve total amount for both deposits
      await nonOwner.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AequoVault.address, depositAmount1 + depositAmount2],
      });

      // First deposit
      const txHash = await AequoVault.write.deposit([depositAmount1], { account: nonOwner.account });

      const depositEvent = await getEventFromLogs(txHash, "event Deposit(address,uint256)");
      assert.ok(depositEvent, "Deposit event should be emitted");
      const userInfoAfterFirst = await AequoVault.read.vaultUserInfo([
        nonOwner.account.address,
      ]);

      // Second deposit
      const txHash2 = await AequoVault.write.deposit([depositAmount2], { account: nonOwner.account });
      const depositEvent2 = await getEventFromLogs(txHash2, "event Deposit(address,uint256)");
      assert.ok(depositEvent2, "Deposit event should be emitted");
      const userInfoAfterSecond = await AequoVault.read.vaultUserInfo([
        nonOwner.account.address,
      ]);
      const totalAssets = await AequoVault.read.totalAssets();

      assert.ok(
        userInfoAfterSecond[0] > userInfoAfterFirst[0],
        "Deposited amount should increase"
      );
  
      assert.equal(
        totalAssets,
        depositAmount1 + depositAmount2,
        "Total assets should match deposits"
      );
    });

    it("Should handle deposits from multiple users", async function () {
      const { AequoVault, nonOwner, whaleWallet } = await deployFixture();

      const depositAmount1 = parseUnits("100", 6);
      const depositAmount2 = parseUnits("200", 6);

      // User 1 deposit
      await nonOwner.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AequoVault.address, depositAmount1],
      });

      const txHash1 = await AequoVault.write.deposit([depositAmount1], { account: nonOwner.account });
      const depositEvent1 = await getEventFromLogs(txHash1, "event Deposit(address,uint256)");
      assert.ok(depositEvent1, "Deposit event should be emitted");

      // User 2 deposit
      await whaleWallet.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AequoVault.address, depositAmount2],
      });

      const txHash2 = await AequoVault.write.deposit([depositAmount2], { account: whaleWallet.account });
      const depositEvent2 = await getEventFromLogs(txHash2, "event Deposit(address,uint256)");
      assert.ok(depositEvent2, "Deposit event should be emitted");

      // Verify both users have deposits
      const userInfo1 = await AequoVault.read.vaultUserInfo([
        nonOwner.account.address,
      ]);
  
      const userInfo2 = await AequoVault.read.vaultUserInfo([
        whaleWallet.account.address,
      ]);
      const totalAssets = await AequoVault.read.totalAssets();

      assert.ok(userInfo1[0] > 0n, "User 1 should have deposited");
      assert.ok(userInfo2[0] > 0n, "User 2 should have deposited");
      assert.ok(userInfo2[0] > userInfo1[0], "User 2 should have more deposited");
      assert.equal(
        totalAssets,
        depositAmount1 + depositAmount2,
        "Total assets should match"
      );
    });
  });
  
  // ════════════════════════════════════════════════════════════════════════
  // Test Suite: Withdrawal Operations
  // ════════════════════════════════════════════════════════════════════════
  
  describe("Withdrawal Operations :", function () {
    it("should not be able to withdraw zero amount", async function () {
      const { AequoVault, nonOwner } = await deployFixture();
  
      const zeroAmount = 0n;
  
      await assert.rejects(
        async () => {
          await AequoVault.write.withdraw([zeroAmount], { account: nonOwner.account });
        },
        (error: any) => {
          return error.message.includes("Withdraw amount must be greater than zero");
        },
        "Should revert with InvalidAmount error"
      );
    });
    
    it("Should be able to withdraw assets from the vault", async function () {
      const { AequoVault, publicClient, nonOwner, assoWallet } = await deployFixture();

      const depositAmount = parseUnits("1000", 6);

      // Approve and deposit
      await nonOwner.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AequoVault.address, depositAmount],
      });

      const setAssoWhitelistTxHash = await AequoVault.write.setAssociationWhitelist([assoWallet.account.address, true]);
      const setAssoWhitelistEvent = await getEventFromLogs(setAssoWhitelistTxHash, "event AssociationWhitelistUpdated(address,bool)");
      assert.ok(setAssoWhitelistEvent, "AssociationWhitelisted event should be emitted");

      const txHash = await AequoVault.write.deposit([depositAmount], { account: nonOwner.account });
      const depositEvent = await getEventFromLogs(txHash, "event Deposit(address,uint256)");
      assert.ok(depositEvent, "Deposit event should be emitted");

      // Set associated association
      const setAssoTxHash = await AequoVault.write.setAssociatedAssoWithUser([assoWallet.account.address], { account: nonOwner.account });
      const setAssoEvent = await getEventFromLogs(setAssoTxHash, "event UserSetAssociatedAsso(address,address)");
      assert.ok(setAssoEvent, "UserSetAssociatedAsso event should be emitted");

      const userInfoBefore = await AequoVault.read.vaultUserInfo([
        nonOwner.account.address,
      ]);

      const usdcBalanceBefore = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [nonOwner.account.address],
      });

      // Withdraw half of the deposit
      const withdrawAmount = parseUnits("500", 6);
      const withdrawTx = await AequoVault.write.withdraw([withdrawAmount], {
        gas: 1000000n, // Explicit gas limit for Aave interaction
        account: nonOwner.account,
      });

      const withdrawEvent = await getEventFromLogs(withdrawTx, "event Withdraw(address,uint256,uint256, uint256)");
      assert.ok(withdrawEvent, "Withdraw event should be emitted");

      const userInfoAfter = await AequoVault.read.vaultUserInfo([
        nonOwner.account.address,
      ]);

      const usdcBalanceAfter = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [nonOwner.account.address],
      });

      assert.ok(
        userInfoAfter[0] === userInfoBefore[0] - withdrawAmount,
        "Deposited amount should decrease"
      );

      assert.ok(
        usdcBalanceAfter > usdcBalanceBefore,
        "USDC balance should increase"
      );

      assert.ok(
        usdcBalanceAfter - usdcBalanceBefore > withdrawAmount,
        "USDC received should match withdrawn amount + interest"
      );

      console.log(
        `USDC received: ${formatUnits(usdcBalanceAfter - usdcBalanceBefore, 6)} USDC`
      );
    });

       it("Should not be able to withdraw assets from the vault if no associated association is set", async function () {
      const { AequoVault, nonOwner } = await deployFixture();

      const depositAmount = parseUnits("1000", 6);

      // Approve and deposit
      await nonOwner.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AequoVault.address, depositAmount],
      });

      const txHash = await AequoVault.write.deposit([depositAmount], { account: nonOwner.account });
      const depositEvent = await getEventFromLogs(txHash, "event Deposit(address,uint256)");
      assert.ok(depositEvent, "Deposit event should be emitted");

      // Withdraw half of the deposit
      const withdrawAmount = parseUnits("500", 6);

      assert.rejects(
        async () => {
          await AequoVault.write.withdraw([withdrawAmount], {
            gas: 1000000n, // Explicit gas limit for Aave interaction
            account: nonOwner.account,
          });
        },
        (error: any) => {
          return error.message.includes("No associated association set for user");
        },
        "Should revert with no associated association error"
      );
    });

    it("The user has no deposits and tries to withdraw", async function () {
      const { AequoVault, nonOwner, nonOwner2 } = await deployFixture();

      const depositAmount = parseUnits("1000", 6);

      // Approve and deposit
      await nonOwner.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AequoVault.address, depositAmount],
      });

      await AequoVault.write.deposit([depositAmount], { account: nonOwner.account });

      // Attempt to withdraw from a different user
      const withdrawAmount = parseUnits("500", 6);

      await assert.rejects(
        async () => {
          await AequoVault.write.withdraw([withdrawAmount], {
            gas: 1000000n,
            account: nonOwner2.account,
          });
        },
        (error: any) => {
          return error.message.includes("User has no deposits");
        },
        "Should revert with no deposits error"
      );
    })

    it("The user tries to withdraw an amount greater than their deposit", async function () {
      const { AequoVault, nonOwner } = await deployFixture();

      const depositAmount = parseUnits("1000", 6);

      // Approve and deposit
      await nonOwner.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AequoVault.address, depositAmount],
      });

      await AequoVault.write.deposit([depositAmount], { account: nonOwner.account });

      // Attempt to withdraw from a different user
      const withdrawAmount = parseUnits("1500", 6);

      await assert.rejects(
        async () => {
          await AequoVault.write.withdraw([withdrawAmount], {
            gas: 1000000n,
            account: nonOwner.account,
          });
        },
        (error: any) => {
          return error.message.includes("Insufficient deposited balance");
        },
        "Should revert with insufficient balance error"
      );
    })

    it("Should revert on deposit with zero amount", async function () {
      const { AequoVault } = await deployFixture();

      await assert.rejects(
        async () => {
          await AequoVault.write.deposit([0n]);
        },
        (error: any) => {
          return error.message.includes("InvalidAmount");
        },
        "Should revert with InvalidAmount error"
      );
    });

    it("Should revert on withdraw with insufficient balance", async function () {
      const { AequoVault, ownerWallet } = await deployFixture();

      const depositAmount = parseUnits("1000", 6);

      await ownerWallet.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AequoVault.address, depositAmount],
      });
      await AequoVault.write.deposit([depositAmount]);

      await assert.rejects(
        async () => {
          await AequoVault.write.withdraw([depositAmount * 2n]);
        },
        (error: any) => {
          return error.message.includes("InsufficientBalance");
        },
        "Should revert with InsufficientBalance error"
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // Test Suite: Interest Calculation and Distribution
  // ════════════════════════════════════════════════════════════════════════

  describe("Interest Calculation and Distribution", function () {
    it("Should correctly calculate interest after time passes", async function () {
      const { AequoVault, testClient, nonOwner } = await deployFixture();

      const depositAmount = parseUnits("1000", 6);

      // Approve and deposit
      await nonOwner.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AequoVault.address, depositAmount],
      });
      await AequoVault.write.deposit([depositAmount], { account: nonOwner.account });

      // Simulate 30 days passing (2,592,000 seconds)
      // This allows Aave interest to accumulate
      await testClient.increaseTime({ seconds: 2592000 });
      await testClient.mine({ blocks: 1 });

      const [totalInterest, userShare, assoShare] =
        await AequoVault.read.calculateInterest([nonOwner.account.address]);

      // After 30 days, there should be accumulated interest
      assert.ok(
        totalInterest > 0n,
        "Total interest should be greater than 0 after 30 days"
      );

      console.log(`Total interest: ${formatUnits(totalInterest, 6)} USDC`);
      console.log(`User share: ${formatUnits(userShare, 6)} USDC`);
      console.log(`Association share: ${formatUnits(assoShare, 6)} USDC`);
    });

    it("Should calculate interest distribution correctly (80/20 split)", async function () {
      const { AequoVault, ownerWallet, assoWallet, testClient, nonOwner } =
        await deployFixture();

      const depositAmount = parseUnits("1000", 6);

      // Setup association
      await AequoVault.write.setAssociationWhitelist([assoWallet.account.address, true]);
      await AequoVault.write.setAssociatedAssoWithUser([assoWallet.account.address]);

      // Approve and deposit
      await nonOwner.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AequoVault.address, depositAmount],
      });

      await AequoVault.write.deposit([depositAmount], { account: nonOwner.account });

      // Simulate 30 days to accumulate interest
      await testClient.increaseTime({ seconds: 2592000 });
      await testClient.mine({ blocks: 1 });

      const defaultFees = await AequoVault.read.defaultFeesPercentage();
      const [totalInterest, userShare, assoShare] =
        await AequoVault.read.calculateInterest([ownerWallet.account.address]);

      // Verify default fees is 20%
      assert.equal(defaultFees, 2000n, "Default fees should be 20%");

      // Verify interest distribution
      if (totalInterest > 0n) {
        assert.ok(assoShare > 0n, "Association share should be greater than 0");
        assert.ok(
          userShare > assoShare,
          "User share should be greater than association share"
        );

        console.log(`Total interest: ${formatUnits(totalInterest, 6)} USDC`);
        console.log(`User share (80%): ${formatUnits(userShare, 6)} USDC`);
        console.log(`Association share (20%): ${formatUnits(assoShare, 6)} USDC`);
      }
    });
    it("I should be able to claim my interest", async function () {
      const { AequoVault, assoWallet, testClient, nonOwner, publicClient } =
        await deployFixture();

      const depositAmount = parseUnits("1000", 6);

      // Setup association
      await AequoVault.write.setAssociationWhitelist([assoWallet.account.address, true]);
      await AequoVault.write.setAssociatedAssoWithUser([assoWallet.account.address], { account: nonOwner.account });

      // Approve and deposit
      await nonOwner.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AequoVault.address, depositAmount],
      });

      await AequoVault.write.deposit([depositAmount], { account: nonOwner.account });

      // Simulate 30 days to accumulate interest
      await testClient.increaseTime({ seconds: 2592000 });
      await testClient.mine({ blocks: 1 });

      const usdcBalanceBefore = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [nonOwner.account.address],
      });

      console.log(`USDC balance before claiming interest: ${formatUnits(usdcBalanceBefore, 6)} USDC`);

      // Claim interest
      const claimTx = await AequoVault.write.claimInterest({ account: nonOwner.account });

      const claimEvent = await getEventFromLogs(claimTx, "event InterestClaimed(address,uint256,address,uint256)");
      assert.ok(claimEvent, "InterestClaimed event should be emitted");

      const usdcBalanceAfter = await publicClient.readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [nonOwner.account.address],
      });

      assert.ok(
        usdcBalanceAfter > usdcBalanceBefore,
        "USDC balance should increase after claiming interest"
      );

      console.log(
        `USDC interest claimed: ${formatUnits(usdcBalanceAfter - usdcBalanceBefore, 6)} USDC`
      );
    });

  });

  // ════════════════════════════════════════════════════════════════════════
  // Test Suite: Aave Integration
  // ════════════════════════════════════════════════════════════════════════

  describe("Aave Integration", function () {
    it("Should integrate with Aave pool correctly", async function () {
      const { AequoVault, ownerWallet } = await deployFixture();

      const depositAmount = parseUnits("1000", 6);

      await ownerWallet.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AequoVault.address, depositAmount],
      });
      await AequoVault.write.deposit([depositAmount]);

      const totalAssets = await AequoVault.read.totalAssets();
      const vaultValue = await AequoVault.read.getTotalVaultValue();

      // Assets should be deposited into Aave
      assert.equal(totalAssets, depositAmount, "Total assets should match deposit");

      assert.ok(
        vaultValue >= depositAmount,
        "Vault value should be at least deposit amount"
      );

      console.log(`Total assets: ${formatUnits(totalAssets, 6)} USDC`);
      console.log(`Vault value in Aave: ${formatUnits(vaultValue, 6)} USDC`);
    });

    it("Should be able to get total interest earned from Aave, if there is some", async function () {
      const { AequoVault, ownerWallet, testClient } = await deployFixture();

      const depositAmount = parseUnits("1000", 6);

      await ownerWallet.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AequoVault.address, depositAmount],
      });
      await AequoVault.write.deposit([depositAmount]);

      // Simulate 30 days to accumulate interest
      await testClient.increaseTime({ seconds: 2592000 });
      await testClient.mine({ blocks: 1 });

      const totalInterest = await AequoVault.read.getGlobalInterest();

      assert.ok(
        totalInterest > 0n,
        "Total interest earned should be greater than 0 after 30 days"
      );
    });

    it("Should return zero interest when no time has passed", async function () {
      const { AequoVault, ownerWallet } = await deployFixture();

      const depositAmount = parseUnits("1000", 6);

      await ownerWallet.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AequoVault.address, depositAmount],
      });
      await AequoVault.write.deposit([depositAmount]);

      // Simulate 30 days to accumulate interest

      const totalInterest = await AequoVault.read.getGlobalInterest();

      assert.ok(
        totalInterest == 0n,
        "Total interest earned should be 0"
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════════
  // Test Suite: User Information Retrieval
  // ════════════════════════════════════════════════════════════════════════

  describe("User Information Retrieval", function () {
    it("Should get comprehensive user info", async function () {
      const { AequoVault, ownerWallet, assoWallet, testClient } =
        await deployFixture();

      const depositAmount = parseUnits("1000", 6);

      // Setup association
      await AequoVault.write.setAssociationWhitelist([assoWallet.account.address, true]);
      await AequoVault.write.setAssociatedAssoWithUser([assoWallet.account.address]);

      // Approve and deposit
      await ownerWallet.writeContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [AequoVault.address, depositAmount],
      });
      await AequoVault.write.deposit([depositAmount]);

      // Simulate 30 days to accumulate interest
      await testClient.increaseTime({ seconds: 2592000 });
      await testClient.mine({ blocks: 1 });

      const [
        depositedAmount,
        associatedAsso,
        pendingInterest,
        userInterestShare,
        assoInterestShare,
        feesPercentage,
      ] = await AequoVault.read.getUserInfo([ownerWallet.account.address]);

      // Verify user info
      assert.equal(depositedAmount, depositAmount, "Deposited amount should match");
      assert.equal(
        associatedAsso.toLowerCase(),
        assoWallet.account.address.toLowerCase(),
        "Association should match"
      );
      assert.equal(feesPercentage, 2000n, "Fees percentage should be default 20%");
      assert.ok(
        pendingInterest > 0n,
        "Pending interest should be greater than 0 after 30 days"
      );
      assert.ok(
        userInterestShare > 0n,
        "User interest share should be greater than 0"
      );
      assert.ok(
        assoInterestShare > 0n,
        "Association interest share should be greater than 0"
      );

      console.log(`Deposited: ${formatUnits(depositedAmount, 6)} USDC`);
      console.log(`Pending interest: ${formatUnits(pendingInterest, 6)} USDC`);
      console.log(`User share: ${formatUnits(userInterestShare, 6)} USDC`);
      console.log(`Association share: ${formatUnits(assoInterestShare, 6)} USDC`);
    });
  });
});