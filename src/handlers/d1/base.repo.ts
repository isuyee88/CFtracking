/**
 * @fileoverview 基础 Repository 类
 * @description 提供通用的 CRUD 操作，子类继承复用
 * @module handlers/d1/base.repo
 */

export abstract class BaseRepository<T> {
  protected db: D1Database;
  protected tableName: string;

  constructor(db: D1Database, tableName: string) {
    this.db = db;
    this.tableName = tableName;
  }

  protected transform(row: Record<string, unknown>): T {
    return row as unknown as T;
  }

  async findById(id: string): Promise<T | null> {
    const result = await this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE id = ? OR displayId = ?`)
      .bind(id, id)
      .first();
    if (!result) return null;
    return this.transform(result as Record<string, unknown>);
  }

  async findAll(limit = 100, offset = 0): Promise<T[]> {
    const result = await this.db
      .prepare(`SELECT * FROM ${this.tableName} LIMIT ? OFFSET ?`)
      .bind(limit, offset)
      .all();
    return (result.results as unknown as Record<string, unknown>[]).map(this.transform.bind(this)) || [];
  }

  async findBy(field: string, value: unknown): Promise<T[]> {
    const result = await this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE ${field} = ?`)
      .bind(value)
      .all();
    return (result.results as unknown as Record<string, unknown>[]).map(this.transform.bind(this)) || [];
  }

  async findOneBy(field: string, value: unknown): Promise<T | null> {
    const result = await this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE ${field} = ? LIMIT 1`)
      .bind(value)
      .first();
    if (!result) return null;
    return this.transform(result as Record<string, unknown>);
  }

  async deleteById(id: string): Promise<boolean> {
    const result = await this.db
      .prepare(`DELETE FROM ${this.tableName} WHERE id = ?`)
      .bind(id)
      .run();
    return result.success;
  }

  async softDelete(id: string): Promise<boolean> {
    const now = new Date().toISOString();
    const result = await this.db
      .prepare(`UPDATE ${this.tableName} SET status = ?, updatedAt = ? WHERE id = ?`)
      .bind('deleted', now, id)
      .run();
    return result.success;
  }

  async count(conditions?: string, params?: unknown[]): Promise<number> {
    let sql = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    if (conditions) {
      sql += ` WHERE ${conditions}`;
    }
    const stmt = this.db.prepare(sql);
    const bound = params ? stmt.bind(...params) : stmt;
    const result = await bound.first();
    return (result?.count as number) || 0;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db
      .prepare(`SELECT 1 FROM ${this.tableName} WHERE id = ? LIMIT 1`)
      .bind(id)
      .first();
    return result !== null;
  }

  async findByIds(ids: string[]): Promise<T[]> {
    if (ids.length === 0) return [];
    const placeholders = ids.map(() => '?').join(',');
    const result = await this.db
      .prepare(`SELECT * FROM ${this.tableName} WHERE id IN (${placeholders}) OR displayId IN (${placeholders})`)
      .bind(...ids, ...ids)
      .all();
    return (result.results as unknown as Record<string, unknown>[]).map(this.transform.bind(this)) || [];
  }
}
