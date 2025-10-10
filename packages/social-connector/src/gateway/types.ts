export interface GatewayClient {
  initAuth(): Promise<{ authUrl: string; challenge?: string }>;
  completeAuth(
    code: string,
  ): Promise<{ evmAddress: string; sessionToken: string }>;
  refreshSession(token: string): Promise<{ sessionToken: string }>;
  disconnect(token: string): Promise<void>;
}
