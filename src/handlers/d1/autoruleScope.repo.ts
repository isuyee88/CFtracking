import type { D1Database } from './index';
import type {
  AutoruleScopeBinding,
  AutoruleScopeConfig,
  AutoruleScopeType,
  EffectiveAutoruleScopeResolution,
  SaveAutoruleScopeConfigInput,
} from '@/types/autoruleScope';
import { TrafficSourceRepository } from './trafficSource.repo';

const GLOBAL_SCOPE_ID = 'global';
const CACHE_TTL_MS = 15_000;

interface ScopeConfigRow {
  id: string;
  scopeType: AutoruleScopeType;
  scopeId: string;
  mode: string;
  enabled: number;
  createdAt: string;
  updatedAt: string;
}

interface ScopeBindingRow {
  ruleId: string;
  priority: number;
  enabled: number;
  updatedAt: string;
}

type CacheEntry<T> = {
  expiresAt: number;
  value: T;
};

export class AutoruleScopeRepository {
  private readonly trafficSourceRepo: TrafficSourceRepository;
  private readonly scopeCache = new Map<string, CacheEntry<AutoruleScopeConfig | null>>();
  private readonly effectiveCache = new Map<string, CacheEntry<EffectiveAutoruleScopeResolution>>();

  constructor(private readonly db: D1Database) {
    this.trafficSourceRepo = new TrafficSourceRepository(db);
  }

  async getGlobalConfig(): Promise<AutoruleScopeConfig | null> {
    return this.getScopeConfig('global', GLOBAL_SCOPE_ID);
  }

  async saveGlobalConfig(input: SaveAutoruleScopeConfigInput): Promise<AutoruleScopeConfig> {
    return this.saveScopeConfig('global', GLOBAL_SCOPE_ID, input);
  }

  async getCampaignConfig(campaignIdOrDisplayId: string): Promise<AutoruleScopeConfig | null> {
    return this.getScopeConfig('campaign', campaignIdOrDisplayId);
  }

  async saveCampaignConfig(
    campaignIdOrDisplayId: string,
    input: SaveAutoruleScopeConfigInput
  ): Promise<AutoruleScopeConfig> {
    return this.saveScopeConfig('campaign', campaignIdOrDisplayId, input);
  }

  async getTrafficSourceConfig(trafficSourceIdOrDisplayId: string): Promise<AutoruleScopeConfig | null> {
    return this.getScopeConfig('traffic_source', trafficSourceIdOrDisplayId);
  }

  async saveTrafficSourceConfig(
    trafficSourceIdOrDisplayId: string,
    input: SaveAutoruleScopeConfigInput
  ): Promise<AutoruleScopeConfig> {
    return this.saveScopeConfig('traffic_source', trafficSourceIdOrDisplayId, input);
  }

  async batchApplyTrafficSourceConfig(
    trafficSourceIdsOrDisplayIds: string[],
    input: SaveAutoruleScopeConfigInput
  ): Promise<AutoruleScopeConfig[]> {
    const results: AutoruleScopeConfig[] = [];
    for (const trafficSourceId of trafficSourceIdsOrDisplayIds.map((item) => String(item || '').trim()).filter(Boolean)) {
      results.push(await this.saveTrafficSourceConfig(trafficSourceId, input));
    }
    return results;
  }

  async listTrafficSourceScopeConfigs(): Promise<AutoruleScopeConfig[]> {
    const configsResult = await this.db
      .prepare(`
        SELECT id, scopeType, scopeId, mode, enabled, createdAt, updatedAt
        FROM autorule_scope_configs
        WHERE scopeType = 'traffic_source'
        ORDER BY updatedAt DESC
      `)
      .all<ScopeConfigRow>();

    const rows = (configsResult.results || []) as ScopeConfigRow[];
    const configs = await Promise.all(rows.map((row) => this.inflateScopeConfig(row)));
    return configs.filter((item): item is AutoruleScopeConfig => Boolean(item));
  }

