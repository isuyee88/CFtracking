/**
 * @fileoverview S2S Inbound Postback接收路由
 * @description 接收来自外部广告平台 (PropellerAds/Taboola/Facebook等) 的Server-to-Server转化回传
 * @module routes/postback-inbound.routes
 *
 * 主要功能:
 * - 接收外部平台的Postback通知 (通用格式+平台专用格式)
 * - IP白名单验证 (防止伪造请求)
 * - HMAC签名验证 (Taboola/Facebook平台)
 * - 频率限制检查 (防刷量攻击)
 * - 幂等性检查 (防止重复处理同一转化)
 * - 查找对应点击记录并创建转化
 * - 触发Outbound Postback (转发到其他平台)
 *
 * 输入:
 *   - HTTP POST请求 (来自外部平台的S2S回调)
 *   - 参数来源: Query String 或 JSON Body
 *
 * 输出:
 *   - JSON响应 { success, platform, clickId, conversionId }
 *
 * 逻辑交互:
 *   - 外部广告平台 → 本路由 → ConversionService → PostbackService
 *   - 调用安全中间件进行验证
 *   - 使用D1进行幂等性检查和存储
 *
 * 前后端交互:
 *   - 纯服务端API，供外部平台调用
 *   - 无前端直接交互
 *
 * API端点:
 * - POST /api/webhook/:platform       - 通用S2S接收 (主要端点)
 * - POST /api/webhook/propellerads    - PropellerAds专用格式
 * - POST /api/webhook/taboola        - Taboola专用 (HMAC验证)
 * - POST /api/webhook/facebook       - Facebook CAPI接收
 * - GET  /api/webhook/:platform/verify - 签名验证调试端点
 *
 * 参数映射表:
 * | 平台     | clickid参数 | payout参数 | status参数 |
 * |----------|------------|------------|-----------|
 * | PropellerAds | clickid    | payout     | status    |
 * | Taboola      | click-id  | revenue    | action_type |
 * | Facebook     | event_id   | value      | event_name |
 * | 通用         | clickid    | payout     | status    |
 */

import { Hono } from 'hono';
import type { Env } from '@/config/env';
import { success, error } from '@/utils/response';
import { HTTP_STATUS } from '@/config/constants';
import { PLATFORM_PARAM_MAPS } from '@/types/attribution';

/** 定义Hono应用的绑定类型 */
type Bindings = Env;

/** 创建Hono应用实例 */
const app = new Hono<{ Bindings: Bindings }>();

// ============================================================
// 辅助函数
// ============================================================

/**
 * 从请求中提取参数 (支持Query和JSON Body两种方式)
 *
 * @param c Hono Context对象
 * @param paramMapping 平台参数映射配置
 * @returns Promise<提取到的参数对象>
 *
 * @description 优先从Query String提取，如果为空则尝试从JSON Body提取。
 */
async function extractParams(
  c: any,
  paramMapping: { clickIdParam: string; payoutParam: string; statusParam: string }
): Promise<{
  clickId: string;
  payout: number;
  status: string;
  rawParams: Record<string, string>;
}> {
  // 尝试从Query String提取
  let clickId = c.req.query(paramMapping.clickIdParam) || '';
  let payoutStr = c.req.query(paramMapping.payoutParam) || '0';
  let status = c.req.query(paramMapping.statusParam) || 'approved';

  // 如果Query中没有，尝试从JSON Body提取
  if (!clickId) {
    try {
      const body = await c.req.json();
      clickId = body[paramMapping.clickIdParam] || '';
      payoutStr = String(body[paramMapping.payoutParam] || '0');
      status = body[paramMapping.statusParam] || 'approved';
    } catch {
      // Body不是JSON，忽略错误
    }
  }

  return {
    clickId,
    payout: parseFloat(payoutStr) || 0,
    status,
    rawParams: {
      ...Object.fromEntries(c.req.query().entries()),
    },
  };
}

