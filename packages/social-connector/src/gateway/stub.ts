import type { GatewayClient } from './types';

export class StubGateway implements GatewayClient {
  private code?: string;
  private token?: string;
  private address?: string;

  async initAuth(): Promise<{ authUrl: string; challenge?: string }> {
    // Simula URL de login
    this.code = crypto.randomUUID();
    return { authUrl: `/auth?code=${this.code}` };
  }

  async completeAuth(
    code: string,
  ): Promise<{ evmAddress: string; sessionToken: string }> {
    if (!this.code || code !== this.code) throw new Error('Invalid code');
    this.address = '0x000000000000000000000000000000000000dEaD';
    this.token = crypto.randomUUID();
    return { evmAddress: this.address, sessionToken: this.token };
  }

  async refreshSession(token: string): Promise<{ sessionToken: string }> {
    if (token !== this.token) throw new Error('Invalid token');
    this.token = crypto.randomUUID();
    return { sessionToken: this.token };
  }

  async disconnect(_token: string): Promise<void> {
    this.code = undefined;
    this.token = undefined;
    this.address = undefined;
  }
}
