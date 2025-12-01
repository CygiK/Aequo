import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { AEQUO_ABI, CONTRACT_ADDRESS_MAP, ERC20_ABI, USDC_ADDRESS_MAP } from "../../../core/web3/constants";
import { addressbyChainIdAndEnv, usdcAddressByChainId } from '../../../core/web3/utils';
import { useState, useEffect, useCallback, useMemo } from 'react';

type TransactionState = 'idle' | 'approving' | 'depositing' | 'withdrawing' | 'success' | 'error';

export function useVaultTransaction() {
    const { address } = useAccount();
    const chainId = useChainId();
    const contractAddress = useMemo(
        () => addressbyChainIdAndEnv(chainId as keyof typeof CONTRACT_ADDRESS_MAP),
        [chainId]
    );
    const usdcAddress = useMemo(
        () => usdcAddressByChainId(chainId as keyof typeof USDC_ADDRESS_MAP),
        [chainId]
    );

    // État unifié pour suivre le flux de transaction
    const [transactionState, setTransactionState] = useState<TransactionState>('idle');
    const [pendingDepositAmount, setPendingDepositAmount] = useState<bigint | null>(null);

    // Hooks pour les transactions USDC (approval)
    const { 
        writeContract: approveUsdc, 
        data: approvalHash,
        reset: resetApproval 
    } = useWriteContract();
    
    const { 
        isSuccess: approvalSuccess, 
        isLoading: approvalLoading,
        isError: approvalError 
    } = useWaitForTransactionReceipt({ 
        hash: approvalHash 
    });

    // Hooks pour les transactions Vault
    const { 
        writeContract: depositToVault, 
        data: depositHash,
        reset: resetDeposit 
    } = useWriteContract();
    
    const { 
        writeContract: withdrawFromVault, 
        data: withdrawHash,
        reset: resetWithdraw 
    } = useWriteContract();

    const { 
        isSuccess: depositSuccess, 
        isLoading: depositLoading,
        isError: depositError 
    } = useWaitForTransactionReceipt({ 
        hash: depositHash 
    });
    
    const { 
        isSuccess: withdrawSuccess, 
        isLoading: withdrawLoading,
        isError: withdrawError 
    } = useWaitForTransactionReceipt({ 
        hash: withdrawHash 
    });

    // Vérifier l'allowance actuelle
    const { 
        data: currentAllowance, 
        refetch: refetchAllowance 
    } = useReadContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address ? [address, contractAddress] : undefined,
        query: {
            enabled: !!address,
        }
    });

    // Reset complet de tous les états
    const resetAllStates = useCallback(() => {
        setTransactionState('idle');
        setPendingDepositAmount(null);
        resetApproval();
        resetDeposit();
        resetWithdraw();
    }, [resetApproval, resetDeposit, resetWithdraw]);

    // Gestion du flux: Approval réussie → Deposit
    useEffect(() => {
        if (approvalSuccess && pendingDepositAmount && transactionState === 'approving') {
            setTransactionState('depositing');
            
            depositToVault({
                address: contractAddress,
                abi: AEQUO_ABI,
                functionName: 'deposit',
                args: [pendingDepositAmount],
            });
            
            setPendingDepositAmount(null);
        }
    }, [approvalSuccess, pendingDepositAmount, transactionState, depositToVault, contractAddress]);

    // Gestion des erreurs d'approval
    useEffect(() => {
        if (approvalError && transactionState === 'approving') {
            setTransactionState('error');
            setPendingDepositAmount(null);
        }
    }, [approvalError, transactionState]);

    // Gestion du succès de dépôt
    useEffect(() => {
        if (depositSuccess && transactionState === 'depositing') {
            setTransactionState('success');
            refetchAllowance();
            
            // Reset automatique après 3 secondes
            const timer = setTimeout(() => {
                resetAllStates();
            }, 3000);
            
            return () => clearTimeout(timer);
        }
    }, [depositSuccess, transactionState, refetchAllowance, resetAllStates]);

    // Gestion des erreurs de dépôt
    useEffect(() => {
        if (depositError && transactionState === 'depositing') {
            setTransactionState('error');
        }
    }, [depositError, transactionState]);

    // Gestion du succès de retrait
    useEffect(() => {
        if (withdrawSuccess && transactionState === 'withdrawing') {
            setTransactionState('success');
            refetchAllowance();
            
            // Reset automatique après 3 secondes
            const timer = setTimeout(() => {
                resetAllStates();
            }, 3000);
            
            return () => clearTimeout(timer);
        }
    }, [withdrawSuccess, transactionState, refetchAllowance, resetAllStates]);

    // Gestion des erreurs de retrait
    useEffect(() => {
        if (withdrawError && transactionState === 'withdrawing') {
            setTransactionState('error');
        }
    }, [withdrawError, transactionState]);

    /**
     * Fonction pour déposer de l'USDC dans le vault
     * Gère automatiquement l'approbation si nécessaire
     */
    const depositeFund = useCallback(async (amount: bigint) => {
        if (!address) {
            return;
        }

        if (transactionState !== 'idle' && transactionState !== 'success' && transactionState !== 'error') {
            return;
        }

        const allowance = (currentAllowance as bigint) || BigInt(0);
        
        if (allowance < amount) {
            // Besoin d'approuver d'abord
            setTransactionState('approving');
            setPendingDepositAmount(amount);
            
            approveUsdc({
                address: usdcAddress,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [contractAddress, amount],
            });
        } else {
            // Allowance suffisante, déposer directement
            setTransactionState('depositing');
            depositToVault({
                address: contractAddress,
                abi: AEQUO_ABI,
                functionName: 'deposit',
                args: [amount],
            });
        }
    }, [address, transactionState, currentAllowance, usdcAddress, contractAddress, approveUsdc, depositToVault]);

    /**
     * Fonction pour retirer de l'USDC du vault
     */
    const withdrawFund = useCallback((amount: bigint) => {
        if (!address) {
            return;
        }

        if (transactionState !== 'idle' && transactionState !== 'success' && transactionState !== 'error') {
            return;
        }

        setTransactionState('withdrawing');
        
        withdrawFromVault({
            address: contractAddress,
            abi: AEQUO_ABI,
            functionName: 'withdraw',
            args: [amount],
        });
    }, [address, transactionState, contractAddress, withdrawFromVault]);

    // États dérivés pour l'UI
    const isApproving = transactionState === 'approving';
    const isDepositing = transactionState === 'depositing';
    const isWithdrawing = transactionState === 'withdrawing';
    const isLoading = transactionState === 'approving' || transactionState === 'depositing' || transactionState === 'withdrawing';
    const hasError = transactionState === 'error';

    return { 
        // Fonctions principales
        depositeFund, 
        withdrawFund,
        resetAllStates,
        
        // États de transaction
        transactionState,
        isApproving,
        isDepositing,
        isWithdrawing,
        isLoading,
        hasError,
        
        // Statuts individuels (pour compatibilité)
        depositSuccess: depositSuccess && transactionState === 'success',
        withdrawSuccess: withdrawSuccess && transactionState === 'success',
        depositLoading,
        withdrawLoading,
        approvalLoading,
        
        // Allowance USDC
        currentAllowance: (currentAllowance as bigint) || BigInt(0),
        refetchAllowance,
        
        // Hashes pour tracking
        approvalHash,
        depositHash,
        withdrawHash,
    };
}