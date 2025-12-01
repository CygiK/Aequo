import type { Route } from "./+types/home";
import { Link } from "react-router";


export function meta({}: Route.MetaArgs) {
  return [
    { title: "Æquo Protocol - Gouvernance Décentralisée" },
    { name: "description", content: "Plateforme de gouvernance décentralisée pour associations et organisations" },
  ];
}

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative bg-linear-to-br from-blue-50 via-white to-purple-50 py-20 md:py-32">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Gouvernance décentralisée
              <span className="block text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-purple-600">
                pour tous
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-10 leading-relaxed">
              Æquo Protocol révolutionne la prise de décision collective grâce à la blockchain.
              Transparent, sécurisé et démocratique.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link 
                to="/dashboard" 
                className="w-full sm:w-auto px-8 py-4 bg-blue-600 text-white rounded-xl font-semibold text-lg hover:bg-blue-700 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 hover:scale-105 duration-300"
              >
                Commencer maintenant
              </Link>
              <Link 
                to="/association" 
                className="w-full sm:w-auto px-8 py-4 bg-white text-gray-800 rounded-xl font-semibold text-lg hover:bg-gray-50 transition-all border-2 border-gray-200 hover:border-blue-600 hover:text-blue-600 duration-300"
              >
                Découvrir les associations
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 md:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Pourquoi Æquo ?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Une plateforme conçue pour démocratiser la gouvernance et renforcer la confiance
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 md:gap-12">
            {/* Feature 1 */}
            <div className="text-center p-8 rounded-2xl hover:bg-blue-50 transition-all duration-300 hover:shadow-lg group">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl">🔒</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Sécurité Blockchain</h3>
              <p className="text-gray-600 leading-relaxed">
                Tous les dépôts sont sécurisés sur la blockchain, garantissant une transparence totale et une traçabilité complète.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="text-center p-8 rounded-2xl hover:bg-purple-50 transition-all duration-300 hover:shadow-lg group">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl">💰</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Intérêts Générés</h3>
              <p className="text-gray-600 leading-relaxed">
                Vos USDC génèrent des intérêts via AAVE. Vous gardez votre part et reversez automatiquement à votre association.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="text-center p-8 rounded-2xl hover:bg-green-50 transition-all duration-300 hover:shadow-lg group">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform duration-300">
                <span className="text-3xl">✨</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Simple d'utilisation</h3>
              <p className="text-gray-600 leading-relaxed">
                Interface intuitive et moderne. Déposez, retirez et soutenez en quelques clics.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it works Section */}
      <section className="py-20 md:py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Comment ça marche ?
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Participer à la gouvernance en 3 étapes simples
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="relative">
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-blue-600">
                <div className="w-12 h-12 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-6 shadow-md">
                  1
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Connectez votre wallet</h3>
                <p className="text-gray-600 leading-relaxed">
                  Utilisez votre wallet Web3 (MetaMask, WalletConnect...) pour vous connecter de manière sécurisée.
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-purple-600">
                <div className="w-12 h-12 bg-purple-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-6 shadow-md">
                  2
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Déposez vos USDC</h3>
                <p className="text-gray-600 leading-relaxed">
                  Déposez vos USDC dans le vault et choisissez l'association que vous souhaitez soutenir.
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border-2 border-transparent hover:border-green-600">
                <div className="w-12 h-12 bg-green-600 text-white rounded-full flex items-center justify-center font-bold text-xl mb-6 shadow-md">
                  3
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Générez des intérêts</h3>
                <p className="text-gray-600 leading-relaxed">
                  Vos fonds génèrent des intérêts via AAVE. Vous et votre association en bénéficiez automatiquement.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-linear-to-r from-blue-600 to-purple-600 relative overflow-hidden">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="max-w-4xl mx-auto px-4 md:px-8 text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 animate-in fade-in duration-700">
            Prêt à commencer ?
          </h2>
          <p className="text-xl text-blue-100 mb-10">
            Rejoignez Æquo et soutenez les associations tout en faisant fructifier vos USDC
          </p>
          <Link 
            to="/dashboard" 
            className="inline-block px-10 py-5 bg-white text-blue-600 rounded-xl font-bold text-lg hover:bg-gray-100 transition-all shadow-2xl hover:shadow-3xl transform hover:-translate-y-1 hover:scale-105 duration-300"
          >
            Commencer maintenant →
          </Link>
        </div>
      </section>
    </div>
  );
}
