/**
 * @fileoverview ClickBank 平台适配器
 * @description 实现 ClickBank API 集成
 * @module services/platform/clickbank
 */

import { PlatformAdapter } from './adapter';
import type { PlatformInfo, PlatformActionResult, ClickBankConfig } from '@/types/platform';

export class ClickBankAdapter extends PlatformAdapter<ClickBankConfig> {
  private initialized = false;
  private baseUrl: string;

  constructor(config: ClickBankConfig) {
    super(config);
    this.baseUrl = config.apiUrl || 'https://api.clickbank.com/rest/v2';
  }

  getInfo(): PlatformInfo {
    return {
      id: 'clickbank',
      name: 'ClickBank',
      type: 'rest',
      version: '1.0.0',
      description: 'ClickBank API integration for affiliate marketing',
      actions: [
        'get_sales',
        'get_commissions',
        'get_product_info',
        'get_affiliate_stats',
        'get_account_balance',
        'create_hoplink',
      ],
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.apiKey || !this.config.accountNickname) {
      throw new Error('Missing required configuration: apiKey and accountNickname');
    }
    this.initialized = true;
  }

  async execute(action: string, parameters: Record<string, unknown>): Promise<PlatformActionResult> {
    if (!this.initialized) {
      return {
        success: false,
        message: 'Platform not initialized',
      };
    }

    switch (action) {
      case 'get_sales':
        return this.getSales(parameters.startDate as string, parameters.endDate as string);
      case 'get_commissions':
        return this.getCommissions(parameters.startDate as string, parameters.endDate as string);
      case 'get_product_info':
        return this.getProductInfo(parameters.productId as string);
      case 'get_affiliate_stats':
        return this.getAffiliateStats(parameters.startDate as string, parameters.endDate as string);
      case 'get_account_balance':
        return this.getAccountBalance();
      case 'create_hoplink':
        return this.createHoplink(
          parameters.vendorId as string,
          parameters.productId as string,
          parameters.hopLinkType as string
        );
      default:
        return {
          success: false,
          message: `Action ${action} not supported`,
        };
    }
  }

  validateConfig(): boolean {
    return !!this.config.apiKey && !!this.config.accountNickname;
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.makeRequest('/accounts/' + this.config.accountNickname, 'GET');
      return response.ok;
    } catch {
      return false;
    }
  }

  private async getSales(startDate: string, endDate: string): Promise<PlatformActionResult> {
    try {
      const response = await this.makeRequest(`/accounts/${this.config.accountNickname}/sales`, 'GET', {
        startDate,
        endDate,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'Sales retrieved successfully',
          data: data as Record<string, unknown>,
        };
      }

      const error = await response.text();
      return {
        success: false,
        message: `Failed to get sales: ${error}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error getting sales: ${error}`,
      };
    }
  }

  private async getCommissions(startDate: string, endDate: string): Promise<PlatformActionResult> {
    try {
      const response = await this.makeRequest(`/accounts/${this.config.accountNickname}/commissions`, 'GET', {
        startDate,
        endDate,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'Commissions retrieved successfully',
          data: data as Record<string, unknown>,
        };
      }

      const error = await response.text();
      return {
        success: false,
        message: `Failed to get commissions: ${error}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error getting commissions: ${error}`,
      };
    }
  }

  private async getProductInfo(productId: string): Promise<PlatformActionResult> {
    try {
      const response = await this.makeRequest(`/products/${productId}`, 'GET');

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'Product info retrieved successfully',
          data: data as Record<string, unknown>,
        };
      }

      const error = await response.text();
      return {
        success: false,
        message: `Failed to get product info: ${error}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error getting product info: ${error}`,
      };
    }
  }

  private async getAffiliateStats(startDate: string, endDate: string): Promise<PlatformActionResult> {
    try {
      const response = await this.makeRequest(`/accounts/${this.config.accountNickname}/stats`, 'GET', {
        startDate,
        endDate,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'Affiliate stats retrieved successfully',
          data: data as Record<string, unknown>,
        };
      }

      const error = await response.text();
      return {
        success: false,
        message: `Failed to get affiliate stats: ${error}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error getting affiliate stats: ${error}`,
      };
    }
  }

  private async getAccountBalance(): Promise<PlatformActionResult> {
    try {
      const response = await this.makeRequest(`/accounts/${this.config.accountNickname}/balance`, 'GET');

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'Account balance retrieved successfully',
          data: data as Record<string, unknown>,
        };
      }

      const error = await response.text();
      return {
        success: false,
        message: `Failed to get account balance: ${error}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error getting account balance: ${error}`,
      };
    }
  }

  private async createHoplink(vendorId: string, productId: string, hopLinkType: string): Promise<PlatformActionResult> {
    try {
      const response = await this.makeRequest('/hoplinks', 'POST', {
        vendor: vendorId,
        product: productId,
        type: hopLinkType || 'standard',
        affiliate: this.config.accountNickname,
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          message: 'Hoplink created successfully',
          data: data as Record<string, unknown>,
        };
      }

      const error = await response.text();
      return {
        success: false,
        message: `Failed to create hoplink: ${error}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error creating hoplink: ${error}`,
      };
    }
  }

  private async makeRequest(
    path: string,
    method: string,
    params?: Record<string, unknown>
  ): Promise<Response> {
    let url = `${this.baseUrl}${path}`;
    
    if (params && method === 'GET') {
      const queryString = new URLSearchParams(params as Record<string, string>).toString();
      url += `?${queryString}`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (params && method !== 'GET') {
      options.body = JSON.stringify(params);
    }

    return fetch(url, options);
  }
}
