/**
 * @fileoverview Postback平台适配器导出
 * @description 统一导出所有Postback平台适配器
 * @module services/postback/adapters/index
 *
 * 支持的平台:
 * - Generic (通用/标准S2S Postback) - PropellerAds, Revcontent, Outbrain, OddBytes, Rumble等
 * - Taboola (需要HMAC-SHA256签名)
 * - Facebook (Conversions API / CAPI)
 * - Revcontent (专用适配器)
 * - Outbrain (专用适配器)
 * - Rumble (专用适配器)
 * - OddBytes (专用适配器)
 *
 * 使用方式:
 * ```typescript
 * import { GenericPostbackAdapter, TaboolaPostbackAdapter } from '@/services/postback/adapters';
 * ```
 */

// 导出抽象基类
export { PostbackPlatformAdapter } from '@/types/postback';

// 导出各平台适配器实现
export { GenericPostbackAdapter } from './generic.adapter';
export { TaboolaPostbackAdapter } from './taboola.adapter';
export { FacebookPostbackAdapter } from './facebook.adapter';
export { RevcontentPostbackAdapter } from './revcontent.adapter';
export { OutbrainPostbackAdapter } from './outbrain.adapter';
export { RumblePostbackAdapter } from './rumble.adapter';
export { OddBytesPostbackAdapter } from './oddbytes.adapter';

/**
 * 平台名称到适配器类的映射表
 * @description 用于动态查找和注册适配器
 */
export const PLATFORM_ADAPTER_MAP: Record<string, new () => import('@/types/postback').PostbackPlatformAdapter> = {
  generic: (await import('./generic.adapter')).GenericPostbackAdapter,
  propellerads: (await import('./generic.adapter')).GenericPostbackAdapter,
  taboola: (await import('./taboola.adapter')).TaboolaPostbackAdapter,
  facebook: (await import('./facebook.adapter')).FacebookPostbackAdapter,
  revcontent: (await import('./revcontent.adapter')).RevcontentPostbackAdapter,
  outbrain: (await import('./outbrain.adapter')).OutbrainPostbackAdapter,
  rumble: (await import('./rumble.adapter')).RumblePostbackAdapter,
  oddbytes: (await import('./oddbytes.adapter')).OddBytesPostbackAdapter,
};

/**
 * 根据平台名称获取适配器实例
 *
 * @param platformName 平台名称 (如 'taboola', 'facebook', 'propellerads')
 * @returns 平台适配器实例，如果不支持则返回Generic适配器
 */
export function getPlatformAdapter(platformName: string): import('@/types/postback').PostbackPlatformAdapter {
  const AdapterClass = PLATFORM_ADAPTER_MAP[platformName.toLowerCase()];

  if (!AdapterClass) {
    console.warn(`[Adapters] Unknown platform "${platformName}", falling back to Generic adapter`);
    const genericClass = PLATFORM_ADAPTER_MAP['generic'];
    if (!genericClass) {
      throw new Error('[Adapters] Generic adapter not found in PLATFORM_ADAPTER_MAP');
    }
    return new genericClass();
  }

  return new AdapterClass();
}
