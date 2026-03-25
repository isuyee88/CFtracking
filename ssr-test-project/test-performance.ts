/**
 * @fileoverview SSR vs SPA 性能对比测试脚本
 * @description 使用 Lighthouse CLI 进行自动化性能测试
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SPA_URL = 'http://localhost:5173';
const SSR_URL = 'http://localhost:8787';
const REPORTS_DIR = path.join(__dirname, 'lighthouse-reports');

// 创建报告目录
if (!fs.existsSync(REPORTS_DIR)) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

console.log('🚀 开始 SSR vs SPA 性能对比测试\n');

// 测试 SPA
console.log('📊 测试 SPA 页面 (客户端渲染)...');
try {
  execSync(
    `lhci autorun --url=${SPA_URL} --output.path=${REPORTS_DIR}/spa-report.html --output=json --output.path=${REPORTS_DIR}/spa-report.json`,
    { stdio: 'inherit' }
  );
  console.log('✅ SPA 测试完成\n');
} catch (error) {
  console.error('❌ SPA 测试失败:', error);
}

// 测试 SSR
console.log('📊 测试 SSR 页面 (服务器渲染)...');
try {
  execSync(
    `lhci autorun --url=${SSR_URL} --output.path=${REPORTS_DIR}/ssr-report.html --output=json --output.path=${REPORTS_DIR}/ssr-report.json`,
    { stdio: 'inherit' }
  );
  console.log('✅ SSR 测试完成\n');
} catch (error) {
  console.error('❌ SSR 测试失败:', error);
}

console.log('📊 生成对比报告...\n');

// 读取并对比结果
try {
  const spaReport = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'spa-report.json'), 'utf-8'));
  const ssrReport = JSON.parse(fs.readFileSync(path.join(REPORTS_DIR, 'ssr-report.json'), 'utf-8'));

  const spaMetrics = spaReport.audits;
  const ssrMetrics = ssrReport.audits;

  console.log('='.repeat(80));
  console.log('📈 SSR vs SPA 性能对比报告');
  console.log('='.repeat(80));
  console.log('\n');
  
  console.log('┌─────────────────────────────────────────────────────────────────────────┐');
  console.log('│ 指标                        │ SPA       │ SSR       │ 提升倍数 │ 状态  │');
  console.log('├─────────────────────────────────────────────────────────────────────────┤');
  
  const metrics = [
    { key: 'first-contentful-paint', name: 'First Contentful Paint (FCP)' },
    { key: 'largest-contentful-paint', name: 'Largest Contentful Paint (LCP)' },
    { key: 'total-blocking-time', name: 'Total Blocking Time (TBT)' },
    { key: 'cumulative-layout-shift', name: 'Cumulative Layout Shift (CLS)' },
    { key: 'speed-index', name: 'Speed Index (SI)' },
    { key: 'interactive', name: 'Time to Interactive (TTI)' },
  ];

  metrics.forEach(({ key, name }) => {
    const spaValue = spaMetrics[key]?.numericValue || 0;
    const ssrValue = ssrMetrics[key]?.numericValue || 0;
    
    const spaDisplay = formatMetric(spaValue, key);
    const ssrDisplay = formatMetric(ssrValue, key);
    
    const improvement = spaValue > 0 ? (spaValue / ssrValue).toFixed(2) : 'N/A';
    const status = ssrValue < spaValue ? '✅ 更好' : '⚠️ 相当';
    
    console.log(`│ ${name.padEnd(27)} │ ${spaDisplay.padEnd(9)} │ ${ssrDisplay.padEnd(9)} │ ${improvement.toString().padEnd(8)} │ ${status.padEnd(5)} │`);
  });
  
  console.log('└─────────────────────────────────────────────────────────────────────────┘');
  
  console.log('\n');
  console.log('📊 详细报告已保存到:');
  console.log(`   - SPA: ${path.join(REPORTS_DIR, 'spa-report.html')}`);
  console.log(`   - SSR: ${path.join(REPORTS_DIR, 'ssr-report.html')}`);
  console.log('\n');
  
} catch (error) {
  console.error('❌ 生成报告失败:', error);
}

/**
 * 格式化指标值
 */
function formatMetric(value: number, key: string): string {
  if (key.includes('shift') || key === 'cumulative-layout-shift') {
    return value.toFixed(3);
  }
  return `${(value / 1000).toFixed(2)}s`;
}