/**
 * 处理Inbound Postback的统一流程
 *
 * @param c Hono Context对象
 * @param platform 平台名称
 * @param paramMapping 参数映射配置
 * @returns Promise<Response> JSON响应
 *
 * @description 统一的处理流程:
 * 1. 提取参数
 * 2. IP白名单检查
 * 3. 频率限制检查
 * 4. 幂等性检查
 * 5. 查找点击记录
 * 6. 创建转化记录
 * 7. 触发Outbound Postback
 * 8. 返回成功响应
 */
async function handleInboundPostback(
  c: any,
  platform: string,
  paramMapping: { clickIdParam: string; payoutParam: string; statusParam: string }
): Promise<Response> {
  const startTime = Date.now();

  try {
    // ============================================================
    // 步骤1: 提取参数
    // ============================================================
    const params = await extractParams(c, paramMapping);

    if (!params.clickId) {
      console.warn(`[InboundPostback][${platform}] Missing clickId`);
      c.status(HTTP_STATUS.BAD_REQUEST);
      return c.json(error('Missing required parameter: clickid', 'MISSING_CLICKID'));
    }

    console.log(
      `[InboundPostback][${platform}] Received postback for clickId=${params.clickId}, ` +
      `payout=${params.payout}, status=${params.status}`
    );

    // ============================================================
    // 步骤2: IP白名单检查
    // ============================================================
    const { createPostbackSecurityMiddleware } = await import('@/middleware/postback-security');
    const securityMiddleware = createPostbackSecurityMiddleware(c.env);

    const securityResult = await securityMiddleware.validateRequest(c.req.raw);
    if (!securityResult.allowed) {
      console.warn(
        `[InboundPostback][${platform}] IP blocked: ${securityMiddleware.extractRealIp(c.req.raw)}`
      );
      c.status(HTTP_STATUS.FORBIDDEN);
      return c.json(error('IP not allowed', 'FORBIDDEN'));
    }

    // ============================================================
    // 步骤3: HMAC签名验证 (仅Taboola和Facebook需要)
    // ============================================================
    if (platform === 'taboola' || platform === 'facebook') {
      const hmacValid = await verifyPlatformSignature(c, platform);
      if (!hmacValid) {
        console.warn(`[InboundPostback][${platform}] Invalid signature`);
        c.status(HTTP_STATUS.UNAUTHORIZED);
        return c.json(error('Invalid signature', 'INVALID_SIGNATURE'));
      }
    }

    // ============================================================
    // 步骤4: 频率限制检查
    // ============================================================
    if (c.env.DB) {
      const { PostbackRateLimiter } = await import('@/services/postback/rate-limiter');
      const rateLimiter = new PostbackRateLimiter(c.env.DB);
      const ip = securityMiddleware.extractRealIp(c.req.raw);

      const rateLimitResult = await rateLimiter.checkLimit(params.clickId, ip, platform);
      if (!rateLimitResult.allowed) {
        console.warn(
          `[InboundPostback][${platform}] Rate limited: ${rateLimitResult.reason}`
        );
        c.status(429); // Too Many Requests
        return c.json(error('Rate limit exceeded', 'RATE_LIMITED', {
          retryAfter: rateLimitResult.resetAt,
        }));
      }
    }

    // ============================================================
    // 步骤5: 幂等性检查 (用clickId+platform作为key)
    // ============================================================
    if (c.env.DB) {
      const { PostbackIdempotencyRepository } = await import(
        '@/handlers/d1/postback-idempotency.repo'
      );
      const idempotencyRepo = new PostbackIdempotencyRepository(c.env.DB);

      // 使用clickId + platform作为唯一键
      const idempotencyKey = `${params.clickId}:${platform}`;
      const alreadyProcessed = await idempotencyRepo.isSent(idempotencyKey, platform);

      if (alreadyProcessed) {
        console.log(
          `[InboundPostback][${platform}] Already processed: ${params.clickId}`
        );
        // 返回成功但不重复处理 (幂等性保证)
        return c.json(success({
          success: true,
          platform,
          clickId: params.clickId,
          conversionId: null,
          message: 'Already processed',
        }));
      }
    }

    // ============================================================
    // 步骤6: 查找对应点击记录
    // ============================================================
    let clickData = null;
    if (c.env.DB) {
      const { ClickRepository } = await import('@/handlers/d1/click.repo');
      const clickRepo = new ClickRepository(c.env.DB);
      clickData = await clickRepo.findByClickId(params.clickId);
    }

    if (!clickData) {
      console.warn(
        `[InboundPostback][${platform}] Click not found: ${params.clickId}`
      );
      // 即使找不到点击也返回成功 (避免平台重试导致刷量)
      // 但不创建转化记录
      return c.json(success({
        success: true,
        platform,
        clickId: params.clickId,
        conversionId: null,
        warning: 'Click not found',
      }));
    }

    // ============================================================
    // 步骤7: 创建转化记录
    // ============================================================
    let conversionId: string | null = null;

    if (c.env.DB) {
      const { ConversionService } = await import('@/services/tracking/conversion.service');
      const conversionService = new ConversionService(c.env);

      const result = await conversionService.handleConversion({
        clickId: params.clickId,
        campaignId: clickData.campaignId,
        offerId: clickData.offerId || '',
        revenue: params.payout,
        payout: params.payout,
        conversionType: statusToConversionType(params.status),
      });

      conversionId = result.conversionId;

      if (!result.success) {
        console.error(
          `[InboundPostback][${platform}] Conversion failed: ${conversionId}`
        );
        c.status(HTTP_STATUS.INTERNAL_ERROR);
        return c.json(error('Conversion failed', 'CONVERSION_ERROR'));
      }
    }

    // ============================================================
    // 步骤8: 标记幂等性 (防止重复处理)
    // ============================================================
    if (c.env.DB && conversionId) {
      const { PostbackIdempotencyRepository } = await import(
        '@/handlers/d1/postback-idempotency.repo'
      );
      const idempotencyRepo = new PostbackIdempotencyRepository(c.env.DB);
      await idempotencyRepo.markAsSent(`${params.clickId}:${platform}`, platform);
    }

    // ============================================================
    // 步骤9: 记录频率限制计数
    // ============================================================
    if (c.env.DB) {
      const { PostbackRateLimiter } = await import('@/services/postback/rate-limiter');
      const rateLimiter = new PostbackRateLimiter(c.env.DB);
      const ip = securityMiddleware.extractRealIp(c.req.raw);
      await rateLimiter.recordSend(conversionId || params.clickId, ip);
    }

    const duration = Date.now() - startTime;
    console.log(
      `[InboundPostback][${platform}] Completed in ${duration}ms: ` +
      `clickId=${params.clickId}, conversionId=${conversionId}`
    );

    // ============================================================
    // 步骤10: 返回成功响应
    // ============================================================
    return c.json(success({
      success: true,
      platform,
      clickId: params.clickId,
      conversionId,
    }));

  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error(`[InboundPostback][${platform}] Error:`, err);

    c.status(HTTP_STATUS.INTERNAL_ERROR);
    return c.json(error(errorMessage, 'INTERNAL_ERROR'));
  }
}

