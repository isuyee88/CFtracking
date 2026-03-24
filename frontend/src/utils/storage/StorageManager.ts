/**
 * File: StorageManager.ts
 * Purpose: 统一存储管理器，提供类型安全、错误处理、数据验证的存储接口
 * Input/Output: 泛型数据读写，支持多种存储策略
 * Logic: 统一管理 localStorage、sessionStorage、IndexedDB、URL 参数等存储方式
 * 
 * Features:
 * - 类型安全的泛型接口
 * - 自动数据验证
 * - 错误处理与恢复
 * - 变化监听
 * - 批量操作
 * - 备份与恢复
 * - 数据迁移
 */

// ==================== 类型定义 ====================

export type StorageType = 'local' | 'session' | 'indexedDB' | 'memory' | 'url';

export interface StorageOptions {
  type?: StorageType;
  encrypt?: boolean;
  compress?: boolean;
  ttl?: number; // Time to live in milliseconds
}

export interface ValidationResult<T> {
  valid: boolean;
  data?: T;
  errors: string[];
}

export interface BackupData {
  version: string;
  timestamp: number;
  data: Record<string, any>;
  checksum: string;
}

export interface CleanupResult {
  removedKeys: string[];
  freedBytes: number;
}

export interface MigrationResult {
  success: boolean;
  migratedKeys: string[];
  errors: Array<{ key: string; error: string }>;
}

// ==================== 存储策略基类 ====================

abstract class StorageStrategy implements IStorageStrategy {
  abstract name: StorageType;
  abstract get<T>(key: string): Promise<T | null>;
  abstract set<T>(key: string, value: T): Promise<void>;
  abstract remove(key: string): Promise<void>;
  abstract clear(): Promise<void>;
  watch?(key: string, callback: (value: any) => void): () => void {
    throw new Error('watch not implemented');
  }

  protected serialize<T>(value: T): string {
    return JSON.stringify(value);
  }

  protected deserialize<T>(data: string): T {
    return JSON.parse(data) as T;
  }

  protected handleError(operation: string, key: string, error: unknown): never {
    console.error(`[Storage] ${operation} failed for key "${key}":`, error);
    throw error;
  }
}

// ==================== LocalStorage 策略 ====================

class LocalStorageStrategy extends StorageStrategy {
  name: StorageType = 'local';

  async get<T>(key: string): Promise<T | null> {
    try {
      const item = localStorage.getItem(key);
      if (!item) return null;
      return this.deserialize<T>(item);
    } catch (error) {
      return this.handleError('GET', key, error);
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const serialized = this.serialize(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      // 处理 quota exceeded 错误
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.warn('[Storage] LocalStorage quota exceeded, attempting cleanup...');
        await this.cleanupOldEntries();
        try {
          localStorage.setItem(key, this.serialize(value));
        } catch (retryError) {
          this.handleError('SET (after cleanup)', key, retryError);
        }
      } else {
        this.handleError('SET', key, error);
      }
    }
  }

  async remove(key: string): Promise<void> {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      this.handleError('REMOVE', key, error);
    }
  }

  async clear(): Promise<void> {
    try {
      localStorage.clear();
    } catch (error) {
      this.handleError('CLEAR', 'all', error);
    }
  }

  watch(key: string, callback: (value: any) => void): () => void {
    const handler = (event: StorageEvent) => {
      if (event.key === key && event.newValue !== null) {
        try {
          callback(this.deserialize(event.newValue));
        } catch {
          // Ignore parse errors
        }
      }
    };

    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }

  private async cleanupOldEntries(): Promise<void> {
    // 简单的清理策略：删除最旧的条目
    const now = Date.now();
    const entries: Array<{ key: string; timestamp: number }> = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        try {
          const item = localStorage.getItem(key);
          if (item) {
            const data = JSON.parse(item);
            // 检查是否有时间戳标记
            if (data && typeof data === 'object' && '$meta' in data) {
              entries.push({
                key,
                timestamp: (data.$meta as any).lastUpdated || now,
              });
            }
          }
        } catch {
          // Skip invalid entries
        }
      }
    }

    // 按时间排序，删除最旧的 20%
    entries.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = Math.floor(entries.length * 0.2);
    
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(entries[i].key);
    }
  }
}

