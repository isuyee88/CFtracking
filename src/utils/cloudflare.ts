/**
 * @fileoverview Cloudflare 请求信息提取工具
 * @description 从 Cloudflare Workers 请求中提取所有可用的请求头、CF 对象信息、Bot Management 等
 * @module utils/cloudflare
 */

import type { Context } from 'hono';

/**
 * Bot Management 信息
 */
export interface BotManagementInfo {
  /** Bot 评分 (1-99)，分数越低越可能是 Bot */
  score: number | null;
  /** 是否验证的 Bot（如 Google Bot） */
  verifiedBot: boolean;
  /** 是否静态资源请求 */
  staticResource: boolean;
  /** JA3 TLS 指纹 */
  ja3Hash: string | null;
  /** JA4 TLS 指纹 */
  ja4: string | null;
  /** Bot 检测 ID 列表 */
  detectionIds: number[];
  /** JS 检测是否通过 */
  jsDetectionPassed: boolean | null;
}

/**
 * TLS 客户端认证信息
 */
export interface TLSClientAuthInfo {
  /** 证书是否验证通过 */
  certVerified: boolean;
  /** 证书指纹 SHA1 */
  certFingerprintSHA1: string | null;
  /** 证书指纹 SHA256 */
  certFingerprintSHA256: string | null;
  /** 证书颁发者 DN */
  certIssuerDN: string | null;
  /** 证书主题 DN */
  certSubjectDN: string | null;
  /** 证书序列号 */
  certSerial: string | null;
  /** 证书生效时间 */
  certNotBefore: string | null;
  /** 证书过期时间 */
  certNotAfter: string | null;
  /** 证书是否被吊销 */
  certRevoked: boolean | null;
  /** 证书是否已呈现 */
  certPresented: boolean | null;
}

/**
 * 完整的 Cloudflare 请求信息
 */
export interface CloudflareRequestInfo {
  // 基础请求信息
  /** Cloudflare Ray ID (唯一请求 ID) */
  rayId: string | null;
  /** 真实访客 IP */
  connectingIP: string | null;
  /** 国家代码 (ISO 3166-1 alpha-2) */
  ipCountry: string | null;
  /** 是否欧盟国家 */
  isEUCountry: boolean;

  // CF 对象信息
  /** ASN 号码 */
  asn: number | null;
  /** ASN 组织名称 */
  asOrganization: string | null;
  /** Cloudflare 数据中心代码 (IATA 机场代码) */
  colo: string | null;

  // 地理位置
  /** 国家 */
  country: string | null;
  /** 城市 */
  city: string | null;
  /** 地区/州 */
  region: string | null;
  /** 地区代码 */
  regionCode: string | null;
  /** 纬度 */
  latitude: string | null;
  /** 经度 */
  longitude: string | null;
  /** 邮编 */
  postalCode: string | null;
  /** 洲 */
  continent: string | null;
  /** 时区 */
  timezone: string | null;
  /** DMA/Metro 代码 */
  metroCode: string | null;

  // 协议信息
  /** HTTP 协议版本 */
  httpProtocol: string | null;
  /** TLS 版本 */
  tlsVersion: string | null;
  /** TLS 加密套件 */
  tlsCipher: string | null;
  /** TLS 客户端随机数 */
  tlsClientRandom: string | null;
  /** 客户端 Hello 长度 */
  tlsClientHelloLength: string | null;
  /** 客户端加密套件 SHA1 */
  tlsClientCiphersSha1: string | null;
  /** 客户端扩展 SHA1 */
  tlsClientExtensionsSha1: string | null;

  // Bot Management
  botManagement: BotManagementInfo | null;

  // TLS 客户端认证 (mTLS)
  tlsClientAuth: TLSClientAuthInfo | null;

  // 请求头信息
  headers: Record<string, string>;

  // 浏览器指纹相关
  /** 请求优先级 */
  requestPriority: string | null;
  /** 原始 Accept-Encoding */
  clientAcceptEncoding: string | null;
  
  // User Agent
  /** User Agent */
  userAgent: string | null;
}

/**
 * 从 Hono Context 中提取所有 Cloudflare 请求信息
 * @param c Hono Context
 * @returns CloudflareRequestInfo
 */
