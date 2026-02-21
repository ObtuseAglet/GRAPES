import type { SharedReport } from '../contracts/types';

export interface SyncProvider {
  enqueueReport(report: SharedReport): Promise<void>;
  flushQueue(queue: SharedReport[]): Promise<{ synced: number }>;
  getSyncStatus(): Promise<{ available: boolean; provider: string }>;
  setConsent(enabled: boolean): Promise<void>;
}

export class MockSyncProvider implements SyncProvider {
  async enqueueReport(_report: SharedReport): Promise<void> {
    return;
  }

  async flushQueue(queue: SharedReport[]): Promise<{ synced: number }> {
    return { synced: queue.length };
  }

  async getSyncStatus(): Promise<{ available: boolean; provider: string }> {
    return { available: true, provider: 'mock' };
  }

  async setConsent(_enabled: boolean): Promise<void> {
    return;
  }
}