/**
 * 验证平台签名 (HMAC)
 *
 * @param c Hono Context对象
 * @param platform 平台名称
 * @returns Promise<boolean> 签名是否有效
 *
 * @private 内部方法
 */
async function verifyPlatformSignature(c: any, platform: string): Promise<boolean> {
  try {
    const { HmacService } = await import('@/services/postback/hmac.service');
    const hmacService = new HmacService();

    if (platform === 'taboola') {
      // Taboola签名验证
      const token = c.req.query('click-id') || '';
      const timestampStr = c.req.query('timestamp') || '';
      const signature = c.req.query('signature') || '';
      const clientSecret = c.env.TABOOLA_CLIENT_SECRET || '';

      if (!token || !timestampStr || !signature || !clientSecret) {
        console.warn('[InboundPostback][Taboola] Missing HMAC parameters');
        return false; // 缺少必需的HMAC参数时拒绝
      }

      const timestamp = parseInt(timestampStr, 10);
      if (isNaN(timestamp)) {
        return false;
      }

      // 检查时间戳有效性 (5分钟内有效，防止重放攻击)
      const now = Date.now();
      const timestampMs = timestamp < 1e12 ? timestamp * 1000 : timestamp;
      if (Math.abs(now - timestampMs) > 5 * 60 * 1000) {
        console.warn('[InboundPostback][Taboola] Timestamp expired');
        return false;
      }

      // 计算并验证签名
      const computedSignature = await hmacService.signTaboola(token, timestamp, clientSecret);
      return computedSignature.toLowerCase() === signature.toLowerCase();

    } else if (platform === 'facebook') {
      // Facebook CAPI签名验证 (使用X-Hub-Signature-256头)
      const payload = await c.req.text();
      const signatureHeader = c.req.header('X-Hub-Signature-256') || '';
      const appSecret = c.env.FACEBOOK_APP_SECRET || '';

      if (!payload || !signatureHeader || !appSecret) {
        console.warn('[InboundPostback][Facebook] Missing Facebook verification parameters');
        return false;
      }

      // 提取签名值 (格式: sha256=xxxxx)
      const expectedSignature = signatureHeader.replace('sha256=', '');
      const computedSignature = await hmacService.sign(appSecret, payload);

      return computedSignature === expectedSignature;
    }

    return true; // 其他平台不需要签名验证

  } catch (error) {
    console.error('[InboundPostback] Signature verification error:', error);
    return false; // 验证出错时拒绝请求
  }
}

