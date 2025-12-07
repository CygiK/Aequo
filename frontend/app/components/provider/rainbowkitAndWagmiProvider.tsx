import '@rainbow-me/rainbowkit/styles.css';

import {
  getDefaultConfig,
  RainbowKitProvider,
} from '@rainbow-me/rainbowkit';
import { WagmiProvider } from 'wagmi';
import {
  hardhat,
  sepolia,
} from 'wagmi/chains';
import {
  QueryClientProvider,
  QueryClient,
} from "@tanstack/react-query";
import { isProduction } from '~/lib/utils';
import * as React from 'react';
import { WALLETCONNECT_PROJECT_ID } from '../../../core/web3/constants';

// Configuration pour le fork mainnet local
const hardhatFork = {
  ...hardhat,
  name: 'Hardhat Fork (Mainnet)',
  id: 31337,
  network: 'hardhat-fork',
  nativeCurrency: {
    decimals: 18,
    name: 'Ethereum',
    symbol: 'ETH',
  },
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
  testnet: true,
} as const;

const productionChains = [sepolia] as const;
const developmentChains = [hardhatFork, sepolia] as const;
const chains = isProduction ? productionChains : developmentChains;

const config = getDefaultConfig({
  appName: 'Aequo',
  projectId: WALLETCONNECT_PROJECT_ID,
  chains,
  ssr: false, // Désactivé pour éviter les problèmes ESM/CommonJS sur Vercel
});

export function RainbowkitAndWagmiProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = React.useState(false);
  const [queryClient] = React.useState(() => new QueryClient());

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <RainbowKitProvider>
              {children}
            </RainbowKitProvider>
          </QueryClientProvider>
        </WagmiProvider> 
  );
}