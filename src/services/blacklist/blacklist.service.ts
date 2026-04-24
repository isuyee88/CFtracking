/**
 * @fileoverview Blacklist 涓氬姟鏈嶅姟
 * @description 澶勭悊榛戝悕鍗曠浉鍏崇殑涓氬姟閫昏緫锛屽寘鎷壒閲忔坊鍔犲拰鍚屾鍒版祦閲忓钩鍙?
 * @module services/blacklist/blacklist.service
 */

import { BlacklistRepository } from '@/handlers/d1/blacklist.repo';
import { TrafficSourceRepository } from '@/handlers/d1/trafficSource.repo';
import { getD1Connection } from '@/handlers/d1';
import { GENERAL_TRAFFIC_SOURCE_ID } from '@/handlers/d1/trafficSource.repo';
import { PropellerAdsAdapter } from '@/services/platform/propellerads';
import type { Env } from '@/config/env';
import type {
  BlacklistEntry,
  BlacklistQueryParams,
  BatchBlacklistDTO,
  BlacklistSyncResult,
  BlacklistCandidate,
  BlacklistType,
  ListCondition,
  ListConditionField,
  ListConditionMode,
  CreateBlacklistDTO,
  UpdateBlacklistDTO,
} from '@/types/blacklist';
import type { TrafficSourceApiConfig } from '@/types/trafficSource';
import { NotFoundError, ValidationError } from '@/middleware/error';
import { FIELD_MAX_LENGTH } from '@/config/field-constraints';
import { normalizeOptionalString, normalizeRequiredString } from '@/utils/fieldLength';

