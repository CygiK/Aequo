import { useChainId, useWriteContract, useWatchContractEvent, useWaitForTransactionReceipt } from "wagmi";
import AequoDAppABI from "../../../core/web3/abi/aequoVault.abi.json";
import { CONTRACT_ADDRESS_MAP } from "../../../core/web3/constants";
import { addressbyChainIdAndEnv } from '../../../core/web3/utils';
import * as React from "react";
import { parseAbiItem } from 'viem';
import { getPublicClient } from "../../../core/web3/client";
import associationsData from "../../../../data/association.json";

function GetAssoListInfo (assoList: {association: `0x${string}`, isWhitelisted: boolean}[]) {
  return assoList.reduce((acc, currentAsso) => {
    const richAssoData = associationsData.associations.find(a => a.id.toLowerCase() === currentAsso.association.toLowerCase());
    if (!richAssoData) return acc;
    
    acc.push({
      ...richAssoData,
      isWhitelisted: currentAsso.isWhitelisted,
    });
    return acc;
  }, [] as Array<typeof associationsData.associations[0] & {isWhitelisted: boolean}>);
}

export function useAssoManagement()  {
    const chainId = useChainId();
    const contractAddress: `0x${string}` = addressbyChainIdAndEnv(chainId as keyof typeof CONTRACT_ADDRESS_MAP);
    const { writeContract: associateAssoToUserContract, isSuccess: assoAssociatedToUser } = useWriteContract();
    const [assoList, setAssoList] = React.useState<{association: `0x${string}`, isWhitelisted: boolean}[]>([]);

    const { writeContract: setWhitelist, data: whitelistHash, isPending: isWhitelistPending, error: whitelistError } = useWriteContract();
    const { isSuccess: whitelistSuccess } = useWaitForTransactionReceipt({ hash: whitelistHash });

    const fetchWhitelistedAssos = React.useCallback(async () => {
        try {
            const logs = await getPublicClient(chainId as keyof typeof CONTRACT_ADDRESS_MAP).getLogs({
                address: contractAddress,
                event: parseAbiItem('event AssociationWhitelistUpdated(address indexed assoAddress, bool whitelisted)'),
                fromBlock: 0n,
                toBlock: 'latest',
            });

            // Créer un Map pour garder seulement le dernier état de chaque association
            const assoMap = new Map<string, boolean>();
            
            logs.forEach(log => {
                const address = (log.args.assoAddress as `0x${string}`).toLowerCase();
                const isWhitelisted = log.args.whitelisted as boolean;
                assoMap.set(address, isWhitelisted);
            });

            // Convertir en array et filtrer seulement les associations whitelistées
            const whitelistedAssos = Array.from(assoMap.entries())
                .filter(([_, isWhitelisted]) => isWhitelisted)
                .map(([address, isWhitelisted]) => ({
                    association: address as `0x${string}`,
                    isWhitelisted
                }));

            setAssoList(whitelistedAssos);
        } catch (error) {
            setAssoList([]);
        }
    }, [chainId, contractAddress]);

    useWatchContractEvent({
        address: contractAddress,
        abi: AequoDAppABI,
        eventName: 'AssociationWhitelistUpdated',
        onLogs() {
            fetchWhitelistedAssos();
        },
    });

    React.useEffect(() => {
        fetchWhitelistedAssos();
    }, [fetchWhitelistedAssos]);

    React.useEffect(() => {
        if (assoAssociatedToUser) {
            fetchWhitelistedAssos();
        }
    }, [assoAssociatedToUser, fetchWhitelistedAssos]);

    const associatAssoToUser = async (address: `0x${string}`) => {
        // Vérifier si l'association est whitelistée en utilisant assoList au lieu d'un hook
        const isWhitelisted = assoList.some(
            asso => asso.association.toLowerCase() === address.toLowerCase() && asso.isWhitelisted
        );

        if(isWhitelisted) {
            associateAssoToUserContract({
                address: contractAddress,
                abi: AequoDAppABI,
                functionName: 'setAssociatedAssoWithUser',
                args: [address],
            });
        }
    };

    function richAssoList() {
        return GetAssoListInfo(assoList);
    }

    function addAssoToWhitelist(address: `0x${string}`) {
        console.log('➕ addAssoToWhitelist appelé avec:', address);
        try {
            setWhitelist({
                address: contractAddress,
                abi: AequoDAppABI,
                functionName: 'setAssociationWhitelist',
                args: [address, true],
            });
            console.log('✅ setWhitelist appelé pour ADD');
        } catch (error) {
            console.error('❌ Erreur lors de addAssoToWhitelist:', error);
        }
    }

    function removeAssoFromWhitelist(address: `0x${string}`) {
        console.log('🔥 removeAssoFromWhitelist appelé avec:', address);
        console.log('📋 Contract address:', contractAddress);
        console.log('📋 Args:', [address, false]);
        
        try {
            setWhitelist({
                address: contractAddress,
                abi: AequoDAppABI,
                functionName: 'setAssociationWhitelist',
                args: [address, false],
            });
            console.log('✅ setWhitelist appelé pour REMOVE');
        } catch (error) {
            console.error('❌ Erreur lors de removeAssoFromWhitelist:', error);
        }
    }

    React.useEffect(() => {
        if (whitelistSuccess) {
            fetchWhitelistedAssos();
        }
    }, [whitelistSuccess, fetchWhitelistedAssos]);



    return { 
        fetchWhitelistedAssos,
        assoList,
        associatAssoToUser,
        richAssoList,
        addAssoToWhitelist,
        removeAssoFromWhitelist,
        isWhitelistPending,
        whitelistSuccess,
        whitelistError
    };
}
