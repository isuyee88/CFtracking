/**
 * @fileoverview Export Formatter Utilities
 * @description Provides data formatting and conversion functions for export functionality
 * @module utils/export.formatter
 * 
 * Input: Raw data objects, field mappings, format options
 * Output: Formatted CSV/Excel content
 * Logic Interaction: Used by export service to format data before download
 * Frontend-Backend: Backend utility, no direct frontend interaction
 */

export type ExportFormat = 'csv' | 'excel' | 'json';

export interface FieldMapping {
  field: string;
  header: string;
  formatter?: (value: unknown) => string;
}

export interface ExportOptions {
  format: ExportFormat;
  fields?: string[] | FieldMapping[];
  includeHeaders?: boolean;
  dateFormat?: string;
  delimiter?: string;
}

/**
 * Default field mappings for common entities
 */
export const DEFAULT_FIELD_MAPPINGS: Record<string, FieldMapping[]> = {
  campaigns: [
    { field: 'id', header: 'ID' },
    { field: 'name', header: 'Name' },
    { field: 'alias', header: 'Alias' },
    { field: 'domain', header: 'Domain' },
    { field: 'status', header: 'Status' },
    { field: 'group', header: 'Group' },
    { field: 'trafficSource', header: 'Traffic Source' },
    { field: 'flowRotation', header: 'Flow Rotation' },
    { field: 'costModel', header: 'Cost Model' },
    { field: 'trafficLoss', header: 'Traffic Loss' },
    { field: 'uniquenessTTL', header: 'Uniqueness TTL' },
    { field: 'visitorBinding', header: 'Visitor Binding' },
    { field: 'createdAt', header: 'Created At', formatter: formatDate },
    { field: 'updatedAt', header: 'Updated At', formatter: formatDate },
  ],
  landingPages: [
    { field: 'id', header: 'ID' },
    { field: 'name', header: 'Name' },
    { field: 'url', header: 'URL' },
    { field: 'status', header: 'Status' },
    { field: 'group', header: 'Group' },
    { field: 'createdAt', header: 'Created At', formatter: formatDate },
    { field: 'updatedAt', header: 'Updated At', formatter: formatDate },
  ],
  offers: [
    { field: 'id', header: 'ID' },
    { field: 'name', header: 'Name' },
    { field: 'url', header: 'URL' },
    { field: 'payout', header: 'Payout' },
    { field: 'currency', header: 'Currency' },
    { field: 'payoutType', header: 'Payout Type' },
    { field: 'network', header: 'Network' },
    { field: 'group', header: 'Group' },
    { field: 'status', header: 'Status' },
    { field: 'createdAt', header: 'Created At', formatter: formatDate },
    { field: 'updatedAt', header: 'Updated At', formatter: formatDate },
  ],
  clicks: [
    { field: 'clickId', header: 'Click ID' },
    { field: 'campaignId', header: 'Campaign ID' },
    { field: 'flowId', header: 'Flow ID' },
    { field: 'landingPageId', header: 'Landing Page ID' },
    { field: 'offerId', header: 'Offer ID' },
    { field: 'timestamp', header: 'Timestamp', formatter: formatDateTime },
    { field: 'ip', header: 'IP Address' },
    { field: 'userAgent', header: 'User Agent' },
    { field: 'referer', header: 'Referer' },
    { field: 'country', header: 'Country' },
    { field: 'city', header: 'City' },
    { field: 'device', header: 'Device' },
    { field: 'browser', header: 'Browser' },
    { field: 'os', header: 'OS' },
    { field: 'visitorId', header: 'Visitor ID' },
    { field: 'subId1', header: 'Sub ID 1' },
    { field: 'subId2', header: 'Sub ID 2' },
    { field: 'subId3', header: 'Sub ID 3' },
    { field: 'cost', header: 'Cost' },
  ],
  conversions: [
    { field: 'conversionId', header: 'Conversion ID' },
    { field: 'clickId', header: 'Click ID' },
    { field: 'campaignId', header: 'Campaign ID' },
    { field: 'offerId', header: 'Offer ID' },
    { field: 'timestamp', header: 'Timestamp', formatter: formatDateTime },
    { field: 'revenue', header: 'Revenue' },
    { field: 'payout', header: 'Payout' },
    { field: 'currency', header: 'Currency' },
    { field: 'conversionType', header: 'Type' },
    { field: 'offerName', header: 'Offer Name' },
    { field: 'status', header: 'Status' },
  ],
  flows: [
    { field: 'id', header: 'ID' },
    { field: 'displayId', header: 'Display ID' },
    { field: 'campaignId', header: 'Campaign ID' },
    { field: 'name', header: 'Name' },
    { field: 'type', header: 'Type' },
    { field: 'weight', header: 'Weight' },
    { field: 'status', header: 'Status' },
    { field: 'limit', header: 'Click Limit' },
    { field: 'createdAt', header: 'Created At', formatter: formatDate },
    { field: 'updatedAt', header: 'Updated At', formatter: formatDate },
  ],
};

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(value: unknown): string {
  if (!value) return '';
  const date = new Date(String(value));
  if (isNaN(date.getTime())) return String(value);
  return date.toISOString().split('T')[0] || '';
}

