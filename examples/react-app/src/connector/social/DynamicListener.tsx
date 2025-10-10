import { useDynamicContext } from '@dynamic-labs/sdk-react-core';
import { useEffect } from 'react';

/**
 * Componente React simples que:
 * 1. Escuta eventos do window (disparados por SocialConnector)
 * 2. Chama métodos da Dynamic SDK (via hooks)
 * 3. Monitora estado da Dynamic e dispara eventos window
 */
export function DynamicListener() {
  const { setShowAuthFlow, primaryWallet, user, handleLogOut } =
    useDynamicContext();

  // Escuta: openDynamicAuth → abre modal
  useEffect(() => {
    const handler = () => {
      console.log('[Listener] openDynamicAuth received');
      setShowAuthFlow(true);
    };
    window.addEventListener('openDynamicAuth', handler);
    return () => window.removeEventListener('openDynamicAuth', handler);
  }, [setShowAuthFlow]);

  // Escuta: requestDynamicLogout → faz logout
  useEffect(() => {
    const handler = () => {
      console.log('[Listener] requestDynamicLogout received');
      handleLogOut();
    };
    window.addEventListener('requestDynamicLogout', handler);
    return () => window.removeEventListener('requestDynamicLogout', handler);
  }, [handleLogOut]);

  // Monitora: quando wallet disponível → dispara dynamicWalletReady
  useEffect(() => {
    if (primaryWallet && user) {
      console.log('[Listener] Wallet detected, getting address...');

      primaryWallet.connector
        .getAddress()
        .then((address) => {
          console.log('[Listener] Wallet ready, address:', address);
          window.dispatchEvent(
            new CustomEvent('dynamicWalletReady', {
              detail: { address, wallet: primaryWallet, user },
            }),
          );
        })
        .catch((err) => {
          console.error('[Listener] Failed to get address:', err);
        });
    }
  }, [primaryWallet, user]);

  return null;
}
