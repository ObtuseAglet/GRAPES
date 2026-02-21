// Test state
const testResults = {
    test1: null,
    test2: null,
    test3: null,
    test4: null,
    test5: null
};

// Helper functions
function log(outputId, message, type = 'info') {
    const output = document.getElementById(outputId);
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    output.appendChild(entry);
    output.scrollTop = output.scrollHeight;
}

function clearLog(outputId) {
    document.getElementById(outputId).innerHTML = '';
}

function setStatus(testId, passed) {
    const statusEl = document.getElementById(`${testId}-status`);
    statusEl.className = `status-badge ${passed ? 'status-pass' : 'status-fail'}`;
    statusEl.textContent = passed ? 'PASSED' : 'FAILED';
    testResults[testId] = passed;
    updateScore();
}

function updateScore() {
    const results = Object.values(testResults).filter(r => r !== null);
    const passed = results.filter(r => r === true).length;
    const total = results.length;
    
    const scoreEl = document.getElementById('final-score');
    const messageEl = document.getElementById('score-message');
    
    scoreEl.textContent = `${passed}/${total}`;
    
    if (total === 5) {
        if (passed === 5) {
            scoreEl.className = 'score';
            messageEl.textContent = '🎉 Perfect! GRAPES stealth mode is fully operational!';
        } else if (passed >= 3) {
            scoreEl.className = 'score partial';
            messageEl.textContent = '⚠️ Partial stealth - some detection methods may still work';
        } else {
            scoreEl.className = 'score fail';
            messageEl.textContent = '❌ Stealth mode may not be working correctly';
        }
    } else {
        messageEl.textContent = `${5 - total} test(s) remaining`;
    }
}

// Test 1: MutationObserver Interception
document.getElementById('run-test1').addEventListener('click', () => {
    clearLog('test1-output');
    log('test1-output', 'Starting MutationObserver interception test...', 'info');
    
    let grapesDetected = false;
    const mutationLog = []; // Collect mutations instead of logging live
    
    // Create observer
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            // Don't log here - just collect data to avoid feedback loop
            mutationLog.push({
                type: mutation.type,
                target: mutation.target.nodeName
            });
            
            // Check if any mutation involves grapes
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const el = node;
                    if (el.id && el.id.includes('grapes')) {
                        grapesDetected = true;
                        mutationLog.push({
                            error: true,
                            message: `GRAPES element detected: ${el.id}`
                        });
                    }
                }
            });
        });
    });
    
    // Start observing
    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
    });
    
    log('test1-output', 'Observer started on document.body', 'info');
    log('test1-output', 'Waiting 1 second to collect mutations...', 'info');
    
    // Wait a moment then check results
    setTimeout(() => {
        observer.disconnect();
        
        // Now safe to log - observer is disconnected
        log('test1-output', `Observer disconnected. Collected ${mutationLog.length} mutations.`, 'info');
        
        // Show some of the mutations (limit to avoid flooding)
        const toShow = mutationLog.slice(0, 10);
        toShow.forEach(m => {
            if (m.error) {
                log('test1-output', `❌ ${m.message}`, 'error');
            } else {
                log('test1-output', `Mutation: ${m.type} on ${m.target}`, 'warn');
            }
        });
        if (mutationLog.length > 10) {
            log('test1-output', `... and ${mutationLog.length - 10} more mutations`, 'info');
        }
        
        if (grapesDetected) {
            log('test1-output', '❌ TEST FAILED: MutationObserver detected GRAPES elements', 'error');
            setStatus('test1', false);
        } else {
            log('test1-output', '✅ TEST PASSED: No GRAPES elements detected by observer', 'success');
            setStatus('test1', true);
        }
    }, 1000);
});

