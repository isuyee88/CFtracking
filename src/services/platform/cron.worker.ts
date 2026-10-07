/**
 * @fileoverview 平台任务 Cron Worker
 * @description 定期处理规则引擎生成的平台操作任务
 * @module services/platform/cron.worker
 */

import { handlePostbackRetryCron } from '@/services/postback/postback-retry.consumer';
import { reconcileHostedAssetOrphans } from '@/services/hostedAsset/hostedAsset.reconciliation';
import { PlatformTaskProcessor } from './task.processor';
import { RuleEngine } from '@/services/rule/engine';
import type { Env } from '@/config/env';

const HOSTED_ASSET_ORPHAN_BATCH_LIMIT = 100;

export function shouldRunHostedAssetOrphanReconciliation(
  value: boolean | string | undefined,
): boolean {
  if (value === true) return true;
  if (typeof value !== 'string') return false;
  return ['1', 'true', 'on', 'yes'].includes(value.trim().toLowerCase());
}

type HostedAssetReconciliationCronEnv = Pick<Env, 'DB' | 'HOSTED_ASSETS_BUCKET'> & {
  HOSTED_ASSET_ORPHAN_RECONCILIATION_ENABLED?: boolean | string;
};

export async function runHostedAssetOrphanReconciliation(
  env: HostedAssetReconciliationCronEnv,
) {
  if (!shouldRunHostedAssetOrphanReconciliation(env.HOSTED_ASSET_ORPHAN_RECONCILIATION_ENABLED)) {
    return null;
  }

  if (!env.HOSTED_ASSETS_BUCKET) {
    console.warn('[HostedAsset] orphan reconciliation enabled but R2 binding is unavailable');
    return null;
  }

  return reconcileHostedAssetOrphans({
    bucket: env.HOSTED_ASSETS_BUCKET,
    db: env.DB,
    limit: HOSTED_ASSET_ORPHAN_BATCH_LIMIT,
  });
}

/**
 * Cron Worker 处理器
 * 由 Cloudflare Workers Cron Triggers 调用
 */
export async function handlePlatformCron(env: Env): Promise<void> {
  console.log('Starting platform cron job...');

  try {
    // 1. 先评估所有规则，生成任务
    console.log('Evaluating rules...');
    const ruleEngine = new RuleEngine(env);
    await ruleEngine.evaluateAllRules();

    // 2. 消费到期的 outbound postback retry，复用现有 5 分钟 Cron，不新增 Queue/Cron binding。
    const retrySummary = await handlePostbackRetryCron(env, { limit: 100 });
    console.log(
      `Postback retry consumer completed. inspected=${retrySummary.inspected} sent=${retrySummary.sent} ` +
      `retried=${retrySummary.retried} deadLettered=${retrySummary.deadLettered} skipped=${retrySummary.skipped}`,
    );

    // 3. Reconcile one bounded R2 page only when explicitly enabled. This reuses
    // the existing daily cron owner without adding another trigger or binding.
    const orphanSummary = await runHostedAssetOrphanReconciliation(env);
    if (orphanSummary) {
      console.log(
        `Hosted Asset orphan reconciliation completed. inspected=${orphanSummary.inspected} ` +
        `orphaned=${orphanSummary.orphaned} deleted=${orphanSummary.deleted} failed=${orphanSummary.failed} ` +
        `complete=${orphanSummary.complete}`,
      );
    }

    // 4. 处理生成的任务
    console.log('Processing pending tasks...');
    const processor = new PlatformTaskProcessor(env);
    const processedCount = await processor.processPendingTasks(50);

    console.log(`Platform cron job completed. Processed ${processedCount} tasks.`);
  } catch (error) {
    console.error('Platform cron job failed:', error);
    throw error;
  }
}

/**
 * 手动触发规则评估（用于测试）
 */
export async function triggerRuleEvaluation(env: Env): Promise<{
  success: boolean;
  message: string;
  tasksCreated?: number;
}> {
  try {
    const ruleEngine = new RuleEngine(env);
    await ruleEngine.evaluateAllRules();

    return {
      success: true,
      message: 'Rule evaluation completed',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Rule evaluation failed: ${message}`,
    };
  }
}

/**
 * 手动触发任务处理（用于测试）
 */
export async function triggerTaskProcessing(env: Env, limit = 10): Promise<{
  success: boolean;
  message: string;
  processedCount?: number;
}> {
  try {
    const processor = new PlatformTaskProcessor(env);
    const processedCount = await processor.processPendingTasks(limit);

    return {
      success: true,
      message: `Processed ${processedCount} tasks`,
      processedCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      success: false,
      message: `Task processing failed: ${message}`,
    };
  }
}
