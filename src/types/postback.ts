/**
 * @fileoverview Postback系统类型定义
 * @description 定义Postback/S2S转化回传系统的所有核心类型接口
 * @module types/postback
 *
 * 主要类型:
 * - PostbackTask: Postback任务模型(运行时状态)
 * - PostbackLog: Postback日志(用于D1持久化)
 * - PostbackContext: Postback上下文(运行时传递的转化数据)
 * - PostbackSendConfig: Postback发送配置(从TrafficSource/AffiliateNetwork获取)
 * - PostbackResult: Postback执行结果
 * - PostbackPlatformAdapter: 平台适配器抽象类
 */

// ============================================================
// Postback任务模型 (运行时状态)
// ============================================================

/**
 * Postback任务状态枚举
 */
export type PostbackTaskStatus = 'pending' | 'sent' | 'failed' | 'retrying';

/**
 * HTTP请求方法
 */
export type HttpMethod = 'GET' | 'POST';

/**
 * Postback任务模型
 * @description 表示一个待发送或已发送的Postback任务，包含完整的状态跟踪信息
 */
export interface PostbackTask {
  /** 任务唯一ID */
  id: string;
  /** 关联的转化ID */
  conversionId: string;
  /** 点击ID (用于追踪) */
  clickId: string;
  /** 活动ID */
  campaignId: string;
  /** Offer ID */
  offerId: string;
  /** 目标平台 (propellerads/taboola/facebook/revcontent/outbrain/rumble/oddbytes/generic) */
  platform: string;
  /** 解析后的最终URL (宏已替换) */
  postbackUrl: string;
  /** 原始URL模板 (含宏变量) */
  rawUrlTemplate: string;
  /** POST请求体 (GET请求时为空) */
  payload?: Record<string, string>;
  /** HTTP请求方法 */
  method: HttpMethod;
  /** 当前任务状态 */
  status: PostbackTaskStatus;
  /** 已重试次数 */
  retryCount: number;
  /** 最大重试次数 */
  maxRetries: number;
  /** 下次重试时间 (ISO格式) */
  nextRetryAt?: string;
  /** 错误信息 (失败时记录) */
  errorMessage?: string;
  /** HTTP响应状态码 */
  responseCode?: number;
  /** HTTP响应体 (截断至500字符) */
  responseBody?: string;
  /** 创建时间 (ISO格式) */
  createdAt: string;
  /** 最后更新时间 (ISO格式) */
  updatedAt: string;
  /** 实际发送时间 (ISO格式) */
  sentAt?: string;
}

// ============================================================
// Postback日志 (D1持久化)
// ============================================================

/**
 * Postback日志模型
 * @description 用于持久化到D1数据库的Postback发送记录
 */
export interface PostbackLog {
  /** 日志唯一ID */
  id: string;
  /** 关联的任务ID */
  taskId: string;
  /** 关联的转化ID */
  conversionId: string;
  /** 点击ID */
  clickId: string;
  /** 活动ID */
  campaignId: string;
  /** 目标平台 */
  platform: string;
  /** 发送的URL (脱敏处理，隐藏token等敏感信息) */
  url: string;
  /** HTTP请求方法 */
  method: HttpMethod;
  /** 请求头 (JSON字符串) */
  requestHeaders?: string;
  /** 请求体 (JSON字符串，敏感字段已脱敏) */
  requestBody?: string;
  /** HTTP响应状态码 */
  statusCode: number;
  /** 响应体 (截断至500字符) */
  responseBody?: string;
  /** 请求延迟 (毫秒) */
  latencyMs: number;
  /** 是否成功 */
  success: boolean;
  /** 错误信息 */
  errorMessage?: string;
  /** 重试次数 */
  retryCount: number;
  /** 创建时间 (ISO格式) */
  createdAt: string;
}

// ============================================================
// Postback上下文 (运行时传递)
// ============================================================

/**
 * 转化状态枚举
 */
