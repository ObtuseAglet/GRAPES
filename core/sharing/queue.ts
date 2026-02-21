import type { SharedReport } from '../contracts/types';
import type { SyncProvider } from './provider';

const KEY = 'v2_sharing_state';
const RETRY_MS = 30_000;

interface QueueState {
  consent: boolean;
  queue: SharedReport[];
  retryCount: number;
  nextRetryAt: number | null;
  lastSyncAt: number | null;
}

const DEFAULT_QUEUE_STATE: QueueState = {
  consent: false,
  queue: [],
  retryCount: 0,
  nextRetryAt: null,
  lastSyncAt: null,
};

export class SharingQueueService {
  constructor(private provider: SyncProvider) {}

  async getState(): Promise<QueueState> {
    const result = await browser.storage.local.get([KEY]);
    return (result[KEY] as QueueState | undefined) || DEFAULT_QUEUE_STATE;
  }

  private async setState(state: QueueState): Promise<void> {
    await browser.storage.local.set({ [KEY]: state });
  }

  async setConsent(enabled: boolean): Promise<QueueState> {
    const state = await this.getState();
    const next = { ...state, consent: enabled };
    await this.provider.setConsent(enabled);
    await this.setState(next);
    return next;
  }

  async enqueue(report: SharedReport): Promise<QueueState> {
    const state = await this.getState();
    if (!state.consent) return state;
    const next = { ...state, queue: [...state.queue, report] };
    await this.provider.enqueueReport(report);
    await this.setState(next);
    return next;
  }

  async flushNow(): Promise<QueueState> {
    const state = await this.getState();
    if (!state.consent || state.queue.length === 0) return state;
    if (state.nextRetryAt && state.nextRetryAt > Date.now()) return state;

    try {
      await this.provider.flushQueue(state.queue);
      const next: QueueState = {
        consent: state.consent,
        queue: [],
        retryCount: 0,
        nextRetryAt: null,
        lastSyncAt: Date.now(),
      };
      await this.setState(next);
      return next;
    } catch {
      const next: QueueState = {
        ...state,
        retryCount: state.retryCount + 1,
        nextRetryAt: Date.now() + RETRY_MS,
      };
      await this.setState(next);
      return next;
    }
  }
}
