/**
 * GRAPES node detection utilities.
 *
 * Pure functions for identifying whether a DOM node belongs to the
 * GRAPES extension, and for filtering mutations / node-lists accordingly.
 */

/** Marker strings that identify GRAPES-injected elements. */
export const GRAPES_MARKERS = ['grapes-custom-styles', 'grapes-', 'data-grapes'] as const;

/**
 * Return `true` when the given node (or any ancestor) is a GRAPES element.
 */
export function isGrapesNode(node: Node | null): boolean {
  if (!node) return false;

  if (node.nodeType === Node.ELEMENT_NODE) {
    const element = node as Element;

    // Check ID
    if (element.id && GRAPES_MARKERS.some((marker) => element.id.includes(marker))) {
      return true;
    }

    // Check class names
    if (element.className && typeof element.className === 'string') {
      if (GRAPES_MARKERS.some((marker) => element.className.includes(marker))) {
        return true;
      }
    }

    // Check data attributes
    for (const attr of Array.from(element.attributes || [])) {
      if (attr.name.startsWith('data-grapes')) {
        return true;
      }
    }
  }

  // Check parent nodes
  if (node.parentNode) {
    return isGrapesNode(node.parentNode);
  }

  return false;
}

/**
 * Return `true` when the mutation record touches any GRAPES node.
 */
export function isGrapesMutation(mutation: MutationRecord): boolean {
  if (isGrapesNode(mutation.target)) {
    return true;
  }

  for (const node of Array.from(mutation.addedNodes)) {
    if (isGrapesNode(node)) {
      return true;
    }
  }

  for (const node of Array.from(mutation.removedNodes)) {
    if (isGrapesNode(node)) {
      return true;
    }
  }

  if (mutation.type === 'attributes') {
    if (mutation.attributeName?.startsWith('data-grapes')) {
      return true;
    }
  }

  return false;
}

/**
 * Remove GRAPES-related mutations from a list (when protection is enabled).
 */
export function filterMutations(
  mutations: MutationRecord[],
  protectionEnabled: boolean,
): MutationRecord[] {
  if (!protectionEnabled) {
    return mutations;
  }
  return mutations.filter((mutation) => !isGrapesMutation(mutation));
}