export type ConversionStatus = 'approved' | 'pending' | 'rejected';

/**
 * Postback上下文
 * @description 运行时传递给Postback服务的完整转化上下文数据
 * 包含转化基本信息 + 来自ClickData的详细信息
 */
export interface PostbackContext {
  /** 转化ID */
  conversionId: string;
  /** 点击ID */
  clickId: string;
  /** 活动ID */
  campaignId: string;
  /** Offer ID */
  offerId: string;
  /** Offer名称 (可选) */
  offerName?: string;
  /** 收入金额 */
  revenue: number;
  /** 支出金额 (payout) */
  payout: number;
  /** 货币代码 (默认USD) */
  currency: string;
  /** 转化类型 (sale/lead/click等) */
  conversionType: string;
  /** 转化状态 */
  status: ConversionStatus;
  /** 转化时间戳 (ISO格式) */
  timestamp: string;

  // --- 来自ClickData的信息 ---
  /** 用户IP地址 */
  ip?: string;
  /** 国家代码 (2位) */
  country?: string;
  /** 设备类型 (mobile/desktop/tablet) */
  device?: string;
  /** 浏览器名称 */
  browser?: string;
  /** 操作系统 */
  os?: string;

  // Sub ID 追踪参数 (支持1-30个, 对标Keitaro完整Sub ID支持)
  /** 子ID 1 */
  subId1?: string;
  /** 子ID 2 */
  subId2?: string;
  /** 子ID 3 */
  subId3?: string;
  /** 子ID 4 */
  subId4?: string;
  /** 子ID 5 */
  subId5?: string;
  /** 子ID 6 */
  subId6?: string;
  /** 子ID 7 */
  subId7?: string;
  /** 子ID 8 */
  subId8?: string;
  /** 子ID 9 */
  subId9?: string;
  /** 子ID 10 */
  subId10?: string;
  /** 子ID 11 */
  subId11?: string;
  /** 子ID 12 */
  subId12?: string;
  /** 子ID 13 */
  subId13?: string;
  /** 子ID 14 */
  subId14?: string;
  /** 子ID 15 */
  subId15?: string;
  /** 子ID 16 */
  subId16?: string;
  /** 子ID 17 */
  subId17?: string;
  /** 子ID 18 */
  subId18?: string;
  /** 子ID 19 */
  subId19?: string;
  /** 子ID 20 */
  subId20?: string;
  /** 子ID 21 */
  subId21?: string;
  /** 子ID 22 */
  subId22?: string;
  /** 子ID 23 */
  subId23?: string;
  /** 子ID 24 */
  subId24?: string;
  /** 子ID 25 */
  subId25?: string;
  /** 子ID 26 */
  subId26?: string;
  /** 子ID 27 */
  subId27?: string;
  /** 子ID 28 */
  subId28?: string;
  /** 子ID 29 */
  subId29?: string;
  /** 子ID 30 */
  subId30?: string;
  /** UTM Source */
  utmSource?: string;
  /** UTM Medium */
  utmMedium?: string;
  /** UTM Campaign */
  utmCampaign?: string;
  /** Cloudflare Ray ID (用于调试) */
  cfRayId?: string;
}

// ============================================================
// Postback配置 (从TrafficSource/AffiliateNetwork获取)
// ============================================================

/**
 * Postback发送配置
 * @description 从TrafficSource或AffiliateNetwork配置中提取的Postback参数
 */
export interface PostbackSendConfig {
  /** 是否启用Postback */
  enabled: boolean;
  /** URL模板 (含{clickid}等宏变量) */
  urlTemplate: string;
  /** HTTP请求方法 */
  method: HttpMethod;
  /** 只在以下状态时发送 (如 ['approved', 'pending']) */
  sendOnlyStatuses: ConversionStatus[];
  /** 自定义参数 (附加到URL或POST body) */
  customParams?: Record<string, string>;
  /** HMAC密钥 (Taboola等平台需要) */
  hmacSecret?: string;
  /** 请求超时时间 (毫秒，默认10000) */
  timeoutMs: number;
  /** 最大重试次数 (默认3) */
  maxRetries: number;
}

