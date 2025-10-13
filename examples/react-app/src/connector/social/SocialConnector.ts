import {
  type ConnectorConfig,
  EthereumWalletAdapter,
  type Maybe,
  PredicateConnector,
  type PredicateVersion,
  type PredicateWalletAdapter,
  type ProviderDictionary,
} from '@fuels/connectors';
import { Address, type ConnectorMetadata, Provider } from 'fuels';

const STORAGE_KEY = 'social-connector-evm-address';

type SocialConnectorConfig = ConnectorConfig & {
  gatewayUrl?: string;
  fuelProvider?: Provider;
  chainId?: number;
  popupConfig?: { width: number; height: number };
};

export class SocialConnector extends PredicateConnector {
  name = 'Social Connector (Local)';
  metadata: ConnectorMetadata = {
    image: {
      light: '',
      dark: '',
    },
    install: {
      action: 'Connect',
      description: 'Login with Google/Email via Dynamic (local stub)',
      link: '',
    },
  };

  private config: SocialConnectorConfig = {};
  private fuelProvider?: Provider;
  private evmAddress: string | null = null;
  private authEventHandler?: (e: Event) => void;

  constructor(config: SocialConnectorConfig = {}) {
    super();
    this.config = config;

    // Restaurar endereço do localStorage ao inicializar
    if (typeof window !== 'undefined') {
      const savedAddress = localStorage.getItem(STORAGE_KEY);
      if (savedAddress) {
        this.evmAddress = savedAddress;
        console.log(
          '[SocialConnector] Restored address from storage:',
          savedAddress,
        );
      }
    }
  }

  protected async _config_providers(_config: ConnectorConfig) {
    this.config = { ...this.config, ...(_config as SocialConnectorConfig) };
    if (!this.fuelProvider) {
      this.fuelProvider =
        this.config.fuelProvider ??
        new Provider('https://mainnet.fuel.network');
    }
  }

  protected async _get_providers(): Promise<ProviderDictionary> {
    if (!this.fuelProvider) {
      await this._config_providers(this.config);
    }
    if (!this.fuelProvider) throw new Error('Fuel provider not configured');
    return { fuelProvider: this.fuelProvider };
  }

  protected _get_current_evm_address(): string | null {
    return this.evmAddress;
  }

  protected async requireConnection(): Promise<void> {
    // Tentar restaurar conexão do localStorage se não houver endereço
    if (!this.evmAddress && typeof window !== 'undefined') {
      const savedAddress = localStorage.getItem(STORAGE_KEY);
      if (savedAddress) {
        this.evmAddress = savedAddress;
        console.log(
          '[SocialConnector] Auto-reconnected from storage:',
          savedAddress,
        );

        // Emitir evento de reconexão
        const b256 = new Address(this.evmAddress).toB256();
        this.emitAccountChange(b256, true);
      }
    }

    // Não lança erro aqui - deixa o fluxo de connect() acontecer naturalmente
  }

  protected async _require_connection(): Promise<void> {
    return this.requireConnection();
  }

  protected async _connect(): Promise<boolean> {
    try {
      console.log('SocialConnector: requesting Dynamic auth...');

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.cleanupAuthListener();
          reject(new Error('Auth timeout after 60s'));
        }, 60_000);

        this.authEventHandler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const { address } = customEvent.detail;

          console.log('Dynamic wallet ready, EVM address:', address);
          clearTimeout(timeout);
          this.cleanupAuthListener();

          // Emite conta para predicate connector
          this.evmAddress = address;
          if (!this.evmAddress) {
            reject(new Error('No EVM address received'));
            return;
          }

          // Persistir endereço no localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEY, this.evmAddress);
            console.log('[SocialConnector] Saved address to storage');
          }

          const b256 = new Address(this.evmAddress).toB256();
          this.emitAccountChange(b256, true);

          resolve(true);
        };

        window.addEventListener('dynamicWalletReady', this.authEventHandler);

        // Dispara evento para abrir modal da Dynamic
        window.dispatchEvent(new CustomEvent('openDynamicAuth'));
      });
    } catch (error) {
      console.error('SocialConnector._connect error:', error);
      this.cleanupAuthListener();
      throw error;
    }
  }

  protected async _disconnect(): Promise<boolean> {
    console.log('SocialConnector: disconnecting...');

    // Dispara evento para Dynamic fazer logout
    window.dispatchEvent(new CustomEvent('dynamicLogout'));

    // Limpar localStorage
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
      console.log('[SocialConnector] Cleared storage on disconnect');
    }

    this.cleanupAuthListener();
    this.evmAddress = null;
    this.emitAccountChange(null, false);
    return true;
  }

  private cleanupAuthListener() {
    if (this.authEventHandler) {
      window.removeEventListener('dynamicWalletReady', this.authEventHandler);
      this.authEventHandler = undefined;
    }
  }

  protected async _sign_message(message: string): Promise<string> {
    try {
      console.log('SocialConnector: signing message via Dynamic...', message);

      // default message to sign: (32ff475e93eb7be2253269bcb88ac637cd31f1585e46e00c94ec8eda9e765d03)
      // 0x35663564313332373165336465366139353666623133343432616464356339613862303136633962626234363239653831613539303333386135376136383166

      // Dispara evento para Dynamic assinar mensagem
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          window.removeEventListener('dynamicMessageSigned', handler);
          reject(new Error('Sign message timeout'));
        }, 60_000);

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const { signature } = customEvent.detail;

          clearTimeout(timeout);
          window.removeEventListener('dynamicMessageSigned', handler);
          resolve(signature);
        };

        window.addEventListener('dynamicMessageSigned', handler);

        // Solicita assinatura via evento (mensagem exata, sem modificação)
        window.dispatchEvent(
          new CustomEvent('requestSignMessage', {
            detail: {
              message,
            },
          }),
        );
      });
    } catch (error) {
      console.error(
        'SocialConnector: signing message via Dynamic error:',
        error,
      );
      throw error;
    }
  }

  protected getWalletAdapter(): PredicateWalletAdapter {
    return new EthereumWalletAdapter();
  }

  protected getPredicateVersions(): Record<string, PredicateVersion> {
    return {};
  }

  protected async getAccountAddress(): Promise<Maybe<string>> {
    return this._get_current_evm_address();
  }

  protected async walletAccounts(): Promise<Array<string>> {
    const acc = this._get_current_evm_address();
    return acc ? [acc] : [];
  }

  async signMessageCustomCurve(_message: string) {
    return Promise.reject({ curve: 'secp256k1', signature: '' });
  }
}
