/**
 * @fileoverview Autorule list resolver
 * @description Resolve blacklist/whitelist match for realtime autorule functions.
 * @module services/autorule/list-resolver.service
 */

import { getD1Connection } from '@/handlers/d1';
import type { D1Database } from '@/handlers/d1';
import type { Env } from '@/config/env';
import { GENERAL_TRAFFIC_SOURCE_ID, TrafficSourceRepository } from '@/handlers/d1/trafficSource.repo';
import type { BlacklistType, ListCondition, ListConditionField } from '@/types/blacklist';

type ListSide = 'blacklist' | 'whitelist';

type SupportedListType = BlacklistType;

interface ListEntry {
  trafficSourceId?: string | null;
  type: string;
  value: string;
  campaignId?: string | null;
  ipMatchMode?: string | null;
  uaMatchMode?: string | null;
  conditionMode?: 'all' | 'any' | null;
  conditionsJson?: string | null;
  conditions?: ListCondition[];
}

export interface AutoruleVisitContext {
  campaignId: string;
  flowId?: string | null;
  trafficSourceId?: string | null;
  ip?: string;
  asn?: number | string;
  userAgent?: string;
  zoneId?: string;
  country?: string;
  device?: string;
  isp?: string;
  fingerprint?: string;
  utmSource?: string;
  utmCampaign?: string;
  browser?: string;
  subIds?: string[];
}

export class ListResolverService {
  private readonly db: D1Database;
  private readonly trafficSourceRepo: TrafficSourceRepository;
  private readonly cache = new Map<string, ListEntry[]>();

  constructor(env: Env) {
    this.db = getD1Connection(env);
    this.trafficSourceRepo = new TrafficSourceRepository(this.db);
  }

  async inBlacklist(type: string, ctx: AutoruleVisitContext): Promise<boolean> {
    return this.matchBySide('blacklist', type, ctx);
  }

  async inWhitelist(type: string, ctx: AutoruleVisitContext): Promise<boolean> {
    return this.matchBySide('whitelist', type, ctx);
  }

  private async matchBySide(side: ListSide, rawType: string, ctx: AutoruleVisitContext): Promise<boolean> {
    const type = this.normalizeType(rawType);
    if (!type) return false;

    const entries = await this.getEntries(side, type, ctx.campaignId, ctx.trafficSourceId);
    if (entries.length === 0) return false;

    const values = this.resolveCandidateValues(type, ctx);
    this.currentContext = ctx;
    try {
      for (const entry of entries) {
        if (this.matchesEntry(type, entry, values)) {
          return true;
        }
      }
      return false;
    } finally {
      this.currentContext = null;
    }
  }

  private normalizeType(type: string): SupportedListType | null {
    const normalized = String(type || '').trim().toLowerCase();
    const aliases: Record<string, SupportedListType> = {
      ip: 'ip',
      asn: 'asn',
      ua: 'user_agent',
      user_agent: 'user_agent',
      zone: 'zone',
      creative: 'creative',
      publisher: 'publisher',
      sub_id: 'sub_id',
      geo: 'country',
      country: 'country',
      device: 'device',
      isp: 'isp',
      fingerprint: 'fingerprint',
      rule: 'rule',
    };

    return aliases[normalized] || null;
  }

  private async getEntries(
    side: ListSide,
    type: SupportedListType,
    campaignId: string,
    trafficSourceId?: string | null
  ): Promise<ListEntry[]> {
    const scopedTrafficSourceIds = await this.resolveTrafficSourceScopeIds(trafficSourceId);
    const cacheKey = `${side}:${type}:${campaignId}:${scopedTrafficSourceIds.join(',')}`;
    const cached = this.cache.get(cacheKey);
    if (cached) return cached;

    const typeVariants = this.getTypeVariants(type);
    const includeRuleType = type !== 'rule';
    const allTypes = includeRuleType ? [...typeVariants, 'rule'] : typeVariants;
    const placeholders = allTypes.map(() => 'type = ?').join(' OR ');
    const typeClause = `(${placeholders})`;
    const trafficSourcePlaceholders = scopedTrafficSourceIds.map(() => '?').join(', ');
    const sql = `
      SELECT trafficSourceId, type, value, campaignId, ipMatchMode, uaMatchMode, conditionMode, conditionsJson
      FROM ${side}
      WHERE status = 'active'
        AND ${typeClause}
        AND (campaignId IS NULL OR campaignId = ?)
        AND trafficSourceId IN (${trafficSourcePlaceholders})
    `;
    const binds: unknown[] = [...allTypes, campaignId, ...scopedTrafficSourceIds];
    const result = await this.db.prepare(sql).bind(...binds).all<ListEntry>();
    const rows = ((result.results as unknown as ListEntry[]) || []).map((row) => ({
      ...row,
      conditions: this.parseConditions(row.conditionsJson),
    }));
    this.cache.set(cacheKey, rows);
    return rows;
  }