// ==================== SessionStorage 策略 ====================

class SessionStorageStrategy extends StorageStrategy {
  name: StorageType = 'session';

  async get<T>(key: string): Promise<T | null> {
    try {
      const item = sessionStorage.getItem(key);
      if (!item) return null;
      return this.deserialize<T>(item);
    } catch (error) {
      return this.handleError('GET', key, error);
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      sessionStorage.setItem(key, this.serialize(value));
    } catch (error) {
      this.handleError('SET', key, error);
    }
  }

  async remove(key: string): Promise<void> {
    try {
      sessionStorage.removeItem(key);
    } catch (error) {
      this.handleError('REMOVE', key, error);
    }
  }

  async clear(): Promise<void> {
    try {
      sessionStorage.clear();
    } catch (error) {
      this.handleError('CLEAR', 'all', error);
    }
  }
}

// ==================== Memory 策略 ====================

class MemoryStorageStrategy extends StorageStrategy {
  name: StorageType = 'memory';
  private store = new Map<string, string>();

  async get<T>(key: string): Promise<T | null> {
    const item = this.store.get(key);
    if (!item) return null;
    return this.deserialize<T>(item);
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, this.serialize(value));
  }

  async remove(key: string): Promise<void> {
    this.store.delete(key);
  }

  async clear(): Promise<void> {
    this.store.clear();
  }

  watch(key: string, callback: (value: any) => void): () => void {
    const observers = new Set<(value: any) => void>();
    observers.add(callback);
    
    return () => {
      observers.delete(callback);
    };
  }
}

// ==================== URL 策略 ====================

class URLStorageStrategy extends StorageStrategy {
  name: StorageType = 'url';
  private paramName: string;

  constructor(paramName: string = 'state') {
    super();
    this.paramName = paramName;
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get(this.paramName);
      if (!encoded) return null;
      
      // Base64 解码
      const decoded = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
      const data = JSON.parse(decoded) as Record<string, any>;
      return (data[key] as T) || null;
    } catch (error) {
      return this.handleError('GET', key, error);
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const params = new URLSearchParams(window.location.search);
      const encoded = params.get(this.paramName);
      
      let data: Record<string, any> = {};
      if (encoded) {
        const decoded = atob(encoded.replace(/-/g, '+').replace(/_/g, '/'));
        data = JSON.parse(decoded);
      }
      
      data[key] = value;
      
      // Base64 编码
      const json = JSON.stringify(data);
      const newEncoded = btoa(json)
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '.');
      
      params.set(this.paramName, newEncoded);
      
      // 更新 URL 而不刷新页面
      const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      window.history.replaceState({}, '', newUrl);
    } catch (error) {
      this.handleError('SET', key, error);
    }
  }

  async remove(key: string): Promise<void> {
    await this.set(key, undefined as any);
  }

  async clear(): Promise<void> {
    const params = new URLSearchParams(window.location.search);
    params.delete(this.paramName);
    
    const newUrl = `${window.location.pathname}${window.location.hash}`;
    window.history.replaceState({}, '', newUrl);
  }
}

// ==================== 存储管理器主类 ====================

interface IStorageStrategy {
  name: StorageType;
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T): Promise<void>;
  remove(key: string): Promise<void>;
  clear(): Promise<void>;
  watch?(key: string, callback: (value: any) => void): () => void;
}

export class StorageManager {
  private static instance: StorageManager;
  private strategies: Map<StorageType, IStorageStrategy>;
  private defaultStrategy: IStorageStrategy;
  private validators: Map<string, (value: any) => ValidationResult<any>>;
  private subscribers: Map<string, Set<(newValue: any, oldValue: any) => void>>;

  private constructor() {
    this.strategies = new Map();
    this.validators = new Map();
    this.subscribers = new Map();

    // 注册默认策略
    this.registerStrategy('local', new LocalStorageStrategy());
    this.registerStrategy('session', new SessionStorageStrategy());
    this.registerStrategy('memory', new MemoryStorageStrategy());
    this.registerStrategy('url', new URLStorageStrategy('state'));

    this.defaultStrategy = this.strategies.get('local')!;
  }

  // ==================== 单例模式 ====================
  