// ============================================================
// Postback结果
// ============================================================

/**
 * Postback执行结果
 * @description 单次Postback发送的结果，包含状态码、延迟、错误等信息
 */
export interface PostbackResult {
  /** 是否成功 */
  success: boolean;
  /** 关联的任务ID */
  taskId: string;
  /** 目标平台名称 */
  platform: string;
  /** 发送的URL */
  url: string;
  /** HTTP响应状态码 */
  statusCode?: number;
  /** 请求延迟 (毫秒) */
  latencyMs: number;
  /** 重试次数 */
  retryCount: number;
  /** 错误信息 (失败时) */
  errorMessage?: string;
  /** 是否会重试 */
  willRetry: boolean;
}

// ============================================================
// 平台适配器抽象类
// ============================================================

/**
 * Postback平台适配器抽象基类
 * @description 定义所有平台适配器必须实现的接口
 * 遵循开闭原则: 新增平台只需添加新的适配器实现
 */
export abstract class PostbackPlatformAdapter {
  /**
   * 平台名称标识符
   * @example 'taboola', 'facebook', 'propellerads'
   */
  abstract readonly platformName: string;

  /**
   * 构建完整的Postback URL
   * @param context 转化上下文数据
   * @param config Postback发送配置
   * @returns 解析后的完整URL (宏已替换) - 支持异步操作 (如HMAC签名)
   */
  abstract buildUrl(context: PostbackContext, config: PostbackSendConfig): Promise<string>;

  /**
   * 构建POST请求体 (可选)
   * @param context 转化上下文数据
   * @param config Postback发送配置
   * @returns POST body键值对 (GET请求时可返回undefined)
   */
  abstract buildPayload?(context: PostbackContext, config: PostbackSendConfig): Record<string, string> | undefined;

  /**
   * 验证HTTP响应是否有效
   * @param statusCode HTTP状态码
   * @param body 响应体内容
   * @returns 验证结果及原因说明
   */
  abstract validateResponse(statusCode: number, body: string): { valid: boolean; reason?: string };

  /**
   * 获取推荐的HTTP方法
   * @returns 推荐的HTTP方法 (GET或POST)
   */
  abstract getRecommendedMethod(): HttpMethod;
}

// ============================================================
// 查询参数类型
// ============================================================

/**
 * Postback历史查询参数
 */
export interface PostbackHistoryQuery {
  /** 页码 (从1开始) */
  page?: number;
  /** 每页数量 */
  pageSize?: number;
  /** 按转化ID筛选 */
  conversionId?: string;
  /** 按点击ID筛选 */
  clickId?: string;
  /** 按活动ID筛选 */
  campaignId?: string;
  /** 按平台筛选 */
  platform?: string;
  /** 按状态筛选 (success/failed) */
  success?: boolean;
  /** 开始日期 (ISO格式) */
  startDate?: string;
  /** 结束日期 (ISO格式) */
  endDate?: string;
}

/**
 * Postback日志查询参数 (Repository内部使用)
 */
export interface PostbackLogQueryParams extends Omit<PostbackHistoryQuery, 'page' | 'pageSize'> {
  limit?: number;
  offset?: number;
}

/**
 * Postback日志列表结果
 */
export interface PostbackLogListResult {
  logs: PostbackLog[];
  total: number;
}

/**
 * Postback统计概览
 */
export interface PostbackStats {
  totalSent: number;
  totalSuccess: number;
  totalFailed: number;
  successRate: number; // 百分比 (0-100)
  avgLatencyMs: number;
  totalRetryCount: number;
  byPlatformStats: Array<{
    platform: string;
    sent: number;
    success: number;
    failed: number;
    successRate: number;
  }>;
}
