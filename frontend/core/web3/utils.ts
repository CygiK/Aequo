import { CONTRACT_ADDRESS_MAP, USDC_ADDRESS_MAP } from "./constants";

export function addressbyChainIdAndEnv(chainId: keyof typeof CONTRACT_ADDRESS_MAP): `0x${string}` {
    const env = process.env.NODE_ENV;

    if (env === 'production') {
        return CONTRACT_ADDRESS_MAP[11155111 as keyof typeof CONTRACT_ADDRESS_MAP];
    }

    const address = CONTRACT_ADDRESS_MAP[chainId as keyof typeof CONTRACT_ADDRESS_MAP];
    if (!address) {
        throw new Error(`No contract address found for chain ID ${chainId}`);
    }
    
    return address;
}

export function usdcAddressByChainId(chainId: keyof typeof USDC_ADDRESS_MAP): `0x${string}` {
    const address = USDC_ADDRESS_MAP[chainId as keyof typeof USDC_ADDRESS_MAP];
    if (!address) {
        throw new Error(`No USDC address found for chain ID ${chainId}`);
    }
    
    return address;
}
