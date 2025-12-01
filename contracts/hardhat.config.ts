import hardhatToolboxViemPlugin from "@nomicfoundation/hardhat-toolbox-viem";
import hardhatKeystorePlugin from "@nomicfoundation/hardhat-keystore";
import hardhatVerify from "@nomicfoundation/hardhat-verify";
import { configVariable, defineConfig } from "hardhat/config";
import { hardhat } from "viem/chains";

export default defineConfig({
  plugins: [hardhatToolboxViemPlugin, hardhatKeystorePlugin, hardhatVerify],
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
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
      forking: {
        url: configVariable("MAINNET_RPC_URL"),
        blockNumber: 19000000,  
        enabled: true,
      },
      hardfork: "cancun",
      initialBaseFeePerGas: 0,
      mining: {
        auto: true,
        interval: 3000,
      },
    },
    hardhat: {
      type: "edr-simulated",
      chainType: "l1",
      forking: {
        url: configVariable("MAINNET_RPC_URL"),
        blockNumber: 19000000,
        enabled: true,
      },
      hardfork: "cancun",
      initialBaseFeePerGas: 0,
      mining: {
        auto: true,
        interval: 3000,
      },
    },
    localhost: {
      type: "http",
      url: "http://127.0.0.1:8545",
      chainId: hardhat.id,
      // tu peux ajouter chainId si besoin, une fois que tu l’auras lu dans les logs du node
      // chainId: 1,
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
      forking: {
        url: configVariable("MAINNET_RPC_URL"),
        enabled: true,
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