/**
 * 将平台状态映射为转化类型
 *
 * @param platformStatus 平台状态字符串
 * @returns 转化类型
 *
 * @private 内部方法
 */
function statusToConversionType(platformStatus: string): string {
  const statusMap: Record<string, string> = {
    approved: 'sale',
    pending: 'lead',
    rejected: 'rejected',
    conversion: 'sale',
    install: 'install',
    purchase: 'sale',
    lead: 'lead',
    signup: 'signup',
    default: 'sale',
  };

  return statusMap[platformStatus.toLowerCase()] || 'sale';
}

// ============================================================
// 路由定义
// ============================================================

/**
 * POST /api/webhook/:platform
 * 通用S2S接收端点 (主要入口)
 *
 * 支持任意平台名称，自动选择对应的参数映射。
 * 如果平台有专用映射则使用专用映射，否则使用通用映射。
 *
 * @param platform 平台名称 (URL路径参数)
 *
 * @example
 * POST /api/webhook/generic?clickid=clk_123&payout=10&status=approved
 * POST /api/webhook/custom?clickid=abc&payout=5.5
 */
app.post('/:platform', async (c) => {
  const platform = c.req.param('platform');

  // 选择参数映射 (有专用映射用专用，否则用通用)
  const paramMapping =
    PLATFORM_PARAM_MAPS[platform] ?? PLATFORM_PARAM_MAPS.generic!;

  return handleInboundPostback(c, platform, paramMapping);
});

/**
 * POST /api/webhook/propellerads
 * PropellerAds专用格式接收端点
 *
 * PropellerAds Postback参数:
 * - clickid: 点击ID (必填)
 * - payout: 收入金额 (必填)
 * - status: 转化状态 (可选, 默认approved)
 * - 其他自定义参数会原样保存
 *
 * @example
 * POST /api/webhook/propellerads?clickid=clk_123&payout=12.50&status=approved
 */
