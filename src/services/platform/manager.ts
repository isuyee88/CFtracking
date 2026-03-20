/**
 * @fileoverview 平台管理器
 * @description 管理所有流量平台适配器
 * @module services/platform/manager
 */

import { PlatformAdapter } from './adapter';
import { OddBytesAdapter } from './oddbytes';
import { PropellerAdsAdapter } from './propellerads';
import type { PlatformInfo, PlatformConfig, PlatformActionResult } from '@/types/platform';

export class PlatformManager {
  private adapters: Map<string, PlatformAdapter<any>> = new Map();
  private configs: Map<string, PlatformConfig['config']> = new Map();

  /**
   * 注册平台适配器
   */
  registerAdapter(adapter: PlatformAdapter<any>): void {
    const info = adapter.getInfo();
    this.adapters.set(info.id, adapter);
  }

  /**
   * 初始化平台
   */
  async initializePlatform(platformId: string, config: PlatformConfig['config']): Promise<void> {
    const adapter = this.adapters.get(platformId);
    if (!adapter) {
      throw new Error(`Platform ${platformId} not found`);
    }

    if (!adapter.validateConfig()) {
      throw new Error(`Invalid configuration for platform ${platformId}`);
    }

    await adapter.initialize();
    this.configs.set(platformId, config);
  }

  /**
   * 执行操作
   */
  async executeAction(
    platformId: string,
    action: string,
    parameters: Record<string, unknown>
  ): Promise<PlatformActionResult> {
    const adapter = this.adapters.get(platformId);
    if (!adapter) {
      return {
        success: false,
        message: `Platform ${platformId} not found`,
      };
    }

    return adapter.execute(action, parameters);
  }

  /**
   * 获取所有可用平台
   */
  getAvailablePlatforms(): PlatformInfo[] {
    const platforms: PlatformInfo[] = [];
    for (const adapter of this.adapters.values()) {
      platforms.push(adapter.getInfo());
    }
    return platforms;
  }

  /**
   * 获取已配置的平台
   */
  getConfiguredPlatforms(): Array<{ info: PlatformInfo; configured: boolean }> {
    const platforms: Array<{ info: PlatformInfo; configured: boolean }> = [];

    for (const [id, adapter] of this.adapters.entries()) {
      platforms.push({
        info: adapter.getInfo(),
        configured: this.configs.has(id),
      });
    }

    return platforms;
  }

  /**
   * 测试平台连接
   */
  async testPlatformConnection(platformId: string): Promise<boolean> {
    const adapter = this.adapters.get(platformId);
    if (!adapter) {
      return false;
    }

    return adapter.testConnection();
  }

  /**
   * 创建默认管理器实例
   */
  static createDefault(): PlatformManager {
    const manager = new PlatformManager();
    manager.registerAdapter(new OddBytesAdapter({ wsdlUrl: '', apiKey: '' } as any));
    manager.registerAdapter(new PropellerAdsAdapter({ apiKey: '' } as any));
    return manager;
  }
}
