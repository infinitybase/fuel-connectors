/**
 * Funções puras que re-emitem eventos da Dynamic como eventos customizados do window
 * Permite que SocialConnector (classe não-React) escute eventos da Dynamic (React callbacks)
 */

function dispatch(eventName: string, detail: unknown) {
  console.log('[EventRouter] dispatch:', eventName, detail);
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

// Eventos chamados pelos callbacks do DynamicContextProvider
export const dynamicEventRouter = {
  onAuthSuccess(args: unknown) {
    console.log('[EventRouter] onAuthSuccess:', args);
    dispatch('dynamicAuthSuccess', args);
  },

  onEmbeddedWalletCreated(wallet: unknown) {
    console.log('[EventRouter] onEmbeddedWalletCreated:', wallet);
    dispatch('dynamicEmbeddedWalletCreated', wallet);
  },

  onWalletAdded(wallet: unknown) {
    console.log('[EventRouter] onWalletAdded:', wallet);
    dispatch('dynamicWalletAdded', wallet);
  },

  onAuthFlowOpen() {
    console.log('[EventRouter] onAuthFlowOpen');
    dispatch('dynamicAuthFlowOpen', null);
  },

  onAuthFlowClose() {
    console.log('[EventRouter] onAuthFlowClose');
    dispatch('dynamicAuthFlowClose', null);
  },

  onLogout(args: unknown) {
    console.log('[EventRouter] onLogout:', args);
    dispatch('dynamicLogout', args);
  },

  // Eventos que o SocialConnector pode disparar
  requestOpenAuth() {
    console.log('[EventRouter] requestOpenAuth');
    dispatch('openDynamicAuth', null);
  },

  requestLogout() {
    console.log('[EventRouter] requestLogout');
    dispatch('requestDynamicLogout', null);
  },
};
