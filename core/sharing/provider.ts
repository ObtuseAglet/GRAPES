import type { ContributionReport } from '../contracts/types';

export interface ContributionProvider {
  enqueueReport(report: ContributionReport): Promise<void>;
  flushQueue(queue: ContributionReport[]): Promise<{ synced: number }>;
  getSyncStatus(): Promise<{ available: boolean; provider: string }>;
  setConsent(enabled: boolean): Promise<void>;
}

export class MockContributionProvider implements ContributionProvider {
  async enqueueReport(_report: ContributionReport): Promise<void> {
    return;
  }

  async flushQueue(queue: ContributionReport[]): Promise<{ synced: number }> {
    return { synced: queue.length };
  }

  async getSyncStatus(): Promise<{ available: boolean; provider: string }> {
    return { available: true, provider: 'mock' };
  }

  async setConsent(_enabled: boolean): Promise<void> {
    return;
  }
}
