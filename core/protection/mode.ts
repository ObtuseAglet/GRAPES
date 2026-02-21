import type { ProtectionMode } from '../contracts/types';

export function isProtectionEnabled(mode: ProtectionMode): boolean {
  return mode === 'full';
}

export function shouldDetect(mode: ProtectionMode): boolean {
  return mode !== 'disabled';
}
