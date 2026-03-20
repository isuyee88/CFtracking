/**
 * @fileoverview Platform 服务模块入口
 * @description 导出所有平台相关的服务和类型
 * @module services/platform
 */

export { PlatformAdapter } from './adapter';
export { PlatformManager } from './manager';
export { PropellerAdsAdapter } from './propellerads';
export { OddBytesAdapter } from './oddbytes';
export { PlatformTaskProcessor } from './task.processor';
export { handlePlatformCron, triggerRuleEvaluation, triggerTaskProcessing } from './cron.worker';
export { createPlatformRouter } from './platform.routes';

export type { TaskPayload } from './task.processor';
