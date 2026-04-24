import { describe, expect, it, vi } from 'vitest';
import type { D1Database } from '@/handlers/d1';
import type { Env } from '@/config/env';
import { FIELD_MAX_LENGTH } from '@/config/field-constraints';
import type { CreateCampaignDTO } from '@/types/campaign';
import type { CreateTrafficSourceDTO } from '@/types/trafficSource';
import type { CreateWhitelistDTO } from '@/types/whitelist';
import type { BatchBlacklistDTO, CreateBlacklistDTO } from '@/types/blacklist';
import type { CreateFlowRuleDTO } from '@/types/flow.schema';
import { CampaignService } from '@/services/campaign/campaign.service';
import { TrafficSourceService } from '@/services/trafficSource/trafficSource.service';
import { WhitelistService } from '@/services/whitelist/whitelist.service';
import { BlacklistService } from '@/services/blacklist/blacklist.service';
import { FlowService } from '@/services/flow/flow.service';

function createDb(): D1Database {
  return {
    prepare: vi.fn(() => ({
      bind: vi.fn(() => ({
        first: vi.fn(),
        all: vi.fn(),
        run: vi.fn(),
      })),
    })),
  } as unknown as D1Database;
}

function createEnv(): Env {
  return {
    DB: createDb(),
  } as unknown as Env;
}

describe('service input length guards', () => {
  it('rejects campaign alias longer than configured max length', () => {
    const service = new CampaignService(createEnv());
    const serviceWithPrivate = service as unknown as {
      normalizeCreateInput: (data: CreateCampaignDTO) => CreateCampaignDTO;
    };
    const payload: CreateCampaignDTO = {
      name: 'Campaign Name',
      alias: 'a'.repeat(FIELD_MAX_LENGTH.CAMPAIGN_ALIAS + 1),
      domain: 'example.com',
    };

    expect(() => serviceWithPrivate.normalizeCreateInput(payload)).toThrow(
      `campaign.alias exceeds max length ${FIELD_MAX_LENGTH.CAMPAIGN_ALIAS}`
    );
  });

  it('rejects traffic source parameter alias longer than configured max length', () => {
    const service = new TrafficSourceService(createEnv());
    const serviceWithPrivate = service as unknown as {
      normalizeCreateInput: (data: CreateTrafficSourceDTO) => CreateTrafficSourceDTO;
    };
    const payload: CreateTrafficSourceDTO = {
      name: 'Traffic Source',
      parameters: [
        {
          alias: 'a'.repeat(FIELD_MAX_LENGTH.PARAMETER_ALIAS + 1),
          paramName: 'utm_source',
          macro: '{source}',
        },
      ],
    };

    expect(() => serviceWithPrivate.normalizeCreateInput(payload)).toThrow(
      `trafficSource.parameters[0].alias exceeds max length ${FIELD_MAX_LENGTH.PARAMETER_ALIAS}`
    );
  });

  it('rejects whitelist user_agent value longer than configured max length', () => {
    const service = new WhitelistService(createEnv());
    const serviceWithPrivate = service as unknown as {
      normalizeCreateInput: (data: CreateWhitelistDTO) => CreateWhitelistDTO;
    };
    const payload: CreateWhitelistDTO = {
      trafficSourceId: 'ts1',
      type: 'user_agent',
      value: 'u'.repeat(FIELD_MAX_LENGTH.USER_AGENT_VALUE + 1),
    };

    expect(() => serviceWithPrivate.normalizeCreateInput(payload)).toThrow(
      `whitelist.value exceeds max length ${FIELD_MAX_LENGTH.USER_AGENT_VALUE}`
    );
  });

  it('rejects blacklist batch item value longer than configured max length', () => {
    const service = new BlacklistService(createEnv());
    const serviceWithPrivate = service as unknown as {
      normalizeBatchInput: (data: BatchBlacklistDTO) => BatchBlacklistDTO;
    };
    const payload: BatchBlacklistDTO = {
      trafficSourceId: 'ts1',
      type: 'zone',
      items: [
        {
          value: 'z'.repeat(FIELD_MAX_LENGTH.TRAFFIC_ENTRY_VALUE + 1),
        },
      ],
    };

    expect(() => serviceWithPrivate.normalizeBatchInput(payload)).toThrow(
      `blacklist.items[0].value exceeds max length ${FIELD_MAX_LENGTH.TRAFFIC_ENTRY_VALUE}`
    );
  });

  it('normalizes whitelist country values to uppercase ISO codes', () => {
    const service = new WhitelistService(createEnv());
    const serviceWithPrivate = service as unknown as {
      normalizeCreateInput: (data: CreateWhitelistDTO) => CreateWhitelistDTO;
    };
    const payload: CreateWhitelistDTO = {
      trafficSourceId: 'ts1',
      type: 'country',
      value: 'us',
    };

    expect(serviceWithPrivate.normalizeCreateInput(payload).value).toBe('US');
  });

  it('rejects blacklist country values that are not ISO alpha-2 codes', () => {
    const service = new BlacklistService(createEnv());
    const serviceWithPrivate = service as unknown as {
      validateEntryValue: (
        type: CreateBlacklistDTO['type'],
        value: string,
        ipMatchMode?: string,
        uaMatchMode?: string,
        hasConditionRules?: boolean
      ) => void;
    };

    expect(() => serviceWithPrivate.validateEntryValue('country', 'USA')).toThrow(
      'Invalid country code: USA. Expected ISO 3166-1 alpha-2 like US'
    );
  });

  it('rejects flow rule names longer than configured max length', () => {
    const service = new FlowService(createEnv());
    const serviceWithPrivate = service as unknown as {
      normalizeCreateRuleInput: (data: CreateFlowRuleDTO) => CreateFlowRuleDTO;
    };
    const payload: CreateFlowRuleDTO = {
      flowId: 'f1',
      name: 'r'.repeat(FIELD_MAX_LENGTH.ROUTING_RULE_NAME + 1),
      condition: {
        logic: 'AND',
        filters: [
          {
            target: 'visit.source',
            operator: 'equals',
            value: 'facebook',
          },
        ],
      },
      action: {
        type: 'allow',
      },
    };

    expect(() => serviceWithPrivate.normalizeCreateRuleInput(payload)).toThrow(
      `rule.name exceeds max length ${FIELD_MAX_LENGTH.ROUTING_RULE_NAME}`
    );
  });
});
