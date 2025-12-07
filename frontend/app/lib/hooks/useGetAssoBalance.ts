import { useReadContract, useChainId } from "wagmi";
import AequoDAppABI from "../../../core/web3/abi/aequoVault.abi.json";
import { CONTRACT_ADDRESS_MAP } from "../../../core/web3/constants";
import { addressbyChainIdAndEnv } from '../../../core/web3/utils';
import { formatUSDC } from "./useGetUserData";

export function useGetAssoBalance(assoAddress: string) {
    const chainId = useChainId();

    const { data: balance } : { data?: bigint } = useReadContract({
        address: addressbyChainIdAndEnv(chainId as keyof typeof CONTRACT_ADDRESS_MAP),
        abi: AequoDAppABI,
        functionName: 'getAssociationTotalReceived',
        args: assoAddress ? [assoAddress.toLowerCase()] : undefined,
        query: {
            enabled: !!assoAddress,
            // Rafraîchir régulièrement pour suivre les dons reçus
            refetchInterval: 50000, // Toutes les 50 secondes
            staleTime: 4000, // Toujours considérer les données comme périmées
            gcTime: 60000, // Ne pas mettre en cache trop longtemps
        }
    });

    return balance ? formatUSDC(balance) : "0"; 
}