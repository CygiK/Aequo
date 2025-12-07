import { createPublicClient, http } from "viem";
import { sepolia, hardhat } from "viem/chains";
import { SEPOLIA_RPC_URL } from "./constants";

export function getPublicClient(chainId: number = 31337) {
    const config = {
        11155111: {
            chain: sepolia,
            transport: http(SEPOLIA_RPC_URL),
        },
        31337: {
            chain: hardhat,
            transport: http(),
        },
    } as const;

    const env = process.env.NODE_ENV;
    const isProduction = env === "production";
    type ChainId = keyof typeof config;
    const publicClient = createPublicClient(isProduction ? config[11155111] : config[chainId as ChainId]);

    return publicClient;
}
