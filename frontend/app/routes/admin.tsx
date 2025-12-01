import type { Route } from "./+types/admin";
import { useState } from "react";
import { useAccount } from "wagmi";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Item,
  ItemContent,
  ItemTitle,
  ItemDescription,
  ItemActions,
  ItemGroup,
} from "../components/ui/item";
import { userIsOwner, useGetVaultInfo, useAssoManagement } from "../lib/hooks";
import { DashboardCard } from "~/components/shared/DashboardCard";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Admin - Æquo Protocol" },
    { name: "description", content: "Panneau d'administration du protocole" },
  ];
}

export default function Admin() {
  const { isConnected } = useAccount();
  const isOwner = userIsOwner();
  const { vaultTotalValue, globalInterest, totalAssoInterest, defaultFeesPercentage, totalAssets } = useGetVaultInfo();
  const {
        richAssoList,
        assoList,
        addAssoToWhitelist,
        removeAssoFromWhitelist,
        isWhitelistPending
  } = useAssoManagement();

  console.log("Vault Info:", globalInterest);
  console.log("Total Association Interest:", totalAssoInterest);
  console.log("Vault Total Value:", vaultTotalValue);

  const [newAssoAddress, setNewAssoAddress] = useState<`0x${string}` | "">("");

  // Gérer l'ajout à la whitelist
  const handleAddToWhitelist = () => {
    if (!newAssoAddress || !newAssoAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
      alert("Veuillez entrer une adresse Ethereum valide.");
      return;
    }

    addAssoToWhitelist(newAssoAddress.toLowerCase() as `0x${string}`);
  };

  // Gérer le retrait de la whitelist
  const handleRemoveFromWhitelist = (assoAddress: `0x${string}`) => {
    console.log('🗑️ Retrait de la whitelist:', assoAddress);
    removeAssoFromWhitelist(assoAddress.toLowerCase() as `0x${string}`);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Connexion requise</CardTitle>
            <CardDescription className="text-center">
              Veuillez connecter votre wallet pour accéder au panneau d'administration
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full mx-4 border-2 border-red-200">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-red-900">Accès refusé</CardTitle>
            <CardDescription className="text-center">
              Vous n'avez pas les droits d'administration pour accéder à cette page
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Panneau d'administration</h1>
          <p className="text-gray-600">Gérez le protocole Æquo et les associations whitelistées</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8">
          <DashboardCard
            displayValue={(vaultTotalValue || 0).toString()}
            cardTitle="Valeur totale du vault"
            color="blue"
          />
          
          <DashboardCard
            displayValue={(globalInterest || 0).toString()}
            cardTitle="Intérêts globaux générés"
            color="green"
          />
          
          <DashboardCard
            displayValue={(totalAssets || 0).toString()}
            cardTitle="Total des dépôts"
            color="purple"
          />
          
          <DashboardCard
            displayValue={`${defaultFeesPercentage}%`}
            cardTitle="Fees par défaut"
            color="orange"
            tokenName="Reversés aux associations"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Ajouter une association */}
          <Card>
            <CardHeader>
              <CardTitle>Ajouter une association</CardTitle>
              <CardDescription>
                Ajouter une nouvelle association à la whitelist
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse Ethereum de l'association
                </label>
                <input
                  type="text"
                  value={newAssoAddress}
                  onChange={(e) => setNewAssoAddress(e.target.value as `0x${string}` | "")}
                  placeholder="0x..."
                  pattern="^0x[a-fA-F0-9]{40}$"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-gray-900 focus:border-transparent"
                />
                <p className="mt-2 text-xs text-gray-500">
                  L'adresse doit être au format Ethereum valide (0x...)
                </p>
              </div>
              <Button
                onClick={handleAddToWhitelist}
                disabled={!newAssoAddress || !newAssoAddress.match(/^0x[a-fA-F0-9]{40}$/)}
                className="w-full"
                size="lg"
              >
                Ajouter à la whitelist
              </Button>
            </CardContent>
          </Card>

          {/* Statistiques */}
          <Card className="border-2 border-gray-200">
            <CardHeader>
              <CardTitle>Statistiques du protocole</CardTitle>
              <CardDescription>Vue d'ensemble des performances</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Associations whitelistées</span>
                  <span className="font-bold text-2xl text-gray-900">
                    {assoList.length}
                  </span>
                </div>
                
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Rendement actuel</span>
                  <span className="font-semibold text-green-600">
                    {defaultFeesPercentage}%
                  </span>
                </div>
                
                <div className="flex justify-between items-center pb-3 border-b border-gray-200">
                  <span className="text-sm text-gray-600">Intérêts non distribués</span>
                  <span className="font-semibold text-blue-600">
                    {vaultTotalValue} USDC
                  </span>
                </div>

                <div className="bg-linear-to-r from-gray-50 to-gray-100 rounded-lg p-4 mt-4">
                  <div className="text-xs font-medium text-gray-600 mb-2">Performance globale</div>
                  <div className="text-2xl font-bold text-gray-900">
                    {globalInterest} USDC
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Intérêts générés depuis le lancement
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Liste des associations whitelistées */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Associations whitelistées ({assoList.length})</CardTitle>
            <CardDescription>
              Liste des associations autorisées à recevoir des dons
            </CardDescription>
          </CardHeader>
          <CardContent>
            {assoList.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-gray-500">Aucune association whitelistée pour le moment</p>
              </div>
            ) : (
              <ItemGroup className="space-y-3">
                {richAssoList().map((asso) => (
                  <Item
                    key={asso.id}
                    variant="outline"
                    className="hover:border-gray-300"
                  >
                    <ItemContent>
                      <ItemTitle>
                        {asso.nom}
                        <Badge variant="secondary" className="bg-purple-100 text-purple-800 hover:bg-purple-200">
                          {asso.type}
                        </Badge>
                      </ItemTitle>
                      <ItemDescription>
                        {asso.description}
                      </ItemDescription>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs font-medium text-gray-500">Adresse:</span>
                        <code className="text-xs font-mono text-gray-900 bg-white px-2 py-1 rounded border border-gray-200">
                          {asso.wallet}
                        </code>
                      </div>
                    </ItemContent>
                    <ItemActions>
                      <Button
                        variant="destructive"
                        onClick={() => handleRemoveFromWhitelist(asso.wallet as `0x${string}`)}
                        size="sm"
                      >
                        Retirer
                      </Button>
                    </ItemActions>
                  </Item>
                ))}
              </ItemGroup>
            )}
          </CardContent>
        </Card>

        {/* Transaction en cours */}
        {isWhitelistPending && (
          <Card className="mt-8 border-2 border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="text-blue-900">Transaction en cours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-900"></div>
                <span className="text-sm text-blue-800">
                  Modification de la whitelist en cours...
                </span>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}