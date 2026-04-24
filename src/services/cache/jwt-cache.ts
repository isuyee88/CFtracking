/**
 * @fileoverview JWT缓存管理器
 * @description 缓存已验证的JWT payload，减少重复验证开销
 * @module services/cache/jwt-cache
 */

interface CachedPayload {
  payload: any;
  expiry: number;
}

/**
 * JWT缓存管理器
 * 使用内存缓存已验证的JWT，避免重复验证
 */
export class JWTCacheManager {
  private static instance: JWTCacheManager;
  private cache: Map<string, CachedPayload> = new Map();
  private readonly maxSize: number = 500;
  private readonly minCacheTTL: number = 300000; // 最小缓存5分钟

  private constructor() {}

  static getInstance(): JWTCacheManager {
    if (!JWTCacheManager.instance) {
      JWTCacheManager.instance = new JWTCacheManager();
    }
    return JWTCacheManager.instance;
  }

  /**
   * 生成缓存键
   */
  private getCacheKey(token: string): string {
    // 使用token的哈希作为缓存键
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      const char = token.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `jwt:${hash.toString(36)}`;
  }

  /**
   * 获取缓存的payload
   */
  get(token: string): any | null {
    const key = this.getCacheKey(token);
    const cached = this.cache.get(key);

    if (!cached) {
      return null;
    }

    // 检查缓存是否过期
    if (cached.expiry < Date.now()) {
      this.cache.delete(key);
      return null;
    }

    return cached.payload;
  }

  /**
   * 缓存payload
   */
  set(token: string, payload: any, jwtExpiry: number): void {
    // 检查缓存大小
    if (this.cache.size >= this.maxSize) {
      this.evictOldest();
    }

    const key = this.getCacheKey(token);
    
    // 缓存TTL = min(JWT剩余有效期, 1小时)
    const remainingTTL = (jwtExpiry * 1000) - Date.now();
    const cacheTTL = Math.min(remainingTTL, 3600000); // 最多缓存1小时
    const actualTTL = Math.max(cacheTTL, this.minCacheTTL);

    this.cache.set(key, {
      payload,
      expiry: Date.now() + actualTTL,
    });
  }

  /**
   * 清除缓存
   */
  delete(token: string): void {
    const key = this.getCacheKey(token);
    this.cache.delete(key);
  }

  /**
   * 清除所有缓存
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 淘汰最旧的缓存
   */
  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestExpiry = Infinity;

    for (const [key, cached] of this.cache.entries()) {
      if (cached.expiry < oldestExpiry) {
        oldestExpiry = cached.expiry;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * 获取缓存统计
   */
  getStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: 0, // 需要在实际使用中统计
    };
  }

  /**
   * 清理过期缓存
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, cached] of this.cache.entries()) {
      if (cached.expiry < now) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }
}

// 定期清理过期缓存（每5分钟）
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    JWTCacheManager.getInstance().cleanup();
  }, 300000);
}
