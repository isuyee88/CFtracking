/**
 * @fileoverview KV 存储操作包装器
 * @description 封装 Cloudflare KV 的通用操作
 * @module handlers/kv
 */

export class KV {
  constructor(private kv: KVNamespace) {}

  async get<T>(key: string): Promise<T | null> {
    const value = await this.kv.get(key, 'json');
    return value as T | null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    if (ttlSeconds) {
      await this.kv.put(key, JSON.stringify(value), { expirationTtl: ttlSeconds });
    } else {
      await this.kv.put(key, JSON.stringify(value));
    }
  }

  async delete(key: string): Promise<void> {
    await this.kv.delete(key);
  }

  async list(prefix?: string): Promise<string[]> {
    const list = await this.kv.list({ prefix });
    return list.keys.map(k => k.name);
  }
}
