/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, beforeEach } from 'vitest';
import { isGrapesNode, isGrapesMutation, filterMutations, GRAPES_MARKERS } from './node-detection';

describe('GRAPES_MARKERS', () => {
  it('contains expected marker strings', () => {
    expect(GRAPES_MARKERS).toContain('grapes-');
    expect(GRAPES_MARKERS).toContain('grapes-custom-styles');
    expect(GRAPES_MARKERS).toContain('data-grapes');
  });
});

describe('isGrapesNode', () => {
  it('returns false for null', () => {
    expect(isGrapesNode(null)).toBe(false);
  });

  it('returns false for a plain element', () => {
    const el = document.createElement('div');
    el.id = 'my-widget';
    expect(isGrapesNode(el)).toBe(false);
  });

  it('detects element by id containing "grapes-"', () => {
    const el = document.createElement('style');
    el.id = 'grapes-custom-styles';
    expect(isGrapesNode(el)).toBe(true);
  });

  it('detects element by id containing "grapes-" prefix', () => {
    const el = document.createElement('div');
    el.id = 'grapes-test-panel';
    expect(isGrapesNode(el)).toBe(true);
  });

  it('detects element by className containing a marker', () => {
    const el = document.createElement('div');
    el.className = 'foo grapes-notification bar';
    expect(isGrapesNode(el)).toBe(true);
  });

  it('detects element by data-grapes attribute', () => {
    const el = document.createElement('div');
    el.setAttribute('data-grapes-injected', 'true');
    expect(isGrapesNode(el)).toBe(true);
  });

  it('detects element by data-grapes attribute with any value', () => {
    const el = document.createElement('span');
    el.setAttribute('data-grapes', '');
    expect(isGrapesNode(el)).toBe(true);
  });

  it('returns false for text nodes', () => {
    const text = document.createTextNode('hello');
    expect(isGrapesNode(text)).toBe(false);
  });

  it('detects child of a grapes element via parent traversal', () => {
    const parent = document.createElement('div');
    parent.id = 'grapes-panel';
    const child = document.createElement('span');
    parent.appendChild(child);
    expect(isGrapesNode(child)).toBe(true);
  });

  it('detects deeply nested child of a grapes element', () => {
    const root = document.createElement('div');
    root.id = 'grapes-overlay';
    const mid = document.createElement('div');
    root.appendChild(mid);
    const deep = document.createElement('button');
    mid.appendChild(deep);
    expect(isGrapesNode(deep)).toBe(true);
  });

  it('returns false for elements with "grape" (no trailing s-)', () => {
    const el = document.createElement('div');
    el.id = 'grape-juice';
    expect(isGrapesNode(el)).toBe(false);
  });

  it('returns false for element with unrelated data attributes', () => {
    const el = document.createElement('div');
    el.setAttribute('data-testid', 'foo');
    expect(isGrapesNode(el)).toBe(false);
  });
});

describe('isGrapesMutation', () => {
  function makeMutation(overrides: Partial<MutationRecord>): MutationRecord {
    return {
      type: 'childList',
      target: document.body,
      addedNodes: [] as unknown as NodeList,
      removedNodes: [] as unknown as NodeList,
      previousSibling: null,
      nextSibling: null,
      attributeName: null,
      attributeNamespace: null,
      oldValue: null,
      ...overrides,
    } as MutationRecord;
  }

  it('returns true when target is a grapes node', () => {
    const target = document.createElement('div');
    target.id = 'grapes-notification';
    const mutation = makeMutation({ target });
    expect(isGrapesMutation(mutation)).toBe(true);
  });

  it('returns true when an added node is a grapes node', () => {
    const added = document.createElement('style');
    added.id = 'grapes-custom-styles';
    const nodeList = [added] as unknown as NodeList;
    (nodeList as unknown as { length: number }).length = 1;
    // Use Array.from-compatible structure
    const mutation = makeMutation({
      target: document.body,
      addedNodes: {
        length: 1,
        0: added,
        item: (i: number) => (i === 0 ? added : null),
        [Symbol.iterator]: function* () {
          yield added;
        },
        forEach: (cb: (node: Node) => void) => cb(added),
      } as unknown as NodeList,
    });
    expect(isGrapesMutation(mutation)).toBe(true);
  });

  it('returns true when a removed node is a grapes node', () => {
    const removed = document.createElement('div');
    removed.setAttribute('data-grapes-injected', 'true');
    const mutation = makeMutation({
      target: document.body,
      removedNodes: {
        length: 1,
        0: removed,
        item: (i: number) => (i === 0 ? removed : null),
        [Symbol.iterator]: function* () {
          yield removed;
        },
        forEach: (cb: (node: Node) => void) => cb(removed),
      } as unknown as NodeList,
    });
    expect(isGrapesMutation(mutation)).toBe(true);
  });

  it('returns true for data-grapes attribute mutation', () => {
    const mutation = makeMutation({
      type: 'attributes',
      attributeName: 'data-grapes-mode',
    });
    expect(isGrapesMutation(mutation)).toBe(true);
  });

  it('returns false for unrelated mutations', () => {
    const div = document.createElement('div');
    div.id = 'app';
    const mutation = makeMutation({
      target: div,
      addedNodes: { length: 0, item: () => null, [Symbol.iterator]: function* () {}, forEach: () => {} } as unknown as NodeList,
      removedNodes: { length: 0, item: () => null, [Symbol.iterator]: function* () {}, forEach: () => {} } as unknown as NodeList,
    });
    expect(isGrapesMutation(mutation)).toBe(false);
  });

  it('returns false for unrelated attribute mutation', () => {
    const mutation = makeMutation({
      type: 'attributes',
      attributeName: 'class',
    });
    expect(isGrapesMutation(mutation)).toBe(false);
  });
});

describe('filterMutations', () => {
  function makeMutation(targetId: string): MutationRecord {
    const target = document.createElement('div');
    target.id = targetId;
    return {
      type: 'childList',
      target,
      addedNodes: { length: 0, item: () => null, [Symbol.iterator]: function* () {}, forEach: () => {} } as unknown as NodeList,
      removedNodes: { length: 0, item: () => null, [Symbol.iterator]: function* () {}, forEach: () => {} } as unknown as NodeList,
      previousSibling: null,
      nextSibling: null,
      attributeName: null,
      attributeNamespace: null,
      oldValue: null,
    } as MutationRecord;
  }

  it('filters out grapes mutations when protection is enabled', () => {
    const mutations = [
      makeMutation('app'),
      makeMutation('grapes-notification'),
      makeMutation('sidebar'),
    ];
    const result = filterMutations(mutations, true);
    expect(result).toHaveLength(2);
    expect((result[0].target as Element).id).toBe('app');
    expect((result[1].target as Element).id).toBe('sidebar');
  });

  it('returns all mutations when protection is disabled', () => {
    const mutations = [
      makeMutation('app'),
      makeMutation('grapes-notification'),
      makeMutation('sidebar'),
    ];
    const result = filterMutations(mutations, false);
    expect(result).toHaveLength(3);
  });

  it('returns empty array when all mutations are grapes-related', () => {
    const mutations = [
      makeMutation('grapes-panel'),
      makeMutation('grapes-custom-styles'),
    ];
    const result = filterMutations(mutations, true);
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty input', () => {
    expect(filterMutations([], true)).toHaveLength(0);
    expect(filterMutations([], false)).toHaveLength(0);
  });
});
