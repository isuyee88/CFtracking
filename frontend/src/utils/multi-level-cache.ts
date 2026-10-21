/**
 * @fileoverview 多级缓存管理器
 * @description 提供内存、SessionStorage、LocalStorage 三级缓存
 * @module utils/multi-level-cache
 *
 * 功能:
 *   - 内存缓存（快速访问）
 *   - SessionStorage（会话级持久化）
 *   - LocalStorage（长期持久化）
 *   - 自动过期清理
 *   - 缓存大小限制
 *
 * 输入: 缓存键、数据、配置
 * 输出: 缓存数据
 */

export type CacheLevel = 'memory' | 'session' | 'local';

export interface CacheConfig {
  ttl: number;
  level: CacheLevel[];
  maxSize?: number;
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  hash?: string;
  version?: string;
}

const DEFAULT_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5分钟
  level: ['memory', 'session'],
};

class MultiLevelCache {
  private memoryCache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number = 50 * 1024 * 1024; // 50MB

  constructor() {
    this.cleanupExpired();
    setInterval(() => this.cleanupExpired(), 60 * 1000); // 每分钟清理一次
  }

  /**
   * 设置缓存
   */
  set<T>(key: string, data: T, config: Partial<CacheConfig> = {}): void {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl: finalConfig.ttl,
    };

    for (const level of finalConfig.level) {
      try {
        switch (level) {
          case 'memory':
            this.setMemory(key, entry);
            break;
          case 'session':
            this.setSession(key, entry);
            break;
          case 'local':
            this.setLocal(key, entry);
            break;
        }
      } catch (err) {
        console.warn(`[Cache] Failed to set ${level} cache for ${key}:`, err);
      }
    }
  }

  /**
   * 获取缓存
   */
  get<T>(key: string, config: Partial<CacheConfig> = {}): T | null {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };

    for (const level of finalConfig.level) {
      try {
        let entry: CacheEntry<T> | null = null;

        switch (level) {
          case 'memory':
            entry = this.getMemory<T>(key);
            break;
          case 'session':
            entry = this.getSession<T>(key);
            break;
          case 'local':
            entry = this.getLocal<T>(key);
            break;
        }

        if (entry && this.isValid(entry)) {
          // 更新最后访问时间
          entry.timestamp = Date.now();
          return entry.data;
        }
      } catch (err) {
        console.warn(`[Cache] Failed to get ${level} cache for ${key}:`, err);
      }
    }

    return null;
  }

  /**
   * 检查缓存是否存在且有效
   */
  has(key: string, config: Partial<CacheConfig> = {}): boolean {
    return this.get(key, config) !== null;
  }

  /**
   * 删除缓存
   */
  delete(key: string): void {
    this.memoryCache.delete(key);

    try {
      sessionStorage.removeItem(key);
    } catch (err) {
      // ignore
    }

    try {
      localStorage.removeItem(key);
    } catch (err) {
      // ignore
    }
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.memoryCache.clear();

    try {
      sessionStorage.clear();
    } catch (err) {
      // ignore
    }

    try {
      localStorage.clear();
    } catch (err) {
      // ignore
    }
  }

  /**
   * 获取缓存状态
   */
  getStatus(): {
    memory: { size: number; count: number };
    session: { size: number; count: number };
    local: { size: number; count: number };
  } {
    return {
      memory: {
        size: this.getMemorySize(),
        count: this.memoryCache.size,
      },
      session: {
        size: this.getSessionSize(),
        count: this.getSessionCount(),
      },
      local: {
        size: this.getLocalSize(),
        count: this.getLocalCount(),
      },
    };
  }

  // 私有方法

  private setMemory<T>(key: string, entry: CacheEntry<T>): void {
    this.memoryCache.set(key, entry);
    this.checkMemorySize();
  }

  private getMemory<T>(key: string): CacheEntry<T> | null {
    return this.memoryCache.get(key) || null;
  }

  private setSession<T>(key: string, entry: CacheEntry<T>): void {
    const json = JSON.stringify(entry);
    sessionStorage.setItem(key, json);
  }

  private getSession<T>(key: string): CacheEntry<T> | null {
    const json = sessionStorage.getItem(key);
    return json ? JSON.parse(json) : null;
  }

  private setLocal<T>(key: string, entry: CacheEntry<T>): void {
    const json = JSON.stringify(entry);
    localStorage.setItem(key, json);
  }

  private getLocal<T>(key: string): CacheEntry<T> | null {
    const json = localStorage.getItem(key);
    return json ? JSON.parse(json) : null;
  }

  private isValid<T>(entry: CacheEntry<T>): boolean {
    const age = Date.now() - entry.timestamp;
    return age < entry.ttl;
  }

  private cleanupExpired(): void {
    const now = Date.now();

    // 清理内存缓存
    for (const [key, entry] of this.memoryCache) {
      if (!this.isValid(entry)) {
        this.memoryCache.delete(key);
      }
    }

    // 清理 SessionStorage
    this.cleanupStorage(sessionStorage);

    // 清理 LocalStorage
    this.cleanupStorage(localStorage);
  }

  private cleanupStorage(storage: Storage): void {
    const keysToRemove: string[] = [];

    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key) {
        try {
          const json = storage.getItem(key);
          if (json) {
            const entry = JSON.parse(json);
            if (entry.timestamp && entry.ttl && !this.isValid(entry)) {
              keysToRemove.push(key);
            }
          }
        } catch (err) {
          // ignore
        }
      }
    }

    for (const key of keysToRemove) {
      storage.removeItem(key);
    }
  }

  private checkMemorySize(): void {
    const size = this.getMemorySize();
    if (size > this.maxSize) {
      // LRU 清理：删除最旧的条目
      const entries = Array.from(this.memoryCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

      const toRemove = entries.slice(0, Math.floor(entries.length * 0.3));
      for (const [key] of toRemove) {
        this.memoryCache.delete(key);
      }
    }
  }

  private getMemorySize(): number {
    let size = 0;
    for (const [key, entry] of this.memoryCache) {
      size += key.length * 2; // UTF-16
      size += JSON.stringify(entry).length * 2;
    }
    return size;
  }

  private getSessionSize(): number {
    let size = 0;
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key) {
        const value = sessionStorage.getItem(key);
        size += key.length * 2;
        size += (value?.length || 0) * 2;
      }
    }
    return size;
  }

  private getSessionCount(): number {
    return sessionStorage.length;
  }

  private getLocalSize(): number {
    let size = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        const value = localStorage.getItem(key);
        size += key.length * 2;
        size += (value?.length || 0) * 2;
      }
    }
    return size;
  }

  private getLocalCount(): number {
    return localStorage.length;
  }
}

export const multiLevelCache = new MultiLevelCache();

export default multiLevelCache;
