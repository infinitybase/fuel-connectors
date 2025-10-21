import React from 'react';
import ReactDOM from 'react-dom/client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { coinbaseWallet, walletConnect } from '@wagmi/connectors';
import { http, createConfig, injected } from '@wagmi/core';
import { mainnet, sepolia } from '@wagmi/core/chains';

import { EthereumWalletConnectors } from '@dynamic-labs/ethereum';
import { DynamicContextProvider } from '@dynamic-labs/sdk-react-core';
import { defaultConnectors } from '@fuels/connectors';
import { FuelProvider, type NetworkConfig } from '@fuels/react';
import { WagmiProvider } from 'wagmi';
import { SocialConnector as LocalSocialConnector } from './connector/social';
import { dynamicEventRouter } from './connector/social/DynamicEventRouter';

import * as Toast from '@radix-ui/react-toast';

import App from './App.tsx';
import ScreenSizeIndicator from './components/screensize-indicator.tsx';
import './index.css';
import { type FuelConfig, Provider } from 'fuels';
import {
  CHAIN_ID,
  CHAIN_ID_NAME,
  COUNTER_CONTRACT_ID,
  CUSTOM_ASSET_ID,
  CUSTOM_ASSET_SYMBOL,
  DEFAULT_AMOUNT,
  EXPLORER_URL,
  PROVIDER_URL,
} from './config.ts';
import { type Config, ConfigProvider } from './context/ConfigContext.tsx';

if (!PROVIDER_URL) {
  throw new Error('VITE_FUEL_PROVIDER_URL is not set');
}

const queryClient = new QueryClient();
const isDev = process.env.NODE_ENV === 'development';

// ============================================================
// WalletConnect Connector configurations
// https://docs.walletconnect.com/web3modal/javascript/about
// ============================================================
const WC_PROJECT_ID = import.meta.env.VITE_APP_WC_PROJECT_ID;
const METADATA = {
  name: 'Wallet Demo',
  description: 'Fuel Wallets Demo',
  url: location.href,
  icons: ['https://connectors.fuel.network/logo_white.png'],
};
const wagmiConfig = createConfig({
  chains: [mainnet, sepolia],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  syncConnectedChain: true,
  connectors: [
    injected({ shimDisconnect: false }),
    walletConnect({
      projectId: WC_PROJECT_ID,
      metadata: METADATA,
      showQrModal: false,
    }),
    coinbaseWallet({
      appName: METADATA.name,
      appLogoUrl: METADATA.icons[0],
      darkMode: true,
      reloadOnDisconnect: true,
    }),
  ],
});

const NETWORKS: NetworkConfig[] = [
  {
    chainId: CHAIN_ID,
    url: PROVIDER_URL,
  },
];

const FUEL_CONFIG: FuelConfig = {
  connectors: defaultConnectors({
    devMode: true,
    wcProjectId: WC_PROJECT_ID,
    ethWagmiConfig: wagmiConfig,
    chainId: CHAIN_ID,
    fuelProvider: new Provider(PROVIDER_URL),
  }),
};

// Inject local SocialConnector to the beginning for testing
FUEL_CONFIG.connectors?.unshift(
  new LocalSocialConnector({ fuelProvider: new Provider(PROVIDER_URL) }),
);

const config: Config = {
  explorerUrl: EXPLORER_URL,
  providerUrl: PROVIDER_URL,
  counterContractId: COUNTER_CONTRACT_ID,
  chainIdName: CHAIN_ID_NAME,
  defaultAmount: DEFAULT_AMOUNT,
  assetId: CUSTOM_ASSET_ID,
  assetSymbol: CUSTOM_ASSET_SYMBOL,
};

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <DynamicContextProvider
        settings={{
          // environmentId: '900fba82-9069-46df-9a1a-ca4e3787ec92',
          //environmentId: '1db47cdc-383c-45e2-af38-7cb8dd8d1e4c',
          environmentId: '332b2411-e593-4808-82c8-669a858631e2',
          initialAuthenticationMode: 'connect-and-sign',
          walletConnectors: [EthereumWalletConnectors],
          debugError: true,
          logLevel: 'DEBUG',
          events: {
            onAuthFlowOpen: () => dynamicEventRouter.onAuthFlowOpen(),
            onAuthFlowClose: () => dynamicEventRouter.onAuthFlowClose(),
            onAuthSuccess: (args) => dynamicEventRouter.onAuthSuccess(args),
            onEmbeddedWalletCreated: (wallet) =>
              dynamicEventRouter.onEmbeddedWalletCreated(wallet),
            onWalletAdded: (wallet) => dynamicEventRouter.onWalletAdded(wallet),
            onLogout: (args) => dynamicEventRouter.onLogout(args),
          },
        }}
      >
        <WagmiProvider config={wagmiConfig}>
          <FuelProvider
            theme="dark"
            networks={NETWORKS}
            fuelConfig={FUEL_CONFIG}
          >
            <ConfigProvider config={config}>
              <Toast.Provider>
                <App />
                <Toast.Viewport
                  id="toast-viewport"
                  className="fixed bottom-0 right-0 z-[100] m-0 flex w-[420px] max-w-[100vw] list-none flex-col gap-[10px] p-[var(--viewport-padding)] outline-none [--viewport-padding:_25px]"
                />
              </Toast.Provider>
            </ConfigProvider>
            <ScreenSizeIndicator />
          </FuelProvider>
        </WagmiProvider>
      </DynamicContextProvider>

      {isDev && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  </React.StrictMode>,
);
