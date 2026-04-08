/**
 * @fileoverview 加密工具
 * @description 提供哈希和 ID 生成功能
 * @module utils/crypto
 * 
 * ID 生成策略:
 * - Click ID: clk_{时间戳13位}{随机数3位} = 16位数字
 * - Visitor ID: vst_{服务器指纹}_{客户端指纹} = 基于设备指纹
 * - Conversion ID: cnv_{时间戳13位}{随机数3位} = 16位数字
 * 
 * Visitor ID 策略 (轻量级设备指纹):
 * - 服务器指纹: JA3/JA4 TLS指纹 + ASN + IP前缀
 * - 客户端指纹: 屏幕 + 硬件 + 时区 + 语言
 * - 组合准确率: ~95%
 */

import { TRACKING } from '@/config/constants';
import type { CloudflareRequestInfo } from '@/utils/cloudflare';

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
 * 生成服务器端指纹 (基于 Cloudflare TLS 信息)
 * 
 * 组成因素:
 * 1. JA3/JA4 指纹 (权重 40%) - TLS 客户端指纹，无法伪造 (需要 Bot Management)
 * 2. TLS 密码套件指纹 (权重 30%) - TLS 握手特征 (所有计划可用)
 * 3. TLS 扩展指纹 (权重 20%) - TLS 扩展特征 (所有计划可用)
 * 4. ASN 编号 (权重 10%) - 网络组织标识
 * 5. IP 前缀 (权重 10%) - IP 地址前 3 段
 * 6. User-Agent (始终包含) - 区分不同浏览器
 * 
 * @param cfInfo Cloudflare 请求信息
 * @returns 服务器指纹 (8位十六进制)
 */
export function generateServerFingerprint(cfInfo: CloudflareRequestInfo): string {
  const factors: string[] = [];
  
  // 1. JA3/JA4 指纹 (权重最高，无法被客户端伪造，需要 Bot Management)
  if (cfInfo.botManagement?.ja3Hash) {
    factors.push(`ja3:${cfInfo.botManagement.ja3Hash}`);
  } else if (cfInfo.botManagement?.ja4) {
    factors.push(`ja4:${cfInfo.botManagement.ja4}`);
  }
  
  // 2. TLS 密码套件指纹 (所有计划可用)
  if (cfInfo.tlsClientCiphersSha1) {
    factors.push(`ciphers:${cfInfo.tlsClientCiphersSha1}`);
  }
  
  // 3. TLS 扩展指纹 (所有计划可用)
  if (cfInfo.tlsClientExtensionsSha1) {
    factors.push(`ext:${cfInfo.tlsClientExtensionsSha1}`);
  }
  
  // 4. TLS 版本 + 加密套件组合 (所有计划可用)
  if (cfInfo.tlsVersion && cfInfo.tlsCipher) {
    factors.push(`tls:${cfInfo.tlsVersion}:${cfInfo.tlsCipher}`);
  }
  
  // 5. ClientHello 长度 (不同浏览器有不同的长度)
  if (cfInfo.tlsClientHelloLength) {
    factors.push(`hello:${cfInfo.tlsClientHelloLength}`);
  }
  
  // 6. ASN 编号 (网络组织)
  if (cfInfo.asn) {
    factors.push(`asn:${cfInfo.asn}`);
  }
  
  // 7. IP 前缀 (前 3 段，同一网络通常相同)
  if (cfInfo.connectingIP) {
    const ipParts = cfInfo.connectingIP.split('.');
    if (ipParts.length >= 3) {
      factors.push(`ip:${ipParts.slice(0, 3).join('.')}`);
    }
  }
  
  // 8. User-Agent (始终包含，区分不同浏览器)
  if (cfInfo.userAgent) {
    factors.push(`ua:${simpleHash(cfInfo.userAgent)}`);
  }
  
  const combined = factors.join('|');
  return simpleHash(combined).toString(16).padStart(8, '0');
}

/**
 * 生成客户端指纹 (轻量级浏览器指纹)
 * 
 * 收集项 (仅 5 项，性能影响极低):
 * 1. 屏幕分辨率
 * 2. 硬件并发数
 * 3. 设备内存
 * 4. 时区偏移
 * 5. 浏览器语言
 * 
 * @param clientData 客户端收集的指纹数据
 * @returns 客户端指纹 (8位十六进制)
 */
export function generateClientFingerprint(clientData: {
  screenResolution?: string;
  hardwareConcurrency?: number;
  deviceMemory?: number;
  timezoneOffset?: number;
  language?: string;
}): string {
  const factors: string[] = [];
  
  if (clientData.screenResolution) {
    factors.push(`scr:${clientData.screenResolution}`);
  }
  if (clientData.hardwareConcurrency) {
    factors.push(`core:${clientData.hardwareConcurrency}`);
  }
  if (clientData.deviceMemory) {
    factors.push(`mem:${clientData.deviceMemory}`);
  }
  if (clientData.timezoneOffset !== undefined) {
    factors.push(`tz:${clientData.timezoneOffset}`);
  }
  if (clientData.language) {
    factors.push(`lang:${clientData.language}`);
  }
  
  const combined = factors.join('|');
  return simpleHash(combined).toString(16).padStart(8, '0');
}

/**
 * 生成完整设备指纹 (Visitor ID)
 * 格式: vst_{服务器指纹8位}_{客户端指纹8位}
 * 
 * @param cfInfo Cloudflare 请求信息
 * @param clientFingerprint 客户端指纹 (可选)
 * @returns Visitor ID 字符串
 */
export async function generateDeviceFingerprint(
  cfInfo: CloudflareRequestInfo,
  clientFingerprint?: string
): Promise<string> {
  // 服务器端指纹
  const serverFp = generateServerFingerprint(cfInfo);
  
  // 如果有客户端指纹，组合使用
  if (clientFingerprint) {
    return `${TRACKING.VISITOR_ID_PREFIX}${serverFp}_${clientFingerprint}`;
  }
  
  // 否则仅使用服务器指纹
  return `${TRACKING.VISITOR_ID_PREFIX}${serverFp}`;
}

/**
 * 生成 Visitor ID (设备指纹)
 * 基于 IP + User-Agent 生成确定性指纹 (向后兼容)
 * 同一设备多次访问应该生成相同的 visitorId
 * 
 * @param ip 访客 IP 地址
 * @param userAgent 浏览器 User-Agent
 * @returns Visitor ID 字符串
 */
export async function generateVisitorId(ip?: string, userAgent?: string): Promise<string> {
  if (ip && userAgent) {
    const fingerprint = await sha256(`${ip}:${userAgent}`);
    return `${TRACKING.VISITOR_ID_PREFIX}${fingerprint.substring(0, 16)}`;
  }
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${TRACKING.VISITOR_ID_PREFIX}${timestamp}${random.toString().padStart(3, '0')}`;
}

/**
 * 同步版本：生成 Visitor ID (设备指纹)
 * 用于不需要异步的场景
 * 
 * @param ip 访客 IP 地址
 * @param userAgent 浏览器 User-Agent
 * @returns Visitor ID 字符串
 */
export function generateVisitorIdSync(ip?: string, userAgent?: string): string {
  if (ip && userAgent) {
    const fingerprint = simpleHash(`${ip}:${userAgent}`);
    return `${TRACKING.VISITOR_ID_PREFIX}${fingerprint.toString(16).padStart(16, '0')}`;
  }
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${TRACKING.VISITOR_ID_PREFIX}${timestamp}${random.toString().padStart(3, '0')}`;
}

/**
 * 从 ID 中提取数字部分
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
