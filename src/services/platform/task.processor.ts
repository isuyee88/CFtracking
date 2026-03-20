/**
 * @fileoverview 平台任务处理器
 * @description 处理规则引擎生成的平台操作任务
 * @module services/platform/task.processor
 */

import { PlatformManager } from './manager';
import { TaskRepository, type Task } from '@/handlers/d1/task.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';

export interface TaskPayload {
  ruleId: string;
  action: string;
  platform: string;
  parameters: Record<string, unknown>;
  campaignId: string;
}

/**
 * 平台任务处理器
 * 处理来自规则引擎的任务队列中的平台操作
 */
export class PlatformTaskProcessor {
  private taskRepo: TaskRepository;
  private manager: PlatformManager;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    const db = getD1Connection(env);
    this.taskRepo = new TaskRepository(db);
    this.manager = PlatformManager.createDefault();
  }

  /**
   * 处理单个任务
   */
  async processTask(task: Task): Promise<void> {
    if (task.type !== 'rule_action') {
      console.log(`Skipping non-rule task: ${task.type}`);
      return;
    }

    const acquired = await this.taskRepo.markRunning(task.id);
    if (!acquired) {
      console.log(`Task ${task.id} already being processed`);
      return;
    }

    try {
      const payload = JSON.parse(task.payload) as TaskPayload;
      const result = await this.executePlatformAction(payload);

      await this.taskRepo.markCompleted(task.id, {
        success: result.success,
        message: result.message,
        data: result.data,
      });

      console.log(`Task ${task.id} completed: ${result.message}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      await this.taskRepo.markFailed(task.id, errorMessage);
      console.error(`Task ${task.id} failed: ${errorMessage}`);
    }
  }

  /**
   * 执行平台操作
   */
  private async executePlatformAction(payload: TaskPayload) {
    const { platform, action, parameters } = payload;

    // 初始化平台配置
    const config = await this.getPlatformConfig(platform);
    if (config) {
      await this.manager.initializePlatform(platform, config);
    }

    return this.manager.executeAction(platform, action, parameters);
  }

  /**
   * 获取平台配置
   */
  private async getPlatformConfig(platformId: string): Promise<Record<string, unknown> | null> {
    // 从环境变量获取 API Key
    const envKey = `${platformId.toUpperCase()}_API_KEY` as keyof Env;
    const apiKey = this.env[envKey] as string | undefined;
    if (!apiKey) {
      console.warn(`No API key found for platform: ${platformId}`);
      return null;
    }

    return {
      apiKey,
    };
  }

  /**
   * 处理所有待处理的任务
   */
  async processPendingTasks(limit = 10): Promise<number> {
    const tasks = await this.taskRepo.getPendingTasks(limit);

    for (const task of tasks) {
      try {
        await this.processTask(task);
      } catch (error) {
        console.error(`Failed to process task ${task.id}:`, error);
      }
    }

    return tasks.length;
  }
}
