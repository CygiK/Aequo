import type { Route } from "./+types/association";
import associationsData from "../../../data/association.json";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Label } from "../components/ui/label";
import { Checkbox } from "../components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  InputGroup,
  InputGroupInput,
  InputGroupTextarea,
} from "../components/ui/input-group";
import { useGetAssoBalance, useAssoManagement } from "../lib/hooks";
import { Form } from "react-router";
import * as React from "react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Associations - Æquo Protocol" },
    { name: "description", content: "Découvrez les associations et organisations utilisant Æquo Protocol" },
  ];
}

export async function clientLoader({}: Route.LoaderArgs) {
  return {
    associations: associationsData.associations,
  };
}

export async function clientAction({request}: Route.ActionArgs) {
    const formData = await request.formData();
    return null;
}

const typeColors: Record<string, { bg: string; text: string; border: string }> = {
    Environnement: { bg: "bg-green-50", text: "text-green-700", border: "border-green-200" },
    Technologie: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
    Culture: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
    Éducation: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
    Santé: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
    Sport: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
    Social: { bg: "bg-pink-50", text: "text-pink-700", border: "border-pink-200" },
    Business: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
};

// Composant séparé pour afficher une carte d'association
function AssociationCard({ association, colors }: { association: any; colors: { bg: string; text: string; border: string } }) {
    const assoBalance = useGetAssoBalance(association.wallet);
    
    return (
        <Card className="hover:shadow-2xl transition-all duration-300 hover:-translate-y-2 border-2 border-gray-200 hover:border-blue-300">
            <CardHeader className="space-y-0 pb-4">
                <div className="flex justify-between items-start mb-4">
                    <span className={`px-4 py-2 rounded-full text-xs font-bold border-2 ${colors.bg} ${colors.text} ${colors.border}`}>
                        {association.type}
                    </span>
                </div>
                <CardTitle className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
                    {association.nom}
                </CardTitle>
                <CardDescription className="text-gray-600 leading-relaxed line-clamp-3">
                    {association.description}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="bg-gray-50 rounded-xl p-4 border-2 border-gray-200">
                    <div className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">Adresse Wallet</div>
                    <div className="text-xs md:text-sm font-mono text-gray-900 break-all">
                        {association.wallet}
                    </div>
                </div>
            </CardContent>
            <CardFooter className="pt-6">
                <div className="w-full bg-linear-to-r from-green-50 to-blue-50 rounded-xl p-5 border-2 border-green-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Total des revenus</div>
                            <div className="text-2xl md:text-3xl font-bold text-green-600">
                                {assoBalance} <span className="text-base md:text-lg font-semibold text-gray-600">USDC</span>
                            </div>
                        </div>
                        <div className="bg-white rounded-full p-3 shadow-md">
                            <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
}

export default function Association({ loaderData }: Route.ComponentProps) {
    const {assoList, fetchWhitelistedAssos} = useAssoManagement();
    const associations = loaderData.associations;
    const richedAssoInfo: any[] = assoList.map(asso => {
        return associations.find((a: any) => a.wallet.toLowerCase() === asso.association.toLowerCase());
    });

    React.useEffect(() => {
        fetchWhitelistedAssos();
    }, [fetchWhitelistedAssos]);

    return (
        <div className="min-h-screen py-12 md:py-16 px-4">
        {/* Hero Section */}
        <section className="mb-12 md:mb-16">
            <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 md:mb-6">
                Associations
            </h1>
            <p className="text-lg md:text-xl text-gray-600 leading-relaxed">
                Découvrez les organisations qui utilisent Æquo Protocol pour recevoir des dons via les intérêts générés
            </p>
            </div>
        </section>

        {/* Stats Section */}
        <section className="mb-12 md:mb-16">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            <div className="bg-white border-2 border-blue-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300">
                <div className="text-5xl font-bold text-blue-600 mb-2">{assoList.length}</div>
                <div className="text-sm text-gray-600 font-medium">Associations actives</div>
            </div>
            <div className="bg-white border-2 border-green-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300">
                <div className="text-5xl font-bold text-green-600 mb-2">💯</div>
                <div className="text-sm text-gray-600 font-medium">Transparent</div>
            </div>
            <div className="bg-white border-2 border-purple-200 rounded-2xl p-6 text-center hover:shadow-lg transition-all duration-300">
                <div className="text-5xl font-bold text-purple-600 mb-2">⚡</div>
                <div className="text-sm text-gray-600 font-medium">Automatique</div>
            </div>
            </div>
        </section>

        {/* Associations Grid */}
        <section>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto px-4">
            {richedAssoInfo.map((whiteListedAsso) => (
                    <AssociationCard key={whiteListedAsso.id} association={whiteListedAsso} colors={typeColors[whiteListedAsso?.type]} />
            ))}
            </div>
        </section>

        {/* Application Form Section */}
        <section className="mt-20">
            <div className="bg-gray-900 rounded-3xl p-12 max-w-4xl mx-auto">
                <div className="text-center mb-10">
                    <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                        Candidature d'association
                    </h2>
                    <p className="text-gray-300 text-lg max-w-2xl mx-auto">
                        Vous souhaitez rejoindre Æquo Protocol ? Remplissez ce formulaire pour soumettre votre candidature.
                    </p>
                </div>

                <Form method="post" className="space-y-6">
                    {/* Nom de l'association */}
                    <div className="space-y-2">
                        <Label htmlFor="nom" className="text-sm font-semibold text-white">
                            Nom de l'association *
                        </Label>
                        <InputGroup className="bg-gray-800 border-gray-700">
                            <InputGroupInput
                                id="nom"
                                name="nom"
                                type="text"
                                required
                                placeholder="Ex: Association pour l'environnement"
                                className="text-white placeholder-gray-400"
                            />
                        </InputGroup>
                    </div>

                    {/* Type d'association */}
                    <div className="space-y-2">
                        <Label htmlFor="type" className="text-sm font-semibold text-white">
                            Type d'association *
                        </Label>
                        <Select name="type" required>
                            <SelectTrigger className="w-full bg-gray-800 border-gray-700 text-white">
                                <SelectValue placeholder="Sélectionnez un type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Environnement">Environnement</SelectItem>
                                <SelectItem value="Technologie">Technologie</SelectItem>
                                <SelectItem value="Culture">Culture</SelectItem>
                                <SelectItem value="Éducation">Éducation</SelectItem>
                                <SelectItem value="Santé">Santé</SelectItem>
                                <SelectItem value="Sport">Sport</SelectItem>
                                <SelectItem value="Social">Social</SelectItem>
                                <SelectItem value="Business">Business</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="description" className="text-sm font-semibold text-white">
                            Description de votre projet *
                        </Label>
                        <InputGroup className="bg-gray-800 border-gray-700 h-auto">
                            <InputGroupTextarea
                                id="description"
                                name="description"
                                required
                                rows={4}
                                placeholder="Décrivez les objectifs et la mission de votre association..."
                                className="text-white placeholder-gray-400 resize-none"
                            />
                        </InputGroup>
                    </div>

                    {/* Adresse Wallet */}
                    <div className="space-y-2">
                        <Label htmlFor="wallet" className="text-sm font-semibold text-white">
                            Adresse du wallet Ethereum *
                        </Label>
                        <InputGroup className="bg-gray-800 border-gray-700">
                            <InputGroupInput
                                id="wallet"
                                name="wallet"
                                type="text"
                                required
                                pattern="^0x[a-fA-F0-9]{40}$"
                                placeholder="0x..."
                                className="text-white placeholder-gray-400 font-mono text-sm"
                            />
                        </InputGroup>
                        <p className="text-xs text-gray-400">
                            Adresse qui recevra les revenus générés sur la plateforme
                        </p>
                    </div>

                    {/* Email de contact */}
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-semibold text-white">
                            Email de contact *
                        </Label>
                        <InputGroup className="bg-gray-800 border-gray-700">
                            <InputGroupInput
                                id="email"
                                name="email"
                                type="email"
                                required
                                placeholder="contact@association.org"
                                className="text-white placeholder-gray-400"
                            />
                        </InputGroup>
                    </div>

                    {/* Site web (optionnel) */}
                    <div className="space-y-2">
                        <Label htmlFor="website" className="text-sm font-semibold text-white">
                            Site web (optionnel)
                        </Label>
                        <InputGroup className="bg-gray-800 border-gray-700">
                            <InputGroupInput
                                id="website"
                                name="website"
                                type="url"
                                placeholder="https://www.exemple.org"
                                className="text-white placeholder-gray-400"
                            />
                        </InputGroup>
                    </div>

                    {/* Acceptation des conditions */}
                    <div className="flex items-start gap-3">
                        <Checkbox
                            id="terms"
                            name="terms"
                            required
                            className="mt-1 border-gray-700 data-[state=checked]:bg-white data-[state=checked]:text-gray-900"
                        />
                        <Label htmlFor="terms" className="text-sm text-gray-300 font-normal cursor-pointer">
                            J'accepte les conditions d'utilisation et je certifie que les informations fournies sont exactes. 
                            Je comprends que ma candidature sera examinée avant validation. *
                        </Label>
                    </div>

                    {/* Boutons d'action */}
                    <div className="flex gap-4 pt-4">
                        <Button
                            type="submit"
                            className="flex-1 bg-white text-gray-900 hover:bg-gray-100"
                            size="lg"
                        >
                            Soumettre la candidature
                        </Button>
                        <Button
                            type="reset"
                            variant="outline"
                            className="px-8 border-2 border-gray-700 text-gray-900 hover:bg-gray-800"
                            size="lg"
                        >
                            Réinitialiser
                        </Button>
                    </div>

                    <p className="text-xs text-gray-400 text-center pt-2">
                        * Champs obligatoires
                    </p>
                </Form>
            </div>
        </section>
        </div>
    );
}