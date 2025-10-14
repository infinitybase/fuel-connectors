import {
  type ConnectorConfig,
  EthereumWalletAdapter,
  type Maybe,
  PredicateConnector,
  type PredicateVersion,
  type PredicateWalletAdapter,
  type ProviderDictionary,
} from "@fuels/connectors";
import { Address, type ConnectorMetadata, Provider } from "fuels";

// Prefixo para todas as chaves do localStorage deste connector
const STORAGE_PREFIX = "SOCIAL_";

// Chaves de armazenamento com prefixo
const STORAGE_KEYS = {
  EVM_ADDRESS: `${STORAGE_PREFIX}evm_address`,
  DYNAMIC_SESSION: `${STORAGE_PREFIX}dynamic_session`,
  LAST_CONNECTION: `${STORAGE_PREFIX}last_connection`,
} as const;

type SocialConnectorConfig = ConnectorConfig & {
  gatewayUrl?: string;
  fuelProvider?: Provider;
  chainId?: number;
  popupConfig?: { width: number; height: number };
};

export class SocialConnector extends PredicateConnector {
  name = "Social Connector (Local)";
  metadata: ConnectorMetadata = {
    image: {
      light: "",
      dark: "",
    },
    install: {
      action: "Connect",
      description: "Login with Google/Email via Dynamic (local stub)",
      link: "",
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
    if (typeof window !== "undefined") {
      const savedAddress = localStorage.getItem(STORAGE_KEYS.EVM_ADDRESS);
      if (savedAddress) {
        this.evmAddress = savedAddress;
        console.log(
          "[SocialConnector] Restored address from storage:",
          savedAddress
        );
      }
    }
  }

  protected async _config_providers(_config: ConnectorConfig) {
    this.config = { ...this.config, ...(_config as SocialConnectorConfig) };
    if (!this.fuelProvider) {
      this.fuelProvider =
        this.config.fuelProvider ??
        new Provider("https://mainnet.fuel.network");
    }
  }

  protected async _get_providers(): Promise<ProviderDictionary> {
    if (!this.fuelProvider) {
      await this._config_providers(this.config);
    }
    if (!this.fuelProvider) throw new Error("Fuel provider not configured");
    return { fuelProvider: this.fuelProvider };
  }

  protected _get_current_evm_address(): string | null {
    return this.evmAddress;
  }

  protected async requireConnection(): Promise<void> {
    // Tentar restaurar conexão do localStorage se não houver endereço
    if (!this.evmAddress && typeof window !== "undefined") {
      const savedAddress = localStorage.getItem(STORAGE_KEYS.EVM_ADDRESS);
      if (savedAddress) {
        this.evmAddress = savedAddress;
        console.log(
          "[SocialConnector] Auto-reconnected from storage:",
          savedAddress
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
      // Verificar se já tem conexão restaurada do localStorage
      if (this.evmAddress) {
        console.log(
          "[SocialConnector] Already have address, skipping auth:",
          this.evmAddress
        );
        // Verificar se Dynamic ainda está autenticado
        const isDynamicReady = await this.checkDynamicStatus();

        if (isDynamicReady) {
          console.log(
            "[SocialConnector] Dynamic session still active, reusing connection"
          );
          return true;
        }
        console.log("[SocialConnector] Dynamic session expired, need new auth");
        // Limpar estado antigo
        this.evmAddress = null;
        if (typeof window !== "undefined") {
          localStorage.removeItem(STORAGE_KEYS.EVM_ADDRESS);
        }
      }

      console.log("SocialConnector: requesting Dynamic auth...");

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          this.cleanupAuthListener();
          reject(new Error("Auth timeout after 60s"));
        }, 60_000);

        this.authEventHandler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const { address } = customEvent.detail;

          console.log("Dynamic wallet ready, EVM address:", address);
          clearTimeout(timeout);
          this.cleanupAuthListener();

          // Emite conta para predicate connector
          this.evmAddress = address;
          if (!this.evmAddress) {
            reject(new Error("No EVM address received"));
            return;
          }

          // Persistir endereço no localStorage
          if (typeof window !== "undefined") {
            localStorage.setItem(STORAGE_KEYS.EVM_ADDRESS, this.evmAddress);
            console.log("[SocialConnector] Saved address to storage");
          }

          const b256 = new Address(this.evmAddress).toB256();
          this.emitAccountChange(b256, true);

          resolve(true);
        };

        window.addEventListener("dynamicWalletReady", this.authEventHandler);

        // Dispara evento para abrir modal da Dynamic
        window.dispatchEvent(new CustomEvent("openDynamicAuth"));
      });
    } catch (error) {
      console.error("SocialConnector._connect error:", error);
      this.cleanupAuthListener();
      throw error;
    }
  }

  private async checkDynamicStatus(): Promise<boolean> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        window.removeEventListener("dynamicStatusResponse", handler);
        resolve(false);
      }, 2000); // 2s timeout

      const handler = (e: Event) => {
        clearTimeout(timeout);
        window.removeEventListener("dynamicStatusResponse", handler);
        const customEvent = e as CustomEvent;
        const isReady = customEvent.detail?.isAuthenticated || false;
        resolve(isReady);
      };

      window.addEventListener("dynamicStatusResponse", handler);
      window.dispatchEvent(new CustomEvent("checkDynamicStatus"));
    });
  }

  protected async _disconnect(): Promise<boolean> {
    console.log("SocialConnector: disconnecting...");

    // Dispara evento para Dynamic fazer logout
    window.dispatchEvent(new CustomEvent("dynamicLogout"));

    // Limpar TODAS as chaves com prefixo SOCIAL_ do localStorage
    this.clearAllStorageKeys();

    this.cleanupAuthListener();
    this.evmAddress = null;
    this.emitAccountChange(null, false);
    return true;
  }

  /**
   * Limpa todas as chaves do localStorage que começam com o prefixo SOCIAL_
   */
  private clearAllStorageKeys(): void {
    if (typeof window === "undefined") return;

    const keysToRemove: string[] = [];

    // Iterar por todas as chaves do localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }

    // Remover todas as chaves encontradas
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      console.log(`[SocialConnector] Removed storage key: ${key}`);
    });

    console.log(
      `[SocialConnector] Cleared ${keysToRemove.length} storage keys with prefix ${STORAGE_PREFIX}`
    );
  }

  private cleanupAuthListener() {
    if (this.authEventHandler) {
      window.removeEventListener("dynamicWalletReady", this.authEventHandler);
      this.authEventHandler = undefined;
    }
  }

  protected async _sign_message(message: string): Promise<string> {
    try {
      console.log("SocialConnector: signing message via Dynamic...", message);
      // Dispara evento para Dynamic assinar mensagem
      return new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          window.removeEventListener("dynamicMessageSigned", handler);
          reject(new Error("Sign message timeout"));
        }, 60_000);

        const handler = (e: Event) => {
          const customEvent = e as CustomEvent;
          const { signature } = customEvent.detail;

          clearTimeout(timeout);
          window.removeEventListener("dynamicMessageSigned", handler);
          resolve(signature);
        };

        window.addEventListener("dynamicMessageSigned", handler);

        // Solicita assinatura via evento (mensagem exata, sem modificação)
        window.dispatchEvent(
          new CustomEvent("requestSignMessage", {
            detail: {
              message,
            },
          })
        );
      });
    } catch (error) {
      console.error(
        "SocialConnector: signing message via Dynamic error:",
        error
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
    return Promise.reject({ curve: "secp256k1", signature: "" });
  }
}
