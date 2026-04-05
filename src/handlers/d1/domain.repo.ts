/**
 * @fileoverview Domain repository backed by D1.
 */

import { BaseRepository } from './base.repo';
import type { D1Database } from './index';
import type { CreateDomainDTO, Domain, UpdateDomainDTO } from '@/types/domain';
import { IdService } from '@/services/id.service';

export class DomainRepository extends BaseRepository<Domain> {
  private idService: IdService;

  constructor(db: D1Database) {
    super(db, 'domains');
    this.idService = new IdService(db);
  }

  protected transform(row: Record<string, unknown>): Domain {
    return {
      ...row,
      id: String(row.displayId || row.id),
      cloudflareProxyEnabled: Boolean(row.cloudflareProxyEnabled),
      registrar: (row.registrar as string | null) ?? null,
      cloudflareZoneId: (row.cloudflareZoneId as string | null) ?? null,
      defaultCampaignId: (row.defaultCampaignId as string | null) ?? null,
      defaultLandingPageId: (row.defaultLandingPageId as string | null) ?? null,
      notes: (row.notes as string | null) ?? null,
    } as Domain;
  }

  protected hasDisplayIdColumn(): boolean {
    return true;
  }

  async create(data: CreateDomainDTO): Promise<Domain> {
    const displayId = await this.idService.generateId('domains');
    const now = new Date().toISOString();

    await this.db
      .prepare(`
        INSERT INTO domains (
          id, displayId, hostname, usage, status, sslStatus, dnsProvider,
          registrar, cloudflareZoneId, cloudflareProxyEnabled,
          defaultCampaignId, defaultLandingPageId, notes, createdAt, updatedAt
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .bind(
        displayId,
        displayId,
        data.hostname,
        data.usage || 'tracking',
        data.status || 'pending',
        data.sslStatus || 'pending',
        data.dnsProvider || 'cloudflare',
        data.registrar || null,
        data.cloudflareZoneId || null,
        data.cloudflareProxyEnabled ? 1 : 0,
        data.defaultCampaignId || null,
        data.defaultLandingPageId || null,
        data.notes || null,
        now,
        now
      )
      .run();

    const domain = await this.findById(displayId);
    return domain!;
  }

  async update(id: string, data: UpdateDomainDTO): Promise<Domain | null> {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.hostname !== undefined) {
      fields.push('hostname = ?');
      values.push(data.hostname);
    }
    if (data.usage !== undefined) {
      fields.push('usage = ?');
      values.push(data.usage);
    }
    if (data.status !== undefined) {
      fields.push('status = ?');
      values.push(data.status);
    }
    if (data.sslStatus !== undefined) {
      fields.push('sslStatus = ?');
      values.push(data.sslStatus);
    }
    if (data.dnsProvider !== undefined) {
      fields.push('dnsProvider = ?');
      values.push(data.dnsProvider);
    }
    if (data.registrar !== undefined) {
      fields.push('registrar = ?');
      values.push(data.registrar);
    }
    if (data.cloudflareZoneId !== undefined) {
      fields.push('cloudflareZoneId = ?');
      values.push(data.cloudflareZoneId);
    }
    if (data.cloudflareProxyEnabled !== undefined) {
      fields.push('cloudflareProxyEnabled = ?');
      values.push(data.cloudflareProxyEnabled ? 1 : 0);
    }
    if (data.defaultCampaignId !== undefined) {
      fields.push('defaultCampaignId = ?');
      values.push(data.defaultCampaignId);
    }
    if (data.defaultLandingPageId !== undefined) {
      fields.push('defaultLandingPageId = ?');
      values.push(data.defaultLandingPageId);
    }
    if (data.notes !== undefined) {
      fields.push('notes = ?');
      values.push(data.notes);
    }

    if (fields.length === 0) {
      return this.findById(id);
    }

    fields.push('updatedAt = ?');
    values.push(new Date().toISOString(), id);

    await this.db
      .prepare(`UPDATE domains SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...values)
      .run();

    return this.findById(id);
  }

  async findByStatus(status: string): Promise<Domain[]> {
    return this.findBy('status', status);
  }

  async hostnameExists(hostname: string, excludeId?: string): Promise<boolean> {
    let sql = 'SELECT 1 FROM domains WHERE hostname = ?';
    const params: unknown[] = [hostname];

    if (excludeId) {
      sql += ' AND id != ?';
      params.push(excludeId);
    }

    const result = await this.db.prepare(sql).bind(...params).first();
    return result !== null;
  }

  async getCampaignCount(hostname: string): Promise<number> {
    const result = await this.db
      .prepare('SELECT COUNT(*) as count FROM campaigns WHERE domain = ?')
      .bind(hostname)
      .first<{ count: number }>();
    return result?.count || 0;
  }

  async findList(page = 1, pageSize = 20, status?: string, search?: string): Promise<{ list: Domain[]; total: number }> {
    const offset = (page - 1) * pageSize;
    let countSql = 'SELECT COUNT(*) as count FROM domains WHERE 1=1';
    let listSql = 'SELECT * FROM domains WHERE 1=1';
    const params: unknown[] = [];
    const countParams: unknown[] = [];

    if (status) {
      countSql += ' AND status = ?';
      listSql += ' AND status = ?';
      params.push(status);
      countParams.push(status);
    }

    if (search) {
      const searchPattern = `%${search}%`;
      countSql += ' AND (hostname LIKE ? OR registrar LIKE ? OR dnsProvider LIKE ?)';
      listSql += ' AND (hostname LIKE ? OR registrar LIKE ? OR dnsProvider LIKE ?)';
      params.push(searchPattern, searchPattern, searchPattern);
      countParams.push(searchPattern, searchPattern, searchPattern);
    }

    listSql += ' ORDER BY updatedAt DESC LIMIT ? OFFSET ?';
    params.push(pageSize, offset);

    const [countResult, listResult] = await Promise.all([
      this.db.prepare(countSql).bind(...countParams).first<{ count: number }>(),
      this.db.prepare(listSql).bind(...params).all(),
    ]);

    return {
      list: (listResult.results as Record<string, unknown>[] | undefined)?.map(this.transform.bind(this)) || [],
      total: countResult?.count || 0,
    };
  }
}
