/**
 * @fileoverview Timezone Utilities
 * @description Utility functions for timezone handling
 * @module utils/timezone
 */

// Common timezones list
export const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00' },
  { value: 'America/New_York', label: 'Eastern Time (ET)', offset: '-05:00' },
  { value: 'America/Chicago', label: 'Central Time (CT)', offset: '-06:00' },
  { value: 'America/Denver', label: 'Mountain Time (MT)', offset: '-07:00' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)', offset: '-08:00' },
  { value: 'Europe/London', label: 'London (GMT)', offset: '+00:00' },
  { value: 'Europe/Paris', label: 'Paris (CET)', offset: '+01:00' },
  { value: 'Europe/Berlin', label: 'Berlin (CET)', offset: '+01:00' },
  { value: 'Europe/Moscow', label: 'Moscow (MSK)', offset: '+03:00' },
  { value: 'Asia/Dubai', label: 'Dubai (GST)', offset: '+04:00' },
  { value: 'Asia/Kolkata', label: 'India (IST)', offset: '+05:30' },
  { value: 'Asia/Shanghai', label: 'China (CST)', offset: '+08:00' },
  { value: 'Asia/Tokyo', label: 'Japan (JST)', offset: '+09:00' },
  { value: 'Asia/Seoul', label: 'Korea (KST)', offset: '+09:00' },
  { value: 'Australia/Sydney', label: 'Sydney (AEST)', offset: '+10:00' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)', offset: '+12:00' },
];

// Get user's local timezone
export function getLocalTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

// Convert UTC date to local timezone
export function convertToTimezone(date: Date | string, timezone: string): Date {
  const d = typeof date === 'string' ? new Date(date) : date;
  
  if (timezone === 'UTC') return d;
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  };
  
  const formatter = new Intl.DateTimeFormat('en-US', options);
  const parts = formatter.formatToParts(d);
  
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0');
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1;
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0');
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0');
  
  return new Date(year, month, day, hour, minute, second);
}

// Format date with timezone
export function formatWithTimezone(
  date: Date | string, 
  timezone: string, 
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string {
  const d = convertToTimezone(date, timezone);
  
  const pad = (n: number) => n.toString().padStart(2, '0');
  
  const tokens: Record<string, string> = {
    'YYYY': d.getFullYear().toString(),
    'MM': pad(d.getMonth() + 1),
    'DD': pad(d.getDate()),
    'HH': pad(d.getHours()),
    'mm': pad(d.getMinutes()),
    'ss': pad(d.getSeconds()),
  };
  
  return format.replace(/YYYY|MM|DD|HH|mm|ss/g, match => tokens[match] || match);
}

// Get timezone offset string
export function getTimezoneOffset(timezone: string): string {
  const tz = TIMEZONES.find(t => t.value === timezone);
  return tz?.offset || '+00:00';
}

// Get timezone label
export function getTimezoneLabel(timezone: string): string {
  const tz = TIMEZONES.find(t => t.value === timezone);
  return tz?.label || timezone;
}

// Store timezone in localStorage
export function storeTimezone(timezone: string): void {
  localStorage.setItem('user_timezone', timezone);
}

// Get stored timezone
export function getStoredTimezone(): string {
  return localStorage.getItem('user_timezone') || getLocalTimezone();
}