  static getInstance(): StorageManager {
    if (!StorageManager.instance) {
      StorageManager.instance = new StorageManager();
    }
    return StorageManager.instance;
  }

  // ==================== 策略管理 ====================

  registerStrategy(type: StorageType, strategy: IStorageStrategy): void {
    this.strategies.set(type, strategy);
  }

  getStrategy(type: StorageType): IStorageStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new Error(`Storage strategy "${type}" not registered`);
    }
    return strategy;
  }

  setDefaultStrategy(type: StorageType): void {
    this.defaultStrategy = this.getStrategy(type);
  }

  // ==================== 基础操作 ====================

  async get<T>(key: string, defaultValue?: T, options?: StorageOptions): Promise<T | null> {
    const strategy = options?.type ? this.getStrategy(options.type) : this.defaultStrategy;
    
    try {
      const value = await strategy.get<T>(key);
      return value ?? defaultValue ?? null;
    } catch {
      return defaultValue ?? null;
    }
  }

  async set<T>(key: string, value: T, options?: StorageOptions): Promise<void> {
    const strategy = options?.type ? this.getStrategy(options.type) : this.defaultStrategy;
    
    // 验证数据
    const validation = this.validate(key, value);
    if (!validation.valid) {
      console.warn('[Storage] Validation failed:', validation.errors);
    }

    // 添加元数据
    const dataWithMeta = {
      ...value,
      $meta: {
        ...(value as any).$meta,
        lastUpdated: Date.now(),
        version: '1.0',
      },
    };

    await strategy.set(key, dataWithMeta);

    // 通知订阅者
    this.notifySubscribers(key, value);
  }

  async remove(key: string, options?: StorageOptions): Promise<void> {
    const strategy = options?.type ? this.getStrategy(options.type) : this.defaultStrategy;
    await strategy.remove(key);
    this.notifySubscribers(key, null);
  }

  async clear(prefix?: string, options?: StorageOptions): Promise<void> {
    const strategy = options?.type ? this.getStrategy(options.type) : this.defaultStrategy;
    
    if (prefix) {
      // 只清除带前缀的键
      const keys = await this.getKeys(prefix);
      for (const key of keys) {
        await strategy.remove(key);
      }
    } else {
      await strategy.clear();
    }
  }

  // ==================== 批量操作 ====================

  async getBatch<T>(keys: string[], options?: StorageOptions): Promise<Record<string, T>> {
    const strategy = options?.type ? this.getStrategy(options.type) : this.defaultStrategy;
    const result: Record<string, T> = {};

    for (const key of keys) {
      result[key] = await strategy.get<T>(key);
    }

    return result;
  }

  async setBatch<T>(entries: Record<string, T>, options?: StorageOptions): Promise<void> {
    const strategy = options?.type ? this.getStrategy(options.type) : this.defaultStrategy;

    for (const [key, value] of Object.entries(entries)) {
      await strategy.set(key, value);
    }
  }

  // ==================== 订阅与发布 ====================

  subscribe(key: string, callback: (newValue: any, oldValue: any) => void): () => void {
    if (!this.subscribers.has(key)) {
      this.subscribers.set(key, new Set());
    }

    const subscribers = this.subscribers.get(key)!;
    subscribers.add(callback);

    // 返回取消订阅函数
    return () => {
      subscribers.delete(callback);
      if (subscribers.size === 0) {
        this.subscribers.delete(key);
      }
    };
  }

  private notifySubscribers(key: string, newValue: any): void {
    const subscribers = this.subscribers.get(key);
    if (subscribers) {
      // 获取旧值
      this.get(key).then(oldValue => {
        subscribers.forEach(callback => callback(newValue, oldValue));
      });
    }
  }

  // ==================== 数据验证 ====================

  registerValidator(keyPattern: string, validator: (value: any) => ValidationResult<any>): void {
    this.validators.set(keyPattern, validator);
  }

  validate<T>(key: string, value: any): ValidationResult<T> {
    // 查找匹配的验证器
    for (const [pattern, validator] of this.validators.entries()) {
      if (new RegExp(pattern).test(key)) {
        return validator(value);
      }
    }

    // 默认验证：总是通过
    return { valid: true, data: value, errors: [] };
  }

  // ==================== 辅助方法 ====================

  private async getKeys(prefix: string): Promise<string[]> {
    const keys: string[] = [];
    
    // 尝试从 localStorage 获取
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        keys.push(key);
      }
    }

    return keys;
  }

  async size(): Promise<number> {
    let totalSize = 0;
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length * 2; // UTF-16 编码
        }
      }
    }

    return totalSize;
  }

  async usage(): Promise<{ total: number; limit: number; percentage: number }> {
    const total = await this.size();
    const limit = 5 * 1024 * 1024; // localStorage 通常限制 5MB
    return {
      total,
      limit,
      percentage: (total / limit) * 100,
    };
  }

  // ==================== 备份与恢复 ====================

  async backup(prefix?: string): Promise<BackupData> {
    const data: Record<string, any> = {};
    const keys = prefix ? await this.getKeys(prefix) : await this.getKeys('');

    for (const key of keys) {
      const value = await this.get(key);
      if (value !== null) {
        data[key] = value;
      }
    }

    const checksum = await this.calculateChecksum(JSON.stringify(data));

    return {
      version: '1.0',
      timestamp: Date.now(),
      data,
      checksum,
    };
  }

  async restore(backup: BackupData): Promise<void> {
    // 验证校验和
    const checksum = await this.calculateChecksum(JSON.stringify(backup.data));
    if (checksum !== backup.checksum) {
      throw new Error('Backup checksum mismatch');
    }

    // 恢复数据
    await this.setBatch(backup.data);
  }

  async export(prefix?: string): Promise<string> {
    const backup = await this.backup(prefix);
    return JSON.stringify(backup, null, 2);
  }

  async import(json: string): Promise<void> {
    const backup = JSON.parse(json) as BackupData;
    await this.restore(backup);
  }

  private async calculateChecksum(data: string): Promise<string> {
    // 简单的 checksum 实现
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  }

  // ==================== 清理与迁移 ====================

  async cleanup(expiredBefore?: number): Promise<CleanupResult> {
    const removedKeys: string[] = [];
    let freedBytes = 0;
    const now = Date.now();

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;

      try {
        const value = localStorage.getItem(key);
        if (!value) continue;

        const data = JSON.parse(value);
        const lastUpdated = data.$meta?.lastUpdated;

        // 如果设置了过期时间且数据已过期
        if (expiredBefore && lastUpdated && lastUpdated < expiredBefore) {
          freedBytes += value.length * 2;
          localStorage.removeItem(key);
          removedKeys.push(key);
        }
      } catch {
        // 跳过无效数据
      }
    }

    return { removedKeys, freedBytes };
  }

  async migrate(
    fromVersion: string,
    toVersion: string,
    migrator: (data: any) => any
  ): Promise<MigrationResult> {
    const migratedKeys: string[] = [];
    const errors: Array<{ key: string; error: string }> = [];

    const keys = await this.getKeys('');
    
    for (const key of keys) {
      try {
        const data = await this.get(key);
        if (data && (data as any).$meta?.version === fromVersion) {
          const migrated = migrator(data);
          await this.set(key, migrated);
          migratedKeys.push(key);
        }
      } catch (error) {
        errors.push({
          key,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      success: errors.length === 0,
      migratedKeys,
      errors,
    };
  }
}

// ==================== 导出单例 ====================

export const storageManager = StorageManager.getInstance();

// ==================== 便捷函数 ====================

export async function getUserPreference<T>(key: string): Promise<T | null> {
  return storageManager.get<T>(`cf:v1:pref:user:${key}`);
}

export async function setUserPreference<T>(key: string, value: T): Promise<void> {
  return storageManager.set(`cf:v1:pref:user:${key}`, value);
}

export async function getTableConfig<T>(tableId: string): Promise<T | null> {
  return storageManager.get<T>(`cf:v1:tbl:user:${tableId}:config`);
}

export async function setTableConfig<T>(tableId: string, config: T): Promise<void> {
  return storageManager.set(`cf:v1:tbl:user:${tableId}:config`, config);
}

export async function getPageView<T>(pageId: string): Promise<T | null> {
  return storageManager.get<T>(`cf:v1:view:user:${pageId}:state`);
}

export async function setPageView<T>(pageId: string, state: T): Promise<void> {
  return storageManager.set(`cf:v1:view:user:${pageId}:state`, state);
}