// Test 2: DOM Query Hiding
document.getElementById('run-test2').addEventListener('click', () => {
    clearLog('test2-output');
    log('test2-output', 'Starting DOM query hiding test...', 'info');
    
    let failures = 0;
    
    // Test getElementById
    const byId = document.getElementById('grapes-custom-styles');
    if (byId) {
        log('test2-output', '❌ getElementById found grapes-custom-styles', 'error');
        failures++;
    } else {
        log('test2-output', '✅ getElementById returned null for grapes-custom-styles', 'success');
    }
    
    // Test querySelector
    const byQuery = document.querySelector('[id^="grapes"]');
    if (byQuery) {
        log('test2-output', `❌ querySelector found element: ${byQuery.id}`, 'error');
        failures++;
    } else {
        log('test2-output', '✅ querySelector returned null for [id^="grapes"]', 'success');
    }
    
    // Test querySelectorAll
    const allGrapes = document.querySelectorAll('[id*="grapes"]');
    if (allGrapes.length > 0) {
        log('test2-output', `❌ querySelectorAll found ${allGrapes.length} grapes elements`, 'error');
        failures++;
    } else {
        log('test2-output', '✅ querySelectorAll returned empty for [id*="grapes"]', 'success');
    }
    
    // Test data attribute query
    const byData = document.querySelectorAll('[data-grapes-injected]');
    if (byData.length > 0) {
        log('test2-output', `❌ Found ${byData.length} elements with data-grapes-injected`, 'error');
        failures++;
    } else {
        log('test2-output', '✅ No elements found with data-grapes-injected', 'success');
    }
    
    if (failures === 0) {
        log('test2-output', '✅ TEST PASSED: All DOM queries properly hidden', 'success');
        setStatus('test2', true);
    } else {
        log('test2-output', `❌ TEST FAILED: ${failures} query method(s) leaked GRAPES elements`, 'error');
        setStatus('test2', false);
    }
});

// Test 3: Child Nodes Enumeration
document.getElementById('run-test3').addEventListener('click', () => {
    clearLog('test3-output');
    log('test3-output', 'Starting child nodes enumeration test...', 'info');
    
    let failures = 0;
    
    // Check head.childNodes
    const headChildren = document.head.childNodes;
    let grapesInHead = 0;
    for (const node of headChildren) {
        if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node;
            if (el.id && el.id.includes('grapes')) {
                grapesInHead++;
            }
        }
    }
    if (grapesInHead > 0) {
        log('test3-output', `❌ Found ${grapesInHead} GRAPES elements in head.childNodes`, 'error');
        failures++;
    } else {
        log('test3-output', '✅ No GRAPES elements in head.childNodes', 'success');
    }
    
    // Check head.children
    const headChildrenElements = document.head.children;
    let grapesInHeadChildren = 0;
    for (const el of headChildrenElements) {
        if (el.id && el.id.includes('grapes')) {
            grapesInHeadChildren++;
        }
    }
    if (grapesInHeadChildren > 0) {
        log('test3-output', `❌ Found ${grapesInHeadChildren} GRAPES elements in head.children`, 'error');
        failures++;
    } else {
        log('test3-output', '✅ No GRAPES elements in head.children', 'success');
    }
    
    // Check body.children
    const bodyChildren = document.body.children;
    let grapesInBody = 0;
    for (const el of bodyChildren) {
        if (el.id && el.id.includes('grapes')) {
            grapesInBody++;
        }
    }
    if (grapesInBody > 0) {
        log('test3-output', `❌ Found ${grapesInBody} GRAPES elements in body.children`, 'error');
        failures++;
    } else {
        log('test3-output', '✅ No GRAPES elements in body.children', 'success');
    }
    
    if (failures === 0) {
        log('test3-output', '✅ TEST PASSED: Child enumeration properly filtered', 'success');
        setStatus('test3', true);
    } else {
        log('test3-output', `❌ TEST FAILED: ${failures} enumeration(s) leaked GRAPES elements`, 'error');
        setStatus('test3', false);
    }
});

// Test 4: innerHTML Inspection
document.getElementById('run-test4').addEventListener('click', () => {
    clearLog('test4-output');
    log('test4-output', 'Starting innerHTML inspection test...', 'info');
    
    const headHTML = document.head.innerHTML;
    
    // Check for grapes style tags
    const grapesStyleMatch = headHTML.match(/id="grapes[^"]*"/g);
    
    if (grapesStyleMatch) {
        log('test4-output', `❌ Found GRAPES references in head.innerHTML: ${grapesStyleMatch.join(', ')}`, 'error');
        log('test4-output', '❌ TEST FAILED: innerHTML leaks GRAPES elements', 'error');
        setStatus('test4', false);
    } else {
        log('test4-output', '✅ No GRAPES style tags found in head.innerHTML', 'success');
        log('test4-output', `ℹ️ head.innerHTML length: ${headHTML.length} chars`, 'info');
        log('test4-output', '✅ TEST PASSED: innerHTML properly sanitized', 'success');
        setStatus('test4', true);
    }
});

