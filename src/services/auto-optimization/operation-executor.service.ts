/**
 * @fileoverview 自动化操作执行服务
 * @description 将已审批的自动化操作下发到平台适配器并回写执行状态
 * @module services/auto-optimization/operation-executor
 */

import { AutoOptimizationRepository } from '@/handlers/d1/auto-optimization.repo';
import { getD1Connection } from '@/handlers/d1';
import { PlatformManager } from '@/services/platform/manager';
import type { Env } from '@/config/env';
import type { ActionType, AutoOperation } from '@/types/auto-optimization';

interface PlatformActionMapping {
  action: string;
  parameters: Record<string, unknown>;
}

export interface OperationExecutionResult {
  operationId: string;
  actionType: ActionType;
  platform: string;
  executed: boolean;
  success: boolean;
  skipped?: boolean;
  message: string;
  platformAction?: string;
  details?: Record<string, unknown>;
}

export class AutoOperationExecutorService {
  private repo: AutoOptimizationRepository;
  private manager: PlatformManager;
  private env: Env;

  constructor(env: Env) {
    this.env = env;
    const db = getD1Connection(env);
    this.repo = new AutoOptimizationRepository(db);
    this.manager = PlatformManager.createDefault();
  }

  async executeOperation(operationId: string): Promise<OperationExecutionResult> {
    const operation = await this.repo.getOperation(operationId);
    if (!operation) {
      return {
        operationId,
        actionType: 'ALERT',
        platform: 'unknown',
        executed: false,
        success: false,
        message: 'Operation not found',
      };
    }

    if (operation.executionStatus === 'success') {
      return {
        operationId: operation.id,
        actionType: operation.actionType,
        platform: operation.platform,
        executed: true,
        success: true,
        skipped: true,
        message: 'Operation already executed successfully',
      };
    }

    if (!['approved', 'auto_approved'].includes(operation.approvalStatus)) {
      return {
        operationId: operation.id,
        actionType: operation.actionType,
        platform: operation.platform,
        executed: false,
        success: false,
        skipped: true,
        message: `Operation is not executable in status ${operation.approvalStatus}`,
      };
    }

    const platformId = this.normalizePlatformId(operation.platform);
    const mapped = await this.mapOperationToPlatformAction(operation, platformId);
    if (!mapped.success) {
      await this.repo.finalizeOperationExecution(operation.id, {
        success: false,
        executionError: mapped.message,
      });

      return {
        operationId: operation.id,
        actionType: operation.actionType,
        platform: operation.platform,
        executed: false,
        success: false,
        message: mapped.message,
      };
    }

    const config = this.buildPlatformConfig(platformId);
    if (!config) {
      return {
        operationId: operation.id,
        actionType: operation.actionType,
        platform: operation.platform,
        executed: false,
        success: false,
        skipped: true,
        platformAction: mapped.mapping.action,
        message: `Missing platform config for ${platformId}, keep pending`,
      };
    }

    try {
      await this.manager.initializePlatform(platformId, config);
    } catch (error) {
      const message = `Platform ${platformId} initialization failed: ${this.stringifyError(error)}`;
      await this.repo.finalizeOperationExecution(operation.id, {
        success: false,
        executionError: message,
      });

      return {
        operationId: operation.id,
        actionType: operation.actionType,
        platform: operation.platform,
        executed: false,
        success: false,
        platformAction: mapped.mapping.action,
        message,
      };
    }

    await this.repo.updateOperationStatus(operation.id, {
      executionStatus: 'running',
    });

    const result = await this.manager.executeAction(
      platformId,
      mapped.mapping.action,
      mapped.mapping.parameters,
    );

    if (result.success) {
      await this.repo.finalizeOperationExecution(operation.id, {
        success: true,
        executionResult: {
          platformId,
          platformAction: mapped.mapping.action,
          message: result.message,
          data: result.data || {},
        },
      });

      return {
        operationId: operation.id,
        actionType: operation.actionType,
        platform: operation.platform,
        executed: true,
        success: true,
        platformAction: mapped.mapping.action,
        message: result.message,
        details: result.data,
      };
    }

    await this.repo.finalizeOperationExecution(operation.id, {
      success: false,
      executionError: result.message,
    });

    return {
      operationId: operation.id,
      actionType: operation.actionType,
      platform: operation.platform,
      executed: false,
      success: false,
      platformAction: mapped.mapping.action,
      message: result.message,
      details: result.data,
    };
  }

