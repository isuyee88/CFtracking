/**
 * File: storageMigration.ts
 * Purpose: 数据迁移工具，支持不同版本间的数据结构升级
 * Input/Output: 旧版本数据 -> 新版本数据
 * Logic: 提供迁移函数和版本管理
 */

import { storageManager, MigrationResult } from './StorageManager';

// ==================== 数据模型版本定义 ====================

export interface DataModelVersion {
  version: string;
  releaseDate: string;
  description: string;
  changes: string[];
}

export const DATA_MODEL_VERSIONS: DataModelVersion[] = [
  {
    version: '1.0',
    releaseDate: '2024-01-01',
    description: 'Initial version',
    changes: [
      'Initial release',
      'Basic preference storage',
      'Table configuration support',
    ],
  },
  {
    version: '1.1',
    releaseDate: '2024-03-01',
    description: 'Added view configuration',
    changes: [
      'Added viewConfigs support',
      'Improved validation',
      'Better error handling',
    ],
  },
];

// ==================== 迁移函数 ====================

/**
 * 从 1.0 迁移到 1.1
 * 添加 viewConfigs 字段
 */
export async function migrateFrom10To11(): Promise<MigrationResult> {
  return await storageManager.migrate('1.0', '1.1', (data) => {
    // 添加 viewConfigs 字段（如果不存在）
    if (!data.viewConfigs) {
      data.viewConfigs = {};
    }
    
    // 更新元数据
    data.$meta = {
      ...data.$meta,
      version: '1.1',
      lastUpdated: Date.now(),
    };
    
    return data;
  });
}

/**
 * 执行所有迁移
 */
export async function migrateToLatest(): Promise<void> {
  const currentVersion = '1.0'; // 假设当前是 1.0
  
  if (currentVersion === '1.0') {
    console.log('[Migration] Migrating from 1.0 to 1.1...');
    await migrateFrom10To11();
    console.log('[Migration] Migration completed');
  }
}

// ==================== 迁移工具类 ====================

export class MigrationTool {
  private static instance: MigrationTool;
  
  private constructor() {}
  
  static getInstance(): MigrationTool {
    if (!MigrationTool.instance) {
      MigrationTool.instance = new MigrationTool();
    }
    return MigrationTool.instance;
  }
  
  /**
   * 获取当前版本
   */
  async getCurrentVersion(): Promise<string> {
    const sample = await storageManager.get<any>('cf:v1:pref:user:theme');
    return sample?.$meta?.version || '1.0';
  }
  
  /**
   * 检查是否需要迁移
   */
  async needsMigration(): Promise<boolean> {
    const currentVersion = await this.getCurrentVersion();
    const latestVersion = DATA_MODEL_VERSIONS[DATA_MODEL_VERSIONS.length - 1].version;
    return currentVersion !== latestVersion;
  }
  
  /**
   * 执行迁移
   */
  async migrate(): Promise<MigrationResult> {
    const currentVersion = await this.getCurrentVersion();
    
    // 根据当前版本选择迁移路径
    if (currentVersion === '1.0') {
      return await migrateFrom10To11();
    }
    
    return {
      success: true,
      migratedKeys: [],
      errors: [],
    };
  }
  
  /**
   * 获取迁移信息
   */
  async getMigrationInfo(): Promise<{
    currentVersion: string;
    latestVersion: string;
    needsMigration: boolean;
    changes: string[];
  }> {
    const currentVersion = await this.getCurrentVersion();
    const latestVersion = DATA_MODEL_VERSIONS[DATA_MODEL_VERSIONS.length - 1].version;
    const needsMigration = currentVersion !== latestVersion;
    
    // 获取所有需要应用的变更
    const changes: string[] = [];
    let foundCurrent = false;
    
    for (const version of DATA_MODEL_VERSIONS) {
      if (foundCurrent) {
        changes.push(...version.changes);
      }
      if (version.version === currentVersion) {
        foundCurrent = true;
      }
    }
    
    return {
      currentVersion,
      latestVersion,
      needsMigration,
      changes,
    };
  }
}

export const migrationTool = MigrationTool.getInstance();

// ==================== 自动迁移 ====================

/**
 * 在应用启动时自动检查并执行迁移
 */
export async function autoMigrate(): Promise<void> {
  try {
    const tool = migrationTool;
    const needsMigration = await tool.needsMigration();
    
    if (needsMigration) {
      console.log('[AutoMigration] Migration needed, starting...');
      const result = await tool.migrate();
      
      if (result.success) {
        console.log(`[AutoMigration] Successfully migrated ${result.migratedKeys.length} keys`);
      } else {
        console.error('[AutoMigration] Migration failed:', result.errors);
      }
    }
  } catch (error) {
    console.error('[AutoMigration] Error:', error);
  }
}

// ==================== 迁移报告 ====================

export interface MigrationReport {
  startTime: number;
  endTime: number;
  duration: number;
  success: boolean;
  migratedKeys: string[];
  errors: Array<{ key: string; error: string }>;
  summary: {
    total: number;
    successful: number;
    failed: number;
  };
}

/**
 * 生成迁移报告
 */
export async function generateMigrationReport(
  result: MigrationResult,
  startTime: number
): Promise<MigrationReport> {
  const endTime = Date.now();
  
  return {
    startTime,
    endTime,
    duration: endTime - startTime,
    success: result.success,
    migratedKeys: result.migratedKeys,
    errors: result.errors,
    summary: {
      total: result.migratedKeys.length + result.errors.length,
      successful: result.migratedKeys.length,
      failed: result.errors.length,
    },
  };
}

export default {
  migrateFrom10To11,
  migrateToLatest,
  MigrationTool,
  migrationTool,
  autoMigrate,
  generateMigrationReport,
};