export function extractCloudflareInfo(c: Context): CloudflareRequestInfo {
  const req = c.req;
  const raw = req.raw;
  const cf = raw.cf as Record<string, any> | undefined;

  // 提取请求头
  const headers: Record<string, string> = {};
  req.raw.headers.forEach((value, key) => {
    headers[key] = value;
  });

  // 提取 Bot Management 信息
  let botManagement: BotManagementInfo | null = null;
  if (cf?.botManagement) {
    const bm = cf.botManagement;
    botManagement = {
      score: bm.score ?? null,
      verifiedBot: bm.verifiedBot ?? false,
      staticResource: bm.staticResource ?? false,
      ja3Hash: bm.ja3Hash ?? null,
      ja4: bm.ja4 ?? null,
      detectionIds: bm.detectionIds ?? [],
      jsDetectionPassed: bm.jsDetection?.passed ?? null,
    };
  }

  // 提取 TLS 客户端认证信息
  let tlsClientAuth: TLSClientAuthInfo | null = null;
  if (cf?.tlsClientAuth) {
    const tls = cf.tlsClientAuth;
    tlsClientAuth = {
      certVerified: tls.certVerified ?? false,
      certFingerprintSHA1: tls.certFingerprintSHA1 ?? null,
      certFingerprintSHA256: tls.certFingerprintSHA256 ?? null,
      certIssuerDN: tls.certIssuerDN ?? null,
      certSubjectDN: tls.certSubjectDN ?? null,
      certSerial: tls.certSerial ?? null,
      certNotBefore: tls.certNotBefore ?? null,
      certNotAfter: tls.certNotAfter ?? null,
      certRevoked: tls.certRevoked ?? null,
      certPresented: tls.certPresented ?? null,
    };
  }

  return {
    // 基础请求信息
    rayId: req.header('CF-Ray') ?? null,
    connectingIP: req.header('CF-Connecting-IP') ?? null,
    ipCountry: req.header('CF-IPCountry') ?? null,
    isEUCountry: cf?.isEUCountry === '1' || cf?.isEUCountry === true,

    // CF 对象信息
    asn: cf?.asn ?? null,
    asOrganization: cf?.asOrganization ?? null,
    colo: cf?.colo ?? null,

    // 地理位置
    country: cf?.country ?? null,
    city: cf?.city ?? null,
    region: cf?.region ?? null,
    regionCode: cf?.regionCode ?? null,
    latitude: cf?.latitude ?? null,
    longitude: cf?.longitude ?? null,
    postalCode: cf?.postalCode ?? null,
    continent: cf?.continent ?? null,
    timezone: cf?.timezone ?? null,
    metroCode: cf?.metroCode ?? null,

    // 协议信息
    httpProtocol: cf?.httpProtocol ?? null,
    tlsVersion: cf?.tlsVersion ?? null,
    tlsCipher: cf?.tlsCipher ?? null,
    tlsClientRandom: cf?.tlsClientRandom ?? null,
    tlsClientHelloLength: cf?.tlsClientHelloLength ?? null,
    tlsClientCiphersSha1: cf?.tlsClientCiphersSha1 ?? null,
    tlsClientExtensionsSha1: cf?.tlsClientExtensionsSha1 ?? null,

    // Bot Management
    botManagement,

    // TLS 客户端认证
    tlsClientAuth,

    // 请求头
    headers,

    // 其他
    requestPriority: cf?.requestPriority ?? null,
    clientAcceptEncoding: cf?.clientAcceptEncoding ?? null,
    
    // User Agent
    userAgent: req.header('User-Agent') ?? null,
  };
}

/**
 * 生成访客指纹 ID
 * 结合多个因素生成唯一标识
 * @param info CloudflareRequestInfo
 * @returns 指纹 ID 字符串
 */
export function generateFingerprint(info: CloudflareRequestInfo): string {
  const factors = [
    info.connectingIP,
    info.userAgent,
    info.asOrganization,
    info.tlsClientCiphersSha1,
    info.tlsClientExtensionsSha1,
    info.botManagement?.ja3Hash,
    info.botManagement?.ja4,
  ].filter(Boolean);

  // 简单的哈希组合
  const combined = factors.join('|');
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }

  return `fp_${Math.abs(hash).toString(36)}_${Date.now().toString(36)}`;
}

/**
 * 判断是否为可疑请求
 * @param info CloudflareRequestInfo
 * @returns 风险评估结果
 */
export function assessRisk(info: CloudflareRequestInfo): {
  isBot: boolean;
  isSuspicious: boolean;
  riskScore: number;
  reasons: string[];
} {
  const reasons: string[] = [];
  let riskScore = 0;

  // Bot 检测
  const bm = info.botManagement;
  if (bm) {
    // Bot 评分低 (1-30 分很可能是 Bot)
    if (bm.score !== null && bm.score <= 30) {
      riskScore += 50;
      reasons.push(`Low bot score: ${bm.score}`);
    }

    // 已验证的 Bot
    if (bm.verifiedBot) {
      riskScore += 10;
      reasons.push('Verified bot');
    }

    // JS 检测未通过
    if (bm.jsDetectionPassed === false) {
      riskScore += 30;
      reasons.push('JS detection failed');
    }
  }

  // TLS 指纹缺失 (可能是非浏览器请求)
  if (!info.tlsClientCiphersSha1) {
    riskScore += 20;
    reasons.push('Missing TLS fingerprint');
  }

  // 检查是否使用代理/VPN
  if (info.asOrganization?.toLowerCase().includes('vpn') ||
      info.asOrganization?.toLowerCase().includes('proxy') ||
      info.asOrganization?.toLowerCase().includes('hosting')) {
    riskScore += 15;
    reasons.push('Possible VPN/Proxy');
  }

  return {
    isBot: riskScore >= 50,
    isSuspicious: riskScore >= 30,
    riskScore: Math.min(riskScore, 100),
    reasons,
  };
}

/**
 * 获取客户端真实 IP (优先使用 CF-Connecting-IP)
 * @param c Hono Context
 * @returns IP 地址
 */
export function getClientIP(c: Context): string {
  return c.req.header('CF-Connecting-IP') ||
         c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
         'unknown';
}

/**
 * 获取国家代码
 * @param c Hono Context
 * @returns 国家代码
 */
export function getCountry(c: Context): string | null {
  return c.req.header('CF-IPCountry') ||
         (c.req.raw.cf as any)?.country ||
         null;
}

/**
 * 获取城市
 * @param c Hono Context
 * @returns 城市名称
 */
export function getCity(c: Context): string | null {
  return (c.req.raw.cf as any)?.city || null;
}
