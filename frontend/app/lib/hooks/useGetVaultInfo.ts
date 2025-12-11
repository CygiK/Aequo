import { useReadContract, useChainId, useWatchContractEvent } from "wagmi"
import AequoDAppABI from "../../../core/web3/abi/aequoVault.abi.json";
import { addressbyChainIdAndEnv } from '../../../core/web3/utils';
import { CONTRACT_ADDRESS_MAP } from "../../../core/web3/constants";
import { getPublicClient } from "core/web3/client";
import { parseAbiItem } from "viem";
import * as React from "react";
import { formatUSDC } from "./useGetUserData";

export function useGetVaultInfo() {
    const chainId = useChainId();
    const publicClient = getPublicClient(chainId as keyof typeof CONTRACT_ADDRESS_MAP);
    const [totalAssoInterest, setTotalAssoInterest] = React.useState<number>(0);
    

    const { data: vaultTotalValue, refetch: refetchVaultTotalValue } = useReadContract({
        address: addressbyChainIdAndEnv(chainId as keyof typeof CONTRACT_ADDRESS_MAP),
        abi: AequoDAppABI,
        functionName: 'getTotalVaultValue',
    });

    const { data: globalInterest, refetch: refetchGlobalInterest } = useReadContract({
        address: addressbyChainIdAndEnv(chainId as keyof typeof CONTRACT_ADDRESS_MAP),
        abi: AequoDAppABI,
        functionName: 'getGlobalInterest',
    });

    const { data: defaultFeesPercentage, refetch: refetchDefaultFeesPercentage } = useReadContract({
        address: addressbyChainIdAndEnv(chainId as keyof typeof CONTRACT_ADDRESS_MAP),
        abi: AequoDAppABI,
        functionName: 'defaultFeesPercentage',
    });

    const { data: totalAssets, refetch: refetchTotalAssets } = useReadContract({
        address: addressbyChainIdAndEnv(chainId as keyof typeof CONTRACT_ADDRESS_MAP),
        abi: AequoDAppABI,
        functionName: 'totalAssets',
    });

    const getAllWithdrawableAmount = async () => {
        try {
            const logs = await publicClient.getLogs({
                address: addressbyChainIdAndEnv(chainId as keyof typeof CONTRACT_ADDRESS_MAP),
                event: parseAbiItem('event Withdraw(address indexed user, uint256 principal, uint256 userInterest, uint256 assoInterest)'),
                fromBlock: 0n,
                toBlock: 'latest',
            });

            const totalAssoInterest = logs.reduce((acc, log) => {
                const assoInterest = log.args.assoInterest as bigint;
                return acc + assoInterest;
            }, 0n);

            setTotalAssoInterest(Number(totalAssoInterest));

        } catch (error) {
            console.error("Error fetching vault info:", error);
        }
    }

    useWatchContractEvent({
        address: addressbyChainIdAndEnv(chainId as keyof typeof CONTRACT_ADDRESS_MAP),
        abi: AequoDAppABI,
        eventName: 'Withdraw',
        onLogs() {
            getAllWithdrawableAmount();
            refetchVaultTotalValue();
            refetchGlobalInterest();
            refetchTotalAssets();
        },
    });

    useWatchContractEvent({
        address: addressbyChainIdAndEnv(chainId as keyof typeof CONTRACT_ADDRESS_MAP),
        abi: AequoDAppABI,
        eventName: 'Deposit',
        onLogs() {
            getAllWithdrawableAmount();
            refetchVaultTotalValue();
            refetchGlobalInterest();
            refetchTotalAssets();
        },
    });

    useWatchContractEvent({
        address: addressbyChainIdAndEnv(chainId as keyof typeof CONTRACT_ADDRESS_MAP),
        abi: AequoDAppABI,
        eventName: 'FeesPercentageUpdated',
        onLogs() {
            refetchDefaultFeesPercentage();
        },
    });

    React.useEffect(() => {
            getAllWithdrawableAmount();
            refetchVaultTotalValue();
            refetchGlobalInterest();
            refetchTotalAssets();
    }, [chainId]);

    return { 
        vaultTotalValue: vaultTotalValue ? formatUSDC(vaultTotalValue as bigint) : undefined, 
        globalInterest: globalInterest ? formatUSDC(globalInterest as bigint) : undefined, 
        totalAssoInterest : totalAssoInterest ? formatUSDC(totalAssoInterest) : undefined, 
        defaultFeesPercentage: defaultFeesPercentage ? Number(defaultFeesPercentage) / 100 : undefined,
        totalAssets: totalAssets ? formatUSDC(totalAssets as bigint) : undefined
    };
}