  async resolveEffectiveScopeConfig(
    campaignIdOrDisplayId: string,
    trafficSourceIdOrDisplayId?: string | null
  ): Promise<EffectiveAutoruleScopeResolution> {
    const campaignStorageId = await this.resolveCampaignStorageId(campaignIdOrDisplayId);
    if (!campaignStorageId) {
      throw new Error('Campaign not found');
    }

    const trafficSourceStorageId = trafficSourceIdOrDisplayId
      ? await this.resolveTrafficSourceStorageId(trafficSourceIdOrDisplayId)
      : null;
    const cacheKey = `effective:${campaignStorageId}:${trafficSourceStorageId || ''}`;
    const cached = this.readCache(this.effectiveCache, cacheKey);
    if (cached) {
      return cached;
    }

    const scopeRequests: Array<{ scopeType: AutoruleScopeType; scopeId: string }> = [
      { scopeType: 'campaign', scopeId: campaignStorageId },
    ];

    if (trafficSourceStorageId) {
      scopeRequests.push({ scopeType: 'traffic_source', scopeId: trafficSourceStorageId });
    }

    scopeRequests.push({ scopeType: 'global', scopeId: GLOBAL_SCOPE_ID });

    let hasExplicitConfig = false;
    let effectiveConfig: AutoruleScopeConfig | null = null;

    for (const request of scopeRequests) {
      const config = await this.getScopeConfigByStorageId(request.scopeType, request.scopeId);
      if (!config) {
        continue;
      }

      hasExplicitConfig = true;
      if (!config.enabled || config.mode === 'inherit') {
        continue;
      }

      effectiveConfig = config;
      break;
    }

    const resolution: EffectiveAutoruleScopeResolution = {
      effectiveConfig,
      hasExplicitConfig,
      scannedScopeTypes: scopeRequests.map((item) => item.scopeType),
    };

    this.writeCache(this.effectiveCache, cacheKey, resolution);
    return resolution;
  }

  async getScopeConfig(
    scopeType: AutoruleScopeType,
    scopeIdOrDisplayId: string
  ): Promise<AutoruleScopeConfig | null> {
    const storageId = await this.resolveScopeStorageId(scopeType, scopeIdOrDisplayId);
    if (!storageId) {
      return null;
    }

    return this.getScopeConfigByStorageId(scopeType, storageId);
  }

