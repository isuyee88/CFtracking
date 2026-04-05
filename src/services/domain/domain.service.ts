/**
 * @fileoverview Domain business service.
 */

import { DomainRepository } from '@/handlers/d1/domain.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type { CreateDomainDTO, Domain, UpdateDomainDTO } from '@/types/domain';
import { DuplicateError, NotFoundError } from '@/middleware/error';

export class DomainService {
  private repo: DomainRepository;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.repo = new DomainRepository(db);
  }

  async create(data: CreateDomainDTO): Promise<Domain> {
    const exists = await this.repo.hostnameExists(data.hostname);
    if (exists) {
      throw new DuplicateError(`Domain "${data.hostname}" already exists`);
    }

    return this.repo.create(data);
  }

  async getById(id: string): Promise<Domain> {
    const domain = await this.repo.findById(id);
    if (!domain) {
      throw new NotFoundError('Domain not found');
    }
    return domain;
  }

  async getList(page = 1, pageSize = 20, status?: string, search?: string) {
    return this.repo.findList(page, pageSize, status, search);
  }

  async getListWithStats(page = 1, pageSize = 20, status?: string, search?: string) {
    const result = await this.repo.findList(page, pageSize, status, search);
    const list = await Promise.all(
      result.list.map(async (domain) => ({
        ...domain,
        campaignCount: await this.repo.getCampaignCount(domain.hostname),
      }))
    );
    return {
      list,
      total: result.total,
    };
  }

  async update(id: string, data: UpdateDomainDTO): Promise<Domain> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Domain not found');
    }

    if (data.hostname && data.hostname !== existing.hostname) {
      const exists = await this.repo.hostnameExists(data.hostname, existing.id);
      if (exists) {
        throw new DuplicateError(`Domain "${data.hostname}" already exists`);
      }
    }

    const updated = await this.repo.update(id, data);
    return updated!;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Domain not found');
    }

    await this.repo.deleteById(existing.id);
  }
}
