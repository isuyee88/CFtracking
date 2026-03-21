/**
 * @fileoverview 加密工具
 * @description 提供哈希和 ID 生成功能
 * @module utils/crypto
 * 
 * ID 生成策略:
 * - Click ID: clk_{时间戳13位}{随机数3位} = 16位数字
 * - Visitor ID: vst_{时间戳13位}{随机数3位} = 16位数字
 * - Conversion ID: cnv_{时间戳13位}{随机数3位} = 16位数字
 * 
 * 优点:
 * - 无需数据库查询，Worker 本地生成
 * - 数字部分可直接存入 Analytics Engine double 字段
 * - 时间戳前缀保证大致有序
 * - 唯一性: 同一毫秒内 1000 种可能，碰撞概率极低
 * - 16位数字在 JavaScript MAX_SAFE_INTEGER (2^53-1) 范围内，精度安全
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

/**
 * 生成 Click ID
 * 格式: clk_{时间戳13位}{随机数3位}
 * 示例: clk_1774104706123456
 * 
 * @returns Click ID 字符串
 */
export function generateClickId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${TRACKING.CLICK_ID_PREFIX}${timestamp}${random.toString().padStart(3, '0')}`;
}

/**
 * 生成 Conversion ID
 * 格式: cnv_{时间戳13位}{随机数3位}
 * 示例: cnv_1774104706123456
 * 
 * @returns Conversion ID 字符串
 */
export function generateConversionId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${TRACKING.CONVERSION_ID_PREFIX}${timestamp}${random.toString().padStart(3, '0')}`;
}

/**
 * 生成 Visitor ID
 * 格式: vst_{时间戳13位}{随机数3位}
 * 示例: vst_1774104706123456
 * 
 * @returns Visitor ID 字符串
 */
export function generateVisitorId(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${TRACKING.VISITOR_ID_PREFIX}${timestamp}${random.toString().padStart(3, '0')}`;
}

/**
 * 从 ID 中提取数字部分
 * 用于 Analytics Engine double 字段存储
 * 
 * @param id 带前缀的 ID
 * @returns 数字部分
 */
export function extractNumericId(id: string): number {
  if (!id) return 0;
  const numericPart = id.replace(/^[a-z]+_/, '');
  return numericPart ? parseInt(numericPart, 10) : 0;
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
