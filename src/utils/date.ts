/**
 * @fileoverview 日期处理工具
 * @description 提供日期格式化和解析功能
 * @module utils/date
 */

export function toISOString(date: Date = new Date()): string {
  return date.toISOString();
}

export function toDateString(date: Date = new Date()): string {
  const isoString = date.toISOString();
  const parts = isoString ? isoString.split('T') : [];
  return parts[0] || '';
}

export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

export function getDateRange(period: string): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now);
  let start: Date;

  switch (period) {
    case 'today':
      start = new Date(now.setHours(0, 0, 0, 0));
      break;
    case 'yesterday':
      start = addDays(new Date(now.setHours(0, 0, 0, 0)), -1);
      end.setHours(0, 0, 0, 0);
      break;
    case 'last7days':
      start = addDays(new Date(now.setHours(0, 0, 0, 0)), -7);
      break;
    case 'last30days':
      start = addDays(new Date(now.setHours(0, 0, 0, 0)), -30);
      break;
    case 'thisMonth':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'lastMonth':
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    default:
      start = addDays(new Date(now.setHours(0, 0, 0, 0)), -1);
  }

  return { start, end };
}

export function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([hdm])$/);
  if (!match) return 0;

  const value = parseInt(match[1] || '0', 10);
  const unit = match[2];

  switch (unit) {
    case 'h':
      return value * 60 * 60 * 1000;
    case 'd':
      return value * 24 * 60 * 60 * 1000;
    case 'm':
      return value * 60 * 1000;
    default:
      return 0;
  }
}

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}
