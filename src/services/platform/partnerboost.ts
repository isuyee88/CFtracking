import type { Env } from '@/config/env';
import type { PlatformInfo, PlatformActionResult, PartnerBoostConfig } from '@/types/platform';
import { PlatformAdapter } from './adapter';

/** Read-only PartnerBoost adapter approved by the Phase 1 supplement ruling. */
export class PartnerBoostAdapter extends PlatformAdapter<PartnerBoostConfig> {
  private initialized = false;
  private readonly baseUrl: string;

  constructor(config: PartnerBoostConfig, env?: Env) {
    super(config, env);
    this.baseUrl = config.apiUrl || 'https://app.partnerboost.com/api.php';
  }

  getInfo(): PlatformInfo {
    return {
      id: 'partnerboost',
      name: 'PartnerBoost',
      type: 'rest',
      version: '1.0.0',
      description: 'PartnerBoost read-only affiliate network integration',
      actions: ['get_offers', 'get_offer_details', 'get_conversions', 'test_connection'],
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.apiToken) {
      throw new Error('Missing required configuration: apiToken');
    }
    this.initialized = true;
  }

  async execute(action: string, parameters: Record<string, unknown>): Promise<PlatformActionResult> {
    if (!this.initialized) {
      return { success: false, message: 'Platform not initialized' };
    }

    switch (action) {
      case 'get_offers':
        return this.getOffers(parameters);
      case 'get_offer_details':
        return this.getOfferDetails(String(parameters.offerId || ''));
      case 'get_conversions':
        return this.getConversions(parameters);
      case 'test_connection':
        return { success: await this.testConnection(), message: 'Connection test completed' };
      default:
        return { success: false, message: `Action ${action} not supported` };
    }
  }

  validateConfig(): boolean {
    return Boolean(this.config.apiToken);
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest({ mod: 'datafeed', op: 'list', page: 1, limit: 1 });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async getOffers(parameters: Record<string, unknown>): Promise<PlatformActionResult> {
    return this.read('Offers', {
      mod: 'datafeed',
      op: 'list',
      page: this.positiveInteger(parameters.page, 1),
      limit: this.positiveInteger(parameters.limit, 10),
    });
  }

  private async getOfferDetails(offerId: string): Promise<PlatformActionResult> {
    if (!offerId) return { success: false, message: 'offerId is required' };
    return this.read('Offer details', { mod: 'datafeed', op: 'detail', product_id: offerId });
  }

  private async getConversions(parameters: Record<string, unknown>): Promise<PlatformActionResult> {
    const startDate = String(parameters.startDate || '');
    const endDate = String(parameters.endDate || '');
    if (!startDate || !endDate) {
      return { success: false, message: 'startDate and endDate are required' };
    }
    return this.read('Conversions', {
      mod: 'medium',
      op: 'transaction',
      start_date: startDate,
      end_date: endDate,
      page: 1,
      limit: 100,
    });
  }

  private async read(label: string, params: Record<string, string | number>): Promise<PlatformActionResult> {
    try {
      const response = await this.makeRequest(params);
      if (response.ok) {
        const data: unknown = await response.json();
        return { success: true, message: `${label} retrieved`, data: this.asRecord(data) };
      }
      return { success: false, message: `Failed to get ${label.toLowerCase()}: HTTP ${response.status}` };
    } catch (error) {
      return { success: false, message: `Error getting ${label.toLowerCase()}: ${String(error)}` };
    }
  }

  private async makeRequest(params: Record<string, string | number>): Promise<Response> {
    const url = new URL(this.baseUrl);
    url.searchParams.set('token', this.config.apiToken);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
    return fetch(url.toString(), { method: 'GET', headers: { Accept: 'application/json' } });
  }

  private positiveInteger(value: unknown, fallback: number): number {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
  }

  private asRecord(value: unknown): Record<string, unknown> {
    return value !== null && typeof value === 'object' ? value as Record<string, unknown> : { value };
  }
}