app.post('/propellerads', async (c) => {
  return handleInboundPostback(c, 'propellerads', PLATFORM_PARAM_MAPS.propellerads!);
});

/**
 * POST /api/webhook/taboola
 * Taboola专用格式接收端点 (带HMAC签名验证)
 *
 * Taboola Postback参数:
 * - click-id: 点击ID (必填)
 * - revenue: 收入金额 (必填)
 * - action_type: 动作类型 (可选)
 * - timestamp: 时间戳 (用于HMAC签名)
 * - signature: HMAC签名 (用于验证)
 *
 * 安全要求:
 * - 必须通过HMAC-SHA256签名验证
 * - 时间戳必须在5分钟内有效
 *
 * @example
 * POST /api/webhook/taboola?click-id=clk_123&revenue=15.00&action_type=conversion&timestamp=1677654321&signature=a1b2c3...
 */
app.post('/taboola', async (c) => {
  return handleInboundPostback(c, 'taboola', PLATFORM_PARAM_MAPS.taboola!);
});

/**
 * POST /api/webhook/facebook
 * Facebook CAPI (Conversion API) 接收端点
 *
 * Facebook CAPI特点:
 * - 使用X-Hub-Signature-256头进行HMAC-SHA256验证
 * - 事件数据在JSON Body中
 * - event_id作为点击标识符
 *
 * 安全要求:
 * - 必须通过X-Hub-Signature-256验证
 *
 * @example
 * POST /api/webhook/facebook
 * Headers: X-Hub-Signature-256: sha256=abcdef...
 * Body: { "event_id": "evt_123", "value": "20.00", "event_name": "Purchase" }
 */
app.post('/facebook', async (c) => {
  return handleInboundPostback(c, 'facebook', PLATFORM_PARAM_MAPS.facebook!);
});

/**
 * GET /api/webhook/:platform/verify
 * 签名验证调试端点
 *
 * 用于开发调试时验证签名生成逻辑是否正确。
 * 生产环境建议禁用此端点或添加额外认证。
 *
 * @param platform 平台名称
 * @query clickid 测试用的点击ID
 *
 * @returns 包含签名计算过程和结果的调试信息
 *
 * @example
 * GET /api/webhook/taboola/verify?click-id=test123
 */
app.get('/:platform/verify', async (c) => {
  const platform = c.req.param('platform');

  // 仅非生产环境允许调试端点
  if (c.env.ENVIRONMENT === 'production') {
    c.status(404);
    return c.json({ error: 'Not found' });
  }

  try {
    const { HmacService } = await import('@/services/postback/hmac.service');
    const hmacService = new HmacService();

    const now = Math.floor(Date.now() / 1000);
    const testToken = c.req.query('click-id') || 'test-click-id';

    let signature = '';
    let algorithm = '';

    if (platform === 'taboola') {
      const secret = c.env.TABOOLA_CLIENT_SECRET || 'test-secret';
      signature = await hmacService.signTaboola(testToken, now, secret);
      algorithm = 'HMAC-SHA256(taboola format)';
    } else if (platform === 'facebook') {
      const secret = c.env.FACEBOOK_APP_SECRET || 'test-secret';
      const testData = JSON.stringify({ test: true });
      signature = await hmacService.sign(secret, testData);
      algorithm = 'HMAC-SHA256(standard)';
    } else {
      const secret = 'test-secret';
      signature = await hmacService.sign(secret, `${testToken}${now}`);
      algorithm = 'HMAC-SHA256(generic)';
    }

    return c.json(success({
      platform,
      timestamp: now,
      token: testToken,
      signature,
      algorithm,
      message: 'Use this data to verify your signature implementation',
    }));

  } catch (err) {
    console.error('[InboundPostback] Verify endpoint error:', err);
    c.status(500);
    return c.json(error('Verification failed', 'VERIFY_ERROR'));
  }
});

export default app;
