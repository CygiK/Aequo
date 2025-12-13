import type { Route } from "./+types/dashboard";
import * as React from "react";
import { useAccount } from "wagmi";
import { parseUnits } from "viem";
import { DashboardCard } from "~/components/shared/DashboardCard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { useGetAssoBalance, useAssoManagement, useGetUserData, useVaultTransaction } from "../lib/hooks";
import { USDC_DECIMALS } from "../../core/web3/constants";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Dashboard - Æquo" },
    { name: "description", content: "Gérez vos dépôts et soutenez les associations" },
  ];
}

export default function Dashboard() {
  const { isConnected } = useAccount();

  const [depositAmount, setDepositAmount] = React.useState("");
  const [withdrawAmount, setWithdrawAmount] = React.useState("");
  const [selectedAsso, setSelectedAsso] = React.useState<string>("");
  const [activeTab, setActiveTab] = React.useState<"deposit" | "withdraw">("deposit");
  const [isUpdating, setIsUpdating] = React.useState(false);

  const { associatAssoToUser, richAssoList} = useAssoManagement();
  const { parsedUserData, refetchUserInfo, isLoading: userDataLoading, updateTrigger } = useGetUserData();
  const {
    depositeFund,
    withdrawFund,
    transactionState,
    isLoading: transactionLoading,
    depositSuccess,
    withdrawSuccess,
    resetAllStates,
    errorMessage,
    hasError,
    config
  } = useVaultTransaction();

  const whitelistedAssociations = richAssoList();

  // Extraire les données utilisateur avec détection de changements
  const userDepositAmount = parsedUserData?.depositedAmount;
  const pendingInterest = parsedUserData?.pendingInterest;
  const userInterestShare = parsedUserData?.userInterestShare;
  const assoInterestShare = parsedUserData?.assoInterestShare;
  const associatedAsso = parsedUserData?.associatedAsso;
  const feesPercentage = parsedUserData?.feesPercentage;

  // Mettre à jour l'indicateur visuel à chaque mise à jour des données
  React.useEffect(() => {
    if (updateTrigger > 0) {
      setIsUpdating(true);
      const timer = setTimeout(() => setIsUpdating(false), 400);
      return () => clearTimeout(timer);
    }
  }, [updateTrigger]);

  // Recharger les données après succès et réinitialiser les états
  React.useEffect(() => {
    if (depositSuccess || withdrawSuccess) {
      refetchUserInfo();
      // Réinitialiser les champs après succès
      setDepositAmount("");
      setWithdrawAmount("");

      // Reset automatique des états de transaction après 3s
      const timer = setTimeout(() => {
        resetAllStates();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [depositSuccess, withdrawSuccess, refetchUserInfo, resetAllStates]);

  const currentAsso = React.useMemo(() => 
    whitelistedAssociations.find(
      (asso) => asso.wallet.toLowerCase() === associatedAsso?.toLowerCase()
    ), [whitelistedAssociations, associatedAsso]
  );

  // Hook pour récupérer le balance de l'association actuelle
  const assoBalance = useGetAssoBalance(associatedAsso);

  // Gérer le dépôt
  // Utilise parseUnits de viem pour une conversion précise (évite les erreurs de floating point)
  const handleDeposit = () => {
    if (!depositAmount || parseFloat(depositAmount) <= 0) return;

    try {
      // parseUnits('10.5', 6) => 10_500_000n (précis, pas de perte de précision)
      const amountInUsdcUnits = parseUnits(depositAmount, USDC_DECIMALS);
      console.log('[Dashboard] Dépôt demandé:', {
        input: depositAmount,
        amountInUsdcUnits: amountInUsdcUnits.toString(),
        vaultAddress: config.vaultAddress
      });
      depositeFund(amountInUsdcUnits);
    } catch (err) {
      console.error('[Dashboard] Erreur de conversion du montant:', err);
    }
  };

  // Gérer le retrait
  const handleWithdraw = () => {
    if (!withdrawAmount || parseFloat(withdrawAmount) <= 0) return;

    try {
      const amountInUsdcUnits = parseUnits(withdrawAmount, USDC_DECIMALS);
      console.log('[Dashboard] Retrait demandé:', {
        input: withdrawAmount,
        amountInUsdcUnits: amountInUsdcUnits.toString()
      });
      withdrawFund(amountInUsdcUnits);
    } catch (err) {
      console.error('[Dashboard] Erreur de conversion du montant:', err);
    }
  };

  // Gérer la sélection d'association
  const handleSetAssociation = async () => {
    if (!selectedAsso) return;
      await associatAssoToUser(selectedAsso as `0x${string}`);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Connexion requise</CardTitle>
            <CardDescription className="text-center">
              Veuillez connecter votre wallet pour accéder au dashboard
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 md:py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-3 md:mb-2 gap-3">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Dashboard</h1>
            
            <Badge 
              variant="success" 
              className={`gap-2 ${isUpdating ? 'opacity-100' : 'opacity-50'}`}
            >
              <div className={`w-2 h-2 rounded-full ${isUpdating ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
              <span className="hidden md:inline">Mise à jour en temps réel des intérêts AAVE</span>
              <span className="md:hidden">Temps réel AAVE</span>
            </Badge>
          </div>
          <p className="text-sm md:text-base text-gray-600">Gérez vos dépôts et soutenez les associations</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <DashboardCard
            displayValue={userDepositAmount}
            cardTitle="Total déposé"
            color="black"
          />
          
          <DashboardCard
            displayValue={pendingInterest}
            cardTitle="Intérêts totaux"
            color="green"
          />

          <DashboardCard
            displayValue={userInterestShare}
            cardTitle="Votre part"
            color="blue"
          />

          <DashboardCard
            displayValue={assoInterestShare}
            cardTitle="Don association"
            color="purple"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
          {/* Messages de succès */}
          {depositSuccess && (
            <div className="lg:col-span-2 bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <svg className="w-6 h-6 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-bold text-green-900">Dépôt réussi !</p>
                <p className="text-sm text-green-700">Vos USDC ont été déposés avec succès dans le vault.</p>
              </div>
            </div>
          )}
          
          {withdrawSuccess && (
            <div className="lg:col-span-2 bg-green-50 border-2 border-green-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <svg className="w-6 h-6 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="font-bold text-green-900">Retrait réussi !</p>
                <p className="text-sm text-green-700">Vos USDC et intérêts ont été retirés avec succès.</p>
              </div>
            </div>
          )}

          {/* Message d'erreur */}
          {hasError && errorMessage && (
            <div className="lg:col-span-2 bg-red-50 border-2 border-red-200 rounded-xl p-4 flex items-center gap-3 shadow-sm">
              <svg className="w-6 h-6 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="flex-1">
                <p className="font-bold text-red-900">Erreur de transaction</p>
                <p className="text-sm text-red-700">{errorMessage}</p>
              </div>
              <button
                onClick={resetAllStates}
                className="text-red-600 hover:text-red-800 p-1"
                title="Fermer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* Colonne gauche - Actions */}
          <div className="space-y-6">
            {/* Dépôt / Retrait avec Switch */}
            <Card>
              <CardHeader>
                <CardTitle>Gérer vos fonds</CardTitle>
                <CardDescription>
                  Déposez ou retirez vos USDC
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Switch Tabs */}
                <div className="flex gap-2 p-1 bg-gray-100 rounded-lg">
                  <Button
                    variant={activeTab === "deposit" ? "default" : "ghost"}
                    onClick={() => setActiveTab("deposit")}
                    className="flex-1"
                  >
                    Dépôt
                  </Button>
                  <Button
                    variant={activeTab === "withdraw" ? "default" : "ghost"}
                    onClick={() => setActiveTab("withdraw")}
                    className="flex-1"
                  >
                    Retrait
                  </Button>
                </div>

                {/* Formulaire Dépôt */}
                {activeTab === "deposit" && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Montant à déposer (USDC)
                      </label>
                      <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                      />
                      <p className="mt-2 text-xs text-gray-500">
                        💡 Vos fonds seront investis sur Aave pour générer des intérêts
                      </p>
                    </div>
                    <Button
                      onClick={handleDeposit}
                      disabled={!depositAmount || parseFloat(depositAmount) <= 0 || transactionLoading || userDataLoading}
                      className="w-full"
                      size="lg"
                    >
                      {transactionLoading ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          {transactionState === 'approving' ? 'Approbation USDC en cours...' : 'Dépôt en cours...'}
                        </>
                      ) : (
                        <>
                          Déposer {depositAmount ? `${parseFloat(depositAmount).toFixed(2)} USDC` : ""}
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Formulaire Retrait */}
                {activeTab === "withdraw" && (
                  <div className="space-y-4 animate-in fade-in duration-300">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Montant à retirer (USDC)
                      </label>
                      <input
                        type="number"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        max={depositAmount}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-600 focus:border-transparent"
                      />
                      <div className="mt-2 flex justify-between items-center">
                        <p className="text-xs text-gray-500">
                          Disponible: {userDepositAmount} USDC
                        </p>
                        <Button
                          variant="link"
                          size="sm"
                          onClick={() => setWithdrawAmount(userDepositAmount?.toString() || '0')}
                          className="h-auto p-0 text-xs"
                        >
                          Max
                        </Button>
                      </div>
                      <p className="mt-2 text-xs text-gray-500">
                        💡 Vos intérêts seront distribués automatiquement
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={handleWithdraw}
                      disabled={!withdrawAmount || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > parseFloat(userDepositAmount?.toString() || '0') || transactionLoading || userDataLoading}
                      className="w-full"
                      size="lg"
                    >
                      {(transactionLoading && transactionState === 'withdrawing') ? (
                        <>
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Retrait en cours...
                        </>
                      ) : (
                        <>
                          Retirer {withdrawAmount ? `${parseFloat(withdrawAmount).toFixed(2)} USDC` : ""}
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Sélection association */}
            <Card>
              <CardHeader>
                <CardTitle>Choisir une association</CardTitle>
                <CardDescription>
                  Sélectionnez l'association que vous souhaitez soutenir
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Association
                  </label>
                  <Select value={selectedAsso} onValueChange={setSelectedAsso}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Sélectionnez une association" />
                    </SelectTrigger>
                    <SelectContent>
                      {whitelistedAssociations.map((asso) => (
                        <SelectItem key={asso.id} value={asso.wallet}>
                          {asso.nom} - {asso.type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={async () => await handleSetAssociation()}
                  disabled={!selectedAsso}
                  className="w-full bg-purple-600 hover:bg-purple-700"
                  size="lg"
                >
                  Définir l'association
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Colonne droite - Informations */}
          <div className="space-y-6">
            {/* Association actuelle */}
            {currentAsso ? (
              <Card className="border-2 border-purple-200 bg-purple-50">
                <CardHeader>
                  <CardTitle className="text-purple-900">Association sélectionnée</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">{currentAsso.nom}</h3>
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-purple-200 text-purple-800 mb-3">
                      {currentAsso.type}
                    </span>
                    <p className="text-gray-700 text-sm leading-relaxed mb-4">
                      {currentAsso.description}
                    </p>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="text-xs font-medium text-gray-500 mb-1">Total reçu par cette association</div>
                    <div className="text-2xl font-bold text-purple-900">
                      {assoBalance} <span className="text-lg text-gray-600">USDC</span>
                    </div>
                  </div>

                  <div className="bg-white rounded-lg p-4 border border-purple-200">
                    <div className="text-xs font-medium text-gray-500 mb-2">Adresse wallet</div>
                    <div className="text-xs font-mono text-gray-900 break-all">
                      {currentAsso.wallet}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-2 border-gray-200">
                <CardHeader>
                  <CardTitle>Aucune association sélectionnée</CardTitle>
                  <CardDescription>
                    Veuillez sélectionner une association pour commencer à générer des dons
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      ⚠️ Vous devez sélectionner une association avant de pouvoir effectuer des retraits
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Résumé des gains */}
            <Card>
              <CardHeader>
                <CardTitle>Détail des gains</CardTitle>
                <CardDescription>Répartition de vos intérêts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="text-sm text-gray-600">Intérêts totaux générés</span>
                    <span className="font-semibold text-gray-900">
                      {pendingInterest} USDC
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="text-sm text-gray-600">Votre part ({100 - feesPercentage}%)</span>
                    <span className="font-semibold text-blue-600">
                      {userInterestShare} USDC
                    </span>
                  </div>
                  
                  <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                    <span className="text-sm text-gray-600">Part association ({feesPercentage}%)</span>
                    <span className="font-semibold text-purple-600">
                      {assoInterestShare} USDC
                    </span>
                  </div>

                  <div className="bg-linear-to-r from-blue-50 to-purple-50 rounded-lg p-4 mt-4">
                    <div className="text-xs font-medium text-gray-600 mb-2">Impact de vos dons</div>
                    <div className="text-2xl font-bold text-gray-900">
                      {assoInterestShare} USDC
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Contribués à {currentAsso?.nom || "votre association"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Informations de transaction */}
            {transactionLoading && (
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardHeader>
                  <CardTitle className="text-blue-900">Transaction en cours</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-900"></div>
                    <span className="text-sm text-blue-800">
                      Confirmation en cours...
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}