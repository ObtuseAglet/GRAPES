/**
 * GRAPES Stealth Test Runner
 *
 * CRITICAL: Tests MUST run in the MAIN world because that's where the stealth
 * proxies operate. Content scripts run in an ISOLATED world with their own
 * prototype chain, so they see the real DOM methods, not our proxied ones.
 *
 * Architecture:
 * - UI panel: runs in content script (isolated world) - safe for rendering
 * - Test logic: injected via <script> tag into MAIN world
 * - Communication: CustomEvents pass results from MAIN → isolated world
 */

// Browser API is available in content script context via WXT
declare const browser: typeof chrome;

export function injectStealthTest() {
  // Check if already injected
  if (document.getElementById('grapes-test-panel')) {
    const existing = document.getElementById('grapes-test-panel');
    if (existing) existing.remove();
    // Also remove injected script
    const existingScript = document.getElementById('grapes-test-runner-script');
    if (existingScript) existingScript.remove();
    return;
  }

  // Create test panel UI (runs in content script context - fine for UI)
  const panel = document.createElement('div');
  panel.id = 'grapes-test-panel';
  panel.setAttribute('data-grapes-injected', 'true');
  panel.innerHTML = `
    <style>
      #grapes-test-panel {
        position: fixed !important;
        top: 20px !important;
        right: 20px !important;
        width: 400px !important;
        max-height: 80vh !important;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
        border: 1px solid #9b59b6 !important;
        border-radius: 12px !important;
        box-shadow: 0 10px 40px rgba(0,0,0,0.5) !important;
        z-index: 2147483646 !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        color: #e0e0e0 !important;
        overflow: hidden !important;
      }
      #grapes-test-panel * {
        box-sizing: border-box !important;
      }
      #grapes-test-header {
        background: rgba(155, 89, 182, 0.2) !important;
        padding: 12px 15px !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
        border-bottom: 1px solid rgba(155, 89, 182, 0.3) !important;
      }
      #grapes-test-header h3 {
        margin: 0 !important;
        font-size: 14px !important;
        color: #9b59b6 !important;
      }
      #grapes-test-close {
        background: transparent !important;
        border: none !important;
        color: #888 !important;
        font-size: 20px !important;
        cursor: pointer !important;
        padding: 0 !important;
        line-height: 1 !important;
      }
      #grapes-test-close:hover {
        color: #e94560 !important;
      }
      #grapes-test-content {
        padding: 15px !important;
        max-height: 60vh !important;
        overflow-y: auto !important;
      }
      .grapes-test-item {
        background: rgba(255,255,255,0.05) !important;
        border-radius: 8px !important;
        padding: 10px !important;
        margin-bottom: 10px !important;
        border: 1px solid rgba(255,255,255,0.1) !important;
      }
      .grapes-test-item h4 {
        margin: 0 0 8px 0 !important;
        font-size: 12px !important;
        color: #e94560 !important;
        display: flex !important;
        justify-content: space-between !important;
        align-items: center !important;
      }
      .grapes-test-badge {
        padding: 2px 8px !important;
        border-radius: 10px !important;
        font-size: 10px !important;
        font-weight: 600 !important;
      }
      .grapes-badge-pending { background: #f39c12 !important; color: white !important; }
      .grapes-badge-pass { background: #27ae60 !important; color: white !important; }
      .grapes-badge-fail { background: #e74c3c !important; color: white !important; }
      .grapes-test-log {
        background: #0d1117 !important;
        border-radius: 4px !important;
        padding: 8px !important;
        font-family: monospace !important;
        font-size: 11px !important;
        max-height: 80px !important;
        overflow-y: auto !important;
        color: #8b949e !important;
      }
      .grapes-log-success { color: #3fb950 !important; }
      .grapes-log-error { color: #f85149 !important; }
      .grapes-log-info { color: #58a6ff !important; }
      #grapes-test-actions {
        padding: 10px 15px !important;
        border-top: 1px solid rgba(255,255,255,0.1) !important;
        display: flex !important;
        gap: 10px !important;
      }
      #grapes-test-actions button {
        flex: 1 !important;
        padding: 8px 12px !important;
        border: none !important;
        border-radius: 6px !important;
        font-size: 12px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        transition: all 0.2s !important;
      }
      #grapes-run-all {
        background: linear-gradient(135deg, #9b59b6 0%, #e94560 100%) !important;
        color: white !important;
      }
      #grapes-run-all:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 4px 12px rgba(155, 89, 182, 0.4) !important;
      }
      #grapes-test-score {
        text-align: center !important;
        padding: 10px !important;
        font-size: 24px !important;
        font-weight: bold !important;a
        color: #9b59b6 !important;
      }
      .grapes-world-badge {
        font-size: 9px !important;
        background: rgba(155, 89, 182, 0.3) !important;
        padding: 2px 6px !important;
        border-radius: 4px !important;
        margin-left: 8px !important;
        color: #ccc !important;
      }
    </style>
    <div id="grapes-test-header">
      <h3>🍇 GRAPES Stealth Test <span class="grapes-world-badge">MAIN WORLD</span></h3>
      <button id="grapes-test-close">&times;</button>
    </div>
    <div id="grapes-test-content">
      <div class="grapes-test-item">
        <h4>Test 1: MutationObserver <span id="grapes-t1-badge" class="grapes-test-badge grapes-badge-pending">Pending</span></h4>
        <div id="grapes-t1-log" class="grapes-test-log">Ready to test...</div>
      </div>
      <div class="grapes-test-item">
        <h4>Test 2: DOM Queries <span id="grapes-t2-badge" class="grapes-test-badge grapes-badge-pending">Pending</span></h4>
        <div id="grapes-t2-log" class="grapes-test-log">Ready to test...</div>
      </div>
      <div class="grapes-test-item">
        <h4>Test 3: Child Enumeration <span id="grapes-t3-badge" class="grapes-test-badge grapes-badge-pending">Pending</span></h4>
        <div id="grapes-t3-log" class="grapes-test-log">Ready to test...</div>
      </div>
      <div class="grapes-test-item">
        <h4>Test 4: innerHTML <span id="grapes-t4-badge" class="grapes-test-badge grapes-badge-pending">Pending</span></h4>
        <div id="grapes-t4-log" class="grapes-test-log">Ready to test...</div>
      </div>
      <div class="grapes-test-item">
        <h4>Test 5: Live Injection <span id="grapes-t5-badge" class="grapes-test-badge grapes-badge-pending">Pending</span></h4>
        <div id="grapes-t5-log" class="grapes-test-log">Ready to test...</div>
      </div>
      <div class="grapes-test-item" style="border-color: rgba(233, 69, 96, 0.3) !important;">
        <h4 style="color: #e94560 !important;">Test 6: TreeWalker 🎬 <span id="grapes-t6-badge" class="grapes-test-badge grapes-badge-pending">Pending</span></h4>
        <div id="grapes-t6-log" class="grapes-test-log">Ready to test...</div>
      </div>
      <div class="grapes-test-item" style="border-color: rgba(233, 69, 96, 0.3) !important;">
        <h4 style="color: #e94560 !important;">Test 7: cloneNode 🎬 <span id="grapes-t7-badge" class="grapes-test-badge grapes-badge-pending">Pending</span></h4>
        <div id="grapes-t7-log" class="grapes-test-log">Ready to test...</div>
      </div>
      <div class="grapes-test-item" style="border-color: rgba(233, 69, 96, 0.3) !important;">
        <h4 style="color: #e94560 !important;">Test 8: outerHTML 🎬 <span id="grapes-t8-badge" class="grapes-test-badge grapes-badge-pending">Pending</span></h4>
        <div id="grapes-t8-log" class="grapes-test-log">Ready to test...</div>
      </div>
      <div class="grapes-test-item" style="border-color: rgba(155, 89, 182, 0.3) !important;">
        <h4 style="color: #9b59b6 !important;">Test 9: Canvas FP 🔍 <span id="grapes-t9-badge" class="grapes-test-badge grapes-badge-pending">Pending</span></h4>
        <div id="grapes-t9-log" class="grapes-test-log">Ready to test...</div>
      </div>
      <div class="grapes-test-item" style="border-color: rgba(155, 89, 182, 0.3) !important;">
        <h4 style="color: #9b59b6 !important;">Test 10: Audio FP 🔍 <span id="grapes-t10-badge" class="grapes-test-badge grapes-badge-pending">Pending</span></h4>
        <div id="grapes-t10-log" class="grapes-test-log">Ready to test...</div>
      </div>
      <div class="grapes-test-item" style="border-color: rgba(52, 152, 219, 0.3) !important;">
        <h4 style="color: #3498db !important;">Test 11: Visibility 👁️ <span id="grapes-t11-badge" class="grapes-test-badge grapes-badge-pending">Pending</span></h4>
        <div id="grapes-t11-log" class="grapes-test-log">Ready to test...</div>
      </div>
      <div class="grapes-test-item" style="border-color: rgba(230, 126, 34, 0.3) !important;">
        <h4 style="color: #e67e22 !important;">Test 12: Tracking Pixels 📡 <span id="grapes-t12-badge" class="grapes-test-badge grapes-badge-pending">Pending</span></h4>
        <div id="grapes-t12-log" class="grapes-test-log">Ready to test...</div>
      </div>
    </div>
    <div id="grapes-test-score">-/12</div>
    <div id="grapes-test-actions">
      <button id="grapes-run-all">▶ Run All Tests</button>
    </div>
  `;

  document.body.appendChild(panel);

  // Close button
  document.getElementById('grapes-test-close')?.addEventListener('click', () => {
    panel.remove();
    // Also remove injected script
    const script = document.getElementById('grapes-test-runner-script');
    if (script) script.remove();
  });

  // Listen for test results from MAIN world via CustomEvent
  window.addEventListener('grapes-test-result', ((event: CustomEvent) => {
    const { testId, passed, logs } = event.detail;

    // Update badge
    const badge = document.getElementById(`grapes-${testId}-badge`);
    if (badge) {
      badge.textContent = passed ? 'PASS' : 'FAIL';
      badge.className = `grapes-test-badge ${passed ? 'grapes-badge-pass' : 'grapes-badge-fail'}`;
    }

    // Update logs
    const logEl = document.getElementById(`grapes-${testId}-log`);
    if (logEl) {
      logEl.innerHTML = '';
      logs.forEach((log: { msg: string; type: string }) => {
        const line = document.createElement('div');
        line.className = `grapes-log-${log.type}`;
        line.textContent = log.msg;
        logEl.appendChild(line);
      });
    }
  }) as EventListener);

  // Listen for score updates from MAIN world
  window.addEventListener('grapes-test-score', ((event: CustomEvent) => {
    const { passed, total } = event.detail;
    const scoreEl = document.getElementById('grapes-test-score');
    if (scoreEl) {
      scoreEl.textContent = `${passed}/${total}`;
      scoreEl.style.color = passed === total ? '#27ae60' : passed > 0 ? '#f39c12' : '#e74c3c';
    }
  }) as EventListener);

  // Inject the test runner as an external script (CSP compliant)
  // The script is loaded from web_accessible_resources
  const script = document.createElement('script');
  script.id = 'grapes-test-runner-script';
  script.src = browser.runtime.getURL('stealth-test-runner.js');
  script.onload = () => {
    console.log('[GRAPES] Test runner script loaded');
  };
  script.onerror = (e) => {
    console.error('[GRAPES] Failed to load test runner script:', e);
  };
  document.documentElement.appendChild(script);

  // "Run All" button triggers the MAIN world function via CustomEvent
  document.getElementById('grapes-run-all')?.addEventListener('click', () => {
    // Reset UI - now 12 tests
    for (let i = 1; i <= 12; i++) {
      const badge = document.getElementById(`grapes-t${i}-badge`);
      if (badge) {
        badge.textContent = 'Running';
        badge.className = 'grapes-test-badge grapes-badge-pending';
      }
      const log = document.getElementById(`grapes-t${i}-log`);
      if (log) log.innerHTML = '<div class="grapes-log-info">Running...</div>';
    }
    const score = document.getElementById('grapes-test-score');
    if (score) {
      score.textContent = '-/12';
      score.style.color = '#9b59b6';
    }

    // Signal the MAIN world to run tests via CustomEvent
    window.dispatchEvent(new CustomEvent('grapes-run-tests'));
  });
}
