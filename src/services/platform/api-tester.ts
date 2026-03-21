/**
 * @fileoverview Traffic Source API 连接测试器
 * @description 支持多个广告平台的 API 连接验证
 * @module services/platform/api-tester
 */

export interface ApiTestResult {
  success: boolean;
  message: string;
  details?: {
    accountName?: string;
    accountId?: string;
    balance?: number;
    currency?: string;
    [key: string]: any;
  };
}

export interface ApiTestConfig {
  baseUrl: string;
  apiKey: string;
  apiSecret?: string;
  platformType?: string;
}

// API Response types
interface PropellerAdsResponse {
  name?: string;
  email?: string;
  id?: string;
  balance?: number;
  currency?: string;
}

interface TaboolaResponse {
  name?: string;
  email?: string;
  id?: string;
}

interface FacebookResponse {
  id?: string;
  name?: string;
  error?: {
    message?: string;
  };
}

interface RevcontentResponse {
  name?: string;
  email?: string;
  id?: string;
}

interface OutbrainResponse {
  marketers?: Array<{
    name?: string;
    id?: string;
  }>;
}

interface RumbleResponse {
  name?: string;
  email?: string;
  id?: string;
}

interface OddBytesResponse {
  accountName?: string;
  username?: string;
  accountId?: string;
}

/**
 * 平台 API 测试器接口
 */
export interface PlatformApiTester {
  testConnection(config: ApiTestConfig): Promise<ApiTestResult>;
}

/**
 * 通用 HTTP API 测试器
 */