  async processPendingOperations(limit: number = 20): Promise<{
    total: number;
    processed: number;
    succeeded: number;
    failed: number;
    skipped: number;
    results: OperationExecutionResult[];
  }> {
    const operations = await this.repo.getPendingExecutableOperations(limit);
    const results: OperationExecutionResult[] = [];

    let succeeded = 0;
    let failed = 0;
    let skipped = 0;

    for (const operation of operations) {
      const result = await this.executeOperation(operation.id);
      results.push(result);

      if (result.skipped) {
        skipped += 1;
        continue;
      }

      if (result.success) {
        succeeded += 1;
      } else {
        failed += 1;
      }
    }

    return {
      total: operations.length,
      processed: results.length,
      succeeded,
      failed,
      skipped,
      results,
    };
  }

  private async mapOperationToPlatformAction(
    operation: AutoOperation,
    platformId: string,
  ): Promise<{ success: true; mapping: PlatformActionMapping } | { success: false; message: string }> {
    const baseCampaignId = operation.campaignId;
    const params = operation.parameters || {};

    switch (operation.actionType) {
      case 'BLOCK':
      case 'PAUSE': {
        if (platformId === 'propellerads' && params.scopeType === 'publisher') {
          const publisherId = this.resolveStringParam(params, ['publisherId', 'publisher_id', 'scopeId']);
          if (!publisherId) {
            return { success: false, message: 'Publisher block requires publisherId' };
          }

          return {
            success: true,
            mapping: {
              action: 'exclude_subzone',
              parameters: {
                campaignId: baseCampaignId,
                publisherId,
              },
            },
          };
        }

        if (platformId === 'propellerads' && operation.zoneId) {
          return {
            success: true,
            mapping: {
              action: 'exclude_zone',
              parameters: {
                campaignId: baseCampaignId,
                zoneId: operation.zoneId,
              },
            },
          };
        }
        // oddbytes 仅支持批量操作（pauseCampaigns），单 campaign 包装为数组
        if (platformId === 'oddbytes') {
          return {
            success: true,
            mapping: {
              action: 'pause_campaigns',
              parameters: { campaignIds: [baseCampaignId] },
            },
          };
        }
        return {
          success: true,
          mapping: {
            action: 'pause_campaign',
            parameters: { campaignId: baseCampaignId },
          },
        };
      }
      case 'UNBLOCK':
      case 'RESUME': {
        if (platformId === 'propellerads' && params.scopeType === 'publisher') {
          const publisherId = this.resolveStringParam(params, ['publisherId', 'publisher_id', 'scopeId']);
          if (!publisherId) {
            return { success: false, message: 'Publisher unblock requires publisherId' };
          }

          return {
            success: true,
            mapping: {
              action: 'include_subzone',
              parameters: {
                campaignId: baseCampaignId,
                publisherId,
              },
            },
          };
        }

        if (platformId === 'propellerads' && operation.zoneId) {
          return {
            success: true,
            mapping: {
              action: 'include_zone',
              parameters: {
                campaignId: baseCampaignId,
                zoneId: operation.zoneId,
              },
            },
          };
        }
        // oddbytes 仅支持批量操作（resumeCampaigns），单 campaign 包装为数组
        if (platformId === 'oddbytes') {
          return {
            success: true,
            mapping: {
              action: 'resume_campaigns',
              parameters: { campaignIds: [baseCampaignId] },
            },
          };
        }
        return {
          success: true,
          mapping: {
            action: 'start_campaign',
            parameters: { campaignId: baseCampaignId },
          },
        };
      }
      case 'ADJUST_BID': {
        let bid = this.resolveNumericParam(params, ['bid', 'newBid', 'targetBid']);
        let previousBid: number | null = null;

        if (bid === null && platformId === 'propellerads') {
          const currentData = await this.manager.executeAction(platformId, 'get_campaign_data', {
            campaignId: baseCampaignId,
          });
          const currentBid = this.extractCurrentBid(currentData.data);
          previousBid = currentBid;

          if (currentBid !== null) {
            const bidMultiplier = this.resolveNumericParam(params, ['bidMultiplier']);
            const bidDeltaPercent = this.resolveNumericParam(params, ['bidDeltaPercent']);
            if (bidMultiplier !== null) {
              bid = Number((currentBid * bidMultiplier).toFixed(5));
            } else if (bidDeltaPercent !== null) {
              bid = Number((currentBid * (1 + bidDeltaPercent / 100)).toFixed(5));
            }
          }
        }

        if (bid === null) {
          return { success: false, message: 'ADJUST_BID requires numeric bid or derivation parameters' };
        }

        // oddbytes 走通用映射：其适配器不支持 adjust_bid（targets 报文未实测），由 adapter 层显式返回 unsupported
          return {
            success: true,
            mapping: {
              action: 'adjust_bid',
              parameters: {
                campaignId: baseCampaignId,
                bid,
                previousBid: previousBid ?? this.resolveNumericParam(params, ['previousBid']),
              },
            },
          };
      }
      case 'BUDGET_REALLOC':
        return { success: false, message: 'BUDGET_REALLOC is not supported by current platform adapters' };
      default:
        return { success: false, message: `Unsupported action type: ${operation.actionType}` };
    }
  }

