/**
 * Suspicious observation detection.
 *
 * Detects when a page tries to observe high-level DOM nodes with options
 * that would reveal extension-injected elements.
 */

/**
 * Return `true` when the observation target + options look like they are
 * trying to detect extension modifications.
 */
export function isSuspiciousObservation(
  target: Node,
  options: MutationObserverInit | undefined,
  doc: Document,
): boolean {
  if (!options) return false;

  const isHighLevelTarget =
    target === doc || target === doc.documentElement || target === doc.head || target === doc.body;

  const wouldCatchModifications =
    options.childList === true ||
    options.subtree === true ||
    (options.attributes === true && !options.attributeFilter);

  return isHighLevelTarget && wouldCatchModifications;
}