export class BlacklistService {
  private blacklistRepo: BlacklistRepository;
  private trafficSourceRepo: TrafficSourceRepository;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    const db = getD1Connection(env);
    this.blacklistRepo = new BlacklistRepository(db);
    this.trafficSourceRepo = new TrafficSourceRepository(db);
  }

  private async resolveTrafficSourceOrThrow(trafficSourceId: string) {
    if (trafficSourceId === GENERAL_TRAFFIC_SOURCE_ID) {
      return this.trafficSourceRepo.ensureGeneralTrafficSource();
    }

    const resolved = await this.trafficSourceRepo.findByIdentifierWithStorageId(trafficSourceId);
    if (!resolved) {
      throw new NotFoundError('Traffic Source not found');
    }

    return resolved;
  }

  /**
   * 鍒涘缓鍗曚釜榛戝悕鍗曟潯鐩?
   */
  async create(data: CreateBlacklistDTO): Promise<BlacklistEntry> {
    const normalizedData = this.normalizeCreateInput(data);
    const { trafficSourceId, type, value } = normalizedData;
    const hasConditionRules = this.hasConditionRules(normalizedData.conditions);

    const { storageId } = await this.resolveTrafficSourceOrThrow(trafficSourceId);

    this.validateEntryValue(type, value, normalizedData.ipMatchMode, normalizedData.uaMatchMode, hasConditionRules);
    this.validateConditionRules(type, normalizedData.matchMode, normalizedData.conditions);

    if (!hasConditionRules) {
      const existing = await this.blacklistRepo.findByValue(storageId, type, value);
      if (existing) {
        if (existing.status === 'active') {
          throw new ValidationError(`Entry already exists in blacklist: ${value}`);
        }
        const updated = await this.blacklistRepo.update(existing.id, {
          status: 'active',
          reason: normalizedData.reason,
          name: normalizedData.name,
          ipMatchMode: normalizedData.ipMatchMode,
          uaMatchMode: normalizedData.uaMatchMode,
          syncToPlatform: normalizedData.syncToPlatform,
          matchMode: normalizedData.matchMode,
          conditions: normalizedData.conditions,
        });
        return updated!;
      }
    }

    const entry = await this.blacklistRepo.create({
      trafficSourceId: storageId,
      type,
      value,
      name: normalizedData.name,
      reason: normalizedData.reason,
      status: 'active',
      synced: false,
      campaignId: normalizedData.campaignId,
      ipMatchMode: normalizedData.ipMatchMode,
      uaMatchMode: normalizedData.uaMatchMode,
      syncToPlatform: normalizedData.syncToPlatform,
      matchMode: normalizedData.matchMode,
      conditions: normalizedData.conditions,
    });

    return entry;
  }
  /**
   * 鏇存柊榛戝悕鍗曟潯鐩?
   */
  async update(id: string, data: UpdateBlacklistDTO): Promise<BlacklistEntry> {
    const normalizedData = this.normalizeUpdateInput(data);
    const entry = await this.blacklistRepo.findById(id);
    if (!entry) {
      throw new NotFoundError('Blacklist entry not found');
    }

    const effectiveConditions = normalizedData.conditions ?? entry.conditions;
    const effectiveMatchMode = normalizedData.matchMode ?? entry.matchMode;
    this.validateConditionRules(entry.type, effectiveMatchMode, effectiveConditions);

    const updated = await this.blacklistRepo.update(id, normalizedData);
    if (!updated) {
      throw new NotFoundError('Blacklist entry not found');
    }

    return updated;
  }

  /**
   * 鎵归噺娣诲姞榛戝悕鍗?
   */
  async batchAdd(data: BatchBlacklistDTO): Promise<BlacklistEntry[]> {
    const normalizedData = this.normalizeBatchInput(data);
    data = normalizedData;
    const { trafficSourceId, type, items } = data;

    const { storageId } = await this.resolveTrafficSourceOrThrow(trafficSourceId);

    if (!items || items.length === 0) {
      throw new ValidationError('No items to blacklist');
    }

    // 鎵归噺鍒涘缓榛戝悕鍗曟潯鐩?
    const entries = await this.blacklistRepo.batchCreate(storageId, type, items);

    return entries;
  }

  /**
   * 浠庢姤鍛婂€欓€夐」鐩腑鎵归噺娣诲姞榛戝悕鍗?
   */
  async batchAddFromCandidates(
    trafficSourceId: string,
    candidates: BlacklistCandidate[],
    reason?: string
  ): Promise<BlacklistEntry[]> {
    const normalizedReason = normalizeOptionalString(reason as unknown, {
      field: 'blacklist.reason',
      maxLength: FIELD_MAX_LENGTH.REASON,
    });
    reason = normalizedReason;

    const items = candidates.map((candidate) => ({
      value: candidate.value,
      name: candidate.name,
      reason: reason || `ROI: ${candidate.metrics.roi.toFixed(2)}%, Spend: $${candidate.metrics.spend}`,
      campaignId: candidate.campaignId,
    }));

    // 鎸夌被鍨嬪垎缁勫鐞?
    const groupedByType = items.reduce(
      (acc, item, index) => {
        const candidate = candidates[index];
        if (!candidate) return acc;
        const type = candidate.type;
        if (!acc[type]) acc[type] = [];
        acc[type].push(item);
        return acc;
      },
      {} as Record<BlacklistType, typeof items>
    );

    const allEntries: BlacklistEntry[] = [];

    for (const [type, typeItems] of Object.entries(groupedByType)) {
      const entries = await this.batchAdd({
        trafficSourceId,
        type: type as BlacklistType,
        items: typeItems,
      });
      allEntries.push(...entries);
    }

    return allEntries;
  }

  /**
   * 鏌ヨ榛戝悕鍗?
   */
  async query(params: BlacklistQueryParams): Promise<BlacklistEntry[]> {
    if (!params.trafficSourceId) {
      return this.blacklistRepo.findByParams(params);
    }

    const { storageId } = await this.resolveTrafficSourceOrThrow(params.trafficSourceId);

    return this.blacklistRepo.findByParams({
      ...params,
      trafficSourceId: storageId,
    });
  }

  /**
   * 鑾峰彇榛戝悕鍗曡鎯?
   */
  async getById(id: string): Promise<BlacklistEntry> {
    const entry = await this.blacklistRepo.findById(id);
    if (!entry) {
      throw new NotFoundError('Blacklist entry not found');
    }
    return entry;
  }

  /**
   * 浠庨粦鍚嶅崟涓Щ闄?
   */
  async remove(id: string): Promise<BlacklistEntry> {
    const entry = await this.blacklistRepo.remove(id);
    if (!entry) {
      throw new NotFoundError('Blacklist entry not found');
    }

    // 濡傛灉宸插悓姝ュ埌骞冲彴锛岄渶瑕佷粠骞冲彴绉婚櫎
    if (entry.synced) {
      await this.removeFromPlatform(entry);
    }

    return entry;
  }

  /**
   * 鍚屾榛戝悕鍗曞埌娴侀噺骞冲彴
   */
  async syncToPlatform(trafficSourceId: string): Promise<BlacklistSyncResult> {
    const { trafficSource, storageId } = await this.resolveTrafficSourceOrThrow(trafficSourceId);

    if (!trafficSource.apiConfig) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [
          {
            entryId: '',
            value: '',
            error: 'API config not set for this traffic source',
          },
        ],
      };
    }

    const apiConfig = this.parseTrafficSourceApiConfig(trafficSource.apiConfig);
    if (!apiConfig.enabled) {
      return {
        success: false,
        synced: 0,
        failed: 0,
        errors: [
          {
            entryId: '',
            value: '',
            error: 'API is disabled for this traffic source',
          },
        ],
      };
    }

    // 鑾峰彇鏈悓姝ョ殑榛戝悕鍗?
    const unsyncedEntries = await this.blacklistRepo.findUnsynced(storageId);

    if (unsyncedEntries.length === 0) {
      return {
        success: true,
        synced: 0,
        failed: 0,
        errors: [],
      };
    }

    // 鏍规嵁骞冲彴绫诲瀷閫夋嫨閫傞厤鍣?
    const result: BlacklistSyncResult = {
      success: true,
      synced: 0,
      failed: 0,
      errors: [],
    };

    // 鐩墠鍙敮鎸?PropellerAds
    if (trafficSource.name.toLowerCase().includes('propeller')) {
      const adapter = new PropellerAdsAdapter({
        apiKey: apiConfig.apiKey,
        apiUrl: apiConfig.baseUrl,
      });

      await adapter.initialize();

      for (const entry of unsyncedEntries) {
        try {
          const syncResult = await this.syncEntryToPropellerAds(adapter, entry);

          if (syncResult.success) {
            await this.blacklistRepo.markSynced(entry.id);
            result.synced++;
          } else {
            result.failed++;
            result.errors.push({
              entryId: entry.id,
              value: entry.value,
              error: syncResult.message,
            });
          }
        } catch (error) {
          result.failed++;
          result.errors.push({
            entryId: entry.id,
            value: entry.value,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }
    } else {
      return {
        success: false,
        synced: 0,
        failed: unsyncedEntries.length,
        errors: [
          {
            entryId: '',
            value: '',
            error: 'Unsupported traffic source platform',
          },
        ],
      };
    }

    result.success = result.failed === 0;
    return result;
  }

  /**
   * 鍚屾鍗曚釜鏉＄洰鍒?PropellerAds
   */
  private async syncEntryToPropellerAds(
    adapter: PropellerAdsAdapter,
    entry: BlacklistEntry
  ): Promise<{ success: boolean; message: string }> {
    // 鍙敮鎸?Zone 绫诲瀷鐨勯粦鍚嶅崟
    if (entry.type !== 'zone') {
      return {
        success: false,
        message: `Unsupported blacklist type: ${entry.type}`,
      };
    }

    // 闇€瑕?campaignId 鎵嶈兘鎺掗櫎 Zone
    if (!entry.campaignId) {
      return {
        success: false,
        message: 'Campaign ID is required to exclude zone',
      };
    }

    const result = await adapter.execute('exclude_zone', {
      campaignId: entry.campaignId,
      zoneId: entry.value,
    });

    return {
      success: result.success,
      message: result.message,
    };
  }

  /**
   * 浠庡钩鍙扮Щ闄ら粦鍚嶅崟
   */
  private async removeFromPlatform(entry: BlacklistEntry): Promise<void> {
    const trafficSource = await this.trafficSourceRepo.findById(entry.trafficSourceId);
    if (!trafficSource || !trafficSource.apiConfig) {
      return;
    }

    const apiConfig = this.parseTrafficSourceApiConfig(trafficSource.apiConfig);
    if (!apiConfig.enabled) {
      return;
    }

    if (trafficSource.name.toLowerCase().includes('propeller') && entry.type === 'zone' && entry.campaignId) {
      const adapter = new PropellerAdsAdapter({
        apiKey: apiConfig.apiKey,
        apiUrl: apiConfig.baseUrl,
      });

      await adapter.initialize();
      await adapter.execute('include_zone', {
        campaignId: entry.campaignId,
        zoneId: entry.value,
      });
    }
  }

  /**
   * 鑾峰彇榛戝悕鍗曠粺璁?
   */
  private parseTrafficSourceApiConfig(config: TrafficSourceApiConfig | string): TrafficSourceApiConfig {
    if (typeof config === 'string') {
      return JSON.parse(config) as TrafficSourceApiConfig;
    }
    return config;
  }

  async getStats(trafficSourceId: string): Promise<{
    total: number;
    active: number;
    synced: number;
    unsynced: number;
  }> {
    const { storageId } = await this.resolveTrafficSourceOrThrow(trafficSourceId);

    return this.blacklistRepo.getStats(storageId);
  }

  private normalizeCreateInput(data: CreateBlacklistDTO): CreateBlacklistDTO {
    const type = data.type as BlacklistType;
    const hasConditionRules = this.hasConditionRules(data.conditions);
    const valueMaxLength = this.getBlacklistValueMaxLength(type);
    const normalizedConditions = this.normalizeConditions(data.conditions, 'blacklist.conditions');
    const normalizedMatchMode = this.normalizeConditionMode(data.matchMode, normalizedConditions);
    const normalizedValue = hasConditionRules
      ? normalizeOptionalString(data.value as unknown, {
          field: 'blacklist.value',
          maxLength: valueMaxLength,
        }) || `rule:${crypto.randomUUID()}`
      : normalizeRequiredString(data.value as unknown, {
          field: 'blacklist.value',
          maxLength: valueMaxLength,
        });

    return {
      ...data,
      trafficSourceId: normalizeRequiredString(data.trafficSourceId as unknown, {
        field: 'blacklist.trafficSourceId',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      }),
      value: this.normalizeEntryValue(type, normalizedValue),
      name: normalizeOptionalString(data.name as unknown, {
        field: 'blacklist.name',
        maxLength: FIELD_MAX_LENGTH.NAME,
      }),
      reason: normalizeOptionalString(data.reason as unknown, {
        field: 'blacklist.reason',
        maxLength: FIELD_MAX_LENGTH.REASON,
      }),
      campaignId: normalizeOptionalString(data.campaignId as unknown, {
        field: 'blacklist.campaignId',
        maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
      }),
      matchMode: normalizedMatchMode,
      conditions: normalizedConditions,
    };
  }

  private normalizeUpdateInput(data: UpdateBlacklistDTO): UpdateBlacklistDTO {
    const normalizedData: UpdateBlacklistDTO = { ...data };

    if (data.name !== undefined) {
      normalizedData.name = normalizeOptionalString(data.name as unknown, {
        field: 'blacklist.name',
        maxLength: FIELD_MAX_LENGTH.NAME,
      });
    }

    if (data.reason !== undefined) {
      normalizedData.reason = normalizeOptionalString(data.reason as unknown, {
        field: 'blacklist.reason',
        maxLength: FIELD_MAX_LENGTH.REASON,
      });
    }

    if (data.conditions !== undefined) {
      normalizedData.conditions = this.normalizeConditions(data.conditions, 'blacklist.conditions');
    }

    if (data.matchMode !== undefined || normalizedData.conditions !== undefined) {
      normalizedData.matchMode = this.normalizeConditionMode(data.matchMode, normalizedData.conditions);
    }

    return normalizedData;
  }

  private normalizeBatchInput(data: BatchBlacklistDTO): BatchBlacklistDTO {
    if (!Array.isArray(data.items)) {
      throw new ValidationError('blacklist.items must be an array');
    }

    const normalizedTrafficSourceId = normalizeRequiredString(data.trafficSourceId as unknown, {
      field: 'blacklist.trafficSourceId',
      maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
    });
    const type = data.type as BlacklistType;
    const valueMaxLength = this.getBlacklistValueMaxLength(type);

    return {
      ...data,
      trafficSourceId: normalizedTrafficSourceId,
      items: data.items.map((item, index) => ({
        ...item,
        value: this.normalizeEntryValue(
          type,
          normalizeRequiredString(item.value as unknown, {
            field: `blacklist.items[${index}].value`,
            maxLength: valueMaxLength,
          })
        ),
        name: normalizeOptionalString(item.name as unknown, {
          field: `blacklist.items[${index}].name`,
          maxLength: FIELD_MAX_LENGTH.NAME,
        }),
        reason: normalizeOptionalString(item.reason as unknown, {
          field: `blacklist.items[${index}].reason`,
          maxLength: FIELD_MAX_LENGTH.REASON,
        }),
        campaignId: normalizeOptionalString(item.campaignId as unknown, {
          field: `blacklist.items[${index}].campaignId`,
          maxLength: FIELD_MAX_LENGTH.CAMPAIGN_ID,
        }),
      })),
    };
  }

  private getBlacklistValueMaxLength(type: BlacklistType): number {
    if (type === 'user_agent') {
      return FIELD_MAX_LENGTH.USER_AGENT_VALUE;
    }
    return FIELD_MAX_LENGTH.TRAFFIC_ENTRY_VALUE;
  }

  /**
   * 楠岃瘉鏉＄洰鍊兼牸寮?
   */
  private validateEntryValue(
    type: BlacklistType,
    value: string,
    ipMatchMode?: string,
    uaMatchMode?: string,
    hasConditionRules = false
  ): void {
    if (!value || value.trim() === '') {
      if (hasConditionRules) {
        return;
      }
      throw new ValidationError('Value is required');
    }

    const normalizedValue = value.trim();
    const maxLength = this.getBlacklistValueMaxLength(type);
    if (normalizedValue.length > maxLength) {
      throw new ValidationError(`Blacklist value exceeds max length ${maxLength}`);
    }

    switch (type) {
      case 'ip':
        this.validateIpValue(normalizedValue, ipMatchMode);
        break;
      case 'user_agent':
        this.validateUaValue(normalizedValue, uaMatchMode);
        break;
      case 'asn':
        this.validateAsnValue(normalizedValue);
        break;
      case 'country':
        this.validateCountryValue(normalizedValue);
        break;
      case 'zone':
      case 'creative':
      case 'publisher':
      case 'sub_id':
      case 'geo':
      case 'device':
      case 'isp':
      case 'fingerprint':
      case 'rule':
        // 杩欎簺绫诲瀷鍙渶瑕侀潪绌哄€?        break;
      default:
        throw new ValidationError(`Unsupported type: ${type}`);
    }
  }

  private hasConditionRules(conditions?: ListCondition[]): boolean {
    return Array.isArray(conditions) && conditions.length > 0;
  }

  private normalizeConditionMode(
    mode: ListConditionMode | undefined,
    conditions: ListCondition[] | undefined
  ): ListConditionMode | undefined {
    if (!this.hasConditionRules(conditions)) {
      return undefined;
    }

    if (!mode) {
      return 'all';
    }

    if (mode !== 'all' && mode !== 'any') {
      throw new ValidationError("matchMode must be 'all' or 'any'");
    }

    return mode;
  }

  private normalizeConditions(
    conditions: CreateBlacklistDTO['conditions'] | UpdateBlacklistDTO['conditions'] | undefined,
    fieldPrefix: string
  ): ListCondition[] | undefined {
    if (conditions === undefined) {
      return undefined;
    }

    if (!Array.isArray(conditions)) {
      throw new ValidationError(`${fieldPrefix} must be an array`);
    }

    if (conditions.length === 0) {
      return [];
    }

    return conditions.map((raw, index) => this.normalizeCondition(raw, `${fieldPrefix}[${index}]`));
  }

  private normalizeCondition(raw: ListCondition, fieldPrefix: string): ListCondition {
    if (!raw || typeof raw !== 'object') {
      throw new ValidationError(`${fieldPrefix} must be an object`);
    }

    const field = String(raw.field || '').trim() as ListConditionField;
    const operator = String(raw.operator || '').trim().toLowerCase() as ListCondition['operator'];

    const allowedFields: ListConditionField[] = [
      'ip',
      'asn',
      'userAgent',
      'zoneId',
      'country',
      'device',
      'isp',
      'fingerprint',
      'utmSource',
      'utmCampaign',
      'browser',
      'subId1',
      'subId2',
      'subId3',
      'subId4',
      'subId5',
    ];
    if (!allowedFields.includes(field)) {
      throw new ValidationError(`${fieldPrefix}.field is invalid`);
    }

    const allowedOperators: ListCondition['operator'][] = [
      'equals',
      'contains',
      'starts_with',
      'ends_with',
      'in',
      'exists',
    ];
    if (!allowedOperators.includes(operator)) {
      throw new ValidationError(`${fieldPrefix}.operator is invalid`);
    }

    if (operator === 'exists') {
      return { field, operator };
    }

    if (operator === 'in') {
      if (!Array.isArray(raw.value)) {
        throw new ValidationError(`${fieldPrefix}.value must be an array for 'in' operator`);
      }
      const values = raw.value
        .map((item, valueIndex) =>
          normalizeRequiredString(item as unknown, {
            field: `${fieldPrefix}.value[${valueIndex}]`,
            maxLength: this.getConditionValueMaxLength(field),
          })
        )
        .filter(Boolean);
      if (values.length === 0) {
        throw new ValidationError(`${fieldPrefix}.value requires at least one item`);
      }
      return { field, operator, value: values };
    }

    const value = normalizeRequiredString(raw.value as unknown, {
      field: `${fieldPrefix}.value`,
      maxLength: this.getConditionValueMaxLength(field),
    });
    return { field, operator, value };
  }

  private getConditionValueMaxLength(field: ListConditionField): number {
    return field === 'userAgent' ? FIELD_MAX_LENGTH.USER_AGENT_VALUE : FIELD_MAX_LENGTH.TRAFFIC_ENTRY_VALUE;
  }

  private validateConditionRules(
    type: BlacklistType,
    matchMode: ListConditionMode | undefined,
    conditions: ListCondition[] | undefined
  ): void {
    const hasConditions = this.hasConditionRules(conditions);
    if (!hasConditions && matchMode !== undefined) {
      throw new ValidationError('matchMode requires conditions');
    }
    if (type === 'rule' && !hasConditions) {
      throw new ValidationError('Rule type requires at least one condition');
    }
  }

  /**
   * 楠岃瘉IP鍦板潃鏍煎紡
   */
  private validateIpValue(value: string, matchMode?: string): void {
    const mode = matchMode || 'exact';

    if (mode === 'cidr') {
      // 楠岃瘉CIDR鏍煎紡: x.x.x.x/y
      const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/;
      if (!cidrRegex.test(value)) {
        throw new ValidationError(`Invalid CIDR format: ${value}. Expected format: x.x.x.x/y`);
      }
      // 楠岃瘉IP閮ㄥ垎
      const [ip] = value.split('/');
      if (ip && !this.isValidIp(ip)) {
        throw new ValidationError(`Invalid IP address in CIDR: ${ip}`);
      }
    } else {
      // 绮剧‘鍖归厤妯″紡
      if (!this.isValidIp(value)) {
        throw new ValidationError(`Invalid IP address: ${value}`);
      }
    }
  }

  /**
   * 楠岃瘉鏄惁鏄湁鏁堢殑IP鍦板潃
   */
  private isValidIp(ip: string): boolean {
    // IPv4楠岃瘉
    const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (ipv4Regex.test(ip)) {
      const parts = ip.split('.').map(Number);
      return parts.every(part => part >= 0 && part <= 255);
    }

    // IPv6楠岃瘉锛堢畝鍖栫増锛?
    const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::$|^::1$|^([0-9a-fA-F]{1,4}:)*[0-9a-fA-F]{1,4}$/;
    if (ipv6Regex.test(ip)) {
      return true;
    }

    return false;
  }

  /**
   * 楠岃瘉UA鍊?
   */
  private validateUaValue(value: string, matchMode?: string): void {
    if (value.length > 1000) {
      throw new ValidationError('User Agent pattern too long (max 1000 characters)');
    }

    const mode = matchMode || 'exact';
    if (mode !== 'exact' && mode !== 'contains') {
      throw new ValidationError(`Invalid UA match mode: ${mode}. Must be 'exact' or 'contains'`);
    }
  }

  private validateAsnValue(value: string): void {
    const normalized = value.trim().toUpperCase();
    const asnRegex = /^(AS)?\d+$/;
    if (!asnRegex.test(normalized)) {
      throw new ValidationError(`Invalid ASN format: ${value}. Expected format: AS12345 or 12345`);
    }
  }

  private validateCountryValue(value: string): void {
    const countryCodeRegex = /^[A-Z]{2}$/;
    if (!countryCodeRegex.test(value.trim().toUpperCase())) {
      throw new ValidationError(`Invalid country code: ${value}. Expected ISO 3166-1 alpha-2 like US`);
    }
  }

  private normalizeEntryValue(type: BlacklistType, value: string): string {
    if (type === 'country') {
      return value.trim().toUpperCase();
    }

    return value;
  }

  /**
   * 鑾峰彇鎶ュ憡涓殑榛戝悕鍗曞€欓€夐」鐩?
   * 鏍规嵁缁熻鏁版嵁鎵惧嚭琛ㄧ幇涓嶄匠鐨?Zone/SubID
   */
  async getBlacklistCandidates(
    trafficSourceId: string,
    options: {
      minSpend?: number;
      maxRoi?: number;
      minClicks?: number;
      dateRange?: string;
    } = {}
  ): Promise<BlacklistCandidate[]> {
    const { minSpend = 10, maxRoi = -50, minClicks = 100 } = options;

    // 浠庢祦閲忕粺璁℃暟鎹腑鎵惧嚭琛ㄧ幇涓嶄匠鐨勯」鐩?
    // 杩欓噷绠€鍖栧鐞嗭紝瀹為檯搴旇鏌ヨ璇︾粏鐨勬祦閲忔暟鎹?
    const db = getD1Connection(this.env);
    const results = await db
      .prepare(
        `
        SELECT
          zone as value,
          SUM(clicks) as clicks,
          SUM(conversions) as conversions,
          SUM(spend) as spend,
          SUM(revenue) as revenue,
          campaignId
        FROM trafficSummary
        WHERE trafficSource = ?
        GROUP BY zone, campaignId
        HAVING spend >= ? AND clicks >= ?
      `
      )
      .bind(trafficSourceId, minSpend, minClicks)
      .all<{
        value: string;
        clicks: number;
        conversions: number;
        spend: number;
        revenue: number;
        campaignId: string;
      }>();

    const candidates: BlacklistCandidate[] = [];

    for (const row of results.results || []) {
      const roi = row.spend > 0 ? ((row.revenue - row.spend) / row.spend) * 100 : 0;

      if (roi <= maxRoi) {
        candidates.push({
          type: 'zone',
          value: row.value,
          name: `Zone ${row.value}`,
          metrics: {
            impressions: 0, // 闇€瑕佷粠鍏朵粬琛ㄨ幏鍙?
            clicks: row.clicks,
            conversions: row.conversions,
            spend: row.spend,
            revenue: row.revenue,
            roi,
          },
          campaignId: row.campaignId,
        });
      }
    }

    // 鎸?ROI 鎺掑簭
    return candidates.sort((a, b) => a.metrics.roi - b.metrics.roi);
  }
}


