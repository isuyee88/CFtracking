/**
 * @fileoverview 平台适配器接口
 * @description 定义所有流量平台适配器的标准接口
 * @module services/platform/adapter
 */

import type { PlatformInfo, PlatformActionResult } from '@/types/platform';

export abstract class PlatformAdapter<TConfig = Record<string, unknown>> {
  protected config: TConfig;

  constructor(config: TConfig) {
    this.config = config;
  }

  /**
   * 获取平台信息
   */
  abstract getInfo(): PlatformInfo;

  /**
   * 初始化平台连接
   */
  abstract initialize(): Promise<void>;

  /**
   * 执行操作
   */
  abstract execute(action: string, parameters: Record<string, unknown>): Promise<PlatformActionResult>;

  /**
   * 验证配置
   */
  abstract validateConfig(): boolean;

  /**
   * 测试连接
   */
  abstract testConnection(): Promise<boolean>;
}
