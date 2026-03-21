---
name: "web-explorer-tester"
description: "Automatically explores web applications by testing all buttons, links, forms, tabs, and modals. Invoke when user needs comprehensive UI testing, automated exploration, or wants to verify all interactive elements work correctly."
---

# Web Application Explorer Tester

## Purpose

This skill automatically explores a web application to test all interactive elements including:
- Buttons (click, verify response)
- Links (navigate, check for errors)
- Forms (fill, submit, validate)
- Tabs (switch, verify content)
- Modals/Dialogs (open, close, verify)
- Dropdowns/Menus (expand, select)

It generates a comprehensive test report with coverage metrics and issues found.

## When to Invoke

- User wants to test all UI elements automatically
- User needs comprehensive coverage testing
- User wants to find broken links/buttons
- User needs regression testing
- User asks "test everything" or "explore the app"

## Prerequisites

- A browser must be connected via `mcp_chrome-devtools_*` tools
- The target web application should be loaded in the browser

## Testing Phases

### Phase 1: Discovery

First, discover all interactive elements on the page:

```javascript
// Discover all interactive elements
() => {
  const elements = {
    buttons: Array.from(document.querySelectorAll('button')).map(b => ({
      text: b.textContent?.trim(),
      disabled: b.disabled,
      visible: b.offsetParent !== null,
      type: b.type,
      id: b.id,
      className: b.className
    })),
    links: Array.from(document.querySelectorAll('a[href]')).map(a => ({
      text: a.textContent?.trim(),
      href: a.href,
      isExternal: !a.href.includes(window.location.hostname),
      id: a.id
    })),
    forms: Array.from(document.querySelectorAll('form')).map(f => ({
      id: f.id,
      action: f.action,
      method: f.method,
      inputs: f.querySelectorAll('input, select, textarea').length
    })),
    inputs: Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
      type: i.type || i.tagName.toLowerCase(),
      name: i.name,
      id: i.id,
      required: i.required,
      placeholder: i.placeholder
    })),
    tabs: Array.from(document.querySelectorAll('[role="tab"], .tab, [class*="tab"]')).map(t => ({
      text: t.textContent?.trim(),
      active: t.getAttribute('aria-selected') === 'true' || t.classList.contains('active'),
      id: t.id
    })),
    modals: Array.from(document.querySelectorAll('[role="dialog"], .modal, [class*="modal"]')).map(m => ({
      visible: m.offsetParent !== null,
      id: m.id,
      hasCloseBtn: !!m.querySelector('[aria-label*="close"], .close, button[class*="close"]')
    })),
    selects: Array.from(document.querySelectorAll('select')).map(s => ({
      id: s.id,
      name: s.name,
      options: s.querySelectorAll('option').length,
      required: s.required
    }))
  };
  
  elements.summary = {
    totalButtons: elements.buttons.length,
    totalLinks: elements.links.length,
    totalForms: elements.forms.length,
    totalInputs: elements.inputs.length,
    totalTabs: elements.tabs.length,
    totalModals: elements.modals.length,
    totalSelects: elements.selects.length
  };
  
  return elements;
}
```

### Phase 2: Interactive Testing

#### 2.1 Test All Buttons

For each button found:
1. Check if visible and not disabled
2. Click the button
3. Wait for response (check for modals, page changes, errors)
4. Log the result

```javascript
// Click button and capture result
async (buttonText) => {
  const buttons = Array.from(document.querySelectorAll('button'));
  const btn = buttons.find(b => b.textContent?.includes(buttonText));
  if (!btn) return { success: false, error: 'Button not found' };
  if (btn.disabled) return { success: false, error: 'Button disabled' };
  
  const beforeState = {
    url: window.location.href,
    modalCount: document.querySelectorAll('[role="dialog"]:not([hidden])').length
  };
  
  btn.click();
  
  await new Promise(r => setTimeout(r, 500));
  
  const afterState = {
    url: window.location.href,
    modalCount: document.querySelectorAll('[role="dialog"]:not([hidden])').length,
    errors: window.__lastError || null
  };
  
  return {
    success: true,
    stateChanged: beforeState.url !== afterState.url,
    modalOpened: afterState.modalCount > beforeState.modalCount,
    before: beforeState,
    after: afterState
  };
}
```

