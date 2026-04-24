/**
 * @fileoverview Report 导出服务
 * @description 提供报告导出功能，支持 CSV、Excel、PDF 格式
 * @module services/analytics/report.export
 */

import type { ReportData, FunnelReport, CohortReport, ComparisonReport } from '@/types/report';

export type ExportFormat = 'csv' | 'excel' | 'pdf';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  title?: string;
}

/**
 * 将报告数据导出为 CSV 格式
 */
export function exportToCSV(data: ReportData | FunnelReport | CohortReport[] | ComparisonReport, _options?: ExportOptions): string {
  if (Array.isArray(data)) {
    // CohortReport 数组
    return exportCohortToCSV(data);
  } else if ('steps' in data) {
    // FunnelReport
    return exportFunnelToCSV(data);
  } else if ('baseline' in data) {
    // ComparisonReport
    return exportComparisonToCSV(data);
  } else {
    // ReportData
    return exportStandardToCSV(data);
  }
}

/**
 * 导出标准报告为 CSV
 */
function exportStandardToCSV(data: ReportData): string {
  const headers = ['维度', ...Object.keys(data.rows[0]?.metrics || {})];
  const rows = data.rows.map(row => [
    row.dimension,
    ...Object.values(row.metrics).map(v => String(v)),
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
}

/**
 * 导出漏斗报告为 CSV
 */
function exportFunnelToCSV(data: FunnelReport): string {
  const headers = ['步骤', '用户数', '流失率(%)', '转化率(%)'];
  const rows = data.steps.map(step => [
    step.step,
    String(step.count),
    String(step.dropoff),
    String(step.conversionRate),
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(',')),
    '',
    `总用户数,${data.totalUsers}`,
    `完成用户数,${data.completedUsers}`,
  ].join('\n');
}

/**
 * 导出队列报告为 CSV
 */
function exportCohortToCSV(data: CohortReport[]): string {
  if (data.length === 0) return '';

  const maxPeriods = Math.max(...data.map(c => c.periods.length));
  const headers = ['队列日期', '总用户数', ...Array.from({ length: maxPeriods }, (_, i) => `第${i}周期`)];

  const rows = data.map(cohort => {
    const row = [
      cohort.cohortDate,
      String(cohort.totalUsers),
    ];

    for (const period of cohort.periods) {
      row.push(`${period.users} (${period.retention.toFixed(2)}%)`);
    }

    // 填充空周期
    for (let i = cohort.periods.length; i < maxPeriods; i++) {
      row.push('');
    }

    return row;
  });

  return [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
}

/**
 * 导出对比报告为 CSV
 */
function exportComparisonToCSV(data: ComparisonReport): string {
  const headers = ['指标', '基准值', '对比值', '绝对差异', '百分比差异(%)'];
  
  const metrics = Object.keys(data.baseline.metrics);
  const rows = metrics.map(metric => [
    metric,
    String(data.baseline.metrics[metric] || 0),
    String(data.comparison.metrics[metric] || 0),
    String(data.diff.absolute[metric] || 0),
    String(data.diff.percentage[metric] || 0),
  ]);

  return [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
}

/**
 * 将报告数据导出为 Excel 格式（简化版，返回 HTML 表格）
 * 注意：在 Cloudflare Workers 环境中，我们使用 HTML 表格作为 Excel 的替代方案
 */
export function exportToExcel(data: ReportData | FunnelReport | CohortReport[] | ComparisonReport, _options?: ExportOptions): string {
  if (Array.isArray(data)) {
    return exportCohortToExcel(data);
  } else if ('steps' in data) {
    return exportFunnelToExcel(data);
  } else if ('comparison' in data) {
    return exportComparisonToExcel(data);
  } else {
    return exportStandardToExcel(data);
  }
}

/**
 * 导出标准报告为 Excel (HTML 表格)
 */
function exportStandardToExcel(data: ReportData): string {
  const headers = ['维度', ...Object.keys(data.rows[0]?.metrics || {})];
  
  return `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
  <meta charset="UTF-8">
  <style>
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
  </style>
</head>
<body>
  <table>
    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
    ${data.rows.map(row => `
      <tr>
        <td>${row.dimension}</td>
        ${Object.values(row.metrics).map(v => `<td>${v}</td>`).join('')}
      </tr>
    `).join('')}
  </table>
</body>
</html>`;
}

/**
 * 导出漏斗报告为 Excel (HTML 表格)
 */
function exportFunnelToExcel(data: FunnelReport): string {
  return `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
  <meta charset="UTF-8">
  <style>
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
  </style>
</head>
<body>
  <h2>漏斗分析报告</h2>
  <table>
    <tr>
      <th>步骤</th>
      <th>用户数</th>
      <th>流失率(%)</th>
      <th>转化率(%)</th>
    </tr>
    ${data.steps.map(step => `
      <tr>
        <td>${step.step}</td>
        <td>${step.count}</td>
        <td>${step.dropoff.toFixed(2)}</td>
        <td>${step.conversionRate.toFixed(2)}</td>
      </tr>
    `).join('')}
  </table>
  <p><strong>总用户数:</strong> ${data.totalUsers}</p>
  <p><strong>完成用户数:</strong> ${data.completedUsers}</p>
</body>
</html>`;
}

/**
 * 导出队列报告为 Excel (HTML 表格)
 */
function exportCohortToExcel(data: CohortReport[]): string {
  if (data.length === 0) return '';

  const maxPeriods = Math.max(...data.map(c => c.periods.length));

  return `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
  <meta charset="UTF-8">
  <style>
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
  </style>
</head>
<body>
  <h2>队列分析报告</h2>
  <table>
    <tr>
      <th>队列日期</th>
      <th>总用户数</th>
      ${Array.from({ length: maxPeriods }, (_, i) => `<th>第${i}周期</th>`).join('')}
    </tr>
    ${data.map(cohort => `
      <tr>
        <td>${cohort.cohortDate}</td>
        <td>${cohort.totalUsers}</td>
        ${cohort.periods.map(p => `<td>${p.users} (${p.retention.toFixed(2)}%)</td>`).join('')}
        ${Array.from({ length: maxPeriods - cohort.periods.length }, () => '<td></td>').join('')}
      </tr>
    `).join('')}
  </table>
</body>
</html>`;
}

/**
 * 导出对比报告为 Excel (HTML 表格)
 */
function exportComparisonToExcel(data: ComparisonReport): string {
  const metrics = Object.keys(data.baseline.metrics);
  
  return `
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
  <meta charset="UTF-8">
  <style>
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
  </style>
</head>
<body>
  <h2>对比分析报告</h2>
  <table>
    <tr>
      <th>指标</th>
      <th>基准值</th>
      <th>对比值</th>
      <th>绝对差异</th>
      <th>百分比差异(%)</th>
    </tr>
    ${metrics.map(metric => `
      <tr>
        <td>${metric}</td>
        <td>${data.baseline.metrics[metric] || 0}</td>
        <td>${data.comparison.metrics[metric] || 0}</td>
        <td>${data.diff.absolute[metric] || 0}</td>
        <td>${data.diff.percentage[metric] || 0}</td>
      </tr>
    `).join('')}
  </table>
</body>
</html>`;
}

/**
 * 将报告数据导出为 PDF 格式（简化版，返回 HTML）
 * 注意：在 Cloudflare Workers 环境中，我们返回 HTML 格式，客户端可以打印为 PDF
 */
export function exportToPDF(data: ReportData | FunnelReport | CohortReport[] | ComparisonReport, options?: ExportOptions): string {
  const title = options?.title || '报告导出';
  
  if (Array.isArray(data)) {
    return exportCohortToPDF(data, title);
  } else if ('steps' in data) {
    return exportFunnelToPDF(data, title);
  } else if ('baseline' in data) {
    return exportComparisonToPDF(data, title);
  } else {
    return exportStandardToPDF(data, title);
  }
}

/**
 * 导出标准报告为 PDF (HTML)
 */
function exportStandardToPDF(data: ReportData, title: string): string {
  const headers = ['维度', ...Object.keys(data.rows[0]?.metrics || {})];
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    @media print {
      body { margin: 0; }
      @page { size: A4; margin: 20mm; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <table>
    <tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>
    ${data.rows.map(row => `
      <tr>
        <td>${row.dimension}</td>
        ${Object.values(row.metrics).map(v => `<td>${v}</td>`).join('')}
      </tr>
    `).join('')}
  </table>
</body>
</html>`;
}

/**
 * 导出漏斗报告为 PDF (HTML)
 */
function exportFunnelToPDF(data: FunnelReport, title: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    .summary { margin-top: 20px; padding: 10px; background-color: #f9f9f9; }
    @media print {
      body { margin: 0; }
      @page { size: A4; margin: 20mm; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <h2>漏斗分析报告</h2>
  <table>
    <tr>
      <th>步骤</th>
      <th>用户数</th>
      <th>流失率(%)</th>
      <th>转化率(%)</th>
    </tr>
    ${data.steps.map(step => `
      <tr>
        <td>${step.step}</td>
        <td>${step.count}</td>
        <td>${step.dropoff.toFixed(2)}</td>
        <td>${step.conversionRate.toFixed(2)}</td>
      </tr>
    `).join('')}
  </table>
  <div class="summary">
    <p><strong>总用户数:</strong> ${data.totalUsers}</p>
    <p><strong>完成用户数:</strong> ${data.completedUsers}</p>
  </div>
</body>
</html>`;
}

/**
 * 导出队列报告为 PDF (HTML)
 */
function exportCohortToPDF(data: CohortReport[], title: string): string {
  if (data.length === 0) return '';

  const maxPeriods = Math.max(...data.map(c => c.periods.length));

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
    th { background-color: #4CAF50; color: white; }
    tr:nth-child(even) { background-color: #f2f2f2; }
    @media print {
      body { margin: 0; }
      @page { size: A4 landscape; margin: 20mm; }
    }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <h2>队列分析报告</h2>
  <table>
    <tr>
      <th>队列日期</th>
      <th>总用户数</th>
      ${Array.from({ length: maxPeriods }, (_, i) => `<th>第${i}周期</th>`).join('')}
    </tr>
    ${data.map(cohort => `
      <tr>
        <td>${cohort.cohortDate}</td>
        <td>${cohort.totalUsers}</td>
        ${cohort.periods.map(p => `<td>${p.users} (${p.retention.toFixed(2)}%)</td>`).join('')}
        ${Array.from({ length: maxPeriods - cohort.periods.length }, () => '<td></td>').join('')}
      </tr>
    `).join('')}
  </table>
</body>
</html>`;
}

/**
 * 导出对比报告为 PDF (HTML)
 */
function exportComparisonToPDF(data: ComparisonReport, title: string): string {
  const metrics = Object.keys(data.baseline.metrics);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
</head>
<body>
  <h1>${title}</h1>
  <h2>对比分析报告</h2>
  <table border="1" cellpadding="8" cellspacing="0">
    <tr><th>指标</th><th>基准期</th><th>对比期</th><th>变化</th></tr>
    ${metrics.map(metric => `
      <tr>
        <td>${metric}</td>
        <td>${data.baseline.metrics[metric] ?? 0}</td>
        <td>${data.comparison.metrics[metric] ?? 0}</td>
        <td>${((data.comparison.metrics[metric] ?? 0) - (data.baseline.metrics[metric] ?? 0)).toFixed(2)}</td>
      </tr>
    `).join('')}
  </table>
</body>
</html>`;
}

/**
 * 获取导出文件的 MIME 类型
 */
export function getMimeType(format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return 'text/csv';
    case 'excel':
      return 'application/vnd.ms-excel';
    case 'pdf':
      return 'text/html';
    default:
      return 'application/octet-stream';
  }
}

/**
 * 获取导出文件的扩展名
 */
export function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return '.csv';
    case 'excel':
      return '.xls';
    case 'pdf':
      return '.html';
    default:
      return '.txt';
  }
}
