import {
  SCHEMA_VERSION,
  type ContributionBatch,
  type ContributionReport,
} from '../contracts/types';
import type { ContributionProvider } from './provider';

const REQUEST_TIMEOUT_MS = 10_000;

export class HttpSyncProvider implements ContributionProvider {
  private endpoint = '';
  private consentGiven = false;

  setEndpoint(url: string): void {
    this.endpoint = url;
  }

  async setConsent(enabled: boolean): Promise<void> {
    this.consentGiven = enabled;
  }

  async enqueueReport(_report: ContributionReport): Promise<void> {
    // Reports are batched locally by ContributionQueueService.
    // Individual enqueues are a no-op at the network level.
  }

  async flushQueue(queue: ContributionReport[]): Promise<{ synced: number }> {
    if (!this.consentGiven || queue.length === 0 || !this.endpoint) {
      return { synced: 0 };
    }

    const batch: ContributionBatch = {
      batchId:
        globalThis.crypto?.randomUUID?.() ||
        `batch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`,
      installationId: queue[0].installationId,
      createdAt: Date.now(),
      clientSchemaVersion: SCHEMA_VERSION,
      reports: queue,
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
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
