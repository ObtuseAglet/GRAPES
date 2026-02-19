/**
 * GRAPES Stealth Injector
 *
 * This script runs in the MAIN world (page context) BEFORE any page scripts.
 * It intercepts MutationObserver to hide our extension's DOM modifications.
 *
 * Think of it like a pre-recorded loop on a security camera - the website
 * sees the "original" DOM state, not our live modifications.
 *
 * Protection can be enabled/disabled via custom events from the content script.
 * Detection always runs regardless of protection status.
 */

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'MAIN',
  registration: 'manifest',

  main() {
    // Protection mode flag - starts as true, content.ts will disable if needed
    // This allows protection to be active by default for the brief moment
    // before content.ts can check storage and potentially disable it
    let protectionEnabled = true;

    // Listen for protection mode changes from content.ts (ISOLATED world)
    window.addEventListener('grapes-set-protection-mode', (event: Event) => {
      const customEvent = event as CustomEvent;
      try {
        const { enabled } = JSON.parse(customEvent.detail);
        protectionEnabled = enabled;
        console.log(`[GRAPES Stealth] Protection mode set to: ${enabled ? 'enabled' : 'disabled'}`);
      } catch (e) {
        console.error('[GRAPES Stealth] Error parsing protection mode event:', e);
      }
    });

    // Marker attributes/IDs that identify our extension's modifications
    const GRAPES_MARKERS = ['grapes-custom-styles', 'grapes-', 'data-grapes'];

    // Store original MutationObserver
    const OriginalMutationObserver = window.MutationObserver;
    const originalObserve = OriginalMutationObserver.prototype.observe;
    const originalDisconnect = OriginalMutationObserver.prototype.disconnect;
    const originalTakeRecords = OriginalMutationObserver.prototype.takeRecords;

    // Track if we've already alerted about suspicious observation
    let hasAlertedSuspiciousObservation = false;
    let hasAlertedSessionReplay = false;

    // Known session replay tool signatures
    const SESSION_REPLAY_SIGNATURES = {
      hotjar: {
        globals: ['hj', 'hjSiteSettings', '_hjSettings'],
        scripts: ['static.hotjar.com', 'script.hotjar.com'],
        cookies: ['_hj'],
      },
      fullstory: {
        globals: ['FS', '_fs_host', '_fs_script', '_fs_org'],
        scripts: ['fullstory.com/s/fs.js', 'edge.fullstory.com'],
        cookies: ['fs_uid'],
      },
      logrocket: {
        globals: ['LogRocket', '_lr_loaded'],
        scripts: ['cdn.logrocket.io', 'cdn.lr-ingest.io'],
        cookies: ['_lr_'],
      },
      mouseflow: {
        globals: ['mouseflow', '_mfq'],
        scripts: ['cdn.mouseflow.com', 'mouseflow.com/projects'],
        cookies: ['mf_'],
      },
      clarity: {
        globals: ['clarity'],
        scripts: ['clarity.ms/tag'],
        cookies: ['_clck', '_clsk'],
      },
      heap: {
        globals: ['heap'],
        scripts: ['cdn.heapanalytics.com', 'heapanalytics.com'],
        cookies: ['_hp2_'],
      },
      smartlook: {
        globals: ['smartlook'],
        scripts: ['rec.smartlook.com', 'assets.smartlook.com'],
        cookies: ['SL_'],
      },
      inspectlet: {
        globals: ['__insp'],
        scripts: ['cdn.inspectlet.com'],
        cookies: ['__insp'],
      },
      lucky_orange: {
        globals: ['__lo_site_id', 'LOQ'],
        scripts: ['d10lpsik1i8c69.cloudfront.net', 'luckyorange.com'],
        cookies: ['_lo'],
      },
      crazyegg: {
        globals: ['CE2'],
        scripts: ['script.crazyegg.com', 'dnn506yrbagrg.cloudfront.net'],
        cookies: ['_ceir'],
      },
    };

    /**
     * Detect session replay tools
     */
    function detectSessionReplayTools(): string[] {
      const detected: string[] = [];

      for (const [tool, signatures] of Object.entries(SESSION_REPLAY_SIGNATURES)) {
        // Check for global variables
        for (const global of signatures.globals) {
          if ((window as any)[global] !== undefined) {
            detected.push(tool);
            break;
          }
        }

        if (detected.includes(tool)) continue;

        // Check for script tags
        const scripts = document.querySelectorAll('script[src]');
        for (const script of Array.from(scripts)) {
          const src = script.getAttribute('src') || '';
          if (signatures.scripts.some((sig) => src.includes(sig))) {
            detected.push(tool);
            break;
          }
        }
      }

      return detected;
    }

    /**
     * Notify about detected session replay tools
     */
    function notifySessionReplayDetected(tools: string[]) {
      if (hasAlertedSessionReplay || tools.length === 0) return;
      hasAlertedSessionReplay = true;

      window.dispatchEvent(
        new CustomEvent('grapes-session-replay-detected', {
          detail: JSON.stringify({
            tools,
            url: window.location.hostname,
          }),
        }),
      );
    }

    // Check for session replay tools after page loads
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
          const tools = detectSessionReplayTools();
          if (tools.length > 0) {
            notifySessionReplayDetected(tools);
          }
        }, 2000); // Delay to allow replay scripts to load
      });
    } else {
      setTimeout(() => {
        const tools = detectSessionReplayTools();
        if (tools.length > 0) {
          notifySessionReplayDetected(tools);
        }
      }, 2000);
    }

    /**
     * Check if observation target and options indicate potential modification detection
     * This detects when sites try to watch for DOM changes that could reveal extensions
     */
    function isSuspiciousObservation(target: Node, options?: MutationObserverInit): boolean {
      if (!options) return false;

      // Check if observing high-level DOM nodes
      const isHighLevelTarget =
        target === document ||
        target === document.documentElement ||
        target === document.head ||
        target === document.body;

      // Check if options would catch extension modifications
      const wouldCatchModifications =
        options.childList === true || // Watching for added/removed elements
        options.subtree === true || // Watching all descendants
        (options.attributes === true && !options.attributeFilter); // Watching all attributes

      return isHighLevelTarget && wouldCatchModifications;
    }

    /**
     * Dispatch event to notify content script about suspicious observation
     */
    function notifySuspiciousObservation(target: Node, options?: MutationObserverInit) {
      if (hasAlertedSuspiciousObservation) return;
      hasAlertedSuspiciousObservation = true;

      // Dispatch custom event that the isolated content script can listen for
      const detail = {
        targetType:
          target === document
            ? 'document'
            : target === document.documentElement
              ? 'documentElement'
              : target === document.head
                ? 'head'
                : target === document.body
                  ? 'body'
                  : 'other',
        options: options
          ? {
              childList: options.childList,
              subtree: options.subtree,
              attributes: options.attributes,
            }
          : null,
        url: window.location.hostname,
      };

      window.dispatchEvent(
        new CustomEvent('grapes-suspicious-observation', {
          detail: JSON.stringify(detail),
        }),
      );
    }

    /**
     * Check if a node is related to GRAPES extension
     */
    function isGrapesNode(node: Node | null): boolean {
      if (!node) return false;

      // Check if it's an element
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
     * Check if a mutation record is related to GRAPES
     */
    function isGrapesMutation(mutation: MutationRecord): boolean {
      // Check the target
      if (isGrapesNode(mutation.target)) {
        return true;
      }

      // Check added nodes
      for (const node of Array.from(mutation.addedNodes)) {
        if (isGrapesNode(node)) {
          return true;
        }
      }

      // Check removed nodes
      for (const node of Array.from(mutation.removedNodes)) {
        if (isGrapesNode(node)) {
          return true;
        }
      }

      // Check attribute changes on grapes elements
      if (mutation.type === 'attributes') {
        if (mutation.attributeName?.startsWith('data-grapes')) {
          return true;
        }
      }

      return false;
    }

    /**
     * Filter mutations to remove GRAPES-related changes
     * Only filters when protection is enabled
     */
    function filterMutations(mutations: MutationRecord[]): MutationRecord[] {
      if (!protectionEnabled) {
        return mutations; // Return all mutations when protection is disabled
      }
      return mutations.filter((mutation) => !isGrapesMutation(mutation));
    }

    /**
     * Proxied MutationObserver that hides GRAPES modifications
     * Detection always runs, but filtering only happens when protection is enabled
     */
    class StealthMutationObserver {
      private realObserver: MutationObserver;
      private userCallback: MutationCallback;
      private isObserving: boolean = false;

      constructor(callback: MutationCallback) {
        this.userCallback = callback;

        // Create real observer with filtered callback
        this.realObserver = new OriginalMutationObserver((mutations, observer) => {
          const filteredMutations = filterMutations(mutations);

          // Only call user callback if there are non-GRAPES mutations
          // (or all mutations if protection is disabled)
          if (filteredMutations.length > 0) {
            this.userCallback(filteredMutations, observer);
          }
        });
      }

      observe(target: Node, options?: MutationObserverInit): void {
        // Detection always runs - notify about suspicious observation patterns
        if (isSuspiciousObservation(target, options)) {
          notifySuspiciousObservation(target, options);
        }

        this.isObserving = true;
        originalObserve.call(this.realObserver, target, options);
      }

      disconnect(): void {
        this.isObserving = false;
        originalDisconnect.call(this.realObserver);
      }

      takeRecords(): MutationRecord[] {
        const records = originalTakeRecords.call(this.realObserver);
        return filterMutations(records);
      }
    }

    // Replace global MutationObserver with our stealth version
    Object.defineProperty(window, 'MutationObserver', {
      value: StealthMutationObserver,
      writable: false,
      configurable: false,
    });

    // Also handle WebKitMutationObserver for older browsers
    if ('WebKitMutationObserver' in window) {
      Object.defineProperty(window, 'WebKitMutationObserver', {
        value: StealthMutationObserver,
        writable: false,
        configurable: false,
      });
    }

    // Intercept querySelectorAll and related methods to hide GRAPES elements
    const originalQuerySelectorAll = Document.prototype.querySelectorAll;
    const originalQuerySelector = Document.prototype.querySelector;
    const originalGetElementById = Document.prototype.getElementById;
    const originalGetElementsByClassName = Document.prototype.getElementsByClassName;
    const originalGetElementsByTagName = Document.prototype.getElementsByTagName;

    // Element-level query methods
    const originalElementQuerySelectorAll = Element.prototype.querySelectorAll;
    const originalElementQuerySelector = Element.prototype.querySelector;
    const originalElementGetElementsByClassName = Element.prototype.getElementsByClassName;
    const originalElementGetElementsByTagName = Element.prototype.getElementsByTagName;

    /**
     * Filter NodeList/HTMLCollection to remove GRAPES elements
     * Only filters when protection is enabled
     */
    function filterNodeList<T extends Node>(nodes: NodeListOf<T> | HTMLCollectionOf<Element>): T[] {
      if (!protectionEnabled) {
        return Array.from(nodes) as T[]; // Return all nodes when protection is disabled
      }
      return Array.from(nodes).filter((node) => !isGrapesNode(node)) as T[];
    }

    /**
     * Check if a node should be hidden (only when protection is enabled)
     */
    function shouldHideNode(node: Node | null): boolean {
      if (!protectionEnabled) return false;
      return isGrapesNode(node);
    }

    /**
     * Create a fake NodeList from an array
     */
    function createFakeNodeList<T extends Node>(nodes: T[]): NodeListOf<T> {
      const fakeList = {
        length: nodes.length,
        item: (index: number) => nodes[index] || null,
        forEach: (callback: (value: T, key: number, parent: NodeListOf<T>) => void) => {
          nodes.forEach((node, i) => callback(node, i, fakeList as NodeListOf<T>));
        },
        entries: () => nodes.entries(),
        keys: () => nodes.keys(),
        values: () => nodes.values(),
        [Symbol.iterator]: () => nodes[Symbol.iterator](),
      };

      // Add numeric indices
      nodes.forEach((node, i) => {
        (fakeList as any)[i] = node;
      });

      return fakeList as NodeListOf<T>;
    }

    // Override Document methods
    Document.prototype.querySelectorAll = function (selectors: string) {
      const results = originalQuerySelectorAll.call(this, selectors);
      // Filter out GRAPES elements when protection is enabled
      return createFakeNodeList(filterNodeList(results));
    };

    Document.prototype.querySelector = function (selectors: string) {
      const result = originalQuerySelector.call(this, selectors);
      if (result && shouldHideNode(result)) {
        return null;
      }
      return result;
    };

    Document.prototype.getElementById = function (elementId: string) {
      const result = originalGetElementById.call(this, elementId);
      // Filter GRAPES elements when protection is enabled
      if (result && shouldHideNode(result)) {
        return null;
      }
      return result;
    };

    // Override Element methods
    Element.prototype.querySelectorAll = function (selectors: string) {
      const results = originalElementQuerySelectorAll.call(this, selectors);
      // Always filter out GRAPES elements
      return createFakeNodeList(filterNodeList(results));
    };

    Element.prototype.querySelector = function (selectors: string) {
      const result = originalElementQuerySelector.call(this, selectors);
      if (result && shouldHideNode(result)) {
        return null;
      }
      return result;
    };

    // Intercept childNodes and children getters to hide GRAPES elements
    const originalChildNodesGetter = Object.getOwnPropertyDescriptor(
      Node.prototype,
      'childNodes',
    )?.get;
    const originalChildrenGetter = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'children',
    )?.get;

    if (originalChildNodesGetter) {
      Object.defineProperty(Node.prototype, 'childNodes', {
        get: function () {
          const nodes = originalChildNodesGetter.call(this);
          // Only filter for head/body to avoid performance issues
          if (
            this === document.head ||
            this === document.body ||
            this === document.documentElement
          ) {
            return createFakeNodeList(filterNodeList(nodes));
          }
          return nodes;
        },
        configurable: true,
      });
    }

    if (originalChildrenGetter) {
      Object.defineProperty(Element.prototype, 'children', {
        get: function () {
          const children = originalChildrenGetter.call(this);
          // Only filter for head/body to avoid performance issues
          if (
            this === document.head ||
            this === document.body ||
            this === document.documentElement
          ) {
            // filterNodeList already checks protectionEnabled
            return createFakeNodeList(
              filterNodeList(children as unknown as HTMLCollectionOf<Element>) as Element[],
            ) as unknown as HTMLCollection;
          }
          return children;
        },
        configurable: true,
      });
    }

    // Intercept innerHTML/outerHTML getters to hide GRAPES elements
    const originalInnerHTMLDescriptor = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'innerHTML',
    );
    const originalInnerHTMLGetter = originalInnerHTMLDescriptor?.get;
    const originalInnerHTMLSetter = originalInnerHTMLDescriptor?.set;

    if (originalInnerHTMLGetter && originalInnerHTMLSetter) {
      Object.defineProperty(Element.prototype, 'innerHTML', {
        get: function () {
          const html = originalInnerHTMLGetter.call(this);
          // Only clean for head to hide our style injections when protection is enabled
          if (protectionEnabled && this === document.head) {
            // Remove GRAPES style tags from the HTML string
            return html.replace(/<style[^>]*id="grapes[^"]*"[^>]*>[\s\S]*?<\/style>/gi, '');
          }
          return html;
        },
        set: function (value) {
          // Use the original setter, not this.innerHTML (which would recurse!)
          originalInnerHTMLSetter.call(this, value);
        },
        configurable: true,
        enumerable: true,
      });
    }

    // =========================================================================
    // SESSION REPLAY TOOL PROTECTION
    // Additional interceptions for tools like Hotjar, FullStory, LogRocket
    // =========================================================================

    // Intercept outerHTML - used by replay tools for DOM serialization
    const originalOuterHTMLDescriptor = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'outerHTML',
    );
    const originalOuterHTMLGetter = originalOuterHTMLDescriptor?.get;

    if (originalOuterHTMLGetter) {
      Object.defineProperty(Element.prototype, 'outerHTML', {
        get: function () {
          // Only filter when protection is enabled
          if (!protectionEnabled) {
            return originalOuterHTMLGetter.call(this);
          }

          // If this element is a GRAPES element, return empty string
          if (isGrapesNode(this)) {
            return '';
          }

          // For head/body/html, use DOM-based filtering (more reliable than regex)
          if (
            this === document.head ||
            this === document.body ||
            this === document.documentElement
          ) {
            // Clone the element
            const clone = this.cloneNode(true) as Element;

            // Find and remove all GRAPES elements from the clone
            // IMPORTANT: Use the ORIGINAL querySelectorAll to find grapes elements
            // (the intercepted version would filter them out!)
            const grapesElements = originalElementQuerySelectorAll.call(
              clone,
              '[id^="grapes"], [data-grapes-injected]',
            );
            grapesElements.forEach((el) => el.remove());

            // Also check for script/style tags we injected by walking all elements
            const allElements = originalElementQuerySelectorAll.call(clone, '*');
            allElements.forEach((el) => {
              if (isGrapesNode(el)) {
                el.remove();
              }
            });

            return originalOuterHTMLGetter.call(clone);
          }

          return originalOuterHTMLGetter.call(this);
        },
        set: originalOuterHTMLDescriptor?.set,
        configurable: true,
        enumerable: true,
      });
    }

    // Intercept getElementsByTagName - filter GRAPES elements
    Document.prototype.getElementsByTagName = function (tagName: string) {
      const results = originalGetElementsByTagName.call(this, tagName);
      return createFakeNodeList(filterNodeList(results)) as any;
    };

    Element.prototype.getElementsByTagName = function (tagName: string) {
      const results = originalElementGetElementsByTagName.call(this, tagName);
      return createFakeNodeList(filterNodeList(results)) as any;
    };

    // Intercept getElementsByClassName - filter GRAPES elements
    Document.prototype.getElementsByClassName = function (classNames: string) {
      const results = originalGetElementsByClassName.call(this, classNames);
      return createFakeNodeList(filterNodeList(results)) as any;
    };

    Element.prototype.getElementsByClassName = function (classNames: string) {
      const results = originalElementGetElementsByClassName.call(this, classNames);
      return createFakeNodeList(filterNodeList(results)) as any;
    };

    // Intercept TreeWalker - used by replay tools for efficient DOM traversal
    const OriginalTreeWalker = window.TreeWalker;
    const originalCreateTreeWalker = Document.prototype.createTreeWalker;

    Document.prototype.createTreeWalker = function (
      root: Node,
      whatToShow?: number,
      filter?: NodeFilter | null,
    ): TreeWalker {
      // If protection is disabled, use original behavior
      if (!protectionEnabled) {
        return originalCreateTreeWalker.call(this, root, whatToShow, filter);
      }

      // Wrap the filter to also exclude GRAPES nodes
      const wrappedFilter: NodeFilter = {
        acceptNode: (node: Node) => {
          // First check if it's a GRAPES node
          if (isGrapesNode(node)) {
            return NodeFilter.FILTER_REJECT;
          }
          // Then apply the original filter if provided
          if (filter) {
            if (typeof filter === 'function') {
              return (filter as (node: Node) => number)(node);
            } else if (filter.acceptNode) {
              return filter.acceptNode(node);
            }
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      };

      return originalCreateTreeWalker.call(this, root, whatToShow, wrappedFilter);
    };

    // Intercept NodeIterator - similar to TreeWalker
    const originalCreateNodeIterator = Document.prototype.createNodeIterator;

    Document.prototype.createNodeIterator = function (
      root: Node,
      whatToShow?: number,
      filter?: NodeFilter | null,
    ): NodeIterator {
      // If protection is disabled, use original behavior
      if (!protectionEnabled) {
        return originalCreateNodeIterator.call(this, root, whatToShow, filter);
      }

      const wrappedFilter: NodeFilter = {
        acceptNode: (node: Node) => {
          if (isGrapesNode(node)) {
            return NodeFilter.FILTER_REJECT;
          }
          if (filter) {
            if (typeof filter === 'function') {
              return (filter as (node: Node) => number)(node);
            } else if (filter.acceptNode) {
              return filter.acceptNode(node);
            }
          }
          return NodeFilter.FILTER_ACCEPT;
        },
      };

      return originalCreateNodeIterator.call(this, root, whatToShow, wrappedFilter);
    };

    // Intercept cloneNode - used by replay tools to snapshot DOM
    const originalCloneNode = Node.prototype.cloneNode;

    Node.prototype.cloneNode = function (deep?: boolean): Node {
      const clone = originalCloneNode.call(this, deep);

      // Only filter when protection is enabled
      if (!protectionEnabled) {
        return clone;
      }

      // If deep clone, remove GRAPES elements from the clone
      if (deep && clone.nodeType === Node.ELEMENT_NODE) {
        const cloneEl = clone as Element;
        // Remove elements with grapes IDs
        const grapesElements = cloneEl.querySelectorAll('[id*="grapes"], [data-grapes-injected]');
        grapesElements.forEach((el) => el.remove());

        // Also check the root element itself
        if (isGrapesNode(cloneEl)) {
          // Return an empty fragment instead
          return document.createDocumentFragment();
        }
      }

      return clone;
    };

    // Intercept Element.matches - prevent detection via selector matching
    const originalMatches = Element.prototype.matches;

    Element.prototype.matches = function (selectors: string): boolean {
      // Only protect when enabled
      if (protectionEnabled && isGrapesNode(this)) {
        // GRAPES elements should appear to not match any selector
        // that could identify them as extension elements
        if (selectors.includes('grapes') || selectors.includes('[data-grapes')) {
          return false;
        }
      }
      return originalMatches.call(this, selectors);
    };

    // Intercept Element.closest - prevent finding GRAPES ancestors
    const originalClosest = Element.prototype.closest;

    Element.prototype.closest = function (selectors: string): Element | null {
      const result = originalClosest.call(this, selectors);
      if (protectionEnabled && result && isGrapesNode(result)) {
        return null;
      }
      return result;
    };

    // Intercept getComputedStyle - hide GRAPES-related custom properties
    const originalGetComputedStyle = window.getComputedStyle;

    window.getComputedStyle = (elt: Element, pseudoElt?: string | null): CSSStyleDeclaration => {
      const styles = originalGetComputedStyle.call(window, elt, pseudoElt);
      // Note: We don't modify the styles themselves, just ensure
      // getComputedStyle on GRAPES elements doesn't cause issues
      return styles;
    };

    // Intercept document.all - legacy API but still used by some tools
    const originalDocumentAll = Object.getOwnPropertyDescriptor(Document.prototype, 'all')?.get;
    if (originalDocumentAll) {
      Object.defineProperty(Document.prototype, 'all', {
        get: function () {
          const all = originalDocumentAll.call(this);
          if (!protectionEnabled) {
            return all;
          }
          // Convert to array and filter, return array-like object
          const filtered = Array.from(all).filter((el) => !isGrapesNode(el));
          return createFakeNodeList(filtered as Element[]) as any;
        },
        configurable: true,
      });
    }

    // Intercept firstChild/lastChild/nextSibling/previousSibling for head/body
    const originalFirstChildGetter = Object.getOwnPropertyDescriptor(
      Node.prototype,
      'firstChild',
    )?.get;
    const originalLastChildGetter = Object.getOwnPropertyDescriptor(
      Node.prototype,
      'lastChild',
    )?.get;
    const originalNextSiblingGetter = Object.getOwnPropertyDescriptor(
      Node.prototype,
      'nextSibling',
    )?.get;
    const originalPreviousSiblingGetter = Object.getOwnPropertyDescriptor(
      Node.prototype,
      'previousSibling',
    )?.get;

    if (originalFirstChildGetter) {
      Object.defineProperty(Node.prototype, 'firstChild', {
        get: function () {
          let child = originalFirstChildGetter.call(this);
          // Skip GRAPES nodes when getting first child of head/body (only if protection enabled)
          if (protectionEnabled && (this === document.head || this === document.body)) {
            while (child && isGrapesNode(child)) {
              child = originalNextSiblingGetter?.call(child);
            }
          }
          return child;
        },
        configurable: true,
      });
    }

    if (originalLastChildGetter) {
      Object.defineProperty(Node.prototype, 'lastChild', {
        get: function () {
          let child = originalLastChildGetter.call(this);
          if (protectionEnabled && (this === document.head || this === document.body)) {
            while (child && isGrapesNode(child)) {
              child = originalPreviousSiblingGetter?.call(child);
            }
          }
          return child;
        },
        configurable: true,
      });
    }

    // Intercept firstElementChild/lastElementChild
    const originalFirstElementChildGetter = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'firstElementChild',
    )?.get;
    const originalLastElementChildGetter = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'lastElementChild',
    )?.get;
    const originalNextElementSiblingGetter = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'nextElementSibling',
    )?.get;
    const originalPreviousElementSiblingGetter = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'previousElementSibling',
    )?.get;

    if (originalFirstElementChildGetter && originalNextElementSiblingGetter) {
      Object.defineProperty(Element.prototype, 'firstElementChild', {
        get: function () {
          let child = originalFirstElementChildGetter.call(this);
          if (
            protectionEnabled &&
            (this === document.head || this === document.body || this === document.documentElement)
          ) {
            while (child && isGrapesNode(child)) {
              child = originalNextElementSiblingGetter.call(child);
            }
          }
          return child;
        },
        configurable: true,
      });
    }

    if (originalLastElementChildGetter && originalPreviousElementSiblingGetter) {
      Object.defineProperty(Element.prototype, 'lastElementChild', {
        get: function () {
          let child = originalLastElementChildGetter.call(this);
          if (
            protectionEnabled &&
            (this === document.head || this === document.body || this === document.documentElement)
          ) {
            while (child && isGrapesNode(child)) {
              child = originalPreviousElementSiblingGetter.call(child);
            }
          }
          return child;
        },
        configurable: true,
      });
    }

    // Intercept childElementCount
    const originalChildElementCountGetter = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'childElementCount',
    )?.get;

    if (originalChildElementCountGetter && originalChildrenGetter) {
      Object.defineProperty(Element.prototype, 'childElementCount', {
        get: function () {
          if (
            protectionEnabled &&
            (this === document.head || this === document.body || this === document.documentElement)
          ) {
            const children = originalChildrenGetter.call(this);
            return Array.from(children).filter((child) => !isGrapesNode(child)).length;
          }
          return originalChildElementCountGetter.call(this);
        },
        configurable: true,
      });
    }

    // ======================================================================
    // FINGERPRINTING PROTECTION
    // Protect against canvas and audio fingerprinting
    // ======================================================================

    let hasAlertedFingerprinting = false;
    const detectedFingerprintTypes: Set<string> = new Set();

    /**
     * Notify about fingerprinting attempts
     */
    function notifyFingerprintingDetected(type: string) {
      detectedFingerprintTypes.add(type);

      if (!hasAlertedFingerprinting) {
        hasAlertedFingerprinting = true;

        // Dispatch after a short delay to batch multiple detections
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('grapes-fingerprinting-detected', {
              detail: JSON.stringify({
                types: Array.from(detectedFingerprintTypes),
                url: window.location.hostname,
              }),
            }),
          );
        }, 100);
      }
    }

    /**
     * Add noise to canvas data for fingerprinting protection
     * This makes each canvas fingerprint unique without breaking functionality
     */
    function addCanvasNoise(data: Uint8ClampedArray): void {
      // Add very subtle noise that doesn't visually affect the canvas
      // but changes the fingerprint
      const noise = Math.floor(Math.random() * 10);
      for (let i = 0; i < Math.min(data.length, 20); i += 4) {
        // Only modify alpha channel slightly to minimize visual impact
        data[i] = (data[i] + noise) % 256;
      }
    }

    /**
     * Generate a unique but consistent noise seed per session
     */
    const sessionNoiseSeed = Math.random() * 1000;

    // CANVAS FINGERPRINTING PROTECTION

    // Intercept HTMLCanvasElement.toDataURL
    const originalToDataURL = HTMLCanvasElement.prototype.toDataURL;
    HTMLCanvasElement.prototype.toDataURL = function (type?: string, quality?: any): string {
      // Check if this looks like fingerprinting (small canvas, no visible content)
      const width = this.width;
      const height = this.height;
      const isLikelyFingerprint =
        (width <= 300 && height <= 150) ||
        (width === 220 && height === 30) || // Common fingerprint size
        (width === 16 && height === 16); // Another common size

      if (isLikelyFingerprint) {
        notifyFingerprintingDetected('canvas');

        // Add noise to the canvas data before generating URL
        const ctx = this.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, width, height);
          addCanvasNoise(imageData.data);
          ctx.putImageData(imageData, 0, 0);
        }
      }

      return originalToDataURL.call(this, type, quality);
    };

    // Intercept HTMLCanvasElement.toBlob
    const originalToBlob = HTMLCanvasElement.prototype.toBlob;
    HTMLCanvasElement.prototype.toBlob = function (
      callback: BlobCallback,
      type?: string,
      quality?: any,
    ): void {
      const width = this.width;
      const height = this.height;
      const isLikelyFingerprint = width <= 300 && height <= 150;

      if (isLikelyFingerprint) {
        notifyFingerprintingDetected('canvas');

        const ctx = this.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, width, height);
          addCanvasNoise(imageData.data);
          ctx.putImageData(imageData, 0, 0);
        }
      }

      return originalToBlob.call(this, callback, type, quality);
    };

    // Intercept CanvasRenderingContext2D.getImageData
    const originalGetImageData = CanvasRenderingContext2D.prototype.getImageData;
    CanvasRenderingContext2D.prototype.getImageData = function (
      sx: number,
      sy: number,
      sw: number,
      sh: number,
      settings?: ImageDataSettings,
    ): ImageData {
      const imageData = originalGetImageData.call(this, sx, sy, sw, sh, settings);

      // Check if this is likely fingerprinting
      const isLikelyFingerprint = sw <= 300 && sh <= 150;

      if (isLikelyFingerprint) {
        notifyFingerprintingDetected('canvas');
        addCanvasNoise(imageData.data);
      }

      return imageData;
    };

    // WEBGL FINGERPRINTING PROTECTION

    // Intercept WebGL getParameter to randomize renderer info
    const webglContexts = ['webgl', 'webgl2', 'experimental-webgl'];

    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function (
      contextId: string,
      options?: any,
    ): RenderingContext | null {
      const context = originalGetContext.call(this, contextId, options);

      if (context && webglContexts.includes(contextId)) {
        const gl = context as WebGLRenderingContext;
        const originalGetParameter = gl.getParameter.bind(gl);

        gl.getParameter = (pname: number): any => {
          // RENDERER and VENDOR are commonly used for fingerprinting
          const UNMASKED_VENDOR_WEBGL = 0x9245;
          const UNMASKED_RENDERER_WEBGL = 0x9246;

          if (pname === UNMASKED_VENDOR_WEBGL || pname === UNMASKED_RENDERER_WEBGL) {
            notifyFingerprintingDetected('webgl');
            // Return generic values instead of actual GPU info
            if (pname === UNMASKED_VENDOR_WEBGL) {
              return 'Generic Vendor';
            }
            return 'Generic Renderer';
          }

          return originalGetParameter(pname);
        };

        // Also intercept getShaderPrecisionFormat
        const originalGetShaderPrecisionFormat = gl.getShaderPrecisionFormat?.bind(gl);
        if (originalGetShaderPrecisionFormat) {
          gl.getShaderPrecisionFormat = (
            shaderType: number,
            precisionType: number,
          ): WebGLShaderPrecisionFormat | null => {
            const result = originalGetShaderPrecisionFormat(shaderType, precisionType);
            if (result) {
              notifyFingerprintingDetected('webgl');
            }
            return result;
          };
        }
      }

      return context;
    } as typeof HTMLCanvasElement.prototype.getContext;

    // AUDIO FINGERPRINTING PROTECTION

    // Intercept AudioContext to add noise to audio processing
    const OriginalAudioContext = window.AudioContext || (window as any).webkitAudioContext;
    const OriginalOfflineAudioContext =
      window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;

    if (OriginalAudioContext) {
      const audioNoiseAmount = 0.0001 * sessionNoiseSeed;

      // Create a proxy for AudioContext
      (window as any).AudioContext = (options?: AudioContextOptions) => {
        const ctx = new OriginalAudioContext(options);

        // Intercept createAnalyser
        const originalCreateAnalyser = ctx.createAnalyser.bind(ctx);
        ctx.createAnalyser = (): AnalyserNode => {
          const analyser = originalCreateAnalyser();

          // Intercept getFloatFrequencyData
          const originalGetFloatFrequencyData = analyser.getFloatFrequencyData.bind(analyser);
          analyser.getFloatFrequencyData = (array: Float32Array): void => {
            originalGetFloatFrequencyData(array);
            notifyFingerprintingDetected('audio');
            // Add subtle noise
            for (let i = 0; i < array.length; i++) {
              array[i] += audioNoiseAmount * (Math.random() - 0.5);
            }
          };

          // Intercept getByteFrequencyData
          const originalGetByteFrequencyData = analyser.getByteFrequencyData.bind(analyser);
          analyser.getByteFrequencyData = (array: Uint8Array): void => {
            originalGetByteFrequencyData(array);
            notifyFingerprintingDetected('audio');
            // Add subtle noise
            for (let i = 0; i < Math.min(array.length, 10); i++) {
              array[i] = Math.max(0, Math.min(255, array[i] + Math.floor(Math.random() * 2)));
            }
          };

          return analyser;
        };

        // Intercept createOscillator for oscillator fingerprinting
        const originalCreateOscillator = ctx.createOscillator.bind(ctx);
        ctx.createOscillator = (): OscillatorNode => {
          const oscillator = originalCreateOscillator();
          notifyFingerprintingDetected('audio');
          return oscillator;
        };

        return ctx;
      };

      // Copy static properties
      Object.setPrototypeOf((window as any).AudioContext, OriginalAudioContext);
      (window as any).AudioContext.prototype = OriginalAudioContext.prototype;
    }

    if (OriginalOfflineAudioContext) {
      // OfflineAudioContext is commonly used for fingerprinting
      (window as any).OfflineAudioContext = (
        numberOfChannels: number,
        length: number,
        sampleRate: number,
      ) => {
        notifyFingerprintingDetected('audio');

        const ctx = new OriginalOfflineAudioContext(numberOfChannels, length, sampleRate);

        // Intercept startRendering
        const originalStartRendering = ctx.startRendering.bind(ctx);
        ctx.startRendering = (): Promise<AudioBuffer> =>
          originalStartRendering().then((buffer: AudioBuffer) => {
            // Add noise to the rendered audio data
            for (let channel = 0; channel < buffer.numberOfChannels; channel++) {
              const data = buffer.getChannelData(channel);
              for (let i = 0; i < Math.min(data.length, 100); i++) {
                data[i] += 0.0001 * sessionNoiseSeed * (Math.random() - 0.5);
              }
            }
            return buffer;
          });

        return ctx;
      };

      Object.setPrototypeOf((window as any).OfflineAudioContext, OriginalOfflineAudioContext);
      (window as any).OfflineAudioContext.prototype = OriginalOfflineAudioContext.prototype;
    }

    // CLIENT RECTS FINGERPRINTING PROTECTION
    // Some sites use getBoundingClientRect for fingerprinting

    const originalGetBoundingClientRect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (): DOMRect {
      const rect = originalGetBoundingClientRect.call(this);

      // Check if this might be fingerprinting (measuring specific test elements)
      const tagName = this.tagName?.toLowerCase();
      const hasNoContent = !this.textContent?.trim();
      const isSmall = rect.width < 50 && rect.height < 50;
      const isHidden =
        (this as HTMLElement).style?.visibility === 'hidden' ||
        (this as HTMLElement).style?.opacity === '0';

      // If it looks like a fingerprinting test element, add subtle noise
      if ((hasNoContent && isSmall) || isHidden) {
        // Add very subtle noise that won't break layouts
        const noise = sessionNoiseSeed * 0.00001;
        return new DOMRect(rect.x + noise, rect.y + noise, rect.width + noise, rect.height + noise);
      }

      return rect;
    };

    // ======================================================================
    // VISIBILITY STATE TRACKING PROTECTION
    // Prevent sites from tracking when user switches tabs or minimizes
    // ======================================================================

    let hasAlertedVisibilityTracking = false;

    /**
     * Notify about visibility tracking attempts
     */
    function notifyVisibilityTracking() {
      if (hasAlertedVisibilityTracking) return;
      hasAlertedVisibilityTracking = true;

      console.log('[GRAPES] Visibility tracking detected:', { url: window.location.hostname });

      window.dispatchEvent(
        new CustomEvent('grapes-visibility-tracking-detected', {
          detail: JSON.stringify({
            url: window.location.hostname,
          }),
        }),
      );
    }

    // Intercept document.visibilityState - always report as 'visible'
    const originalVisibilityStateDescriptor = Object.getOwnPropertyDescriptor(
      Document.prototype,
      'visibilityState',
    );

    if (originalVisibilityStateDescriptor?.get) {
      Object.defineProperty(Document.prototype, 'visibilityState', {
        get: function () {
          const realState = originalVisibilityStateDescriptor.get!.call(this);
          // Only notify if they're actually checking and it would have been hidden
          if (realState === 'hidden') {
            notifyVisibilityTracking();
          }
          // Always return 'visible' to prevent tracking
          return 'visible';
        },
        configurable: true,
        enumerable: true,
      });
    }

    // Intercept document.hidden - always report as false (not hidden)
    const originalHiddenDescriptor = Object.getOwnPropertyDescriptor(Document.prototype, 'hidden');

    if (originalHiddenDescriptor?.get) {
      Object.defineProperty(Document.prototype, 'hidden', {
        get: function () {
          const realHidden = originalHiddenDescriptor.get!.call(this);
          if (realHidden) {
            notifyVisibilityTracking();
          }
          // Always return false (not hidden)
          return false;
        },
        configurable: true,
        enumerable: true,
      });
    }

    // Intercept visibilitychange event listeners
    // We'll block these events from firing when the page would have been hidden
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    const originalRemoveEventListener = EventTarget.prototype.removeEventListener;

    // Track visibility change handlers to suppress them
    const visibilityHandlers = new WeakMap<
      EventListenerOrEventListenerObject,
      EventListenerOrEventListenerObject
    >();

    EventTarget.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ): void {
      if (type === 'visibilitychange' && listener) {
        notifyVisibilityTracking();

        // Create a wrapper that only fires when becoming visible (not hidden)
        const wrapper: EventListener = function (event: Event) {
          // Only allow the event through if we're "becoming visible"
          // Since we always report visible, we just suppress all these events
          // This prevents sites from knowing you left and came back

          // Actually, let's be smarter: allow the event but with spoofed state
          // The document.visibilityState will already return 'visible'
          // So handlers will see the event but state will be 'visible'

          if (typeof listener === 'function') {
            listener.call(this, event);
          } else if (listener && typeof listener.handleEvent === 'function') {
            listener.handleEvent(event);
          }
        };

        visibilityHandlers.set(listener, wrapper);
        return originalAddEventListener.call(this, type, wrapper, options);
      }

      return originalAddEventListener.call(this, type, listener, options);
    };

    EventTarget.prototype.removeEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | EventListenerOptions,
    ): void {
      if (type === 'visibilitychange' && listener) {
        const wrapper = visibilityHandlers.get(listener);
        if (wrapper) {
          visibilityHandlers.delete(listener);
          return originalRemoveEventListener.call(this, type, wrapper, options);
        }
      }

      return originalRemoveEventListener.call(this, type, listener, options);
    };

    // Also intercept Page Visibility API via document event handlers
    const originalOnVisibilityChange = Object.getOwnPropertyDescriptor(
      Document.prototype,
      'onvisibilitychange',
    );

    if (originalOnVisibilityChange) {
      let storedHandler: ((this: Document, ev: Event) => any) | null = null;

      Object.defineProperty(Document.prototype, 'onvisibilitychange', {
        get: () => storedHandler,
        set: function (handler: ((this: Document, ev: Event) => any) | null) {
          if (handler) {
            notifyVisibilityTracking();
          }
          storedHandler = handler;
          // Set the actual handler but document.visibilityState will be spoofed
          if (originalOnVisibilityChange.set) {
            originalOnVisibilityChange.set.call(this, handler);
          }
        },
        configurable: true,
        enumerable: true,
      });
    }

    // Intercept focus and blur events on window (often used alongside visibility)
    // These can also be used to track user attention
    let hasAlertedFocusTracking = false;
    const focusTrackingThreshold = 3; // Alert after 3 focus/blur listeners
    let focusBlurListenerCount = 0;

    const originalWindowAddEventListener = window.addEventListener.bind(window);

    // Note: We already overrode EventTarget.prototype.addEventListener above,
    // but we can track focus/blur specifically here
    const checkFocusTracking = (type: string) => {
      if (type === 'focus' || type === 'blur') {
        focusBlurListenerCount++;
        if (focusBlurListenerCount >= focusTrackingThreshold && !hasAlertedFocusTracking) {
          hasAlertedFocusTracking = true;
          notifyVisibilityTracking();
        }
      }
    };

    // Wrap the addEventListener we already modified to also check for focus tracking
    const currentAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function (
      type: string,
      listener: EventListenerOrEventListenerObject | null,
      options?: boolean | AddEventListenerOptions,
    ): void {
      checkFocusTracking(type);
      return currentAddEventListener.call(this, type, listener, options);
    };

    // ======================================================================
    // TRACKING PIXEL & BEACON PROTECTION
    // Detect and block tracking pixels, beacons, and analytics requests
    // ======================================================================

    let hasAlertedTrackingPixel = false;
    const detectedTrackingTypes: Set<string> = new Set();
    let trackingCount = 0;

    // Known tracking domains and patterns
    const TRACKING_DOMAINS = [
      // Analytics
      'google-analytics.com',
      'googletagmanager.com',
      'doubleclick.net',
      'googlesyndication.com',
      'googleadservices.com',
      // Facebook
      'facebook.com/tr',
      'facebook.net',
      'fbcdn.net',
      // Twitter/X
      'analytics.twitter.com',
      't.co',
      'platform.twitter.com',
      // Microsoft/Bing
      'bat.bing.com',
      'clarity.ms',
      'browser.events.data.microsoft.com',
      // Other major trackers
      'pixel.quantserve.com',
      'quantcast.com',
      'amazon-adsystem.com',
      'assoc-amazon.com',
      'criteo.com',
      'criteo.net',
      'outbrain.com',
      'taboola.com',
      'linkedin.com/px',
      'snap.licdn.com',
      'tiktok.com/i18n/pixel',
      'analytics.tiktok.com',
      'pinterest.com/ct',
      'ct.pinterest.com',
      'segment.io',
      'segment.com',
      'mixpanel.com',
      'mxpnl.com',
      'amplitude.com',
      'hubspot.com',
      'hs-analytics.net',
      'hsforms.net',
      'intercom.io',
      'zendesk.com',
      'optimizely.com',
      'chartbeat.com',
      'scorecardresearch.com',
      'newrelic.com',
      'nr-data.net',
      'sentry.io',
      'bugsnag.com',
      'rollbar.com',
      'loggly.com',
      'sumologic.com',
    ];

    // Patterns that indicate tracking pixels
    const TRACKING_PATTERNS = [
      /\/pixel\??/i,
      /\/beacon\??/i,
      /\/track(ing)?\??/i,
      /\/collect\??/i,
      /\/event\??/i,
      /\/analytics/i,
      /\/t\.gif/i,
      /\/p\.gif/i,
      /\/1x1\./i,
      /\/transparent\./i,
      /\/blank\.(gif|png)/i,
      /\/spacer\.(gif|png)/i,
    ];

    /**
     * Check if a URL is a tracking URL
     */
    function isTrackingUrl(url: string): { isTracking: boolean; type: string } {
      try {
        const urlObj = new URL(url, window.location.href);

        // Check against known tracking domains
        for (const domain of TRACKING_DOMAINS) {
          if (urlObj.hostname.includes(domain) || urlObj.href.includes(domain)) {
            return { isTracking: true, type: 'analytics' };
          }
        }

        // Check against tracking patterns
        for (const pattern of TRACKING_PATTERNS) {
          if (pattern.test(urlObj.pathname)) {
            return { isTracking: true, type: 'pixel' };
          }
        }

        return { isTracking: false, type: '' };
      } catch {
        return { isTracking: false, type: '' };
      }
    }

    /**
     * Notify about tracking pixel/beacon detection
     */
    function notifyTrackingDetected(type: string) {
      trackingCount++;
      detectedTrackingTypes.add(type);

      if (!hasAlertedTrackingPixel) {
        hasAlertedTrackingPixel = true;

        // Dispatch after a short delay to batch multiple detections
        setTimeout(() => {
          window.dispatchEvent(
            new CustomEvent('grapes-tracking-pixel-detected', {
              detail: JSON.stringify({
                count: trackingCount,
                types: Array.from(detectedTrackingTypes),
                url: window.location.hostname,
              }),
            }),
          );
        }, 500);
      }
    }

    // INTERCEPT navigator.sendBeacon
    const originalSendBeacon = navigator.sendBeacon?.bind(navigator);

    if (originalSendBeacon) {
      navigator.sendBeacon = (url: string, data?: BodyInit | null): boolean => {
        const trackingCheck = isTrackingUrl(url);

        if (trackingCheck.isTracking) {
          notifyTrackingDetected('beacon');
          console.log('[GRAPES] Blocked sendBeacon to:', url);
          // Return true to indicate "success" but don't actually send
          return true;
        }

        return originalSendBeacon(url, data);
      };
    }

    // INTERCEPT fetch for tracking requests
    const originalFetch = window.fetch;

    window.fetch = (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url;
      const trackingCheck = isTrackingUrl(url);

      if (trackingCheck.isTracking) {
        notifyTrackingDetected('fetch');
        console.log('[GRAPES] Blocked fetch to:', url);
        // Return a fake successful response
        return Promise.resolve(new Response('', { status: 200, statusText: 'OK' }));
      }

      return originalFetch.call(window, input, init);
    };

    // INTERCEPT XMLHttpRequest for tracking requests
    const originalXHROpen = XMLHttpRequest.prototype.open;
    const originalXHRSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (
      method: string,
      url: string | URL,
      async: boolean = true,
      username?: string | null,
      password?: string | null,
    ): void {
      const urlStr = typeof url === 'string' ? url : url.href;
      (this as any).__grapesUrl = urlStr;
      (this as any).__grapesIsTracking = isTrackingUrl(urlStr);

      return originalXHROpen.call(this, method, url, async, username, password);
    };

    XMLHttpRequest.prototype.send = function (
      body?: Document | XMLHttpRequestBodyInit | null,
    ): void {
      const trackingCheck = (this as any).__grapesIsTracking;

      if (trackingCheck?.isTracking) {
        notifyTrackingDetected('xhr');
        console.log('[GRAPES] Blocked XHR to:', (this as any).__grapesUrl);

        // Simulate successful response
        Object.defineProperty(this, 'status', { value: 200, writable: false });
        Object.defineProperty(this, 'statusText', { value: 'OK', writable: false });
        Object.defineProperty(this, 'responseText', { value: '', writable: false });
        Object.defineProperty(this, 'readyState', { value: 4, writable: false });

        // Fire events
        setTimeout(() => {
          this.dispatchEvent(new Event('load'));
          this.dispatchEvent(new Event('loadend'));
        }, 0);

        return;
      }

      return originalXHRSend.call(this, body);
    };

    // INTERCEPT Image loading for tracking pixels
    const OriginalImage = window.Image;

    (window as any).Image = (width?: number, height?: number): HTMLImageElement => {
      const img = new OriginalImage(width, height);
      const originalSrcDescriptor = Object.getOwnPropertyDescriptor(
        HTMLImageElement.prototype,
        'src',
      );

      // Track if this looks like a tracking pixel (1x1 or very small)
      const isLikelyTrackingSize =
        (width === 1 && height === 1) ||
        (width !== undefined && width <= 3 && height !== undefined && height <= 3);

      if (isLikelyTrackingSize) {
        // Override src setter to check for tracking
        Object.defineProperty(img, 'src', {
          get: function () {
            return originalSrcDescriptor?.get?.call(this) ?? '';
          },
          set: function (value: string) {
            const trackingCheck = isTrackingUrl(value);

            if (trackingCheck.isTracking) {
              notifyTrackingDetected('pixel');
              console.log('[GRAPES] Blocked tracking pixel:', value);
              // Don't set the src - block the tracking pixel
              // Fire load event to not break page logic
              setTimeout(() => {
                this.dispatchEvent(new Event('load'));
              }, 0);
              return;
            }

            originalSrcDescriptor?.set?.call(this, value);
          },
          configurable: true,
          enumerable: true,
        });
      }

      return img;
    };

    // Preserve Image prototype
    (window as any).Image.prototype = OriginalImage.prototype;

    // OBSERVE DOM for tracking pixels (1x1 images, invisible images)
    const trackingPixelObserver = new OriginalMutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;

            // Check if it's an img element
            if (element.tagName === 'IMG') {
              const img = element as HTMLImageElement;
              checkAndBlockTrackingImage(img);
            }

            // Check for img elements within added nodes
            const images = element.querySelectorAll?.('img');
            images?.forEach((img) => checkAndBlockTrackingImage(img as HTMLImageElement));

            // Check for iframe tracking pixels
            if (element.tagName === 'IFRAME') {
              const iframe = element as HTMLIFrameElement;
              const src = iframe.src || '';
              const trackingCheck = isTrackingUrl(src);

              // Also check for tiny iframes (often used for tracking)
              const isTinyIframe =
                (iframe.width === '0' || iframe.width === '1') &&
                (iframe.height === '0' || iframe.height === '1');

              if (trackingCheck.isTracking || isTinyIframe) {
                notifyTrackingDetected('iframe');
                console.log('[GRAPES] Blocked tracking iframe:', src);
                iframe.src = 'about:blank';
                iframe.remove();
              }
            }
          }
        });
      });
    });

    /**
     * Check if an image is a tracking pixel and block it
     */
    function checkAndBlockTrackingImage(img: HTMLImageElement): void {
      const src = img.src || img.getAttribute('src') || '';
      const width = img.width || parseInt(img.getAttribute('width') || '0', 10);
      const height = img.height || parseInt(img.getAttribute('height') || '0', 10);

      // Check if it's a 1x1 or very small image
      const isTinyImage = (width <= 3 && height <= 3) || (width === 0 && height === 0);

      // Check if it's hidden
      const style = img.style;
      const isHidden =
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.opacity === '0' ||
        (parseInt(style.width || '999', 10) <= 1 && parseInt(style.height || '999', 10) <= 1);

      // Check if URL is tracking
      const trackingCheck = isTrackingUrl(src);

      if ((isTinyImage || isHidden) && (trackingCheck.isTracking || src)) {
        // Only block if it actually looks like tracking (has URL pattern or is to tracking domain)
        if (trackingCheck.isTracking) {
          notifyTrackingDetected('pixel');
          console.log('[GRAPES] Blocked tracking pixel image:', src);
          img.src =
            'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
          img.removeAttribute('src');
        }
      }
    }

    // Start observing when DOM is ready
    const startTrackingObserver = () => {
      trackingPixelObserver.observe(document.body || document.documentElement, {
        childList: true,
        subtree: true,
      });

      // Scan existing images
      document.querySelectorAll('img').forEach((img) => {
        checkAndBlockTrackingImage(img as HTMLImageElement);
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startTrackingObserver);
    } else {
      startTrackingObserver();
    }

    console.log('[GRAPES] Stealth mode activated - MutationObserver intercepted');
    console.log('[GRAPES] Session replay protection enabled');
    console.log('[GRAPES] Fingerprinting protection enabled');
    console.log('[GRAPES] Visibility tracking protection enabled');
    console.log('[GRAPES] Tracking pixel protection enabled');
  },
});
