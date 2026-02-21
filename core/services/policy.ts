import type { StorageStateV2 } from '../storage/schema';
import type { ProtectionMode } from '../contracts/types';
import { extractBaseDomain } from './domain';

export interface PolicyStatus {
  mode: ProtectionMode;
  protectionEnabled: boolean;
  siteOverride: 'enabled' | 'disabled' | 'default' | null;
}

export function getProtectionStatusForDomain(domain: string, state: StorageStateV2): PolicyStatus {
  const baseDomain = extractBaseDomain(domain);
  const siteOverride = state.sitePolicy[baseDomain] || null;

  if (siteOverride === 'enabled') {
    return { mode: 'full', protectionEnabled: true, siteOverride };
  }
  if (siteOverride === 'disabled') {
    return { mode: 'disabled', protectionEnabled: false, siteOverride };
  }

  const mode = state.coreSettings.mode;
  return {
    mode,
    protectionEnabled: mode === 'full',
    siteOverride,
  };
}
