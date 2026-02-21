import{b as o}from"./browser-BnURzfs5.js";let i=null,r=null,l=null,p="",a="",u="activity";const E={"dom-monitoring":{icon:"👁️",label:"DOM Monitoring",color:"#e94560",desc:"Watching page changes"},"session-replay":{icon:"🎬",label:"Session Replay",color:"#f39c12",desc:"Recording your activity"},fingerprinting:{icon:"🔍",label:"Fingerprinting",color:"#9b59b6",desc:"Creating device ID"},"visibility-tracking":{icon:"👁️",label:"Visibility Tracking",color:"#3498db",desc:"Detecting tab switches"},"tracking-pixel":{icon:"📡",label:"Tracking Pixels",color:"#e67e22",desc:"Cross-site tracking"}};function v(t){try{const s=new URL(t).hostname;if(s==="localhost"||/^\d+\.\d+\.\d+\.\d+$/.test(s))return s;const e=s.split(".");if(e.length<=2)return s;const n=["co.uk","com.br","com.au","co.jp","co.in","com.mx"],c=e.slice(-2).join(".");return n.includes(c)&&e.length>2?e.slice(-3).join("."):e.slice(-2).join(".")}catch{return""}}function h(t){return new Date(t).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}function m(){return!i||!a?null:i.siteSettings[a]||null}function y(){const t=m();return t==="enabled"?!0:t==="disabled"?!1:i?.globalMode==="full"}function S(){if(r?.events?.length)return r.events;if(!l)return[];const t=[],s=y(),e=l.timestamp;return l.mutationObserver&&t.push({type:"dom-monitoring",details:["page changes"],timestamp:e,blocked:s}),l.sessionReplay?.length&&t.push({type:"session-replay",details:l.sessionReplay,timestamp:e,blocked:s}),l.fingerprinting?.length&&t.push({type:"fingerprinting",details:l.fingerprinting,timestamp:e,blocked:s}),l.visibilityTracking&&t.push({type:"visibility-tracking",details:["tab switches"],timestamp:e,blocked:s}),l.trackingPixels?.length&&t.push({type:"tracking-pixel",details:l.trackingPixels,timestamp:e,blocked:s}),t}function L(){const t=y(),s=i?.globalMode||"detection-only",e=t?"#27ae60":s==="detection-only"?"#f39c12":"#e74c3c";return`
    <header class="popup-header">
      <div class="popup-title"><span class="popup-logo">🍇</span> GRAPES</div>
      <div class="popup-status" style="color: ${e};">
        <span class="status-dot" style="background: ${e};"></span> ${t?"Protected":s==="detection-only"?"Monitoring":"Disabled"}
      </div>
    </header>
    <div class="domain-info">
      <div class="domain-name">${a||"Unknown"}</div>
    </div>
  `}function T(){return`
    <div class="popup-tabs">
      <button class="tab-btn ${u==="activity"?"active":""}" data-tab="activity">🔬 Activity</button>
      <button class="tab-btn ${u==="settings"?"active":""}" data-tab="settings">⚙️ Settings</button>
      <button class="tab-btn ${u==="muted"?"active":""}" data-tab="muted">🔕 Muted</button>
    </div>
  `}function w(){const t=S();if(t.length===0)return`
      <div class="tab-content">
        <div class="empty-state">
          <div class="empty-icon">✅</div>
          <div class="empty-title">No Surveillance Detected</div>
          <div class="empty-text">GRAPES is monitoring this page. Detected tracking will appear here.</div>
        </div>
      </div>
    `;const s=t.map(e=>{const n=E[e.type]||{icon:"❓",label:e.type,color:"#888",desc:""},c=e.details.map(d=>d.charAt(0).toUpperCase()+d.slice(1)).join(", ");return`
      <div class="event-card" style="border-left-color: ${n.color};">
        <div class="event-icon" style="background: ${n.color}20; color: ${n.color};">${n.icon}</div>
        <div class="event-body">
          <div class="event-header">
            <span class="event-label">${n.label}</span>
            <span class="event-time">${h(e.timestamp)}</span>
          </div>
          <div class="event-details">${c}</div>
          <div class="event-desc">${n.desc}</div>
        </div>
        <div class="event-status ${e.blocked?"blocked":"detected"}">${e.blocked?"🛡️ Blocked":"⚠️ Detected"}</div>
      </div>
    `}).join("");return`
    <div class="tab-content">
      <div class="activity-summary">
        <span class="summary-count">${t.length}</span>
        <span class="summary-text">tracking method${t.length!==1?"s":""} found</span>
      </div>
      <div class="events-list">${s}</div>
    </div>
  `}function R(){const t=i?.globalMode||"detection-only",s=m(),e=i?.loggingEnabled||!1;return`
    <div class="tab-content">
      <div class="setting-section">
        <div class="setting-label">Global Mode</div>
        <div class="btn-group">
          <button class="mode-btn ${t==="full"?"active":""}" data-mode="full">🛡️ Full</button>
          <button class="mode-btn ${t==="detection-only"?"active":""}" data-mode="detection-only">👁️ Detect</button>
          <button class="mode-btn ${t==="disabled"?"active":""}" data-mode="disabled">⏸️ Off</button>
        </div>
      </div>
      
      <div class="setting-section">
        <div class="setting-label">This Site (${a})</div>
        <div class="btn-group">
          <button class="site-btn ${s==="enabled"?"active":""}" data-site="enabled">🟢 Protect</button>
          <button class="site-btn ${!s||s==="default"?"active":""}" data-site="default">⚪ Default</button>
          <button class="site-btn ${s==="disabled"?"active":""}" data-site="disabled">🔴 Disable</button>
        </div>
      </div>
      
      <div class="setting-section">
        <label class="toggle-row">
          <input type="checkbox" id="logging-toggle" ${e?"checked":""}>
          <span>Enable surveillance logging</span>
        </label>
        <div class="setting-hint">Logs are stored locally for future analysis</div>
      </div>
      
      <div class="setting-section">
        <div class="setting-label">Surveillance Logs</div>
        <div class="btn-row">
          <button id="export-logs" class="secondary-btn">📥 Export Logs</button>
          <button id="clear-logs" class="secondary-btn danger">🗑️ Clear Logs</button>
        </div>
        <div class="setting-hint">Export logs as JSON for MongoDB import or analysis</div>
      </div>
      
      <button id="stealth-test" class="primary-btn">🔬 Run Stealth Test</button>
    </div>
  `}function $(){const t=i?.suppressedNotificationDomains||[];return t.length===0?`
      <div class="tab-content">
        <div class="empty-state">
          <div class="empty-icon">🔔</div>
          <div class="empty-title">No Muted Sites</div>
          <div class="empty-text">When you mute notifications for a site, it will appear here.</div>
        </div>
      </div>
    `:`
    <div class="tab-content">
      <div class="setting-hint" style="margin-bottom: 12px;">
        Notifications are hidden on these sites. Detection still works.
      </div>
      <div class="muted-list">${t.map(e=>`
    <div class="muted-item">
      <span class="muted-domain">${e}</span>
      <button class="remove-btn" data-domain="${e}">✕</button>
    </div>
  `).join("")}</div>
    </div>
  `}function g(){const t=document.getElementById("root");if(!t)return;if(!i){t.innerHTML='<div class="popup-container loading">Loading...</div>';return}const s=u==="settings"?R():u==="muted"?$():w();t.innerHTML=`
    <div class="popup-container">
      ${L()}
      ${T()}
      ${s}
    </div>
  `,P()}function P(){document.querySelectorAll(".tab-btn").forEach(t=>{t.addEventListener("click",s=>{u=s.target.dataset.tab||"activity",g()})}),document.querySelectorAll(".mode-btn").forEach(t=>{t.addEventListener("click",async s=>{const e=s.target.dataset.mode;await o.runtime.sendMessage({type:"SET_GLOBAL_MODE",mode:e}),i&&(i.globalMode=e),g()})}),document.querySelectorAll(".site-btn").forEach(t=>{t.addEventListener("click",async s=>{const e=s.target.dataset.site;await o.runtime.sendMessage({type:"SET_SITE_PROTECTION",domain:a,setting:e}),i&&(e==="default"?delete i.siteSettings[a]:i.siteSettings[a]=e),g()})}),document.getElementById("logging-toggle")?.addEventListener("change",async t=>{const s=t.target.checked;await o.runtime.sendMessage({type:"SET_LOGGING_ENABLED",enabled:s}),i&&(i.loggingEnabled=s)}),document.getElementById("export-logs")?.addEventListener("click",async()=>{try{const t=await o.runtime.sendMessage({type:"GET_ALL_LOGS"});if(!t||t.length===0){alert("No logs to export. Enable logging and browse some sites first.");return}const s=JSON.stringify(t,null,2),e=new Blob([s],{type:"application/json"}),n=URL.createObjectURL(e),c=document.createElement("a");c.href=n,c.download=`grapes-logs-${new Date().toISOString().split("T")[0]}.json`,c.click(),URL.revokeObjectURL(n)}catch(t){console.error("Export failed:",t),alert("Failed to export logs")}}),document.getElementById("clear-logs")?.addEventListener("click",async()=>{confirm("Are you sure you want to clear all surveillance logs? This cannot be undone.")&&(await o.runtime.sendMessage({type:"CLEAR_LOGS"}),alert("Logs cleared successfully"))}),document.getElementById("stealth-test")?.addEventListener("click",async()=>{const[t]=await o.tabs.query({active:!0,currentWindow:!0});t?.id&&(await o.tabs.sendMessage(t.id,{type:"RUN_STEALTH_TEST"}),window.close())}),document.querySelectorAll(".remove-btn").forEach(t=>{t.addEventListener("click",async s=>{const e=s.target.dataset.domain;e&&(await o.runtime.sendMessage({type:"REMOVE_SUPPRESSED_DOMAIN",domain:e}),i&&(i.suppressedNotificationDomains=i.suppressedNotificationDomains.filter(n=>n!==e)),g())})})}function k(){const s=new URLSearchParams(window.location.search).get("tabId");return s?parseInt(s,10):null}async function b(){const t=k();console.log("[GRAPES Popup] Init, sourceTabId:",t);try{i=await o.runtime.sendMessage({type:"GET_PREFERENCES"})||{globalMode:"detection-only",siteSettings:{},customStylesEnabled:!1,customStyles:{},suppressedNotificationDomains:[],onboardingComplete:!1,loggingEnabled:!0},console.log("[GRAPES Popup] Preferences loaded:",i);let e;if(t){e=t;try{p=(await o.tabs.get(t)).url||"",a=v(p),console.log("[GRAPES Popup] Using source tab:",e,a)}catch(n){console.log("[GRAPES Popup] Failed to get source tab:",n)}}if(!e||!a){const[n]=await o.tabs.query({active:!0,currentWindow:!0});n?.id&&n.url&&!n.url.startsWith("chrome")&&(e=n.id,p=n.url,a=v(p),console.log("[GRAPES Popup] Using active tab:",e,a))}if(e)try{if(r=await o.runtime.sendMessage({type:"GET_CURRENT_LOG_ENTRY",tabId:e}),l=await o.runtime.sendMessage({type:"GET_TAB_SURVEILLANCE",tabId:e}),console.log("[GRAPES Popup] Log entry:",r),console.log("[GRAPES Popup] Surveillance:",l),!r&&!l&&a){console.log("[GRAPES Popup] No in-memory data, checking persisted logs for domain:",a);const n=await o.runtime.sendMessage({type:"GET_ALL_LOGS"});if(n&&Array.isArray(n)){const c=n.filter(d=>d.domain===a);c.length>0&&(r=c.sort((d,f)=>f.timestamp-d.timestamp)[0],console.log("[GRAPES Popup] Found persisted log entry:",r))}}}catch(n){console.log("[GRAPES Popup] Failed to get surveillance data:",n)}g()}catch(s){console.error("[GRAPES Popup] Init error:",s),document.getElementById("root").innerHTML=`<div class="popup-container"><p>Error: ${s}</p></div>`}}document.readyState==="loading"?document.addEventListener("DOMContentLoaded",b):b();
