/**
 * Per-session persona selection (ADR-002).
 *
 * - In `full` mode the persona is fixed to the normalized blend-in identity so
 *   GRAPES users converge on a single common fingerprint.
 * - In `spoof` mode the persona is randomized ONCE per browser session and
 *   reused for every request thereafter. Mid-session persona changes are
 *   themselves a fingerprint, so we deliberately stay stable.
 *
 * Persistence uses chrome.storage.session when available (cleared on browser
 * close, MV3) and falls back to chrome.storage.local otherwise.
 */

import type { ProtectionMode } from '../contracts/types';
import { type BrowserPersona, getNormalizedPersona, getPersonaById, pickPersona } from './ua-pool';

const SESSION_KEY = 'grapes:active_persona_id';

export interface SessionStorageLike {
  get(keys: string | string[]): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
  remove(keys: string | string[]): Promise<void>;
}

export interface PersonaSessionOptions {
  storage: SessionStorageLike;
  /** Optional deterministic RNG for tests. */
  rand?: () => number;
}

/**
 * Resolve the active persona for a given protection mode. Selects (and
 * persists) a new spoof persona if none is set yet for this session.
 *
 * Returns `null` when protection is `disabled` or `detection-only` — header
 * scrambling is off in those modes.
 */
export async function getOrCreateActivePersona(
  mode: ProtectionMode,
  options: PersonaSessionOptions,
): Promise<BrowserPersona | null> {
  if (mode === 'disabled' || mode === 'detection-only') return null;
  if (mode === 'full') return getNormalizedPersona();

  // mode === 'spoof'
  const stored = await options.storage.get(SESSION_KEY);
  const existingId = stored[SESSION_KEY];
  if (typeof existingId === 'string') {
    const found = getPersonaById(existingId);
    if (found) return found;
  }

  const next = pickPersona(options.rand);
  await options.storage.set({ [SESSION_KEY]: next.id });
  return next;
}

/**
 * Force-clear the persisted spoof-mode persona — e.g. when the user toggles
 * out of and back into spoof mode and wants a fresh identity.
 */
export async function clearActivePersona(storage: SessionStorageLike): Promise<void> {
  await storage.remove(SESSION_KEY);
}
