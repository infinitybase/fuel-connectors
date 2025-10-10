import type { Provider } from 'fuels';

export type SocialProvider = 'google' | 'email';

export interface SocialConnectorConfig {
  dynamicEnvironmentId?: string;
  gatewayUrl?: string;
  fuelProvider?: Provider;
  chainId?: number;
  socialProviders?: SocialProvider[];
  popupConfig?: { width: number; height: number };
  [key: string]: unknown;
}

export interface DynamicSession {
  evmAddress: string;
  sessionToken: string;
}

export interface TxResultLike {
  hash: string;
  status?: string;
}
