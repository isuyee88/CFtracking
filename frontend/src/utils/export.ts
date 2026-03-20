/**
 * @fileoverview Export Utilities
 * @description Utility functions for exporting data to CSV and Excel
 * @module utils/export
 */

/**
 * Convert data to CSV format
 */
export function convertToCSV(data: any[], headers?: string[]): string {
  if (data.length === 0) return '';

  // Get headers from first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Create header row
  const headerRow = csvHeaders.join(',');
  
  // Create data rows
  const rows = data.map(row => {
    return csvHeaders.map(header => {
      const value = row[header];
      // Handle different value types
      if (value === null || value === undefined) return '';
      if (typeof value === 'string') {
        // Escape quotes and wrap in quotes if contains comma
        const escaped = value.replace(/"/g, '""');
        return escaped.includes(',') || escaped.includes('\n') || escaped.includes('"') 
          ? `"${escaped}"` 
          : escaped;
      }
      if (typeof value === 'number') return value.toString();
      if (value instanceof Date) return value.toISOString();
      return String(value);
    }).join(',');
  });

  return [headerRow, ...rows].join('\n');
}

/**
 * Download data as CSV file
 */
export function downloadCSV(data: any[], filename: string, headers?: string[]): void {
  const csv = convertToCSV(data, headers);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Convert data to Excel-compatible HTML table
 */
export function convertToExcelHTML(data: any[], headers?: string[]): string {
  if (data.length === 0) return '';

  const excelHeaders = headers || Object.keys(data[0]);
  
  const headerRow = excelHeaders.map(h => `<th>${escapeHtml(h)}</th>`).join('');
  
  const rows = data.map(row => {
    return '<tr>' + excelHeaders.map(header => {
      const value = row[header];
      const cellValue = value === null || value === undefined 
        ? '' 
        : escapeHtml(String(value));
      return `<td>${cellValue}</td>`;
    }).join('') + '</tr>';
  }).join('');

  return `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" 
          xmlns:x="urn:schemas-microsoft-com:office:excel" 
          xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8">
      <style>
        table { border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
        th { background-color: #f0f0f0; font-weight: bold; }
      </style>
    </head>
    <body>
      <table>
        <thead><tr>${headerRow}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body>
    </html>
  `;
}

/**
 * Download data as Excel file (HTML format)
 */
export function downloadExcel(data: any[], filename: string, headers?: string[]): void {
  const html = convertToExcelHTML(data, headers);
  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const link = document.createElement('a');
  
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.xls`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Export data with selected format
 */
export function exportData(
  data: any[], 
  filename: string, 
  format: 'csv' | 'excel' = 'csv',
  headers?: string[]
): void {
  if (format === 'csv') {
    downloadCSV(data, filename, headers);
  } else if (format === 'excel') {
    downloadExcel(data, filename, headers);
  }
}

/**
 * Format campaign data for export
 */
export function formatCampaignForExport(campaign: any): Record<string, any> {
  return {
    'ID': campaign.id,
    'Name': campaign.name,
    'Status': campaign.status,
    'Group': campaign.group,
    'Traffic Source': campaign.source,
    'Clicks': campaign.clicks,
    'Conversions': campaign.conversions,
    'Revenue': campaign.revenue,
    'Profit': campaign.profit,
    'ROI': campaign.roi,
    'EPC': campaign.epc,
    'CPC': campaign.cpc,
    'CR': campaign.cr,
    'Created At': campaign.createdAt,
    'Updated At': campaign.updatedAt,
  };
}

/**
 * Format landing page data for export
 */
export function formatLandingPageForExport(lp: any): Record<string, any> {
  return {
    'ID': lp.id,
    'Name': lp.name,
    'URL': lp.url,
    'Status': lp.status,
    'Group': lp.group,
    'Campaigns': lp.campaignCount || 0,
    'Clicks': lp.clicks || 0,
    'Conversions': lp.conversions || 0,
    'CR': lp.cr || 0,
    'Updated At': lp.updatedAt,
  };
}

/**
 * Format offer data for export
 */
export function formatOfferForExport(offer: any): Record<string, any> {
  return {
    'ID': offer.id,
    'Name': offer.name,
    'URL': offer.url,
    'Status': offer.status,
    'Group': offer.group,
    'Network': offer.network,
    'Payout': offer.payout,
    'Payout Type': offer.payoutType,
    'Currency': offer.currency,
    'Campaigns': offer.campaignCount || 0,
    'Clicks': offer.clicks || 0,
    'Conversions': offer.conversions || 0,
    'Revenue': offer.revenue || 0,
    'EPC': offer.epc || 0,
    'CR': offer.cr || 0,
    'Updated At': offer.updatedAt,
  };
}

/**
 * Format traffic source data for export
 */
export function formatTrafficSourceForExport(ts: any): Record<string, any> {
  return {
    'ID': ts.id,
    'Name': ts.name,
    'Type': ts.type,
    'Status': ts.status,
    'Cost Model': ts.costModel,
    'Cost Value': ts.costValue,
    'Currency': ts.currency,
    'Campaigns': ts.campaignCount || 0,
    'Clicks': ts.clicks || 0,
    'Conversions': ts.conversions || 0,
    'Revenue': ts.revenue || 0,
    'Cost': ts.cost || 0,
    'Profit': ts.profit || 0,
    'ROI': ts.roi || 0,
    'Updated At': ts.updatedAt,
  };
}

/**
 * Format affiliate network data for export
 */
export function formatAffiliateNetworkForExport(an: any): Record<string, any> {
  return {
    'ID': an.id,
    'Name': an.name,
    'Type': an.type,
    'Status': an.status,
    'API URL': an.apiUrl || '',
    'Offers': an.offerCount || an.offers || 0,
    'Clicks': an.clicks || 0,
    'Conversions': an.conversions || 0,
    'Revenue': an.revenue || 0,
    'EPC': an.epc || 0,
    'CR': an.cr || 0,
    'Updated At': an.updatedAt,
  };
}