export class GenericApiTester implements PlatformApiTester {
  async testConnection(config: ApiTestConfig): Promise<ApiTestResult> {
    try {
      const response = await fetch(config.baseUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        return {
          success: true,
          message: 'Connection successful',
        };
      } else {
        return {
          success: false,
          message: `Connection failed: HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

/**
 * PropellerAds API 测试器
 */
export class PropellerAdsTester implements PlatformApiTester {
  async testConnection(config: ApiTestConfig): Promise<ApiTestResult> {
    try {
      // PropellerAds API endpoint for user info
      const url = `${config.baseUrl}/user`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as PropellerAdsResponse;
        return {
          success: true,
          message: 'PropellerAds API connection successful',
          details: {
            accountName: data.name || data.email,
            accountId: data.id,
            balance: data.balance,
            currency: data.currency,
          },
        };
      } else if (response.status === 401) {
        return {
          success: false,
          message: 'Invalid API key. Please check your credentials.',
        };
      } else {
        return {
          success: false,
          message: `Connection failed: HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

/**
 * Taboola API 测试器
 */
export class TaboolaTester implements PlatformApiTester {
  async testConnection(config: ApiTestConfig): Promise<ApiTestResult> {
    try {
      // Taboola API endpoint for current user
      const url = `${config.baseUrl}/users/current`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as TaboolaResponse;
        return {
          success: true,
          message: 'Taboola API connection successful',
          details: {
            accountName: data.name || data.email,
            accountId: data.id,
          },
        };
      } else if (response.status === 401) {
        return {
          success: false,
          message: 'Invalid API key or token expired.',
        };
      } else {
        return {
          success: false,
          message: `Connection failed: HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

/**
 * Facebook Marketing API 测试器
 */
export class FacebookTester implements PlatformApiTester {
  async testConnection(config: ApiTestConfig): Promise<ApiTestResult> {
    try {
      // Facebook Graph API endpoint for me
      const url = `https://graph.facebook.com/v18.0/me?access_token=${config.apiKey}`;
      
      const response = await fetch(url);
      const data = await response.json() as FacebookResponse;

      if (response.ok && data.id) {
        return {
          success: true,
          message: 'Facebook API connection successful',
          details: {
            accountName: data.name,
            accountId: data.id,
          },
        };
      } else if (data.error) {
        return {
          success: false,
          message: `Facebook API error: ${data.error.message}`,
        };
      } else {
        return {
          success: false,
          message: 'Connection failed',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

/**
 * Revcontent API 测试器
 */
export class RevcontentTester implements PlatformApiTester {
  async testConnection(config: ApiTestConfig): Promise<ApiTestResult> {
    try {
      // Revcontent API endpoint for user info
      const url = `${config.baseUrl}/api/user`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as RevcontentResponse;
        return {
          success: true,
          message: 'Revcontent API connection successful',
          details: {
            accountName: data.name || data.email,
            accountId: data.id,
          },
        };
      } else if (response.status === 401) {
        return {
          success: false,
          message: 'Invalid API key. Please check your credentials.',
        };
      } else {
        return {
          success: false,
          message: `Connection failed: HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

/**
 * Outbrain API 测试器
 */
export class OutbrainTester implements PlatformApiTester {
  async testConnection(config: ApiTestConfig): Promise<ApiTestResult> {
    try {
      // Outbrain API endpoint for marketers
      const url = `${config.baseUrl}/marketers`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'OB-TOKEN-V1': config.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as OutbrainResponse;
        const marketer = data.marketers?.[0];
        return {
          success: true,
          message: 'Outbrain API connection successful',
          details: {
            accountName: marketer?.name,
            accountId: marketer?.id,
          },
        };
      } else if (response.status === 401) {
        return {
          success: false,
          message: 'Invalid API token. Please check your credentials.',
        };
      } else {
        return {
          success: false,
          message: `Connection failed: HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

/**
 * Rumble API 测试器
 */
export class RumbleTester implements PlatformApiTester {
  async testConnection(config: ApiTestConfig): Promise<ApiTestResult> {
    try {
      // Rumble Ads API endpoint
      const url = `${config.baseUrl}/api/v1/account`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${config.apiKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as RumbleResponse;
        return {
          success: true,
          message: 'Rumble API connection successful',
          details: {
            accountName: data.name || data.email,
            accountId: data.id,
          },
        };
      } else if (response.status === 401) {
        return {
          success: false,
          message: 'Invalid API key. Please check your credentials.',
        };
      } else {
        return {
          success: false,
          message: `Connection failed: HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

/**
 * OddBytes API 测试器
 */
export class OddBytesTester implements PlatformApiTester {
  async testConnection(config: ApiTestConfig): Promise<ApiTestResult> {
    try {
      // OddBytes REST API v1 endpoint for authentication test
      const url = `${config.baseUrl}/rest/v1/system/status`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Api-Key': config.apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json() as OddBytesResponse;
        return {
          success: true,
          message: 'OddBytes API connection successful',
          details: {
            accountName: data.accountName || data.username,
            accountId: data.accountId,
          },
        };
      } else if (response.status === 401) {
        return {
          success: false,
          message: 'Invalid API key. Please check your credentials.',
        };
      } else {
        return {
          success: false,
          message: `Connection failed: HTTP ${response.status}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: `Connection error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }
}

/**
 * API 测试器工厂
 */
export class ApiTesterFactory {
  private static testers: Map<string, PlatformApiTester> = new Map([
    ['propellerads', new PropellerAdsTester()],
    ['taboola', new TaboolaTester()],
    ['facebook', new FacebookTester()],
    ['revcontent', new RevcontentTester()],
    ['outbrain', new OutbrainTester()],
    ['rumble', new RumbleTester()],
    ['oddbytes', new OddBytesTester()],
  ]);

  static getTester(platformType?: string): PlatformApiTester {
    if (platformType) {
      const normalizedType = platformType.toLowerCase().replace(/[^a-z]/g, '');
      const tester = this.testers.get(normalizedType);
      if (tester) {
        return tester;
      }
    }
    return new GenericApiTester();
  }

  static registerTester(platformType: string, tester: PlatformApiTester): void {
    this.testers.set(platformType.toLowerCase(), tester);
  }
}

/**
 * 测试 API 连接
 */
export async function testApiConnection(
  config: ApiTestConfig
): Promise<ApiTestResult> {
  const tester = ApiTesterFactory.getTester(config.platformType);
  return tester.testConnection(config);
}
