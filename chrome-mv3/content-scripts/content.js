var content=(function(){"use strict";const p=globalThis.browser?.runtime?.id?globalThis.browser:globalThis.chrome;function D(n){return n}function v(){if(document.getElementById("grapes-test-panel")){const e=document.getElementById("grapes-test-panel");e&&e.remove();const i=document.getElementById("grapes-test-runner-script");i&&i.remove();return}const n=document.createElement("div");n.id="grapes-test-panel",n.setAttribute("data-grapes-injected","true"),n.innerHTML=`
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
  `,document.body.appendChild(n),document.getElementById("grapes-test-close")?.addEventListener("click",()=>{n.remove();const e=document.getElementById("grapes-test-runner-script");e&&e.remove()}),window.addEventListener("grapes-test-result",(e=>{const{testId:i,passed:s,logs:a}=e.detail,o=document.getElementById(`grapes-${i}-badge`);o&&(o.textContent=s?"PASS":"FAIL",o.className=`grapes-test-badge ${s?"grapes-badge-pass":"grapes-badge-fail"}`);const r=document.getElementById(`grapes-${i}-log`);r&&(r.innerHTML="",a.forEach(S=>{const b=document.createElement("div");b.className=`grapes-log-${S.type}`,b.textContent=S.msg,r.appendChild(b)}))})),window.addEventListener("grapes-test-score",(e=>{const{passed:i,total:s}=e.detail,a=document.getElementById("grapes-test-score");a&&(a.textContent=`${i}/${s}`,a.style.color=i===s?"#27ae60":i>0?"#f39c12":"#e74c3c")}));const t=document.createElement("script");t.id="grapes-test-runner-script",t.src=p.runtime.getURL("stealth-test-runner.js"),t.onload=()=>{console.log("[GRAPES] Test runner script loaded")},t.onerror=e=>{console.error("[GRAPES] Failed to load test runner script:",e)},document.documentElement.appendChild(t),document.getElementById("grapes-run-all")?.addEventListener("click",()=>{for(let i=1;i<=12;i++){const s=document.getElementById(`grapes-t${i}-badge`);s&&(s.textContent="Running",s.className="grapes-test-badge grapes-badge-pending");const a=document.getElementById(`grapes-t${i}-log`);a&&(a.innerHTML='<div class="grapes-log-info">Running...</div>')}const e=document.getElementById("grapes-test-score");e&&(e.textContent="-/12",e.style.color="#9b59b6"),window.dispatchEvent(new CustomEvent("grapes-run-tests"))})}class w{constructor(){this.container=null,this.notifications=new Map,this.pendingNotifications=[],this.isReady=!1,this.stylesInjected=!1,this.suppressedDomains=new Set,this.currentDomain="",this.threatCount=0,this.lastNotificationTime=0,this.autoCloseTimer=null,this.currentDomain=this.extractDomain(window.location.hostname),this.loadSuppressedDomains().then(()=>{document.body?this.init():document.addEventListener("DOMContentLoaded",()=>this.init())})}extractDomain(t){if(t==="localhost"||/^\d+\.\d+\.\d+\.\d+$/.test(t))return t;const e=t.split(".");if(e.length<=2)return t;const i=["co.uk","com.br","com.au","co.jp","co.in","com.mx"],s=e.slice(-2).join(".");return i.includes(s)&&e.length>2?e.slice(-3).join("."):e.slice(-2).join(".")}async loadSuppressedDomains(){try{const e=(await p.runtime.sendMessage({type:"GET_PREFERENCES"}))?.suppressedNotificationDomains||[];this.suppressedDomains=new Set(e)}catch(t){console.log("[GRAPES] Could not load suppressed domains:",t)}}async saveSuppressedDomains(t,e){try{e?await p.runtime.sendMessage({type:"ADD_SUPPRESSED_DOMAIN",domain:t}):await p.runtime.sendMessage({type:"REMOVE_SUPPRESSED_DOMAIN",domain:t})}catch(i){console.log("[GRAPES] Could not save suppressed domain:",i)}}isDomainSuppressed(){return this.suppressedDomains.has(this.currentDomain)}async suppressCurrentDomain(){this.suppressedDomains.add(this.currentDomain),await this.saveSuppressedDomains(this.currentDomain,!0),this.notifications.forEach((t,e)=>this.dismiss(e)),console.log(`[GRAPES] Notifications suppressed for ${this.currentDomain}`)}async enableCurrentDomain(){this.suppressedDomains.delete(this.currentDomain),await this.saveSuppressedDomains(this.currentDomain,!1),console.log(`[GRAPES] Notifications enabled for ${this.currentDomain}`)}getSuppressedDomains(){return Array.from(this.suppressedDomains)}init(){this.createContainer(),this.injectStyles(),this.isReady=!0,this.isDomainSuppressed()||this.pendingNotifications.forEach(t=>this.show(t)),this.pendingNotifications=[]}createContainer(){this.container||(this.container=document.createElement("div"),this.container.id="grapes-notification-container",this.container.setAttribute("data-grapes-injected","true"),this.container.style.cssText=`
      position: fixed !important;
      bottom: 20px !important;
      right: 20px !important;
      z-index: 2147483647 !important;
      display: flex !important;
      flex-direction: column-reverse !important;
      gap: 10px !important;
      pointer-events: none !important;
      max-height: calc(100vh - 40px) !important;
      overflow: hidden !important;
    `,document.body.appendChild(this.container))}injectStyles(){if(this.stylesInjected)return;const t=document.createElement("style");t.id="grapes-notification-styles",t.setAttribute("data-grapes-injected","true"),t.textContent=`
      @keyframes grapes-notif-slide-in {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes grapes-notif-slide-out {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
      }
      .grapes-notification {
        pointer-events: auto !important;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
        border-radius: 12px !important;
        padding: 14px 16px !important;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4) !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        max-width: 280px !important;
        animation: grapes-notif-slide-in 0.3s ease-out !important;
        color: #ffffff !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
      }
      .grapes-notification:hover {
        transform: translateX(-5px) scale(1.02) !important;
        box-shadow: 0 6px 25px rgba(0, 0, 0, 0.5) !important;
      }
      .grapes-notification.dismissing {
        animation: grapes-notif-slide-out 0.3s ease-in forwards !important;
      }
      .grapes-notif-header {
        display: flex !important;
        align-items: center !important;
        gap: 12px !important;
      }
      .grapes-notif-icon {
        width: 36px !important;
        height: 36px !important;
        border-radius: 8px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex-shrink: 0 !important;
        font-size: 18px !important;
        background: rgba(155, 89, 182, 0.2) !important;
      }
      .grapes-notif-content {
        flex: 1 !important;
        min-width: 0 !important;
      }
      .grapes-notif-title {
        font-weight: 600 !important;
        font-size: 13px !important;
        margin-bottom: 2px !important;
        color: #fff !important;
      }
      .grapes-notif-message {
        font-size: 11px !important;
        color: #a0a0a0 !important;
        line-height: 1.3 !important;
      }
      .grapes-notif-cta {
        font-size: 10px !important;
        color: #9b59b6 !important;
        margin-top: 4px !important;
        font-weight: 500 !important;
      }
      .grapes-notif-close {
        background: transparent !important;
        border: none !important;
        color: #666 !important;
        cursor: pointer !important;
        font-size: 18px !important;
        padding: 4px !important;
        line-height: 1 !important;
        opacity: 0.6 !important;
        transition: opacity 0.2s !important;
      }
      .grapes-notif-close:hover {
        opacity: 1 !important;
        color: #fff !important;
      }
      .grapes-notif-suppress {
        display: block !important;
        width: 100% !important;
        background: transparent !important;
        border: none !important;
        color: #555 !important;
        font-size: 9px !important;
        padding: 6px 0 0 0 !important;
        margin-top: 8px !important;
        cursor: pointer !important;
        text-align: center !important;
        border-top: 1px solid rgba(255,255,255,0.1) !important;
      }
      .grapes-notif-suppress:hover {
        color: #888 !important;
      }
    `,document.head.appendChild(t),this.stylesInjected=!0}incrementThreatCount(t){this.threatCount++,this.showSummaryNotification(t)}showSummaryNotification(t){const e=Date.now();if(e-this.lastNotificationTime<1e3&&this.notifications.has("grapes-summary"))return;if(this.lastNotificationTime=e,this.isDomainSuppressed()){console.log("[GRAPES] Domain is suppressed, not showing notification");return}if(!this.isReady||!this.container){console.log("[GRAPES] NotificationManager not ready, will show after init"),setTimeout(()=>{this.isReady&&this.container&&this.showSummaryNotification(t)},500);return}console.log("[GRAPES] Showing summary notification, threat count:",this.threatCount),this.notifications.has("grapes-summary")&&(this.notifications.get("grapes-summary")?.remove(),this.notifications.delete("grapes-summary"));const i=document.createElement("div");i.className="grapes-notification",i.setAttribute("data-grapes-injected","true");const s=t?"Blocked":"Detected",a=t?"🛡️":"⚠️";i.innerHTML=`
      <div class="grapes-notif-header">
        <div class="grapes-notif-icon">${a}</div>
        <div class="grapes-notif-content">
          <div class="grapes-notif-title">${this.threatCount} Tracking Method${this.threatCount>1?"s":""} ${s}</div>
          <div class="grapes-notif-message">GRAPES is ${t?"protecting":"monitoring"} this page</div>
          <div class="grapes-notif-cta">Click extension icon for details</div>
        </div>
        <button class="grapes-notif-close">&times;</button>
      </div>
      <button class="grapes-notif-suppress">🔕 Mute notifications for this site</button>
    `,i.addEventListener("click",o=>{const r=o.target;r.classList.contains("grapes-notif-close")||r.classList.contains("grapes-notif-suppress")||this.dismiss("grapes-summary")}),i.querySelector(".grapes-notif-close")?.addEventListener("click",o=>{o.stopPropagation(),this.dismiss("grapes-summary")}),i.querySelector(".grapes-notif-suppress")?.addEventListener("click",o=>{o.stopPropagation(),this.suppressCurrentDomain()}),this.container.appendChild(i),this.notifications.set("grapes-summary",i),this.autoCloseTimer&&clearTimeout(this.autoCloseTimer),this.autoCloseTimer=window.setTimeout(()=>{this.dismiss("grapes-summary")},8e3)}dismiss(t){const e=this.notifications.get(t);e&&(e.classList.add("dismissing"),setTimeout(()=>{e.remove(),this.notifications.delete(t)},300))}showDomMonitoring(t,e=!0){this.incrementThreatCount(e)}showSessionReplay(t,e=!0){this.incrementThreatCount(e)}showFingerprinting(t,e=!0){this.incrementThreatCount(e)}showVisibilityTracking(t=!0){this.incrementThreatCount(t)}showTrackingPixel(t,e=!0){this.incrementThreatCount(e)}showDetectionPrompt(t){this.showSummaryNotification(!1)}}let c="detection-only",y=0,u=null;function d(){return u||(u=new w),u}const T={matches:["<all_urls>"],runAt:"document_start",main(){console.log("[GRAPES] Content script loaded");const n=C(window.location.hostname),t=s=>{window.dispatchEvent(new CustomEvent("grapes-set-protection-mode",{detail:JSON.stringify({enabled:s})}))};p.runtime.sendMessage({type:"GET_PROTECTION_STATUS",domain:n}).then(s=>{if(s){c=s.mode,console.log(`[GRAPES] Protection mode for ${n}: ${c}`);const a=s.mode==="full";t(a)}}).catch(s=>{console.log("[GRAPES] Could not get protection status:",s),t(!0)}),p.runtime.onMessage.addListener(s=>{s.type==="RUN_STEALTH_TEST"&&(console.log("[GRAPES] Injecting stealth test panel"),document.body?v():document.addEventListener("DOMContentLoaded",()=>v()))});const e=(s,a)=>{c==="full"?a():c==="detection-only"&&(y++,setTimeout(()=>{d().showDetectionPrompt(y)},500))};window.addEventListener("grapes-suspicious-observation",s=>{const a=s;try{const o=JSON.parse(a.detail);console.log("[GRAPES] Suspicious MutationObserver detected:",o),p.runtime.sendMessage({type:"SUSPICIOUS_OBSERVATION_DETECTED",data:o}).catch(r=>{console.log("[GRAPES] Could not send message to background:",r)}),e("dom",()=>d().showDomMonitoring(o))}catch(o){console.error("[GRAPES] Error parsing suspicious observation event:",o)}}),window.addEventListener("grapes-session-replay-detected",s=>{const a=s;try{const o=JSON.parse(a.detail);console.log("[GRAPES] Session replay tools detected:",o),p.runtime.sendMessage({type:"SESSION_REPLAY_DETECTED",data:o}).catch(r=>{console.log("[GRAPES] Could not send message to background:",r)}),e("replay",()=>d().showSessionReplay(o))}catch(o){console.error("[GRAPES] Error parsing session replay event:",o)}}),window.addEventListener("grapes-fingerprinting-detected",s=>{const a=s;try{const o=JSON.parse(a.detail);console.log("[GRAPES] Fingerprinting detected:",o),p.runtime.sendMessage({type:"FINGERPRINTING_DETECTED",data:o}).catch(r=>{console.log("[GRAPES] Could not send message to background:",r)}),e("fingerprint",()=>d().showFingerprinting(o))}catch(o){console.error("[GRAPES] Error parsing fingerprinting event:",o)}}),window.addEventListener("grapes-visibility-tracking-detected",s=>{const a=s;try{const o=JSON.parse(a.detail);console.log("[GRAPES] Visibility tracking detected:",o),p.runtime.sendMessage({type:"VISIBILITY_TRACKING_DETECTED",data:o}).catch(r=>{console.log("[GRAPES] Could not send message to background:",r)}),e("visibility",()=>d().showVisibilityTracking())}catch(o){console.error("[GRAPES] Error parsing visibility tracking event:",o)}}),window.addEventListener("grapes-tracking-pixel-detected",s=>{const a=s;try{const o=JSON.parse(a.detail);console.log("[GRAPES] Tracking pixels detected:",o),p.runtime.sendMessage({type:"TRACKING_PIXEL_DETECTED",data:o}).catch(r=>{console.log("[GRAPES] Could not send message to background:",r)}),e("tracking",()=>d().showTrackingPixel(o))}catch(o){console.error("[GRAPES] Error parsing tracking pixel event:",o)}});const i=()=>{p.storage.sync.get(["preferences"]).then(s=>{const a=s.preferences||{};a.customStylesEnabled&&a.customStyles&&E(a.customStyles)})};document.readyState==="loading"?document.addEventListener("DOMContentLoaded",i):i(),p.storage.onChanged.addListener((s,a)=>{if(a==="sync"&&s.preferences){const o=s.preferences.newValue;o.customStylesEnabled?E(o.customStyles||{}):x()}})}};function C(n){if(n==="localhost"||/^\d+\.\d+\.\d+\.\d+$/.test(n))return n;const t=n.split(".");if(t.length<=2)return n;const e=["co.uk","com.br","com.au","co.jp","co.in","com.mx"],i=t.slice(-2).join(".");return e.includes(i)&&t.length>2?t.slice(-3).join("."):t.slice(-2).join(".")}function E(n){x();const t=document.createElement("style");t.id="grapes-custom-styles",t.setAttribute("data-grapes-injected","true");let e="";n.backgroundColor&&(e+=`body { background-color: ${n.backgroundColor} !important; }
`),n.textColor&&(e+=`body { color: ${n.textColor} !important; }
`),n.fontSize&&(e+=`body { font-size: ${n.fontSize}px !important; }
`),n.fontFamily&&(e+=`body { font-family: ${n.fontFamily} !important; }
`),n.customCSS&&(e+=n.customCSS),t.textContent=e,document.head.appendChild(t),console.log("[GRAPES] Custom styles applied")}function x(){const n=document.getElementById("grapes-custom-styles");n&&(n.remove(),console.log("[GRAPES] Custom styles removed"))}function l(n,...t){}const R={debug:(...n)=>l(console.debug,...n),log:(...n)=>l(console.log,...n),warn:(...n)=>l(console.warn,...n),error:(...n)=>l(console.error,...n)};class h extends Event{constructor(t,e){super(h.EVENT_NAME,{}),this.newUrl=t,this.oldUrl=e}static EVENT_NAME=f("wxt:locationchange")}function f(n){return`${p?.runtime?.id}:content:${n}`}function P(n){let t,e;return{run(){t==null&&(e=new URL(location.href),t=n.setInterval(()=>{let i=new URL(location.href);i.href!==e.href&&(window.dispatchEvent(new h(i,e)),e=i)},1e3))}}}class g{constructor(t,e){this.contentScriptName=t,this.options=e,this.abortController=new AbortController,this.isTopFrame?(this.listenForNewerScripts({ignoreFirstEvent:!0}),this.stopOldScripts()):this.listenForNewerScripts()}static SCRIPT_STARTED_MESSAGE_TYPE=f("wxt:content-script-started");isTopFrame=window.self===window.top;abortController;locationWatcher=P(this);receivedMessageIds=new Set;get signal(){return this.abortController.signal}abort(t){return this.abortController.abort(t)}get isInvalid(){return p.runtime.id==null&&this.notifyInvalidated(),this.signal.aborted}get isValid(){return!this.isInvalid}onInvalidated(t){return this.signal.addEventListener("abort",t),()=>this.signal.removeEventListener("abort",t)}block(){return new Promise(()=>{})}setInterval(t,e){const i=setInterval(()=>{this.isValid&&t()},e);return this.onInvalidated(()=>clearInterval(i)),i}setTimeout(t,e){const i=setTimeout(()=>{this.isValid&&t()},e);return this.onInvalidated(()=>clearTimeout(i)),i}requestAnimationFrame(t){const e=requestAnimationFrame((...i)=>{this.isValid&&t(...i)});return this.onInvalidated(()=>cancelAnimationFrame(e)),e}requestIdleCallback(t,e){const i=requestIdleCallback((...s)=>{this.signal.aborted||t(...s)},e);return this.onInvalidated(()=>cancelIdleCallback(i)),i}addEventListener(t,e,i,s){e==="wxt:locationchange"&&this.isValid&&this.locationWatcher.run(),t.addEventListener?.(e.startsWith("wxt:")?f(e):e,i,{...s,signal:this.signal})}notifyInvalidated(){this.abort("Content script context invalidated"),R.debug(`Content script "${this.contentScriptName}" context invalidated`)}stopOldScripts(){window.postMessage({type:g.SCRIPT_STARTED_MESSAGE_TYPE,contentScriptName:this.contentScriptName,messageId:Math.random().toString(36).slice(2)},"*")}verifyScriptStartedEvent(t){const e=t.data?.type===g.SCRIPT_STARTED_MESSAGE_TYPE,i=t.data?.contentScriptName===this.contentScriptName,s=!this.receivedMessageIds.has(t.data?.messageId);return e&&i&&s}listenForNewerScripts(t){let e=!0;const i=s=>{if(this.verifyScriptStartedEvent(s)){this.receivedMessageIds.add(s.data.messageId);const a=e;if(e=!1,a&&t?.ignoreFirstEvent)return;this.notifyInvalidated()}};addEventListener("message",i),this.onInvalidated(()=>removeEventListener("message",i))}}function N(){}function m(n,...t){}const I={debug:(...n)=>m(console.debug,...n),log:(...n)=>m(console.log,...n),warn:(...n)=>m(console.warn,...n),error:(...n)=>m(console.error,...n)};return(async()=>{try{const{main:n,...t}=T,e=new g("content",t);return await n(e)}catch(n){throw I.error('The content script "content" crashed on startup!',n),n}})()})();
content;