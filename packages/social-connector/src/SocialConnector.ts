import {
  PredicateConnector as BakoPredicateConnector,
  type ConnectorConfig,
  EthereumWalletAdapter,
  type Maybe,
  type PredicateVersion,
  type PredicateWalletAdapter,
  type ProviderDictionary,
} from '@fuel-connectors/bako-predicate-connector';
import { Address, type ConnectorMetadata, Provider } from 'fuels';

import { DAppWindow } from './DAppWindow';
import { DynamicProvider } from './DynamicProvider';
import { DEFAULT_POPUP } from './constants';
import type { SocialConnectorConfig } from './types';

export class SocialConnector extends BakoPredicateConnector {
  name = 'Social Connector';
  metadata: ConnectorMetadata = {
    image: {
      light: '',
      dark: '',
    },
    install: {
      action: 'Connect',
      description: 'Login with Google/Email via Dynamic',
      link: '',
    },
  };

  private config: SocialConnectorConfig;
  private popup?: DAppWindow;
  private dynamic: DynamicProvider;
  private fuelProvider?: Provider;

  constructor(config: SocialConnectorConfig) {
    super();
    this.config = config;
    this.dynamic = new DynamicProvider(config.gatewayUrl ?? '/api');
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
    return this.dynamic.getSession()?.evmAddress ?? null;
  }

  protected async _sign_message(_message: string): Promise<string> {
    // Placeholder: delegated to Dynamic wallet via gateway when available
    // For now, throw to indicate not implemented in stub
    throw new Error('sign_message not implemented for SocialConnector stub');
  }

  protected async _require_connection(): Promise<void> {
    if (!this._get_current_evm_address()) {
      throw new Error('No connected accounts');
    }
  }
  public async requireConnection(): Promise<void> {
    return this._require_connection();
  }

  protected async _connect(): Promise<boolean> {
    const sessionId = crypto.randomUUID();
    const appUrl = this.config.gatewayUrl ?? '/auth';
    const { authUrl } = await this.dynamic.initAuth();

    this.popup = new DAppWindow({
      appUrl: authUrl.startsWith('http') ? authUrl : appUrl,
      height: this.config.popupConfig?.height ?? DEFAULT_POPUP.height,
      width: this.config.popupConfig?.width ?? DEFAULT_POPUP.width,
      sessionId,
    });

    await new Promise<void>((resolve, reject) => {
      this.popup?.open('/', reject);
      // In a real flow, listen to postMessage or server-sent events
      setTimeout(() => resolve(), 1200);
    });

    // Complete auth (in real flow, code comes from redirect or message)
    const completed = await this.dynamic.completeAuth(sessionId);

    const evmAddress = completed.evmAddress;
    const b256 = new Address(evmAddress).toB256();
    this.emitAccountChange(b256, true);

    this.popup?.close();
    return true;
  }

  protected async _disconnect(): Promise<boolean> {
    await this.dynamic.disconnect();
    this.popup?.close();
    return true;
  }

  async signMessageCustomCurve(_message: string) {
    return Promise.reject({ curve: 'secp256k1', signature: '' });
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
}
