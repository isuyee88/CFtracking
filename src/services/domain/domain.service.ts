/**
 * @fileoverview Domain business service.
 */

import { DomainRepository } from '@/handlers/d1/domain.repo';
import { getD1Connection } from '@/handlers/d1';
import type { Env } from '@/config/env';
import type { CreateDomainDTO, Domain, UpdateDomainDTO } from '@/types/domain';
import { DuplicateError, NotFoundError } from '@/middleware/error';
import { FIELD_MAX_LENGTH } from '@/config/field-constraints';
import {
  normalizeNullableString,
  normalizeOptionalString,
  normalizeRequiredString,
} from '@/utils/fieldLength';

export class DomainService {
  private repo: DomainRepository;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.repo = new DomainRepository(db);
  }

  async create(data: CreateDomainDTO): Promise<Domain> {
    const normalizedData = this.normalizeCreateInput(data);
    const exists = await this.repo.hostnameExists(normalizedData.hostname);
    if (exists) {
      throw new DuplicateError(`Domain "${normalizedData.hostname}" already exists`);
    }

    return this.repo.create(normalizedData);
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
    const normalizedData = this.normalizeUpdateInput(data);
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Domain not found');
    }

    if (normalizedData.hostname && normalizedData.hostname !== existing.hostname) {
      const exists = await this.repo.hostnameExists(normalizedData.hostname, existing.id);
      if (exists) {
        throw new DuplicateError(`Domain "${normalizedData.hostname}" already exists`);
      }
    }

    const updated = await this.repo.update(id, normalizedData);
    return updated!;
  }

  async delete(id: string): Promise<void> {
    const existing = await this.repo.findById(id);
    if (!existing) {
      throw new NotFoundError('Domain not found');
    }

    await this.repo.deleteById(existing.id);
  }

  private normalizeCreateInput(data: CreateDomainDTO): CreateDomainDTO {
    return {
      ...data,
      hostname: normalizeRequiredString(data.hostname as unknown, {
        field: 'domain.hostname',
        maxLength: FIELD_MAX_LENGTH.HOSTNAME,
      }),
      registrar: normalizeOptionalString(data.registrar as unknown, {
        field: 'domain.registrar',
        maxLength: FIELD_MAX_LENGTH.REGISTRAR,
      }),
      cloudflareZoneId: normalizeOptionalString(data.cloudflareZoneId as unknown, {
        field: 'domain.cloudflareZoneId',
        maxLength: FIELD_MAX_LENGTH.CLOUDFLARE_ZONE_ID,
      }),
      defaultCampaignId: normalizeOptionalString(data.defaultCampaignId as unknown, {
        field: 'domain.defaultCampaignId',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      }),
      defaultLandingPageId: normalizeOptionalString(data.defaultLandingPageId as unknown, {
        field: 'domain.defaultLandingPageId',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      }),
      notes: normalizeOptionalString(data.notes as unknown, {
        field: 'domain.notes',
        maxLength: FIELD_MAX_LENGTH.NOTES,
      }),
    };
  }

  private normalizeUpdateInput(data: UpdateDomainDTO): UpdateDomainDTO {
    const normalizedData: UpdateDomainDTO = { ...data };

    if (data.hostname !== undefined) {
      normalizedData.hostname = normalizeRequiredString(data.hostname as unknown, {
        field: 'domain.hostname',
        maxLength: FIELD_MAX_LENGTH.HOSTNAME,
      });
    }

    if (data.registrar !== undefined) {
      normalizedData.registrar = normalizeNullableString(data.registrar as unknown, {
        field: 'domain.registrar',
        maxLength: FIELD_MAX_LENGTH.REGISTRAR,
      });
    }

    if (data.cloudflareZoneId !== undefined) {
      normalizedData.cloudflareZoneId = normalizeNullableString(data.cloudflareZoneId as unknown, {
        field: 'domain.cloudflareZoneId',
        maxLength: FIELD_MAX_LENGTH.CLOUDFLARE_ZONE_ID,
      });
    }

    if (data.defaultCampaignId !== undefined) {
      normalizedData.defaultCampaignId = normalizeNullableString(data.defaultCampaignId as unknown, {
        field: 'domain.defaultCampaignId',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      });
    }

    if (data.defaultLandingPageId !== undefined) {
      normalizedData.defaultLandingPageId = normalizeNullableString(data.defaultLandingPageId as unknown, {
        field: 'domain.defaultLandingPageId',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      });
    }

    if (data.notes !== undefined) {
      normalizedData.notes = normalizeNullableString(data.notes as unknown, {
        field: 'domain.notes',
        maxLength: FIELD_MAX_LENGTH.NOTES,
      });
    }

    return normalizedData;
  }
}
