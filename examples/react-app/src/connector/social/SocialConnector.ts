import {
  type ConnectorConfig,
  EthereumWalletAdapter,
  type Maybe,
  PredicateConnector,
  type PredicateVersion,
  type PredicateWalletAdapter,
  type ProviderDictionary,
} from '@fuels/connectors';
import { type ConnectorMetadata, Provider } from 'fuels';
import { SOCIAL_ICON, STORAGE_KEYS } from './constants';

type SocialConnectorConfig = ConnectorConfig & {
  gatewayUrl?: string;
  fuelProvider?: Provider;
  chainId?: number;
  popupConfig?: { width: number; height: number };
};

export class SocialConnector extends PredicateConnector {
  name = 'Social Login';
  metadata: ConnectorMetadata = {
    image: SOCIAL_ICON,
    install: {
      action: 'Connect',
      description: 'Login with Google/Email via Dynamic',
      link: '',
    },
  };

  private config: SocialConnectorConfig = {};
  private fuelProvider?: Provider;
  private evmAddress: string | null = null;
  private authEventHandler?: (e: Event) => void;
  private authFlowCloseHandler?: (e: Event) => void;

  constructor(config: SocialConnectorConfig = {}) {
    super();
    this.config = config;

    // Restaurar endereço do localStorage ao inicializar
    if (typeof window !== 'undefined') {
      const savedAddress = localStorage.getItem(STORAGE_KEYS.EVM_ADDRESS);
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
      const savedAddress = localStorage.getItem(STORAGE_KEYS.EVM_ADDRESS);
      if (savedAddress) {
        this.evmAddress = savedAddress;
        console.log(
          '[SocialConnector] Auto-reconnected from storage:',
          savedAddress,
        );
      }
    }

    // Não lança erro aqui - deixa o fluxo de connect() acontecer naturalmente
  }

  protected async _require_connection(): Promise<void> {
    return this.requireConnection();
  }

  protected async _connect(): Promise<boolean> {
    try {
      // Verificar se já tem conexão restaurada do localStorage
      if (this.evmAddress) {
        console.log(
          '[SocialConnector] Already have address, skipping auth:',
          this.evmAddress,
        );
        // Verificar se Dynamic ainda está autenticado
        const isDynamicReady = await this.checkDynamicStatus();

        if (isDynamicReady) {
          console.log(
            '[SocialConnector] Dynamic session still active, reusing connection',
          );
          return true;
        }
        console.log('[SocialConnector] Dynamic session expired, need new auth');
        // Limpar estado antigo
        this.evmAddress = null;
        if (typeof window !== 'undefined') {
          localStorage.removeItem(STORAGE_KEYS.EVM_ADDRESS);
        }
      }

      console.log('SocialConnector: requesting Dynamic auth...');

      return new Promise((resolve, reject) => {
        this.authEventHandler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const { address } = customEvent.detail;

          console.log('Dynamic wallet ready, EVM address:', address);
          this.cleanupAuthListener();

          // Emite conta para predicate connector
          this.evmAddress = address;
          if (!this.evmAddress) {
            reject(new Error('No EVM address received'));
            return;
          }

          // Persistir endereço no localStorage
          if (typeof window !== 'undefined') {
            localStorage.setItem(STORAGE_KEYS.EVM_ADDRESS, this.evmAddress);
            console.log('[SocialConnector] Saved address to storage');
          }

          resolve(true);
        };

        this.authFlowCloseHandler = () => {
          this.cleanupAuthListener();
          reject(new Error('Connection declined!'));
        };

        window.addEventListener('dynamicWalletReady', this.authEventHandler);
        window.addEventListener(
          'dynamicAuthFlowClose',
          this.authFlowCloseHandler,
        );

        // Dispara evento para abrir modal da Dynamic
        window.dispatchEvent(new CustomEvent('openDynamicAuth'));
      });
    } catch (error) {
      console.error('SocialConnector._connect error:', error);
      this.cleanupAuthListener();
      throw error;
    }
  }

  private async checkDynamicStatus(): Promise<boolean> {
    return new Promise((resolve) => {
      const handler = (e: Event) => {
        window.removeEventListener('dynamicStatusResponse', handler);
        const customEvent = e as CustomEvent;
        const isReady = customEvent.detail?.isAuthenticated || false;
        resolve(isReady);
      };

      window.addEventListener('dynamicStatusResponse', handler);
      window.dispatchEvent(new CustomEvent('checkDynamicStatus'));
    });
  }

  protected async _disconnect(): Promise<boolean> {
    console.log('SocialConnector: disconnecting...');

    window.dispatchEvent(new CustomEvent('requestDynamicLogout'));

    // Limpar TODAS as chaves com prefixo SOCIAL_ do localStorage
    this.clearAllStorageKeys();

    this.cleanupAuthListener();
    this.evmAddress = null;
    this.emitAccountChange(null, false);
    return true;
  }

  /**
   * Limpa todas as chaves do localStorage que tenham relação com este connector
   */
  private clearAllStorageKeys(): void {
    if (typeof window === 'undefined') return;

    Object.values(STORAGE_KEYS).forEach((key) => {
      window.localStorage.removeItem(key);
    });

    console.log('[SocialConnector] Cleared social storage keys with prefix');
  }

  private cleanupAuthListener() {
    if (this.authEventHandler) {
      window.removeEventListener('dynamicWalletReady', this.authEventHandler);
      this.authEventHandler = undefined;
    }

    if (this.authFlowCloseHandler) {
      window.removeEventListener(
        'dynamicAuthFlowClose',
        this.authFlowCloseHandler,
      );
      this.authFlowCloseHandler = undefined;
    }
  }

  protected async _sign_message(message: string): Promise<string> {
    // Dispara evento para Dynamic assinar mensagem
    return new Promise((resolve, reject) => {
      console.log('SocialConnector: signing message via Dynamic...', message);

      const handler = (e: Event) => {
        const customEvent = e as CustomEvent;
        const { signature, error } = customEvent.detail;

        window.removeEventListener('dynamicMessageSigned', handler);

        if (error) {
          console.log('[SOCIAL CONNECTOR]: ', error);
          const errorMessage = (error as Error).message.includes('rejected')
            ? 'User rejected the request'
            : (error as Error).message;

          reject(new Error(errorMessage));
        } else {
          resolve(signature);
        }
      };

      window.addEventListener('dynamicMessageSigned', handler);

      // Solicita assinatura via evento (mensagem exata, sem modificação)
      window.dispatchEvent(
        new CustomEvent('requestSignMessage', { detail: { message } }),
      );
    });
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
