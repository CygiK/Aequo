import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
      forking: {
        url: configVariable("MAINNET_RPC_URL"),
        blockNumber: 19000000,
      },
      hardfork: "cancun",
      initialBaseFeePerGas: 0,
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
      forking: {
        url: configVariable("MAINNET_RPC_URL"),
        blockNumber: 17500000,
      },
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
