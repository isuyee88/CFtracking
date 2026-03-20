/**
 * @fileoverview 加密工具
 * @description 提供哈希和 ID 生成功能
 * @module utils/crypto
 */

import { TRACKING } from '@/config/constants';

export async function sha256(message: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function generateUUID(): string {
  return crypto.randomUUID();
}

export function generateClickId(): string {
  return `${TRACKING.CLICK_ID_PREFIX}${crypto.randomUUID()}`;
}

export function generateConversionId(): string {
  return `${TRACKING.CONVERSION_ID_PREFIX}${crypto.randomUUID()}`;
}

export function generateVisitorId(): string {
  const randomBytes = new Uint8Array(16);
  crypto.getRandomValues(randomBytes);
  const hexString = Array.from(randomBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `${TRACKING.VISITOR_ID_PREFIX}${hexString}`;
}

export async function hashVisitorKey(ip: string, userAgent: string): Promise<string> {
  return sha256(`${ip}:${userAgent}`);
}

export function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

/**
 * 生成 API Token (UUID v4 格式)
 * @returns API Token 字符串
 */
export function generateApiToken(): string {
  return crypto.randomUUID();
}
