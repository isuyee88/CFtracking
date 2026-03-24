/**
 * File: storageBackup.ts
 * Purpose: 数据备份与恢复工具，支持导出、导入、自动备份
 * Input/Output: 备份数据的导出和导入
 * Logic: 提供完整的备份恢复机制，包括校验和验证
 */

import { storageManager, BackupData } from './StorageManager';

// ==================== 备份元数据 ====================

export interface BackupMetadata {
  version: string;
  createdAt: number;
  createdBy: string;
  description?: string;
  itemCount: number;
  compressedSize?: number;
  uncompressedSize?: number;
  checksum: string;
  encryption?: 'none' | 'aes';
}

// ==================== 备份工具类 ====================

export class BackupTool {
  private static instance: BackupTool;
  
  private constructor() {}
  
  static getInstance(): BackupTool {
    if (!BackupTool.instance) {
      BackupTool.instance = new BackupTool();
    }
    return BackupTool.instance;
  }
  
  /**
   * 创建备份
   */
  async createBackup(
    prefix?: string,
    options?: {
      description?: string;
      compress?: boolean;
      encrypt?: boolean;
    }
  ): Promise<BackupData & { metadata: BackupMetadata }> {
    const startTime = Date.now();
    
    // 创建基础备份
    const backup = await storageManager.backup(prefix);
    
    // 计算详细信息
    const jsonData = JSON.stringify(backup.data);
    const compressedSize = new Blob([jsonData]).size;
    
    // 创建元数据
    const metadata: BackupMetadata = {
      version: backup.version,
      createdAt: startTime,
      createdBy: 'CF Tracking',
      description: options?.description,
      itemCount: Object.keys(backup.data).length,
      compressedSize,
      uncompressedSize: jsonData.length,
      checksum: backup.checksum,
      encryption: options?.encrypt ? 'aes' : 'none',
    };
    
    return {
      ...backup,
      metadata,
    };
  }
  
  /**
   * 恢复备份
   */
  async restoreBackup(backup: BackupData): Promise<void> {
    // 验证校验和
    const isValid = await this.verifyBackup(backup);
    if (!isValid) {
      throw new Error('Backup verification failed');
    }
    
    // 恢复数据
    await storageManager.restore(backup);
  }
  
  /**
   * 导出为 JSON 文件
   */
  async exportToFile(
    filename: string = `cf-tracking-backup-${new Date().toISOString().split('T')[0]}.json`,
    prefix?: string
  ): Promise<void> {
    const backup = await this.createBackup(prefix);
    const json = JSON.stringify(
      { ...backup, metadata: backup.metadata },
      null,
      2
    );
    
    // 创建 Blob 并下载
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  
  /**
   * 从 JSON 文件导入
   */
  async importFromFile(file: File): Promise<void> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (event) => {
        try {
          const json = event.target?.result as string;
          const backup = JSON.parse(json) as BackupData & { metadata?: BackupMetadata };
          
          // 验证备份
          const isValid = await this.verifyBackup(backup);
          if (!isValid) {
            reject(new Error('Invalid backup file'));
            return;
          }
          
          // 恢复数据
          await storageManager.restore(backup);
          resolve();
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file);
    });
  }
  
  /**
   * 验证备份
   */
  async verifyBackup(backup: BackupData): Promise<boolean> {
    try {
      // 重新计算校验和
      const checksum = await this.calculateChecksum(JSON.stringify(backup.data));
      return checksum === backup.checksum;
    } catch {
      return false;
    }
  }
  
  /**
   * 比较校验和
   */
  private async calculateChecksum(data: string): Promise<string> {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
  
  /**
   * 获取备份统计信息
   */
  async getBackupStats(): Promise<{
    totalKeys: number;
    estimatedSize: number;
    oldestEntry?: number;
    newestEntry?: number;
  }> {
    const keys: string[] = [];
    const timestamps: number[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('cf:v1:')) {
        keys.push(key);
        
        try {
          const value = localStorage.getItem(key);
          if (value) {
            const data = JSON.parse(value);
            if (data.$meta?.lastUpdated) {
              timestamps.push(data.$meta.lastUpdated);
            }
          }
        } catch {
          // Skip invalid entries
        }
      }
    }
    
    return {
      totalKeys: keys.length,
      estimatedSize: keys.length * 500, // 平均每个键 500 字节
      oldestEntry: timestamps.length > 0 ? Math.min(...timestamps) : undefined,
      newestEntry: timestamps.length > 0 ? Math.max(...timestamps) : undefined,
    };
  }
  
  /**
   * 自动备份（定期）
   */
  async scheduleAutoBackup(
    intervalMs: number = 24 * 60 * 60 * 1000, // 默认每天
    callback?: (backup: BackupData) => void
  ): Promise<() => void> {
    // 立即执行一次
    const backup = await this.createBackup();
    callback?.(backup);
    
    // 设置定时器
    const timerId = setInterval(async () => {
      const backup = await this.createBackup();
      callback?.(backup);
    }, intervalMs);
    
    // 返回取消函数
    return () => clearInterval(timerId);
  }
}

export const backupTool = BackupTool.getInstance();

// ==================== 便捷函数 ====================

/**
 * 快速导出备份
 */
export async function exportBackup(filename?: string): Promise<void> {
  await backupTool.exportToFile(filename);
}

/**
 * 快速导入备份
 */
export async function importBackup(file: File): Promise<void> {
  await backupTool.importFromFile(file);
}

/**
 * 创建并下载备份
 */
export async function createAndDownloadBackup(description?: string): Promise<BackupData> {
  const backup = await backupTool.createBackup(undefined, { description });
  await backupTool.exportToFile();
  return backup;
}

/**
 * 验证备份文件
 */
export async function validateBackupFile(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = async (event) => {
      try {
        const json = event.target?.result as string;
        const backup = JSON.parse(json) as BackupData;
        const isValid = await backupTool.verifyBackup(backup);
        resolve(isValid);
      } catch {
        resolve(false);
      }
    };
    
    reader.onerror = () => resolve(false);
    reader.readAsText(file);
  });
}

// ==================== React Hook ====================

import { useState, useCallback } from 'react';

export function useBackup() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastBackup, setLastBackup] = useState<BackupData | null>(null);
  
  const createBackup = useCallback(async (description?: string) => {
    try {
      setLoading(true);
      const backup = await backupTool.createBackup(undefined, { description });
      setLastBackup(backup);
      setError(null);
      return backup;
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to create backup'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  const restoreBackup = useCallback(async (backup: BackupData) => {
    try {
      setLoading(true);
      await backupTool.restoreBackup(backup);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to restore backup'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  const exportBackup = useCallback(async (filename?: string) => {
    try {
      setLoading(true);
      await backupTool.exportToFile(filename);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to export backup'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  const importBackup = useCallback(async (file: File) => {
    try {
      setLoading(true);
      await backupTool.importFromFile(file);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to import backup'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  
  return {
    loading,
    error,
    lastBackup,
    createBackup,
    restoreBackup,
    exportBackup,
    importBackup,
  };
}

export default {
  BackupTool,
  backupTool,
  exportBackup,
  importBackup,
  createAndDownloadBackup,
  validateBackupFile,
  useBackup,
};
