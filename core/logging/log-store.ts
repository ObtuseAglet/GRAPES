import type { ThreatEvent } from '../contracts/types';

const MAX_LOG_ENTRIES = 500;

export class ThreatLogStore {
  private tabThreats = new Map<number, ThreatEvent[]>();

  getTabThreats(tabId: number): ThreatEvent[] {
    return this.tabThreats.get(tabId) || [];
  }

  clearTab(tabId: number): void {
    this.tabThreats.delete(tabId);
  }

  addToTab(tabId: number, event: ThreatEvent): void {
    const current = this.tabThreats.get(tabId) || [];
    const deduped = current.filter((item) => item.category !== event.category);
    deduped.push(event);
    this.tabThreats.set(tabId, deduped);
  }

  async appendPersistent(event: ThreatEvent): Promise<ThreatEvent[]> {
    const result = await browser.storage.local.get(['v2_logs']);
    const logs = (result.v2_logs as ThreatEvent[] | undefined) || [];
    logs.push(event);
    if (logs.length > MAX_LOG_ENTRIES) {
      logs.splice(0, logs.length - MAX_LOG_ENTRIES);
    }
    await browser.storage.local.set({ v2_logs: logs });
    return logs;
  }

  async getPersistent(): Promise<ThreatEvent[]> {
    const result = await browser.storage.local.get(['v2_logs']);
    return (result.v2_logs as ThreatEvent[] | undefined) || [];
  }

  async clearPersistent(): Promise<void> {
    await browser.storage.local.remove(['v2_logs']);
  }
}