  private normalizePlatformId(rawPlatform: string): string {
    const normalized = (rawPlatform || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized === 'propeller') return 'propellerads';
    if (normalized === 'clickbankcom') return 'clickbank';
    return normalized;
  }

  private buildPlatformConfig(platformId: string): Record<string, unknown> | null {
    const envMap = this.env as unknown as Record<string, unknown>;

    switch (platformId) {
      case 'propellerads': {
        const apiKey = this.readEnvString(envMap, ['PROPELLERADS_API_KEY', 'PROPELLER_API_KEY']);
        if (!apiKey) return null;

        const apiUrl = this.readEnvString(envMap, ['PROPELLERADS_API_URL']);
        return apiUrl ? { apiKey, apiUrl } : { apiKey };
      }
      case 'oddbytes': {
        // 规范键 ODDBYTES_BASE_URL；兼容旧 ODDBYTES_WSDL_URL（脏值后缀由 adapter 取 origin 清洗）
        const apiKey = this.readEnvString(envMap, ['ODDBYTES_API_KEY']);
        const baseUrl = this.readEnvString(envMap, ['ODDBYTES_BASE_URL', 'ODDBYTES_WSDL_URL']);
        if (!apiKey || !baseUrl) return null;
        return { apiKey, baseUrl };
      }
      case 'clickbank': {
        const apiKey = this.readEnvString(envMap, ['CLICKBANK_API_KEY']);
        const accountNickname = this.readEnvString(envMap, ['CLICKBANK_ACCOUNT_NICKNAME']);
        if (!apiKey || !accountNickname) return null;

        const apiUrl = this.readEnvString(envMap, ['CLICKBANK_API_URL']);
        return apiUrl ? { apiKey, accountNickname, apiUrl } : { apiKey, accountNickname };
      }
      default:
        return null;
    }
  }

  private readEnvString(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    return null;
  }

  private resolveNumericParam(source: Record<string, unknown>, keys: string[]): number | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
      }
      if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
        return Number(value);
      }
    }
    return null;
  }

  private resolveStringParam(source: Record<string, unknown>, keys: string[]): string | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim();
      }
    }
    return null;
  }

  private extractCurrentBid(source: Record<string, unknown> | undefined): number | null {
    if (!source) {
      return null;
    }

    const candidates = [
      source.cpc,
      source.bid,
      (source.campaign as Record<string, unknown> | undefined)?.cpc,
      (source.data as Record<string, unknown> | undefined)?.cpc,
    ];

    for (const candidate of candidates) {
      const numeric = Number(candidate);
      if (Number.isFinite(numeric) && numeric > 0) {
        return numeric;
      }
    }

    return null;
  }

  private stringifyError(error: unknown): string {
    if (error instanceof Error) {
      return error.message;
    }
    return String(error);
  }
}
