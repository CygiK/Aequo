import { useAccount, useReadContract, useChainId } from "wagmi";
import { CONTRACT_ADDRESS_MAP, AEQUO_ABI } from "../../../core/web3/constants";
import { addressbyChainIdAndEnv } from '../../../core/web3/utils';

export function userIsOwner(): boolean {
    const { address } = useAccount();
    const chainId = useChainId();
    const addressToLower = address?.toLowerCase();

    const { data: owner } = useReadContract({
        address: addressbyChainIdAndEnv(chainId as keyof typeof CONTRACT_ADDRESS_MAP),
        abi: AEQUO_ABI,
        functionName: 'owner',
    });

    const ownerAddress = owner ? owner.toString().toLowerCase() : null;

    return addressToLower === ownerAddress;
}