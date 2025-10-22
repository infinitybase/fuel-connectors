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

  // Escuta: openDynamicAuth → abre modal ou retorna sessão existente
  useEffect(() => {
    const handler = () => {
      console.log('[Listener] openDynamicAuth received');

      // Se usuário já está autenticado, não precisa abrir modal
      if (primaryWallet && user) {
        console.log(
          '[Listener] User already authenticated, dispatching wallet ready immediately',
        );

        primaryWallet.connector
          .getAddress()
          .then((address) => {
            window.dispatchEvent(
              new CustomEvent('dynamicWalletReady', {
                detail: { address, wallet: primaryWallet, user },
              }),
            );
          })
          .catch((err) => {
            console.error('[Listener] Failed to get address:', err);
            // Se falhou, abrir modal para reautenticar
            setShowAuthFlow(true);
          });
      } else {
        // Usuário não autenticado, abrir modal
        setShowAuthFlow(true);
      }
    };
    window.addEventListener('openDynamicAuth', handler);
    return () => window.removeEventListener('openDynamicAuth', handler);
  }, [setShowAuthFlow, primaryWallet, user]);

  // Escuta: requestDynamicLogout → faz logout
  useEffect(() => {
    const handler = () => {
      console.log('[Listener] requestDynamicLogout received');
      handleLogOut();
    };
    window.addEventListener('requestDynamicLogout', handler);
    return () => window.removeEventListener('requestDynamicLogout', handler);
  }, [handleLogOut]);

  // Escuta: checkDynamicStatus → responde se está autenticado
  useEffect(() => {
    const handler = () => {
      const isAuthenticated = !!(primaryWallet && user);
      console.log('[Listener] Dynamic status check:', {
        isAuthenticated,
        hasWallet: !!primaryWallet,
        hasUser: !!user,
      });

      window.dispatchEvent(
        new CustomEvent('dynamicStatusResponse', {
          detail: { isAuthenticated },
        }),
      );
    };
    window.addEventListener('checkDynamicStatus', handler);
    return () => window.removeEventListener('checkDynamicStatus', handler);
  }, [primaryWallet, user]);

  // Escuta: requestSignMessage → assina mensagem
  useEffect(() => {
    if (!primaryWallet) return;

    const handler = async (e: Event) => {
      const customEvent = e as CustomEvent;
      console.log('[Listener] Sign message request:', customEvent);
      const { message } = customEvent.detail;

      console.log('[Listener] Sign message request:', message);

      try {
        // Assina mensagem via wallet
        const signature = await primaryWallet.signMessage(message);
        console.log('[Listener] Message signed:', signature);

        window.dispatchEvent(
          new CustomEvent('dynamicMessageSigned', {
            detail: { signature },
          }),
        );
      } catch (err) {
        console.error('[Listener] Failed to sign message:', err);
        window.dispatchEvent(
          new CustomEvent('dynamicMessageSigned', {
            detail: { error: err },
          }),
        );
      }
    };

    window.addEventListener('requestSignMessage', handler);
    return () => window.removeEventListener('requestSignMessage', handler);
  }, [primaryWallet]);

  return null;
}
