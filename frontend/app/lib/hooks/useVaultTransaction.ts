import { useAccount, useChainId, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { AEQUO_ABI, CONTRACT_ADDRESS_MAP, ERC20_ABI, USDC_ADDRESS_MAP, USDC_DECIMALS } from "../../../core/web3/constants";
import { addressbyChainIdAndEnv, usdcAddressByChainId } from '../../../core/web3/utils';
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { BaseError, ContractFunctionRevertedError } from 'viem';

type TransactionState = 'idle' | 'approving' | 'depositing' | 'withdrawing' | 'success' | 'error';

const SEPOLIA_CHAIN_ID = 11155111;

/**
 * Extrait le message d'erreur lisible à partir d'une erreur wagmi/viem
 * Gère les erreurs JSON-RPC, les reverts de contrat, et les erreurs utilisateur
 */
function extractErrorMessage(error: unknown): string {
    if (!error) return 'Erreur inconnue';

    // Erreur annulée par l'utilisateur
    if (error instanceof Error) {
        const message = error.message.toLowerCase();
        if (message.includes('user rejected') || message.includes('user denied')) {
            return 'Transaction annulée par l\'utilisateur';
        }
        if (message.includes('insufficient funds')) {
            return 'Fonds insuffisants pour payer les frais de gas';
        }
    }

    // Erreur viem BaseError (contient potentiellement une cause)
    if (error instanceof BaseError) {
        // Chercher une erreur de revert de contrat
        const revertError = error.walk((e) => e instanceof ContractFunctionRevertedError);
        if (revertError instanceof ContractFunctionRevertedError) {
            const reason = revertError.reason;
            if (reason) {
                // Traduire les messages de revert courants
                if (reason.includes('insufficient allowance')) return 'Allowance USDC insuffisante';
                if (reason.includes('insufficient balance')) return 'Balance USDC insuffisante';
                if (reason.includes('amount') && reason.includes('0')) return 'Le montant doit être supérieur à 0';
                return `Erreur contrat: ${reason}`;
            }
        }

        // Erreur JSON-RPC générique
        if (error.shortMessage) {
            return error.shortMessage;
        }
    }

    // Erreur générique
    if (error instanceof Error) {
        // Nettoyer les erreurs JSON-RPC (-32603)
        if (error.message.includes('-32603')) {
            return 'Erreur RPC: La transaction a échoué. Vérifiez votre balance USDC et réessayez.';
        }
        if (error.message.includes('429')) {
            return 'Trop de requêtes. Veuillez patienter quelques secondes et réessayer.';
        }
        return error.message.slice(0, 150); // Limiter la longueur
    }

    return 'Une erreur inattendue s\'est produite';
}

export function useVaultTransaction() {
    const { address, isConnected } = useAccount();
    const chainId = useChainId();

    // Vérifier si on est sur Sepolia
    const isOnSepolia = chainId === SEPOLIA_CHAIN_ID;

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
    // Message d'erreur explicite pour l'UI
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    // Ref pour éviter les doubles appels
    const isProcessingRef = useRef(false);

    // Hooks pour les transactions USDC (approval)
    const {
        writeContract: approveUsdc,
        data: approvalHash,
        error: approvalErrorData,
        isPending: approvalPending,
        reset: resetApproval
    } = useWriteContract();

    const {
        isSuccess: approvalSuccess,
        isLoading: approvalReceiptLoading,
        isError: approvalReceiptError
    } = useWaitForTransactionReceipt({
        hash: approvalHash
    });

    // Hooks pour les transactions Vault
    const {
        writeContract: depositToVault,
        data: depositHash,
        error: depositErrorData,
        isPending: depositPending,
        reset: resetDeposit
    } = useWriteContract();

    const {
        writeContract: withdrawFromVault,
        data: withdrawHash,
        error: withdrawErrorData,
        isPending: withdrawPending,
        reset: resetWithdraw
    } = useWriteContract();

    const {
        isSuccess: depositSuccess,
        isLoading: depositReceiptLoading,
        isError: depositReceiptError
    } = useWaitForTransactionReceipt({
        hash: depositHash
    });

    const {
        isSuccess: withdrawSuccess,
        isLoading: withdrawReceiptLoading,
        isError: withdrawReceiptError
    } = useWaitForTransactionReceipt({
        hash: withdrawHash
    });

    // Vérifier l'allowance actuelle
    // Note: On désactive le refetch automatique pour éviter de spammer le RPC
    const {
        data: currentAllowance,
        refetch: refetchAllowance,
        isLoading: allowanceLoading
    } = useReadContract({
        address: usdcAddress,
        abi: ERC20_ABI,
        functionName: 'allowance',
        args: address && contractAddress ? [address, contractAddress] : undefined,
        query: {
            enabled: !!address && !!contractAddress && !!usdcAddress,
            // Éviter le refetch automatique trop fréquent
            staleTime: 30_000, // 30 secondes
            refetchInterval: false, // Pas de refetch automatique périodique
            refetchOnWindowFocus: false,
        }
    });

    // Reset complet de tous les états
    const resetAllStates = useCallback(() => {
        setTransactionState('idle');
        setPendingDepositAmount(null);
        setErrorMessage(null);
        isProcessingRef.current = false;
        resetApproval();
        resetDeposit();
        resetWithdraw();
    }, [resetApproval, resetDeposit, resetWithdraw]);

    // Gestion du flux: Approval réussie → Deposit
    useEffect(() => {
        if (approvalSuccess && pendingDepositAmount && transactionState === 'approving') {
            console.log('[Vault] Approval confirmée, lancement du dépôt...', {
                amount: pendingDepositAmount.toString(),
                vaultAddress: contractAddress
            });

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

    // Gestion des erreurs d'approval (writeContract error - avant envoi)
    useEffect(() => {
        if (approvalErrorData && transactionState === 'approving') {
            const message = extractErrorMessage(approvalErrorData);
            console.error('[Vault] Erreur approval:', {
                error: approvalErrorData,
                message,
                usdcAddress,
                spender: contractAddress
            });
            setErrorMessage(message);
            setTransactionState('error');
            setPendingDepositAmount(null);
            isProcessingRef.current = false;
        }
    }, [approvalErrorData, transactionState, usdcAddress, contractAddress]);

    // Gestion des erreurs d'approval (receipt error - tx échouée on-chain)
    useEffect(() => {
        if (approvalReceiptError && transactionState === 'approving') {
            console.error('[Vault] Approval tx échouée on-chain');
            setErrorMessage('La transaction d\'approbation a échoué on-chain');
            setTransactionState('error');
            setPendingDepositAmount(null);
            isProcessingRef.current = false;
        }
    }, [approvalReceiptError, transactionState]);

    // Gestion des erreurs de dépôt (writeContract error)
    useEffect(() => {
        if (depositErrorData && transactionState === 'depositing') {
            const message = extractErrorMessage(depositErrorData);
            console.error('[Vault] Erreur dépôt:', {
                error: depositErrorData,
                message,
                vaultAddress: contractAddress
            });
            setErrorMessage(message);
            setTransactionState('error');
            isProcessingRef.current = false;
        }
    }, [depositErrorData, transactionState, contractAddress]);

    // Gestion du succès de dépôt
    useEffect(() => {
        if (depositSuccess && transactionState === 'depositing') {
            console.log('[Vault] Dépôt confirmé!', { hash: depositHash });
            setTransactionState('success');
            isProcessingRef.current = false;
            refetchAllowance();

            // Reset automatique après 5 secondes
            const timer = setTimeout(() => {
                resetAllStates();
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [depositSuccess, transactionState, refetchAllowance, resetAllStates, depositHash]);

    // Gestion des erreurs de dépôt (receipt error)
    useEffect(() => {
        if (depositReceiptError && transactionState === 'depositing') {
            console.error('[Vault] Dépôt tx échouée on-chain');
            setErrorMessage('La transaction de dépôt a échoué on-chain');
            setTransactionState('error');
            isProcessingRef.current = false;
        }
    }, [depositReceiptError, transactionState]);

    // Gestion des erreurs de retrait (writeContract error)
    useEffect(() => {
        if (withdrawErrorData && transactionState === 'withdrawing') {
            const message = extractErrorMessage(withdrawErrorData);
            console.error('[Vault] Erreur retrait:', {
                error: withdrawErrorData,
                message,
                vaultAddress: contractAddress
            });
            setErrorMessage(message);
            setTransactionState('error');
            isProcessingRef.current = false;
        }
    }, [withdrawErrorData, transactionState, contractAddress]);

    // Gestion du succès de retrait
    useEffect(() => {
        if (withdrawSuccess && transactionState === 'withdrawing') {
            console.log('[Vault] Retrait confirmé!', { hash: withdrawHash });
            setTransactionState('success');
            isProcessingRef.current = false;
            refetchAllowance();

            // Reset automatique après 5 secondes
            const timer = setTimeout(() => {
                resetAllStates();
            }, 5000);

            return () => clearTimeout(timer);
        }
    }, [withdrawSuccess, transactionState, refetchAllowance, resetAllStates, withdrawHash]);

    // Gestion des erreurs de retrait (receipt error)
    useEffect(() => {
        if (withdrawReceiptError && transactionState === 'withdrawing') {
            console.error('[Vault] Retrait tx échouée on-chain');
            setErrorMessage('La transaction de retrait a échoué on-chain');
            setTransactionState('error');
            isProcessingRef.current = false;
        }
    }, [withdrawReceiptError, transactionState]);

    /**
     * Fonction pour déposer de l'USDC dans le vault
     * Gère automatiquement l'approbation si nécessaire
     *
     * IMPORTANT: Le montant doit être en unités USDC (6 décimales)
     * Exemple: pour déposer 10 USDC, passer parseUnits('10', 6) = 10_000_000n
     *
     * Flow:
     * 1. Vérifier que le wallet est connecté et sur la bonne chaîne
     * 2. Vérifier que le montant est > 0
     * 3. Si allowance < amount: faire approve() puis deposit()
     * 4. Sinon: faire deposit() directement
     */
    const depositeFund = useCallback(async (amount: bigint) => {
        // Éviter les doubles clics
        if (isProcessingRef.current) {
            console.warn('[Vault] Transaction déjà en cours, ignorée');
            return;
        }

        // Reset de l'erreur précédente
        setErrorMessage(null);

        // Validation: wallet connecté
        if (!address || !isConnected) {
            setErrorMessage('Veuillez connecter votre wallet');
            setTransactionState('error');
            return;
        }

        // Validation: bonne chaîne (Sepolia en production)
        if (!isOnSepolia && process.env.NODE_ENV === 'production') {
            setErrorMessage('Veuillez vous connecter au réseau Sepolia');
            setTransactionState('error');
            return;
        }

        // Validation: montant > 0
        if (amount <= BigInt(0)) {
            setErrorMessage('Le montant doit être supérieur à 0');
            setTransactionState('error');
            return;
        }

        // Validation: état de transaction valide
        if (transactionState !== 'idle' && transactionState !== 'success' && transactionState !== 'error') {
            console.warn('[Vault] Transaction en cours, veuillez patienter');
            return;
        }

        // Marquer comme en cours de traitement
        isProcessingRef.current = true;

        // Logs de debug détaillés
        console.log('[Vault] Début du dépôt', {
            amount: amount.toString(),
            amountFormatted: `${Number(amount) / 10 ** USDC_DECIMALS} USDC`,
            user: address,
            chainId,
            isOnSepolia,
            vaultAddress: contractAddress,
            usdcAddress,
            currentAllowance: currentAllowance?.toString() ?? '0'
        });

        const allowance = (currentAllowance as bigint) || BigInt(0);

        if (allowance < amount) {
            // Besoin d'approuver d'abord
            console.log('[Vault] Allowance insuffisante, envoi de approve()', {
                currentAllowance: allowance.toString(),
                requiredAmount: amount.toString(),
                spender: contractAddress // C'est le vault qui sera le spender
            });

            setTransactionState('approving');
            setPendingDepositAmount(amount);

            approveUsdc({
                address: usdcAddress,
                abi: ERC20_ABI,
                functionName: 'approve',
                args: [contractAddress, amount], // spender = vault address
            });
        } else {
            // Allowance suffisante, déposer directement
            console.log('[Vault] Allowance suffisante, envoi direct de deposit()', {
                allowance: allowance.toString(),
                amount: amount.toString()
            });

            setTransactionState('depositing');
            depositToVault({
                address: contractAddress,
                abi: AEQUO_ABI,
                functionName: 'deposit',
                args: [amount],
            });
        }
    }, [
        address,
        isConnected,
        isOnSepolia,
        chainId,
        transactionState,
        currentAllowance,
        usdcAddress,
        contractAddress,
        approveUsdc,
        depositToVault
    ]);

    /**
     * Fonction pour retirer de l'USDC du vault
     *
     * IMPORTANT: Le montant doit être en unités USDC (6 décimales)
     * Le retrait distribue automatiquement les intérêts à l'utilisateur et à l'association
     */
    const withdrawFund = useCallback((amount: bigint) => {
        // Éviter les doubles clics
        if (isProcessingRef.current) {
            console.warn('[Vault] Transaction déjà en cours, ignorée');
            return;
        }

        // Reset de l'erreur précédente
        setErrorMessage(null);

        // Validation: wallet connecté
        if (!address || !isConnected) {
            setErrorMessage('Veuillez connecter votre wallet');
            setTransactionState('error');
            return;
        }

        // Validation: bonne chaîne
        if (!isOnSepolia && process.env.NODE_ENV === 'production') {
            setErrorMessage('Veuillez vous connecter au réseau Sepolia');
            setTransactionState('error');
            return;
        }

        // Validation: montant > 0
        if (amount <= BigInt(0)) {
            setErrorMessage('Le montant doit être supérieur à 0');
            setTransactionState('error');
            return;
        }

        // Validation: état de transaction valide
        if (transactionState !== 'idle' && transactionState !== 'success' && transactionState !== 'error') {
            console.warn('[Vault] Transaction en cours, veuillez patienter');
            return;
        }

        isProcessingRef.current = true;

        console.log('[Vault] Début du retrait', {
            amount: amount.toString(),
            amountFormatted: `${Number(amount) / 10 ** USDC_DECIMALS} USDC`,
            user: address,
            vaultAddress: contractAddress
        });

        setTransactionState('withdrawing');

        withdrawFromVault({
            address: contractAddress,
            abi: AEQUO_ABI,
            functionName: 'withdraw',
            args: [amount],
        });
    }, [address, isConnected, isOnSepolia, transactionState, contractAddress, withdrawFromVault]);

    // États dérivés pour l'UI
    const isApproving = transactionState === 'approving';
    const isDepositing = transactionState === 'depositing';
    const isWithdrawing = transactionState === 'withdrawing';
    const isLoading = transactionState === 'approving' || transactionState === 'depositing' || transactionState === 'withdrawing';
    const hasError = transactionState === 'error';

    // Loading states combinés (pending = envoi vers MetaMask, receipt = attente confirmation)
    const approvalLoading = approvalPending || approvalReceiptLoading;
    const depositLoading = depositPending || depositReceiptLoading;
    const withdrawLoading = withdrawPending || withdrawReceiptLoading;

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

        // Message d'erreur explicite pour l'UI
        errorMessage,

        // Informations de configuration (utile pour debug)
        config: {
            vaultAddress: contractAddress,
            usdcAddress,
            chainId,
            isOnSepolia,
            usdcDecimals: USDC_DECIMALS
        },

        // Statuts individuels (pour compatibilité)
        depositSuccess: depositSuccess && transactionState === 'success',
        withdrawSuccess: withdrawSuccess && transactionState === 'success',
        depositLoading,
        withdrawLoading,
        approvalLoading,
        allowanceLoading,

        // Allowance USDC
        currentAllowance: (currentAllowance as bigint) || BigInt(0),
        refetchAllowance,

        // Hashes pour tracking
        approvalHash,
        depositHash,
        withdrawHash,
    };
}