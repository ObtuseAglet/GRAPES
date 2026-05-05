import { beforeEach, describe, expect, it } from 'vitest';
import {
  clearActivePersona,
  getOrCreateActivePersona,
  type SessionStorageLike,
} from './persona-session';
import { getNormalizedPersona, NORMALIZED_PERSONA_ID, PERSONAS } from './ua-pool';

function createStubStorage(): SessionStorageLike & { _store: Map<string, unknown> } {
  const store = new Map<string, unknown>();
  return {
    _store: store,
    async get(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      const out: Record<string, unknown> = {};
      for (const k of list) if (store.has(k)) out[k] = store.get(k);
      return out;
    },
    async set(items) {
      for (const [k, v] of Object.entries(items)) store.set(k, v);
    },
    async remove(keys) {
      const list = Array.isArray(keys) ? keys : [keys];
      for (const k of list) store.delete(k);
    },
  };
}

describe('getOrCreateActivePersona', () => {
  let storage: ReturnType<typeof createStubStorage>;

  beforeEach(() => {
    storage = createStubStorage();
  });

  it('returns null in disabled mode', async () => {
    const p = await getOrCreateActivePersona('disabled', { storage });
    expect(p).toBeNull();
  });

  it('returns null in detection-only mode', async () => {
    const p = await getOrCreateActivePersona('detection-only', { storage });
    expect(p).toBeNull();
  });

  it('returns the normalized persona in full mode without persisting', async () => {
    const p = await getOrCreateActivePersona('full', { storage });
    expect(p?.id).toBe(NORMALIZED_PERSONA_ID);
    expect(storage._store.size).toBe(0);
  });

  it('selects and persists a random persona in spoof mode', async () => {
    const rand = () => 0; // forces first persona
    const p = await getOrCreateActivePersona('spoof', { storage, rand });
    expect(p).toBe(PERSONAS[0]);
    expect(storage._store.size).toBe(1);
  });

  it('reuses the persisted persona on subsequent spoof-mode calls', async () => {
    const first = await getOrCreateActivePersona('spoof', { storage, rand: () => 0 });
    // A different RNG would normally pick a different persona; the persisted
    // id should win and we should get the same persona back.
    const second = await getOrCreateActivePersona('spoof', { storage, rand: () => 0.99 });
    expect(second).toBe(first);
  });

  it('falls through to a fresh selection if persisted id is no longer in the pool', async () => {
    storage._store.set('grapes:active_persona_id', 'persona-that-was-removed');
    const p = await getOrCreateActivePersona('spoof', { storage, rand: () => 0 });
    expect(p).toBe(PERSONAS[0]);
  });
});

describe('clearActivePersona', () => {
  it('removes the persisted id', async () => {
    const storage = createStubStorage();
    storage._store.set('grapes:active_persona_id', 'something');
    await clearActivePersona(storage);
    expect(storage._store.size).toBe(0);
  });
});

describe('full mode persona shape', () => {
  it('returns a Chromium persona so Sec-CH-UA headers are present', () => {
    const p = getNormalizedPersona();
    expect(p.secChUa).toBeTruthy();
    expect(p.userAgentData).toBeTruthy();
  });
});
