import type { SharedReport } from '../contracts/types';
import type { SyncProvider } from './provider';

const REQUEST_TIMEOUT_MS = 10_000;

export class HttpSyncProvider implements SyncProvider {
  private endpoint = '';
  private consentGiven = false;

  setEndpoint(url: string): void {
    this.endpoint = url;
  }

  async setConsent(enabled: boolean): Promise<void> {
    this.consentGiven = enabled;
  }

  async enqueueReport(_report: SharedReport): Promise<void> {
    // Reports are batched locally by SharingQueueService.
    // Individual enqueues are a no-op at the network level.
  }

  async flushQueue(queue: SharedReport[]): Promise<{ synced: number }> {
    if (!this.consentGiven || queue.length === 0 || !this.endpoint) {
      return { synced: 0 };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reports: queue }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}`);
      }

      return { synced: queue.length };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async getSyncStatus(): Promise<{ available: boolean; provider: string }> {
    return { available: this.consentGiven, provider: 'http' };
  }
}
