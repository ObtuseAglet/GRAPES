/**
 * GRAPES Stealth Injector
 * 
 * This script runs in the MAIN world (page context) BEFORE any page scripts.
 * It intercepts MutationObserver to hide our extension's DOM modifications.
 * 
 * Think of it like a pre-recorded loop on a security camera - the website
 * sees the "original" DOM state, not our live modifications.
 */

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  world: 'MAIN',
  registration: 'manifest',
  
  main() {
    // Marker attributes/IDs that identify our extension's modifications
    const GRAPES_MARKERS = [
      'grapes-custom-styles',
      'grapes-',
      'data-grapes',
    ];
    
    // Store original MutationObserver
    const OriginalMutationObserver = window.MutationObserver;
    const originalObserve = OriginalMutationObserver.prototype.observe;
    const originalDisconnect = OriginalMutationObserver.prototype.disconnect;
    const originalTakeRecords = OriginalMutationObserver.prototype.takeRecords;
    
    // Track if we've already alerted about suspicious observation
    let hasAlertedSuspiciousObservation = false;
    
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
        options.subtree === true ||   // Watching all descendants
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
        targetType: target === document ? 'document' : 
                   target === document.documentElement ? 'documentElement' :
                   target === document.head ? 'head' : 
                   target === document.body ? 'body' : 'other',
        options: options ? {
          childList: options.childList,
          subtree: options.subtree,
          attributes: options.attributes,
        } : null,
        url: window.location.hostname,
      };
      
      window.dispatchEvent(new CustomEvent('grapes-suspicious-observation', { 
        detail: JSON.stringify(detail)
      }));
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
        if (element.id && GRAPES_MARKERS.some(marker => element.id.includes(marker))) {
          return true;
        }
        
        // Check class names
        if (element.className && typeof element.className === 'string') {
          if (GRAPES_MARKERS.some(marker => element.className.includes(marker))) {
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
     */
    function filterMutations(mutations: MutationRecord[]): MutationRecord[] {
      return mutations.filter(mutation => !isGrapesMutation(mutation));
    }
    
    /**
     * Proxied MutationObserver that hides GRAPES modifications
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
          if (filteredMutations.length > 0) {
            this.userCallback(filteredMutations, observer);
          }
        });
      }
      
      observe(target: Node, options?: MutationObserverInit): void {
        // Detect suspicious observation patterns
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
     */
    function filterNodeList<T extends Node>(nodes: NodeListOf<T> | HTMLCollectionOf<Element>): T[] {
      return Array.from(nodes).filter(node => !isGrapesNode(node)) as T[];
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
    Document.prototype.querySelectorAll = function(selectors: string) {
      const results = originalQuerySelectorAll.call(this, selectors);
      // Don't filter if querying for grapes elements specifically (internal use)
      if (selectors.includes('grapes')) {
        return results;
      }
      return createFakeNodeList(filterNodeList(results));
    };
    
    Document.prototype.querySelector = function(selectors: string) {
      const result = originalQuerySelector.call(this, selectors);
      if (selectors.includes('grapes')) {
        return result;
      }
      if (result && isGrapesNode(result)) {
        return null;
      }
      return result;
    };
    
    Document.prototype.getElementById = function(elementId: string) {
      const result = originalGetElementById.call(this, elementId);
      // Allow internal GRAPES queries
      if (elementId.includes('grapes')) {
        return result;
      }
      if (result && isGrapesNode(result)) {
        return null;
      }
      return result;
    };
    
    // Override Element methods
    Element.prototype.querySelectorAll = function(selectors: string) {
      const results = originalElementQuerySelectorAll.call(this, selectors);
      if (selectors.includes('grapes')) {
        return results;
      }
      return createFakeNodeList(filterNodeList(results));
    };
    
    Element.prototype.querySelector = function(selectors: string) {
      const result = originalElementQuerySelector.call(this, selectors);
      if (selectors.includes('grapes')) {
        return result;
      }
      if (result && isGrapesNode(result)) {
        return null;
      }
      return result;
    };
    
    // Intercept childNodes and children getters to hide GRAPES elements
    const originalChildNodesGetter = Object.getOwnPropertyDescriptor(Node.prototype, 'childNodes')?.get;
    const originalChildrenGetter = Object.getOwnPropertyDescriptor(Element.prototype, 'children')?.get;
    
    if (originalChildNodesGetter) {
      Object.defineProperty(Node.prototype, 'childNodes', {
        get: function() {
          const nodes = originalChildNodesGetter.call(this);
          // Only filter for head/body to avoid performance issues
          if (this === document.head || this === document.body || this === document.documentElement) {
            return createFakeNodeList(filterNodeList(nodes));
          }
          return nodes;
        },
        configurable: true,
      });
    }
    
    if (originalChildrenGetter) {
      Object.defineProperty(Element.prototype, 'children', {
        get: function() {
          const children = originalChildrenGetter.call(this);
          // Only filter for head/body to avoid performance issues
          if (this === document.head || this === document.body || this === document.documentElement) {
            const filtered = Array.from(children).filter(child => !isGrapesNode(child));
            return createFakeNodeList(filtered as Element[]) as unknown as HTMLCollection;
          }
          return children;
        },
        configurable: true,
      });
    }
    
    // Intercept innerHTML/outerHTML getters to hide GRAPES elements
    const originalInnerHTMLGetter = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML')?.get;
    
    if (originalInnerHTMLGetter) {
      Object.defineProperty(Element.prototype, 'innerHTML', {
        get: function() {
          const html = originalInnerHTMLGetter.call(this);
          // Only clean for head to hide our style injections
          if (this === document.head) {
            // Remove GRAPES style tags from the HTML string
            return html.replace(/<style[^>]*id="grapes[^"]*"[^>]*>[\s\S]*?<\/style>/gi, '');
          }
          return html;
        },
        set: function(value) {
          this.innerHTML = value;
        },
        configurable: true,
      });
    }
    
    console.log('[GRAPES] Stealth mode activated - MutationObserver intercepted');
  },
});