#### 2.2 Test All Links

For each link:
1. Capture the href
2. Check if it's internal or external
3. For internal links, navigate and check for 404
4. Return to original page

```javascript
// Test link navigation
async (linkText) => {
  const links = Array.from(document.querySelectorAll('a[href]'));
  const link = links.find(l => l.textContent?.includes(linkText));
  if (!link) return { success: false, error: 'Link not found' };
  
  const href = link.href;
  const isExternal = !href.includes(window.location.hostname);
  
  if (isExternal) {
    return { success: true, type: 'external', href, note: 'External link - not tested' };
  }
  
  const startUrl = window.location.href;
  link.click();
  await new Promise(r => setTimeout(r, 1000));
  
  const newUrl = window.location.href;
  const pageContent = document.body.innerText;
  const has404 = pageContent.includes('404') || pageContent.includes('Not Found');
  
  return {
    success: !has404,
    startUrl,
    endUrl: newUrl,
    navigated: startUrl !== newUrl,
    hasError: has404
  };
}
```

#### 2.3 Test All Forms

For each form:
1. Fill all required fields with valid test data
2. Submit the form
3. Check for validation errors or success response

```javascript
// Fill form with test data
async (formSelector) => {
  const form = document.querySelector(formSelector);
  if (!form) return { success: false, error: 'Form not found' };
  
  const inputs = form.querySelectorAll('input, select, textarea');
  const filled = [];
  
  for (const input of inputs) {
    const type = input.type || input.tagName.toLowerCase();
    let value;
    
    switch(type) {
      case 'email':
        value = 'test@example.com';
        break;
      case 'number':
        value = '123';
        break;
      case 'tel':
        value = '1234567890';
        break;
      case 'text':
        value = 'Test Value';
        break;
      case 'textarea':
        value = 'Test content for textarea';
        break;
      case 'select-one':
        const options = input.querySelectorAll('option');
        if (options.length > 1) {
          input.value = options[1].value;
          value = options[1].value;
        }
        break;
      case 'checkbox':
      case 'radio':
        input.checked = true;
        value = true;
        break;
      case 'password':
        value = 'TestPassword123!';
        break;
      case 'url':
        value = 'https://example.com';
        break;
      case 'date':
        value = '2025-01-01';
        break;
      default:
        value = 'test';
    }
    
    if (value !== undefined && type !== 'select-one') {
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }
    filled.push({ type, name: input.name, value });
  }
  
  return { success: true, filled };
}
```

#### 2.4 Test All Tabs

For each tab:
1. Click the tab
2. Verify content changed
3. Check for errors

```javascript
// Test tab switching
async (tabText) => {
  const tabs = Array.from(document.querySelectorAll('[role="tab"], .tab, [class*="tab"]'));
  const tab = tabs.find(t => t.textContent?.includes(tabText));
  if (!tab) return { success: false, error: 'Tab not found' };
  
  const beforeContent = document.body.innerHTML.length;
  const beforeActive = tab.getAttribute('aria-selected') || tab.classList.contains('active');
  
  tab.click();
  await new Promise(r => setTimeout(r, 300));
  
  const afterContent = document.body.innerHTML.length;
  const afterActive = tab.getAttribute('aria-selected') || tab.classList.contains('active');
  
  return {
    success: true,
    contentChanged: beforeContent !== afterContent,
    activated: !beforeActive && afterActive
  };
}
```

#### 2.5 Test Modals/Dialogs

For each modal trigger:
1. Open the modal
2. Check modal content
3. Test close button
4. Verify modal closes properly

