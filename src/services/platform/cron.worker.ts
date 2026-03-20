/**
 * @fileoverview 平台任务 Cron Worker
 * @description 定期处理规则引擎生成的平台操作任务
 * @module services/platform/cron.worker
 */

import { PlatformTaskProcessor } from './task.processor';
import { RuleEngine } from '@/services/rule/engine';
import type { Env } from '@/config/env';

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

    // 2. 处理生成的任务
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
