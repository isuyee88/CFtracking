/**
 * @fileoverview 转化追踪服务
 * @description 处理转化追踪的业务逻辑
 * @module services/tracking/conversion.service
 *
 * 职责: 把一次 postback 请求落成至多一条 D1 转化，并只在首次落库后触发 DO 统计。
 * 不变量: 同一 clickId 最多一条新增转化；幂等状态未知时宁可不写（503 可重试），
 *         也不允许“查不到就插入”。
 * @see schema/migrations/084_conversion_idempotency_key.sql
 * @see handlers/d1/conversion.repo.ts saveConversion
 */

import { DOService } from '@/handlers/do';
import { ConversionRepository } from '@/handlers/d1/conversion.repo';
import { ClickRepository } from '@/handlers/d1/click.repo';
import { getD1Connection } from '@/handlers/d1';
import { isAeOnlyClickPersistence, readClickContext } from './click-context';
import { AppError } from '@/middleware/error';
import { HTTP_STATUS } from '@/config/constants';
import type { Env } from '@/config/env';
import type { ConversionData } from '@/types/tracking';
import { generateConversionId } from '@/utils/crypto';

/** 幂等状态未知时返回的错误码；路由据此返回可重试的 503。 */
export const CONVERSION_IDEMPOTENCY_UNAVAILABLE = 'conversion_idempotency_unavailable';

/**
 * 幂等查询不可用。
 *
 * fail-closed why: 查询失败时无法证明这次回传是新转化。若继续插入，就会在
 * 现有“先查后写”的漏洞上再叠一条重复记录；因此宁可拒绝，让平台按 503 重试。
 * 错误带 code/statusCode，路由映射成 503 后调用方才能识别“可重试”而非“成功”。
 */
export class ConversionIdempotencyUnavailableError extends AppError {
  constructor(clickId: string, cause: unknown) {
    super(
      'Conversion idempotency lookup unavailable',
      CONVERSION_IDEMPOTENCY_UNAVAILABLE,
      HTTP_STATUS.SERVICE_UNAVAILABLE,
      { clickId, cause: cause instanceof Error ? cause.message : String(cause) }
    );
    this.name = 'ConversionIdempotencyUnavailableError';
  }
}

/**
 * 该 clickId 的既有转化 id。
 *
 * 历史数据里同一 clickId 可能有多行（迁移 084 之前没有约束），
 * findByClickId 按 timestamp DESC 返回，因此取最新一行作为这一 click 的代表。
 */
function pickExistingConversionId(rows: ConversionData[]): string | null {
  for (const row of rows) {
    if (row?.conversionId) return row.conversionId;
  }
  return null;
}

export interface ConversionRequest {
  clickId: string;
  campaignId: string;
  offerId: string;
  revenue: number;
  payout?: number;
  currency?: string;
  conversionType?: string;
  offerName?: string;
}

export interface ConversionResult {
  conversionId: string;
  success: boolean;
  duplicate?: boolean;
}

export class ConversionService {
  private env: Env;
  private doService: DOService;
  private clickRepo: ClickRepository;
  private conversionRepo: ConversionRepository;

  constructor(env: Env) {
    this.env = env;
    this.doService = new DOService(env);
    const db = getD1Connection(env);
    this.clickRepo = new ClickRepository(db);
    this.conversionRepo = new ConversionRepository(db);
  }

  /**
   * 处理转化请求。
   *
   * 幂等契约:
   *   1. 先按 clickId 查既有转化；查询失败 → 抛 503 错误，不插入（fail-closed）；
   *   2. 已存在 → duplicate，不写库、不触发任何副作用；
   *   3. 插入用 `ON CONFLICT(idempotencyKey) DO NOTHING`，并发重复回传只有一个
   *      赢家；输家 inserted=false，重新读取赢家 id 后按 duplicate 返回；
   *   4. 只有插入赢家才执行 trackConversion / incrementCounter，避免 DO 统计
   *      被重试重复计数。
   *
   * @throws ConversionIdempotencyUnavailableError 幂等查询不可用（含插入冲突后
   *         无法读回赢家行），路由应映射为 503 让平台重试。
   */
  async handleConversion(request: ConversionRequest): Promise<ConversionResult> {
    const conversionId = generateConversionId();

    // A retried postback must not create a second conversion for one click. A
    // failed lookup cannot prove that, so it is fatal rather than best-effort.
    let existing: ConversionData[];
    try {
      existing = await this.conversionRepo.findByClickId(request.clickId);
    } catch (error) {
      throw new ConversionIdempotencyUnavailableError(request.clickId, error);
    }

    const existingConversionId = pickExistingConversionId(existing);
    if (existingConversionId) {
      return { conversionId: existingConversionId, success: true, duplicate: true };
    }

    // AE-only: the click row did not exist in D1. Materialize it now, then
    // persist the conversion; both are conversion-path writes, not click-path.
    if (isAeOnlyClickPersistence(this.env)) {
      const context = await readClickContext(this.env, request.clickId);
      if (context) {
        try {
          await this.clickRepo.saveClick(context);
        } catch (error) {
          // A retried conversion may already have materialized the click.
          console.warn('[ConversionService] click context already materialized or invalid:', error);
        }
      }
    }

    const { inserted } = await this.conversionRepo.saveConversion({
      conversionId,
      clickId: request.clickId,
      campaignId: request.campaignId,
      offerId: request.offerId,
      timestamp: new Date().toISOString(),
      revenue: Number(request.revenue) || 0,
      payout: Number(request.payout ?? request.revenue) || 0,
      currency: request.currency || 'USD',
      conversionType: request.conversionType || 'sale',
      offerName: request.offerName || null,
    });

    if (!inserted) {
      // Lost the unique-index race to a concurrent retry. Report the winner's
      // row and stop here: the winner already emitted the side effects.
      let winner: ConversionData[];
      try {
        winner = await this.conversionRepo.findByClickId(request.clickId);
      } catch (error) {
        throw new ConversionIdempotencyUnavailableError(request.clickId, error);
      }
      const winnerConversionId = pickExistingConversionId(winner);
      if (!winnerConversionId) {
        // The conflict proves a row exists; not being able to read it back means
        // the read path is unreliable, so surface the same retryable failure.
        throw new ConversionIdempotencyUnavailableError(
          request.clickId,
          new Error('idempotency conflict without a readable row')
        );
      }
      return { conversionId: winnerConversionId, success: true, duplicate: true };
    }

    // Only the insert winner may touch DO state; a duplicate must not double count.
    await this.doService.trackConversion({
      clickId: request.clickId,
      revenue: request.revenue
    });

    await this.doService.incrementCounter(`campaign:${request.campaignId}:today`, {
      conversions: 1,
      revenue: request.revenue,
    });

    return {
      conversionId,
      success: true,
    };
  }

  /**
   * 批量处理转化
   */
  async handleBatchConversions(requests: ConversionRequest[]): Promise<ConversionResult[]> {
    const results: ConversionResult[] = [];

    for (const request of requests) {
      try {
        const result = await this.handleConversion(request);
        results.push(result);
      } catch (error) {
        results.push({
          conversionId: '',
          success: false,
        });
      }
    }

    return results;
  }

  /**
   * 获取转化的点击详情
   */
  async getConversionClickDetails(_conversionId: string): Promise<ConversionData | null> {
    return null; // 暂未实现
  }
}

/**
 * 创建 ConversionService 实例的工厂函数
 */
export function createConversionService(env: Env): ConversionService {
  return new ConversionService(env);
}