```javascript
// Test modal open/close
async (triggerSelector) => {
  const trigger = document.querySelector(triggerSelector);
  if (!trigger) return { success: false, error: 'Trigger not found' };
  
  const beforeModals = document.querySelectorAll('[role="dialog"]:not([hidden])').length;
  
  trigger.click();
  await new Promise(r => setTimeout(r, 500));
  
  const afterModals = document.querySelectorAll('[role="dialog"]:not([hidden])').length;
  const modalOpened = afterModals > beforeModals;
  
  if (!modalOpened) {
    return { success: false, error: 'Modal did not open' };
  }
  
  // Try to close modal
  const closeBtn = document.querySelector('[role="dialog"]:not([hidden]) [aria-label*="close"], [role="dialog"]:not([hidden]) .close');
  if (closeBtn) {
    closeBtn.click();
    await new Promise(r => setTimeout(r, 300));
    
    const finalModals = document.querySelectorAll('[role="dialog"]:not([hidden])').length;
    return {
      success: true,
      opened: true,
      closed: finalModals === beforeModals
    };
  }
  
  return { success: true, opened: true, closed: false, note: 'No close button found' };
}
```

### Phase 3: Error Detection & Anomaly Detection

Monitor for:
- Console errors (`window.onerror`)
- Network errors (failed requests)
- Visual errors (elements not rendering)
- Logic errors (unexpected state changes)
- **Blank pages** (empty content after navigation)
- **Form no response** (submit without feedback)
- **Loading timeouts** (stuck in loading state)
- **Performance issues** (low FPS, memory leaks)

#### 3.1 JavaScript Error Monitoring

```javascript
// Setup error monitoring
() => {
  const errors = [];
  
  window.onerror = (msg, url, line, col, error) => {
    errors.push({ type: 'js', msg, url, line, col, time: Date.now() });
  };
  
  window.addEventListener('unhandledrejection', (e) => {
    errors.push({ type: 'promise', reason: String(e.reason), time: Date.now() });
  });
  
  window.__testErrors = errors;
  return 'Error monitoring started';
}

// Get collected errors
() => {
  return window.__testErrors || [];
}
```

#### 3.2 Blank Page Detection

Detect if a page is blank or has insufficient content:

```javascript
// Check if page is blank or nearly empty
() => {
  const bodyText = document.body.innerText.trim();
  const bodyHtml = document.body.innerHTML;
  const images = document.querySelectorAll('img').length;
  const buttons = document.querySelectorAll('button').length;
  const links = document.querySelectorAll('a').length;
  const forms = document.querySelectorAll('form').length;
  const inputs = document.querySelectorAll('input, select, textarea').length;
  
  const hasContent = bodyText.length > 50;
  const hasInteractiveElements = buttons > 0 || links > 0 || forms > 0 || inputs > 0;
  const hasVisualContent = images > 0 || bodyHtml.length > 1000;
  
  const isBlank = !hasContent && !hasInteractiveElements && !hasVisualContent;
  const isNearlyBlank = bodyText.length < 100 && !hasInteractiveElements;
  
  return {
    isBlank,
    isNearlyBlank,
    metrics: {
      textLength: bodyText.length,
      htmlLength: bodyHtml.length,
      images,
      buttons,
      links,
      forms,
      inputs
    },
    recommendation: isBlank ? 'Page appears to be blank - check for loading errors or missing content' : 
                   isNearlyBlank ? 'Page has very little content - verify this is expected' : null
  };
}
```

#### 3.3 Form No Response Detection

Detect if form submission has no visible response:

```javascript
// Test form submission and check for response
async (formSelector) => {
  const form = document.querySelector(formSelector);
  if (!form) return { success: false, error: 'Form not found' };
  
  const beforeState = {
    url: window.location.href,
    hasErrors: document.querySelectorAll('.error, .alert-danger, [class*="error"]').length,
    hasSuccess: document.querySelectorAll('.success, .alert-success, [class*="success"]').length,
    hasLoading: document.querySelectorAll('.loading, .spinner, [class*="loading"]').length,
    consoleErrors: (window.__testErrors || []).length
  };
  
  // Submit form
  const submitBtn = form.querySelector('button[type="submit"], input[type="submit"]');
  if (submitBtn) {
    submitBtn.click();
  } else {
    form.submit();
  }
  
  // Wait for response
  await new Promise(r => setTimeout(r, 2000));
  
  const afterState = {
    url: window.location.href,
    hasErrors: document.querySelectorAll('.error, .alert-danger, [class*="error"]').length,
    hasSuccess: document.querySelectorAll('.success, .alert-success, [class*="success"]').length,
    hasLoading: document.querySelectorAll('.loading, .spinner, [class*="loading"]').length,
    consoleErrors: (window.__testErrors || []).length,
    navigated: beforeState.url !== window.location.href
  };
  
  const hasResponse = 
    afterState.hasErrors > beforeState.hasErrors ||
    afterState.hasSuccess > beforeState.hasSuccess ||
    afterState.navigated ||
    afterState.consoleErrors > beforeState.consoleErrors;
  
  return {
    success: true,
    hasResponse,
    noResponse: !hasResponse,
    beforeState,
    afterState,
    issue: !hasResponse ? 'Form submitted but no visible response detected (no error/success message, no navigation, no console errors)' : null
  };
}
```

#### 3.4 Loading State Timeout Detection

Detect pages stuck in loading state:

```javascript
// Check for stuck loading states
async (timeoutMs = 5000) => {
  const loadingSelectors = [
    '.loading', '.spinner', '.loader', 
    '[class*="loading"]', '[class*="spinner"]',
    '[aria-busy="true"]'
  ];
  
  const startTime = Date.now();
  let loadingElements = [];
  
  while (Date.now() - startTime < timeoutMs) {
    loadingElements = [];
    for (const selector of loadingSelectors) {
      const elements = document.querySelectorAll(selector);
      elements.forEach(el => {
        if (el.offsetParent !== null) { // visible
          loadingElements.push({
            selector,
            text: el.textContent?.trim().substring(0, 50),
            visible: true
          });
        }
      });
    }
    
    if (loadingElements.length === 0) {
      return { isStuck: false, loadingElements: [] };
    }
    
    await new Promise(r => setTimeout(r, 500));
  }
  
  return {
    isStuck: loadingElements.length > 0,
    loadingElements,
    duration: Date.now() - startTime,
    issue: loadingElements.length > 0 ? `Page stuck in loading state for ${timeoutMs}ms` : null
  };
}
```

#### 3.5 Network Error Detection

Check for failed network requests:

```javascript
// Monitor network errors
() => {
  const networkErrors = [];
  const originalFetch = window.fetch;
  const originalXHR = window.XMLHttpRequest.prototype.open;
  
  window.fetch = function(...args) {
    return originalFetch.apply(this, args).catch(err => {
      networkErrors.push({
        type: 'fetch',
        url: args[0],
        error: err.message,
        time: Date.now()
      });
      throw err;
    });
  };
  
  window.__networkErrors = networkErrors;
  return 'Network monitoring started';
}

// Get network errors
() => {
  return window.__networkErrors || [];
}
```

#### 3.6 FPS Performance Monitoring (借鉴 Gremlins.js)

Monitor frame rate during testing to detect performance issues:

```javascript
// FPS Monitor - similar to Gremlins.js fpsMogwai
() => {
  const fpsMonitor = {
    samples: [],
    lastTime: performance.now(),
    frames: 0,
    isRunning: false,
    warningThreshold: 10,
    intervalId: null
  };
  
  const measureFPS = () => {
    const now = performance.now();
    fpsMonitor.frames++;
    
    if (now - fpsMonitor.lastTime >= 500) {
      const fps = Math.round((fpsMonitor.frames * 1000) / (now - fpsMonitor.lastTime));
      fpsMonitor.samples.push({
        fps,
        time: Date.now(),
        warning: fps < fpsMonitor.warningThreshold
      });
      fpsMonitor.frames = 0;
      fpsMonitor.lastTime = now;
    }
  };
  
  const start = () => {
    fpsMonitor.isRunning = true;
    fpsMonitor.intervalId = setInterval(() => {
      requestAnimationFrame(measureFPS);
    }, 100);
  };
  
  const stop = () => {
    fpsMonitor.isRunning = false;
    if (fpsMonitor.intervalId) {
      clearInterval(fpsMonitor.intervalId);
    }
  };
  
  const getStats = () => {
    const fpsValues = fpsMonitor.samples.map(s => s.fps);
    return {
      samples: fpsMonitor.samples.length,
      avg: fpsValues.length ? Math.round(fpsValues.reduce((a, b) => a + b) / fpsValues.length) : 0,
      min: fpsValues.length ? Math.min(...fpsValues) : 0,
      max: fpsValues.length ? Math.max(...fpsValues) : 0,
      warnings: fpsMonitor.samples.filter(s => s.warning).length,
      details: fpsMonitor.samples
    };
  };
  
  window.__fpsMonitor = { start, stop, getStats };
  return 'FPS monitor initialized. Call window.__fpsMonitor.start() to begin.';
}

// Start FPS monitoring
() => {
  if (window.__fpsMonitor) {
    window.__fpsMonitor.start();
    return 'FPS monitoring started';
  }
  return 'FPS monitor not initialized';
}

// Get FPS stats
() => {
  if (window.__fpsMonitor) {
    return window.__fpsMonitor.getStats();
  }
  return null;
}
```

#### 3.7 Trace Tracking (借鉴 Playwright)

Record execution trace for debugging:

```javascript
// Initialize trace recorder
() => {
  const trace = {
    entries: [],
    startTime: Date.now(),
    isRecording: false
  };
  
  const record = (action, details) => {
    trace.entries.push({
      time: Date.now() - trace.startTime,
      action,
      details,
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
  };
  
  // Intercept clicks
  document.addEventListener('click', (e) => {
    if (trace.isRecording) {
      record('click', {
        target: e.target.tagName,
        text: e.target.textContent?.substring(0, 50),
        id: e.target.id,
        className: e.target.className
      });
    }
  }, true);
  
  // Intercept form submissions
  document.addEventListener('submit', (e) => {
    if (trace.isRecording) {
      record('submit', {
        formId: e.target.id,
        action: e.target.action,
        method: e.target.method
      });
    }
  }, true);
  
  // Intercept navigation
  const originalPushState = history.pushState;
  history.pushState = function(...args) {
    if (trace.isRecording) {
      record('navigation', { type: 'pushState', args: args.map(String) });
    }
    return originalPushState.apply(this, args);
  };
  
  window.__trace = {
    start: () => { trace.isRecording = true; trace.startTime = Date.now(); trace.entries = []; },
    stop: () => { trace.isRecording = false; },
    getEntries: () => trace.entries,
    getSummary: () => ({
      totalActions: trace.entries.length,
      duration: Date.now() - trace.startTime,
      actions: trace.entries.reduce((acc, e) => {
        acc[e.action] = (acc[e.action] || 0) + 1;
        return acc;
      }, {})
    })
  };
  
  return 'Trace recorder initialized. Call window.__trace.start() to begin recording.';
}
```

#### 3.8 Stress Testing Mode (借鉴 Gremlins.js)

Random exploration for stress testing:

```javascript
// Stress test configuration
() => {
  const stressTest = {
    config: {
      maxActions: 1000,
      delayMs: 50,
      stopOnError: true,
      maxErrors: 10
    },
    stats: {
      actions: 0,
      errors: 0,
      startTime: null
    },
    isRunning: false,
    actions: []
  };
  
  // Define random actions
  const randomActions = {
    click: () => {
      const buttons = Array.from(document.querySelectorAll('button')).filter(b => !b.disabled && b.offsetParent !== null);
      if (buttons.length > 0) {
        const btn = buttons[Math.floor(Math.random() * buttons.length)];
        btn.click();
        return { action: 'click', target: btn.textContent?.substring(0, 30) };
      }
      return null;
    },
    fillForm: () => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"], textarea')).filter(i => i.offsetParent !== null);
      if (inputs.length > 0) {
        const input = inputs[Math.floor(Math.random() * inputs.length)];
        const value = 'stress_test_' + Math.random().toString(36).substring(7);
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return { action: 'fill', target: input.name || input.id };
      }
      return null;
    },
    scroll: () => {
      const scrollAmount = Math.floor(Math.random() * 500) - 250;
      window.scrollBy(0, scrollAmount);
      return { action: 'scroll', amount: scrollAmount };
    },
    navigate: () => {
      const links = Array.from(document.querySelectorAll('a[href]')).filter(a => 
        a.offsetParent !== null && 
        a.href.includes(window.location.hostname) &&
        !a.href.includes('#') &&
        !a.href.includes('logout')
      );
      if (links.length > 0 && Math.random() > 0.8) {
        const link = links[Math.floor(Math.random() * links.length)];
        return { action: 'navigate', target: link.href };
      }
      return null;
    }
  };
  
  const runAction = () => {
    if (!stressTest.isRunning) return;
    if (stressTest.stats.actions >= stressTest.config.maxActions) {
      stopStressTest();
      return;
    }
    if (stressTest.stats.errors >= stressTest.config.maxErrors) {
      stopStressTest();
      return;
    }
    
    const actionTypes = Object.keys(randomActions);
    const actionType = actionTypes[Math.floor(Math.random() * actionTypes.length)];
    
    try {
      const result = randomActions[actionType]();
      if (result) {
        stressTest.stats.actions++;
        stressTest.actions.push({ ...result, time: Date.now() - stressTest.stats.startTime });
      }
    } catch (e) {
      stressTest.stats.errors++;
      stressTest.actions.push({ action: 'error', error: e.message, time: Date.now() - stressTest.stats.startTime });
    }
    
    setTimeout(runAction, stressTest.config.delayMs);
  };
  
  const startStressTest = (config = {}) => {
    Object.assign(stressTest.config, config);
    stressTest.stats = { actions: 0, errors: 0, startTime: Date.now() };
    stressTest.actions = [];
    stressTest.isRunning = true;
    runAction();
    return 'Stress test started';
  };
  
  const stopStressTest = () => {
    stressTest.isRunning = false;
    return {
      stopped: true,
      stats: stressTest.stats,
      duration: Date.now() - stressTest.stats.startTime,
      actionsPerSecond: stressTest.stats.actions / ((Date.now() - stressTest.stats.startTime) / 1000)
    };
  };
  
  window.__stressTest = {
    start: startStressTest,
    stop: stopStressTest,
    getStats: () => stressTest.stats,
    getActions: () => stressTest.actions,
    configure: (config) => Object.assign(stressTest.config, config)
  };
  
  return 'Stress test module initialized. Call window.__stressTest.start() to begin.';
}
```

### Phase 4: Report Generation

Generate a comprehensive report including:
- **Coverage**: % of elements tested
- **Issues Found**: List of problems
- **Recommendations**: Suggested fixes
- **Test Log**: Detailed actions taken

## Execution Instructions

When this skill is invoked, follow these steps:

### Step 1: Initialize Test Session

1. Use `mcp_chrome-devtools_list_pages` to get current page
2. Use `mcp_chrome-devtools_evaluate_script` to setup error monitoring
3. Use `mcp_chrome-devtools_evaluate_script` to initialize FPS monitor
4. Use `mcp_chrome-devtools_evaluate_script` to initialize trace recorder
5. Use `mcp_chrome-devtools_evaluate_script` to discover all elements
6. Start FPS monitoring and trace recording

### Step 2: Run Tests

For each element type, systematically test:

1. **Buttons**: Click each visible, enabled button and verify response
2. **Links**: Navigate to each internal link, check for errors
3. **Forms**: Fill and submit each form
4. **Tabs**: Click each tab, verify content changes
5. **Modals**: Open and close each modal
6. **Selects**: Change each select value

### Step 3: Run Stress Test (Optional)

If stress testing is requested:
1. Initialize stress test module
2. Configure parameters (maxActions, delayMs, maxErrors)
3. Run stress test for specified duration
4. Collect stress test results

### Step 4: Collect Results

1. Use `mcp_chrome-devtools_list_console_messages` to check for errors
2. Use `mcp_chrome-devtools_evaluate_script` to get FPS statistics
3. Use `mcp_chrome-devtools_evaluate_script` to get trace summary
4. Use `mcp_chrome-devtools_evaluate_script` to get test results
5. Stop FPS monitoring and trace recording

### Step 5: Generate Report

Create a markdown report with:
- Summary statistics
- Performance metrics (FPS, Trace)
- Issues found (categorized by severity)
- Test coverage metrics
- Recommendations

## Test Report Template

```markdown
# Web Application Exploration Test Report

## Summary
- **URL Tested**: [url]
- **Date**: [timestamp]
- **Duration**: [duration]
- **Test Mode**: [Normal/Stress/Both]

## Performance Metrics

### FPS Statistics
| Metric | Value |
|--------|-------|
| Average FPS | X |
| Min FPS | X |
| Max FPS | X |
| FPS Warnings | X |

### Trace Summary
| Action Type | Count |
|-------------|-------|
| Clicks | X |
| Form Submissions | X |
| Navigations | X |
| Total Actions | X |

## Coverage
| Element Type | Found | Tested | Success | Failed | Coverage |
|-------------|-------|--------|---------|--------|----------|
| Buttons | X | Y | Z | W | Z/Y% |
| Links | X | Y | Z | W | Z/Y% |
| Forms | X | Y | Z | W | Z/Y% |
| Tabs | X | Y | Z | W | Z/Y% |
| Modals | X | Y | Z | W | Z/Y% |

## Anomalies Detected

### Blank Pages
| Page URL | Status | Details |
|----------|--------|---------|
| ... | Blank/Nearly Blank | ... |

### Form No Response
| Form | Action | Issue |
|------|--------|-------|
| ... | ... | No response after submission |

### Loading Timeouts
| Page | Duration | Element |
|------|----------|---------|
| ... | Xms | Loading spinner stuck |

### Performance Issues
| Issue | Details | Recommendation |
|-------|---------|----------------|
| Low FPS | Avg: X FPS | Optimize rendering |
| Memory Leak | ... | Check event listeners |

## Issues Found

### Critical
- [Issue description with steps to reproduce]

### Warning
- [Issue description]

### Info
- [Issue description]

## Test Log
| Time | Action | Element | Result | Duration |
|------|--------|---------|--------|----------|
| ... | ... | ... | ... | Xms |

## Trace Details
```
[Detailed execution trace for debugging]
```

## Recommendations
1. [Recommendation]
2. [Recommendation]

## Screenshots
[If applicable]
```

## Best Practices

1. **Start from main pages**: Begin testing from dashboard or main entry points
2. **Test incrementally**: Test one section at a time for better debugging
3. **Capture screenshots**: Use `mcp_chrome-devtools_playwright_screenshot` for visual evidence
4. **Check console**: Always check console messages after each action
5. **Handle authentication**: Skip or handle login flows appropriately
6. **Respect rate limits**: Add delays between actions to avoid overwhelming the server

## Limitations

- Cannot test authentication flows automatically (requires pre-login)
- Cannot test payment flows (requires test payment methods)
- External links are only checked for existence, not navigated
- CAPTCHA-protected forms cannot be tested automatically
- File upload inputs require manual testing

## Related Skills

- `browser-test-verification`: For verifying specific fixes
- `react-router-debugger`: For navigation issues
- `frontend-architect`: For UI architecture problems