// Test 5: Live Injection Detection
document.getElementById('run-test5').addEventListener('click', () => {
    clearLog('test5-output');
    log('test5-output', 'Starting live injection detection test...', 'info');
    
    const target = document.getElementById('grapes-test-target');
    let sawGrapes = false;
    let sawRegular = false;
    const observedElements = []; // Collect observations to avoid feedback loop
    
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === Node.ELEMENT_NODE) {
                    const el = node;
                    observedElements.push({ tag: el.tagName, id: el.id });
                    
                    if (el.id === 'grapes-test-injected') {
                        sawGrapes = true;
                    }
                    if (el.id === 'regular-test-element') {
                        sawRegular = true;
                    }
                }
            });
        });
    });
    
    observer.observe(target, { childList: true, subtree: true });
    log('test5-output', 'Observer attached to test target', 'info');
    
    // Inject a GRAPES-style element (should be hidden)
    setTimeout(() => {
        const grapesEl = document.createElement('div');
        grapesEl.id = 'grapes-test-injected';
        grapesEl.setAttribute('data-grapes-injected', 'true');
        grapesEl.textContent = 'GRAPES injected element';
        grapesEl.style.cssText = 'padding: 5px; background: #9b59b6; color: white; border-radius: 4px; margin: 5px 0;';
        target.appendChild(grapesEl);
    }, 100);
    
    // Inject a regular element (should be visible to observer)
    setTimeout(() => {
        const regularEl = document.createElement('div');
        regularEl.id = 'regular-test-element';
        regularEl.textContent = 'Regular element';
        regularEl.style.cssText = 'padding: 5px; background: #3498db; color: white; border-radius: 4px; margin: 5px 0;';
        target.appendChild(regularEl);
    }, 200);
    
    // Check results
    setTimeout(() => {
        observer.disconnect();
        
        // Now safe to log - observer is disconnected
        log('test5-output', 'Injected GRAPES element (id="grapes-test-injected")', 'info');
        log('test5-output', 'Injected regular element (id="regular-test-element")', 'info');
        log('test5-output', 'Observer disconnected, checking results...', 'info');
        
        // Log what the observer saw
        observedElements.forEach(el => {
            if (el.id === 'grapes-test-injected') {
                log('test5-output', `Observer saw: ${el.tag} with id="${el.id}" ❌`, 'error');
            } else if (el.id === 'regular-test-element') {
                log('test5-output', `Observer saw: ${el.tag} with id="${el.id}" ✅`, 'success');
            } else {
                log('test5-output', `Observer saw: ${el.tag} with id="${el.id}"`, 'warn');
            }
        });
        
        if (!sawGrapes && sawRegular) {
            log('test5-output', '✅ TEST PASSED: GRAPES hidden, regular visible', 'success');
            setStatus('test5', true);
        } else if (sawGrapes) {
            log('test5-output', '❌ TEST FAILED: GRAPES element was detected', 'error');
            setStatus('test5', false);
        } else if (!sawRegular) {
            log('test5-output', '❌ TEST FAILED: Regular element was also hidden (over-filtering)', 'error');
            setStatus('test5', false);
        }
        
        // Cleanup
        const grapesEl = document.getElementById('grapes-test-injected');
        const regularEl = document.getElementById('regular-test-element');
        if (grapesEl) grapesEl.remove();
        if (regularEl) regularEl.remove();
    }, 500);
});

// Run All Tests
document.getElementById('run-all-tests').addEventListener('click', async () => {
    // Reset all statuses
    for (let i = 1; i <= 5; i++) {
        const statusEl = document.getElementById(`test${i}-status`);
        statusEl.className = 'status-badge status-pending';
        statusEl.textContent = 'Running...';
        testResults[`test${i}`] = null;
    }
    
    // Run tests sequentially with delays
    document.getElementById('run-test1').click();
    await new Promise(r => setTimeout(r, 1500));
    
    document.getElementById('run-test2').click();
    await new Promise(r => setTimeout(r, 500));
    
    document.getElementById('run-test3').click();
    await new Promise(r => setTimeout(r, 500));
    
    document.getElementById('run-test4').click();
    await new Promise(r => setTimeout(r, 500));
    
    document.getElementById('run-test5').click();
});

// Initial check for GRAPES extension
window.addEventListener('load', () => {
    setTimeout(() => {
        // Check if GRAPES content script is loaded by looking for the toast styles capability
        const hasGrapes = window.MutationObserver.toString().includes('native code') === false;
        if (hasGrapes) {
            console.log('[Stealth Test] GRAPES stealth mode detected - MutationObserver is proxied');
        } else {
            console.log('[Stealth Test] Warning: GRAPES stealth mode may not be active');
        }
    }, 100);
});
