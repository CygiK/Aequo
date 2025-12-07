import { useAccount, useChainId, useReadContract, useWatchContractEvent, useWatchBlockNumber } from "wagmi";
import { AEQUO_ABI, CONTRACT_ADDRESS_MAP } from "../../../core/web3/constants";
import { addressbyChainIdAndEnv } from '../../../core/web3/utils';
import { useMemo, useCallback, useEffect, useState } from "react";

export function formatUSDC(amount: number | bigint, decimals: number = 6): string {
    const value = typeof amount === 'bigint' ? Number(amount) : amount;
    const formatted = value / Math.pow(10, decimals);
    return new Intl.NumberFormat('fr-FR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 6,
    }).format(formatted);
}

function remapUserData(data: any[]) {
    return data.reduce((acc, curr, index) => {
        switch(index) {
            case 0:
                acc.depositedAmount = formatUSDC(curr);
                break;
            case 1:
                acc.associatedAsso = curr;
                break;
            case 2:
                acc.pendingInterest = formatUSDC(curr);
                break;
            case 3:
                acc.userInterestShare = formatUSDC(curr);
                break;
            case 4:
                acc.assoInterestShare = formatUSDC(curr);
                break;
            case 5:
                acc.feesPercentage = Number(curr) / 100;
                break;
            default:
                break;
        }
        return acc;
    }, {})
}


export function useGetUserData() {
    const { address } = useAccount();
    const chainId = useChainId();
    const contractAddress = useMemo(
        () => addressbyChainIdAndEnv(chainId as keyof typeof CONTRACT_ADDRESS_MAP),
        [chainId]
    );

    const isEnabled = !!address && !!contractAddress;
    const [updateTrigger, setUpdateTrigger] = useState(0);
    const [parsedUserData, setParsedUserData] = useState<any>(null);

    const addressToWatch = address ? { user: address.toLowerCase() } : undefined;

    // Récupération des données utilisateur
    const {
        data: userInfo,
        refetch: refetchUserInfo,
        isLoading,
        isError,
        error,
    } = useReadContract({
        address: contractAddress,
        abi: AEQUO_ABI,
        functionName: 'getUserInfo',
        args: [address],
        query: {
            enabled: isEnabled,
            staleTime: 60000,
            gcTime: 300000, 
            refetchOnMount: false,
            refetchOnWindowFocus: true,
        }
    });

    // Mettre à jour parsedUserData à chaque changement de userInfo
    useEffect(() => {
        if (userInfo) {
            const newData = remapUserData(userInfo as any[]);
            setParsedUserData(newData);
        } else {
            setParsedUserData(null);
        }
    }, [userInfo]);

    // Refetch optimisé
    const optimizedRefetch = useCallback(() => {
        refetchUserInfo();
    }, [refetchUserInfo]);

    // Écouter les événements de dépôt pour cet utilisateur
    useWatchContractEvent({
        address: contractAddress,
        abi: AEQUO_ABI,
        eventName: 'Deposit',
        args: address ? { user: address } : undefined,
        onLogs() {
                setUpdateTrigger(prev => prev + 1);
                refetchUserInfo();
        },
    });

    // Écouter les événements de retrait pour cet utilisateur
    useWatchContractEvent({
        address: contractAddress,
        abi: AEQUO_ABI,
        eventName: 'Withdraw',
        args: addressToWatch,
        onLogs() {
                setUpdateTrigger(prev => prev + 1);
                refetchUserInfo();
        },
    });

    // Écouter les changements d'association
    useWatchContractEvent({
        address: contractAddress,
        abi: AEQUO_ABI,
        eventName: 'UserAssociationUpdated',
        args: addressToWatch,
        onLogs() {
            setUpdateTrigger(prev => prev + 1);
            refetchUserInfo();
        },
    });

    // Surveiller les nouveaux blocs pour mettre à jour les intérêts AAVE en temps réel
    useWatchBlockNumber({
        enabled: isEnabled,
        onBlockNumber() {
            refetchUserInfo();
            setUpdateTrigger(prev => prev + 1);
        },
    });


    return { 
        userInfo,
        parsedUserData,
        refetchUserInfo: optimizedRefetch,
        isLoading,
        isError,
        error,
        updateTrigger,
    };
}