  private async resolveTrafficSourceScopeIds(trafficSourceId?: string | null): Promise<string[]> {
    const scopedIds = new Set<string>([GENERAL_TRAFFIC_SOURCE_ID]);
    const normalized = String(trafficSourceId || '').trim();

    if (!normalized) {
      return Array.from(scopedIds);
    }

    scopedIds.add(normalized);

    const resolved = await this.trafficSourceRepo.findByIdentifierWithStorageId(normalized);
    if (resolved) {
      scopedIds.add(resolved.storageId);
      scopedIds.add(resolved.trafficSource.id);
      if (resolved.trafficSource.displayId) {
        scopedIds.add(resolved.trafficSource.displayId);
      }
    }

    return Array.from(scopedIds).filter(Boolean);
  }

  private parseConditions(raw: string | null | undefined): ListCondition[] | undefined {
    if (!raw || !raw.trim()) {
      return undefined;
    }
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as ListCondition[]) : undefined;
    } catch {
      return undefined;
    }
  }

  private resolveCandidateValues(type: SupportedListType, ctx: AutoruleVisitContext): string[] {
    switch (type) {
      case 'ip':
        return this.toValues(ctx.ip);
      case 'asn':
        return this.toValues(String(ctx.asn ?? ''));
      case 'user_agent':
        return this.toValues(ctx.userAgent);
      case 'zone':
        return this.toValues(ctx.zoneId);
      case 'geo':
      case 'country':
        return this.toValues(ctx.country);
      case 'device':
        return this.toValues(ctx.device);
      case 'isp':
        return this.toValues(ctx.isp);
      case 'fingerprint':
        return this.toValues(ctx.fingerprint);
      case 'sub_id':
        return (ctx.subIds || []).map((item) => item.trim()).filter(Boolean);
      default:
        return [];
    }
  }

  private getTypeVariants(type: SupportedListType): SupportedListType[] {
    if (type === 'country') {
      return ['country', 'geo'];
    }

    return [type];
  }

  private toValues(...values: Array<string | null | undefined>): string[] {
    return values
      .map((value) => String(value || '').trim())
      .filter((value) => value.length > 0);
  }

  private matchesEntry(type: SupportedListType, entry: ListEntry, values: string[]): boolean {
    if (Array.isArray(entry.conditions) && entry.conditions.length > 0) {
      const mode = entry.conditionMode === 'any' ? 'any' : 'all';
      return mode === 'any'
        ? entry.conditions.some((condition) => this.matchCondition(condition, type, values))
        : entry.conditions.every((condition) => this.matchCondition(condition, type, values));
    }

    const ruleValue = String(entry.value || '').trim();
    if (!ruleValue) return false;

    switch (type) {
      case 'ip': {
        const mode = String(entry.ipMatchMode || 'exact').toLowerCase();
        if (mode === 'cidr') {
          return values.some((value) => this.isIpInCidr(value, ruleValue));
        }
        return values.some((value) => value === ruleValue);
      }
      case 'user_agent': {
        const mode = String(entry.uaMatchMode || 'exact').toLowerCase();
        if (mode === 'contains') {
          const lowerRule = ruleValue.toLowerCase();
          return values.some((value) => value.toLowerCase().includes(lowerRule));
        }
        return values.some((value) => value.toLowerCase() === ruleValue.toLowerCase());
      }
      case 'isp': {
        const lowerRule = ruleValue.toLowerCase();
        return values.some((value) => {
          const lower = value.toLowerCase();
          return lower === lowerRule || lower.includes(lowerRule);
        });
      }
      default:
        return values.some((value) => value.toLowerCase() === ruleValue.toLowerCase());
    }
  }

  private matchCondition(condition: ListCondition, type: SupportedListType, fallbackValues: string[]): boolean {
    const directValues = this.resolveConditionValues(condition.field);
    const actualValues = directValues.length > 0 ? directValues : type === 'rule' ? [] : fallbackValues;
    const normalizedActual = actualValues.map((value) => value.toLowerCase());

    switch (condition.operator) {
      case 'exists':
        return actualValues.length > 0;
      case 'equals': {
        const expected = this.normalizeSingleExpected(condition.value);
        if (!expected) return false;
        const expectedLower = expected.toLowerCase();
        return normalizedActual.some((actual) => actual === expectedLower);
      }
      case 'contains': {
        const expected = this.normalizeSingleExpected(condition.value);
        if (!expected) return false;
        const expectedLower = expected.toLowerCase();
        return normalizedActual.some((actual) => actual.includes(expectedLower));
      }
      case 'starts_with': {
        const expected = this.normalizeSingleExpected(condition.value);
        if (!expected) return false;
        const expectedLower = expected.toLowerCase();
        return normalizedActual.some((actual) => actual.startsWith(expectedLower));
      }
      case 'ends_with': {
        const expected = this.normalizeSingleExpected(condition.value);
        if (!expected) return false;
        const expectedLower = expected.toLowerCase();
        return normalizedActual.some((actual) => actual.endsWith(expectedLower));
      }
      case 'in': {
        const expectedItems = this.normalizeListExpected(condition.value);
        if (expectedItems.length === 0) return false;
        return normalizedActual.some((actual) => expectedItems.includes(actual));
      }
      default:
        return false;
    }
  }

  private normalizeSingleExpected(value: ListCondition['value']): string | null {
    if (typeof value !== 'string') {
      return null;
    }
    const normalized = value.trim();
    return normalized ? normalized : null;
  }

  private normalizeListExpected(value: ListCondition['value']): string[] {
    if (Array.isArray(value)) {
      return value.map((item) => String(item || '').trim().toLowerCase()).filter(Boolean);
    }
    if (typeof value === 'string') {
      return value
        .split(',')
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean);
    }
    return [];
  }

  private resolveConditionValues(field: ListConditionField): string[] {
    switch (field) {
      case 'ip':
        return this.toValues(this.currentContext?.ip);
      case 'asn':
        return this.toValues(this.currentContext?.asn !== undefined ? String(this.currentContext.asn) : undefined);
      case 'userAgent':
        return this.toValues(this.currentContext?.userAgent);
      case 'zoneId':
        return this.toValues(this.currentContext?.zoneId);
      case 'country':
        return this.toValues(this.currentContext?.country);
      case 'device':
        return this.toValues(this.currentContext?.device);
      case 'isp':
        return this.toValues(this.currentContext?.isp);
      case 'fingerprint':
        return this.toValues(this.currentContext?.fingerprint);
      case 'utmSource':
        return this.toValues(this.currentContext?.utmSource);
      case 'utmCampaign':
        return this.toValues(this.currentContext?.utmCampaign);
      case 'browser':
        return this.toValues(this.currentContext?.browser);
      case 'subId1':
        return this.toValues(this.currentContext?.subIds?.[0]);
      case 'subId2':
        return this.toValues(this.currentContext?.subIds?.[1]);
      case 'subId3':
        return this.toValues(this.currentContext?.subIds?.[2]);
      case 'subId4':
        return this.toValues(this.currentContext?.subIds?.[3]);
      case 'subId5':
        return this.toValues(this.currentContext?.subIds?.[4]);
      default:
        return [];
    }
  }

  private currentContext: AutoruleVisitContext | null = null;

  private isIpInCidr(ip: string, cidr: string): boolean {
    const [baseIp, maskRaw] = cidr.split('/');
    if (!baseIp || !maskRaw) return false;

    const maskBits = Number(maskRaw);
    if (!Number.isInteger(maskBits) || maskBits < 0 || maskBits > 32) return false;

    const ipInt = this.ipv4ToInt(ip);
    const baseInt = this.ipv4ToInt(baseIp);
    if (ipInt === null || baseInt === null) return false;

    const mask = maskBits === 0 ? 0 : (0xffffffff << (32 - maskBits)) >>> 0;
    return (ipInt & mask) === (baseInt & mask);
  }

  private ipv4ToInt(ip: string): number | null {
    const parts = ip.split('.').map((part) => Number(part));
    if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) {
      return null;
    }
    return (((parts[0] || 0) << 24) | ((parts[1] || 0) << 16) | ((parts[2] || 0) << 8) | (parts[3] || 0)) >>> 0;
  }
}