/**
 * Format datetime to ISO string
 */
function formatDateTime(value: unknown): string {
  if (!value) return '';
  const date = new Date(String(value));
  if (isNaN(date.getTime())) return String(value);
  return date.toISOString();
}

/**
 * Escape CSV field value
 */
function escapeCSVField(value: string, delimiter: string = ','): string {
  if (value === null || value === undefined) return '';
  
  const stringValue = String(value);
  
  const needsEscaping = 
    stringValue.includes(delimiter) ||
    stringValue.includes('"') ||
    stringValue.includes('\n') ||
    stringValue.includes('\r');
  
  if (!needsEscaping) return stringValue;
  
  const escaped = stringValue.replace(/"/g, '""');
  return `"${escaped}"`;
}

/**
 * Convert data to CSV format
 */
export function convertToCSV(
  data: Record<string, unknown>[],
  fields: string[] | FieldMapping[] = [],
  options: Partial<ExportOptions> = {}
): string {
  if (data.length === 0) return '';
  
  const delimiter = options.delimiter || ',';
  const includeHeaders = options.includeHeaders !== false;
  
  let fieldMappings: FieldMapping[];
  if (fields.length === 0) {
    if (data.length === 0 || !data[0]) {
      return '';
    }
    fieldMappings = Object.keys(data[0]).map(field => ({ field, header: field }));
  } else if (typeof fields[0] === 'string') {
    fieldMappings = (fields as string[]).map(field => ({ field, header: field }));
  } else {
    fieldMappings = fields as FieldMapping[];
  }
  
  const lines: string[] = [];
  
  if (includeHeaders) {
    const headers = fieldMappings.map(m => escapeCSVField(m.header, delimiter));
    lines.push(headers.join(delimiter));
  }
  
  for (const row of data) {
    const values = fieldMappings.map(mapping => {
      let value = row[mapping.field];
      
      if (mapping.formatter) {
        value = mapping.formatter(value);
      }
      
      return escapeCSVField(String(value ?? ''), delimiter);
    });
    lines.push(values.join(delimiter));
  }
  
  return lines.join('\n');
}

/**
 * Convert data to JSON format
 */
export function convertToJSON(
  data: Record<string, unknown>[],
  fields: string[] | FieldMapping[] = []
): string {
  let exportData = data;
  
  if (fields.length > 0) {
    const fieldNames = typeof fields[0] === 'string' 
      ? fields as string[]
      : (fields as FieldMapping[]).map(m => m.field);
    
    exportData = data.map(row => {
      const filtered: Record<string, unknown> = {};
      for (const field of fieldNames) {
        filtered[field] = row[field];
      }
      return filtered;
    });
  }
  
  return JSON.stringify(exportData, null, 2);
}

/**
 * Get content type for export format
 */
export function getContentType(format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return 'text/csv; charset=utf-8';
    case 'excel':
      return 'application/vnd.ms-excel';
    case 'json':
      return 'application/json; charset=utf-8';
    default:
      return 'text/plain';
  }
}

/**
 * Get file extension for export format
 */
export function getFileExtension(format: ExportFormat): string {
  switch (format) {
    case 'csv':
      return 'csv';
    case 'excel':
      return 'xls';
    case 'json':
      return 'json';
    default:
      return 'txt';
  }
}
