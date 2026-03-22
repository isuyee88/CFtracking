#!/usr/bin/env node

/**
 * Lighthouse Performance Test Script
 * Lighthouse 性能测试脚本
 * 
 * 输入：本地服务器 URL 或静态文件
 * 输出：Lighthouse 性能报告
 * 逻辑：使用 Puppeteer 启动 Chrome 并运行 Lighthouse
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FRONTEND_DIR = path.join(__dirname);
const DIST_DIR = path.join(FRONTEND_DIR, 'dist');
const REPORT_PATH = path.join(FRONTEND_DIR, 'LIGHTHOUSE_REPORT.md');

// Test configuration
const config = {
  extends: 'lighthouse:default',
  settings: {
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    onlyAudits: [
      'first-contentful-paint',
      'largest-contentful-paint',
      'cumulative-layout-shift',
      'total-blocking-time',
      'speed-index',
      'interactive'
    ],
    screenEmulation: {
      mobile: true,
      width: 375,
      height: 812,
      deviceScaleFactor: 2,
      disabled: false
    },
    throttling: {
      rttMs: 150,
      throughputKbps: 1638.4,
      requestLatencyMs: 562,
      downloadThroughputKbps: 1474.56,
      uploadThroughputKbps: 675,
      cpuSlowdownMultiplier: 4
    }
  }
};

// Helper functions
function log(message, color = '') {
  const colors = {
    cyan: '\x1b[36m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    gray: '\x1b[90m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[color] || ''}${message}${colors.reset}`);
}

function fileExists(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
}

// Check if build exists
log('\n=== Lighthouse Performance Test ===', 'cyan');

if (!fileExists(DIST_DIR)) {
  log('Build directory not found. Running build...', 'yellow');
  try {
    execSync('npm run build', { cwd: FRONTEND_DIR, stdio: 'inherit' });
  } catch (error) {
    log('Build failed!', 'red');
    process.exit(1);
  }
}

// Check if Lighthouse CLI is available
let lighthouseCli = null;
try {
  execSync('lhci --version', { stdio: 'pipe' });
  lighthouseCli = 'lhci';
  log('Lighthouse CI CLI found', 'green');
} catch {
  try {
    execSync('lighthouse --version', { stdio: 'pipe' });
    lighthouseCli = 'lighthouse';
    log('Lighthouse CLI found', 'green');
  } catch {
    log('Lighthouse CLI not found. Installing @lhci/cli...', 'yellow');
    try {
      execSync('npm install -g @lhci/cli', { stdio: 'inherit' });
      lighthouseCli = 'lhci';
    } catch (error) {
      log('Failed to install Lighthouse CLI', 'red');
      process.exit(1);
    }
  }
}

// Start a simple HTTP server to serve the built files
const http = require('http');
const serveStatic = require('serve-static');
const finalhandler = require('finalhandler');

const serve = serveStatic(DIST_DIR, { index: 'index.html' });
const server = http.createServer((req, res) => {
  serve(req, res, finalhandler(req, res));
});

const PORT = 4173;
const URL = `http://localhost:${PORT}`;

log(`\nStarting server on port ${PORT}...`, 'cyan');

server.listen(PORT, async () => {
  log(`Server running at ${URL}`, 'green');
  
  // Wait for server to be ready
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  try {
    // Run Lighthouse
    log('\nRunning Lighthouse...', 'cyan');
    
    const outputFile = path.join(FRONTEND_DIR, 'lighthouse-report.json');
    const htmlOutput = path.join(FRONTEND_DIR, 'lighthouse-report.html');
    
    let command = '';
    if (lighthouseCli === 'lhci') {
      command = `lhci autorun --url=${URL} --output=json --output-path=${outputFile} --collect.settings.onlyCategories=performance,accessibility,best-practices,seo --collect.settings.screenEmulation.mobile=true --collect.settings.throttling.cpuSlowdownMultiplier=4`;
    } else {
      command = `lighthouse ${URL} --output=json --output-path=${outputFile} --output=html --output-path=${htmlOutput} --only-categories=performance,accessibility,best-practices,seo --screenEmulation.mobile=true --throttling.cpuSlowdownMultiplier=4`;
    }
    
    log(`Executing: ${command}`, 'gray');
    
    try {
      execSync(command, { 
        cwd: FRONTEND_DIR, 
        stdio: 'inherit',
        env: { ...process.env, LHCI_BUILD_CONTEXT: 'HEAD' }
      });
    } catch (error) {
      log('Lighthouse run completed (may have warnings)', 'yellow');
    }
    
    // Read results
    let results = null;
    if (fileExists(outputFile)) {
      const reportData = JSON.parse(fs.readFileSync(outputFile, 'utf-8'));
      results = reportData;
    }
    
    // Generate report
    log('\nGenerating report...', 'cyan');
    
    const reportDate = new Date().toISOString().replace('T', ' ').substring(0, 19);
    
    let report = `# Lighthouse Performance Report - CF Tracking Frontend

**Test Date**: ${reportDate}  
**Test URL**: ${URL}  
**Test Type**: Mobile (simulated 4G)  
**Lighthouse Version**: ${lighthouseCli}

---

## Executive Summary

`;

    if (results) {
      // Extract performance metrics
      const categories = results.categories || {};
      const audits = results.audits || {};
      
      report += `### Overall Scores

| Category | Score | Status |
|----------|-------|--------|
| Performance | ${categories.performance?.score ? (categories.performance.score * 100).toFixed(0) : 'N/A'}/100 | ${categories.performance?.score >= 0.9 ? '✅ Excellent' : categories.performance?.score >= 0.5 ? '⚠️ Needs Improvement' : '❌ Poor'} |
| Accessibility | ${categories.accessibility?.score ? (categories.accessibility.score * 100).toFixed(0) : 'N/A'}/100 | ${categories.accessibility?.score >= 0.9 ? '✅ Excellent' : '⚠️ Needs Improvement'} |
| Best Practices | ${categories['best-practices']?.score ? (categories['best-practices'].score * 100).toFixed(0) : 'N/A'}/100 | ${categories['best-practices']?.score >= 0.9 ? '✅ Excellent' : '⚠️ Needs Improvement'} |
| SEO | ${categories.seo?.score ? (categories.seo.score * 100).toFixed(0) : 'N/A'}/100 | ${categories.seo?.score >= 0.9 ? '✅ Excellent' : '⚠️ Needs Improvement'} |

---

## Performance Metrics

### Core Web Vitals

| Metric | Value | Target | Status |
|--------|-------|--------|--------|
| FCP (First Contentful Paint) | ${audits['first-contentful-paint']?.numericValue ? (audits['first-contentful-paint'].numericValue / 1000).toFixed(2) + 's' : 'N/A'} | <1.8s | ${audits['first-contentful-paint']?.numericValue < 1800 ? '✅' : audits['first-contentful-paint']?.numericValue < 3000 ? '⚠️' : '❌'} |
| LCP (Largest Contentful Paint) | ${audits['largest-contentful-paint']?.numericValue ? (audits['largest-contentful-paint'].numericValue / 1000).toFixed(2) + 's' : 'N/A'} | <2.5s | ${audits['largest-contentful-paint']?.numericValue < 2500 ? '✅' : audits['largest-contentful-paint']?.numericValue < 4000 ? '⚠️' : '❌'} |
| CLS (Cumulative Layout Shift) | ${audits['cumulative-layout-shift']?.numericValue ? audits['cumulative-layout-shift'].numericValue.toFixed(3) : 'N/A'} | <0.1 | ${audits['cumulative-layout-shift']?.numericValue < 0.1 ? '✅' : '❌'} |
| TBT (Total Blocking Time) | ${audits['total-blocking-time']?.numericValue ? audits['total-blocking-time'].numericValue.toFixed(0) + 'ms' : 'N/A'} | <200ms | ${audits['total-blocking-time']?.numericValue < 200 ? '✅' : audits['total-blocking-time']?.numericValue < 600 ? '⚠️' : '❌'} |
| Speed Index | ${audits['speed-index']?.numericValue ? (audits['speed-index'].numericValue / 1000).toFixed(2) + 's' : 'N/A'} | <3.4s | ${audits['speed-index']?.numericValue < 3400 ? '✅' : '⚠️'} |
| TTI (Time to Interactive) | ${audits['interactive']?.numericValue ? (audits['interactive'].numericValue / 1000).toFixed(2) + 's' : 'N/A'} | <3.8s | ${audits['interactive']?.numericValue < 3800 ? '✅' : '⚠️'} |

---

## Opportunities

`;

      // Add opportunities
      if (audits['uses-optimized-images']) {
        report += `### Image Optimization
- ${audits['uses-optimized-images']?.description}: ${audits['uses-optimized-images']?.displayValue || 'N/A'}
`;
      }
      
      if (audits['uses-text-compression']) {
        report += `
### Text Compression
- ${audits['uses-text-compression']?.description}: ${audits['uses-text-compression']?.displayValue || 'N/A'}
`;
      }
      
      if (audits['uses-long-cache-ttl']) {
        report += `
### Cache Policy
- ${audits['uses-long-cache-ttl']?.description}: ${audits['uses-long-cache-ttl']?.displayValue || 'N/A'}
`;
      }

      report += `
---

## Diagnostics

`;

      // Add diagnostics
      if (audits['main-thread-work']) {
        report += `### Main Thread Work
- Total: ${audits['main-thread-work']?.displayValue || 'N/A'}
`;
      }
      
      if (audits['bootup-time']) {
        report += `
### JavaScript Execution Time
- Total: ${audits['bootup-time']?.displayValue || 'N/A'}
`;
      }
      
      if (audits['dom-size']) {
        report += `
### DOM Size
- Elements: ${audits['dom-size']?.displayValue || 'N/A'}
`;
      }

      report += `
---

## Passed Audits

`;

      // List passed audits
      const passedAudits = Object.entries(audits)
        .filter(([_, audit]) => audit.score === 1)
        .slice(0, 10);
      
      passedAudits.forEach(([id, audit]) => {
        report += `- ✅ ${audit.description}\n`;
      });

      report += `
---

## Recommendations

### Short-term (1-2 weeks)
1. Optimize images (use WebP/AVIF format)
2. Enable text compression (gzip/brotli)
3. Implement proper cache headers
4. Reduce JavaScript execution time

### Medium-term (1 month)
1. Code splitting optimization
2. Lazy load non-critical resources
3. Implement Service Worker
4. Add performance monitoring

### Long-term (3 months)
1. Consider edge rendering
2. Implement PWA features
3. Add offline support
4. Continuous performance monitoring

---

## Test Configuration

- **Device Emulation**: Mobile (375x812, 2x DPR)
- **Network Throttling**: Simulated 4G (150ms RTT, 1.6Mbps down)
- **CPU Throttling**: 4x slowdown
- **Lighthouse Version**: ${lighthouseCli}

---

**Report Generated**: ${reportDate}  
**Test Tool**: Lighthouse via ${lighthouseCli}  
**Review Status**: Pending Review
`;

    } else {
      report += `
⚠️ **Lighthouse report file not found.**

This could be due to:
1. Lighthouse CLI installation issues
2. Server startup problems
3. Chrome/Puppeteer compatibility

Please run Lighthouse manually:
\`\`\`bash
npm install -g @lhci/cli
lhci autorun --url=http://localhost:4173
\`\`\`

Or use Chrome DevTools:
1. Open Chrome DevTools
2. Go to "Lighthouse" tab
3. Select "Mobile" device
4. Check "Performance", "Accessibility", "Best Practices", "SEO"
5. Click "Analyze page load"
`;
    }

    fs.writeFileSync(REPORT_PATH, report, 'utf-8');
    log(`\nReport saved to: ${REPORT_PATH}`, 'green');
    
    if (fileExists(path.join(FRONTEND_DIR, 'lighthouse-report.html'))) {
      log(`HTML report: ${path.join(FRONTEND_DIR, 'lighthouse-report.html')}`, 'green');
    }
    
  } catch (error) {
    log(`Error running Lighthouse: ${error.message}`, 'red');
  } finally {
    // Stop server
    server.close(() => {
      log('\nServer stopped', 'gray');
      log('\n[COMPLETE] Lighthouse test finished!', 'green');
    });
  }
});
