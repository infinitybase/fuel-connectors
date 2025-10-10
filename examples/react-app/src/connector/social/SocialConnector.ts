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
import { dynamicEventRouter } from './DynamicEventRouter';

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

  protected async _require_connection(): Promise<void> {
    if (!this._get_current_evm_address()) {
      throw new Error('No connected accounts');
    }
  }

  protected async requireConnection(): Promise<void> {
    return this._require_connection();
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

  protected async _sign_message(_message: string): Promise<string> {
    throw new Error('Not implemented in example');
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