  async saveScopeConfig(
    scopeType: AutoruleScopeType,
    scopeIdOrDisplayId: string,
    input: SaveAutoruleScopeConfigInput
  ): Promise<AutoruleScopeConfig> {
    const storageId = await this.resolveScopeStorageId(scopeType, scopeIdOrDisplayId);
    if (!storageId) {
      throw new Error(this.resolveNotFoundMessage(scopeType));
    }

    const now = new Date().toISOString();
    const enabled = input.enabled !== false;
    const mode = input.mode;
    const normalizedBindings = (Array.isArray(input.bindings) ? input.bindings : [])
      .map((binding, index) => ({
        ruleId: String(binding.ruleId || '').trim(),
        priority: Number.isFinite(Number(binding.priority)) ? Number(binding.priority) : index,
        enabled: binding.enabled !== false,
      }))
      .filter((binding) => binding.ruleId)
      .sort((left, right) => left.priority - right.priority);

    let configId = await this.db
      .prepare(`
        SELECT id
        FROM autorule_scope_configs
        WHERE scopeType = ? AND scopeId = ?
        LIMIT 1
      `)
      .bind(scopeType, storageId)
      .first<{ id: string }>()
      .then((row) => row?.id || null);

    if (!configId) {
      configId = crypto.randomUUID();
      await this.db
        .prepare(`
          INSERT INTO autorule_scope_configs (id, scopeType, scopeId, mode, enabled, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(configId, scopeType, storageId, mode, enabled ? 1 : 0, now, now)
        .run();
    } else {
      await this.db
        .prepare(`
          UPDATE autorule_scope_configs
          SET mode = ?, enabled = ?, updatedAt = ?
          WHERE id = ?
        `)
        .bind(mode, enabled ? 1 : 0, now, configId)
        .run();

      await this.db
        .prepare('DELETE FROM autorule_scope_bindings WHERE scopeConfigId = ?')
        .bind(configId)
        .run();
    }

    for (const binding of normalizedBindings) {
      await this.db
        .prepare(`
          INSERT INTO autorule_scope_bindings (id, scopeConfigId, ruleId, priority, enabled, createdAt, updatedAt)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `)
        .bind(crypto.randomUUID(), configId, binding.ruleId, binding.priority, binding.enabled ? 1 : 0, now, now)
        .run();
    }

    this.invalidateCaches(scopeType, storageId);
    const config = await this.getScopeConfigByStorageId(scopeType, storageId);
    if (!config) {
      throw new Error('Failed to persist autorule scope config');
    }
    return config;
  }

  private async getScopeConfigByStorageId(
    scopeType: AutoruleScopeType,
    storageId: string
  ): Promise<AutoruleScopeConfig | null> {
    const cacheKey = `${scopeType}:${storageId}`;
    const cached = this.readCache(this.scopeCache, cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const row = await this.db
      .prepare(`
        SELECT id, scopeType, scopeId, mode, enabled, createdAt, updatedAt
        FROM autorule_scope_configs
        WHERE scopeType = ? AND scopeId = ?
        LIMIT 1
      `)
      .bind(scopeType, storageId)
      .first<ScopeConfigRow>();

    if (!row) {
      this.writeCache(this.scopeCache, cacheKey, null);
      return null;
    }

    const config = await this.inflateScopeConfig(row);
    this.writeCache(this.scopeCache, cacheKey, config);
    return config;
  }

  private async inflateScopeConfig(row: ScopeConfigRow): Promise<AutoruleScopeConfig | null> {
    const bindingsResult = await this.db
      .prepare(`
        SELECT ruleId, priority, enabled, updatedAt
        FROM autorule_scope_bindings
        WHERE scopeConfigId = ?
        ORDER BY priority ASC, updatedAt DESC
      `)
      .bind(row.id)
      .all<ScopeBindingRow>();

    const bindings = ((bindingsResult.results || []) as ScopeBindingRow[])
      .filter((binding) => Number(binding.enabled) === 1)
      .map<AutoruleScopeBinding>((binding) => ({
        ruleId: binding.ruleId,
        priority: Number(binding.priority || 0),
        enabled: Number(binding.enabled) === 1,
        updatedAt: binding.updatedAt,
      }));

    return {
      id: row.id,
      scopeType: row.scopeType,
      scopeId: row.scopeId,
      mode: row.mode as AutoruleScopeConfig['mode'],
      enabled: Number(row.enabled) === 1,
      bindings,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private async resolveScopeStorageId(
    scopeType: AutoruleScopeType,
    scopeIdOrDisplayId: string
  ): Promise<string | null> {
    if (scopeType === 'global') {
      return GLOBAL_SCOPE_ID;
    }
    if (scopeType === 'campaign') {
      return this.resolveCampaignStorageId(scopeIdOrDisplayId);
    }
    return this.resolveTrafficSourceStorageId(scopeIdOrDisplayId);
  }

  private async resolveCampaignStorageId(campaignIdOrDisplayId: string): Promise<string | null> {
    const direct = await this.db
      .prepare('SELECT id FROM campaigns WHERE id = ? OR displayId = ? LIMIT 1')
      .bind(campaignIdOrDisplayId, campaignIdOrDisplayId)
      .first<{ id: string }>();
    return direct?.id || null;
  }

  private async resolveTrafficSourceStorageId(trafficSourceIdOrDisplayId: string): Promise<string | null> {
    const resolved = await this.trafficSourceRepo.findByIdentifierWithStorageId(trafficSourceIdOrDisplayId);
    return resolved?.storageId || null;
  }

  private resolveNotFoundMessage(scopeType: AutoruleScopeType): string {
    switch (scopeType) {
      case 'campaign':
        return 'Campaign not found';
      case 'traffic_source':
        return 'Traffic source not found';
      default:
        return 'Scope not found';
    }
  }

  private invalidateCaches(scopeType: AutoruleScopeType, storageId: string) {
    this.scopeCache.delete(`${scopeType}:${storageId}`);
    this.effectiveCache.clear();
  }

  private readCache<T>(cache: Map<string, CacheEntry<T>>, key: string): T | undefined {
    const entry = cache.get(key);
    if (!entry) {
      return undefined;
    }
    if (entry.expiresAt < Date.now()) {
      cache.delete(key);
      return undefined;
    }
    return entry.value;
  }

  private writeCache<T>(cache: Map<string, CacheEntry<T>>, key: string, value: T) {
    cache.set(key, {
      value,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }
}

export { GLOBAL_SCOPE_ID };
