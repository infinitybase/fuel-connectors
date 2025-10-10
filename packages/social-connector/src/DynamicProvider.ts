import type { DynamicSession } from './types';

/**
 * Thin wrapper to abstract Dynamic SDK/API usage.
 * Replace internals later with real Dynamic SDK calls via gateway.
 */
export class DynamicProvider {
  private session: DynamicSession | null = null;

  constructor(private readonly gatewayBaseURL: string) {}

  async initAuth(): Promise<{ authUrl: string }> {
    const res = await fetch(`${this.gatewayBaseURL}/init-auth`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Failed to init auth');
    return res.json();
  }

  async completeAuth(code: string): Promise<DynamicSession> {
    const res = await fetch(`${this.gatewayBaseURL}/complete-auth`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    if (!res.ok) throw new Error('Failed to complete auth');
    const session: DynamicSession = await res.json();
    this.session = session;
    return session;
  }

  getSession(): DynamicSession | null {
    return this.session;
  }

  async refreshSession(): Promise<DynamicSession> {
    if (!this.session) throw new Error('No session');
    const res = await fetch(`${this.gatewayBaseURL}/refresh-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: this.session.sessionToken }),
    });
    if (!res.ok) throw new Error('Failed to refresh session');
    const next = (await res.json()) as { sessionToken: string };
    this.session = { ...this.session, sessionToken: next.sessionToken };
    return this.session;
  }

  async disconnect(): Promise<void> {
    if (!this.session) return;
    try {
      await fetch(`${this.gatewayBaseURL}/disconnect`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: this.session.sessionToken }),
      });
    } finally {
      this.session = null;
    }
  }
}
