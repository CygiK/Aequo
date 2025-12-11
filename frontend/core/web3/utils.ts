import { CONTRACT_ADDRESS_MAP, USDC_ADDRESS_MAP } from "./constants";

// ChainId Sepolia pour référence
const SEPOLIA_CHAIN_ID = 11155111;

/**
 * Retourne l'adresse du contrat AequoVault selon le chainId et l'environnement.
 * En production, force toujours l'adresse Sepolia pour éviter les erreurs.
 */
export function addressbyChainIdAndEnv(chainId: keyof typeof CONTRACT_ADDRESS_MAP): `0x${string}` {
    const env = process.env.NODE_ENV;

    // En production, toujours utiliser Sepolia
    if (env === 'production') {
        return CONTRACT_ADDRESS_MAP[SEPOLIA_CHAIN_ID as keyof typeof CONTRACT_ADDRESS_MAP];
    }

    const address = CONTRACT_ADDRESS_MAP[chainId as keyof typeof CONTRACT_ADDRESS_MAP];
    if (!address) {
        console.warn(`[Web3] No contract address for chainId ${chainId}, falling back to Sepolia`);
        return CONTRACT_ADDRESS_MAP[SEPOLIA_CHAIN_ID as keyof typeof CONTRACT_ADDRESS_MAP];
    }

    return address;
}

/**
 * Retourne l'adresse USDC selon le chainId.
 * En production, force toujours l'adresse USDC Sepolia (Aave V3 testnet).
 *
 * IMPORTANT: L'USDC a 6 décimales, pas 18 comme ETH.
 * Toujours utiliser parseUnits(value, 6) et formatUnits(value, 6).
 */
export function usdcAddressByChainId(chainId: keyof typeof USDC_ADDRESS_MAP): `0x${string}` {
    const env = process.env.NODE_ENV;

    // En production, toujours utiliser l'USDC Sepolia
    if (env === 'production') {
        return USDC_ADDRESS_MAP[SEPOLIA_CHAIN_ID as keyof typeof USDC_ADDRESS_MAP];
    }

    const address = USDC_ADDRESS_MAP[chainId as keyof typeof USDC_ADDRESS_MAP];
    if (!address) {
        console.warn(`[Web3] No USDC address for chainId ${chainId}, falling back to Sepolia`);
        return USDC_ADDRESS_MAP[SEPOLIA_CHAIN_ID as keyof typeof USDC_ADDRESS_MAP];
    }

    return address;
}
