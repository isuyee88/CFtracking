/**
 * @fileoverview OddBytes 平台适配器
 * @description 实现 OddBytes SOAP API 集成
 * @module services/platform/oddbytes
 */

import { PlatformAdapter } from './adapter';
import type { PlatformInfo, PlatformActionResult, OddBytesConfig } from '@/types/platform';

export class OddBytesAdapter extends PlatformAdapter<OddBytesConfig> {
  private initialized = false;

  constructor(config: OddBytesConfig) {
    super(config);
  }

  getInfo(): PlatformInfo {
    return {
      id: 'oddbytes',
      name: 'OddBytes',
      type: 'soap',
      version: '1.0.0',
      description: 'OddBytes SOAP API integration for traffic management',
      actions: [
        'pause_campaign',
        'start_campaign',
        'adjust_bid',
        'get_campaign_data',
        'get_campaign_stats',
      ],
    };
  }

  async initialize(): Promise<void> {
    if (!this.config.wsdlUrl || !this.config.apiKey) {
      throw new Error('Missing required configuration: wsdlUrl and apiKey');
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
      case 'pause_campaign':
        return this.pauseCampaign(parameters.campaignId as string);
      case 'start_campaign':
        return this.startCampaign(parameters.campaignId as string);
      case 'adjust_bid':
        return this.adjustBid(
          parameters.campaignId as string,
          parameters.keywordId as string,
          parameters.bid as number
        );
      case 'get_campaign_data':
        return this.getCampaignData(parameters.campaignId as string);
      case 'get_campaign_stats':
        return this.getCampaignStats(parameters.campaignId as string);
      default:
        return {
          success: false,
          message: `Action ${action} not supported`,
        };
    }
  }

  validateConfig(): boolean {
    return !!(this.config.wsdlUrl && this.config.apiKey);
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(this.config.wsdlUrl!, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  private async pauseCampaign(campaignId: string): Promise<PlatformActionResult> {
    try {
      const soapEnvelope = this.buildSoapEnvelope('UpdateCampaign', {
        CampaignId: campaignId,
        Status: 'paused',
      });

      const response = await this.sendSoapRequest(soapEnvelope);
      const result = this.parseSoapResponse(response);

      return {
        success: result.success,
        message: result.success
          ? `Campaign ${campaignId} paused successfully`
          : `Failed to pause campaign: ${result.error}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error pausing campaign: ${error}`,
      };
    }
  }

  private async startCampaign(campaignId: string): Promise<PlatformActionResult> {
    try {
      const soapEnvelope = this.buildSoapEnvelope('UpdateCampaign', {
        CampaignId: campaignId,
        Status: 'active',
      });

      const response = await this.sendSoapRequest(soapEnvelope);
      const result = this.parseSoapResponse(response);

      return {
        success: result.success,
        message: result.success
          ? `Campaign ${campaignId} started successfully`
          : `Failed to start campaign: ${result.error}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error starting campaign: ${error}`,
      };
    }
  }

  private async adjustBid(
    campaignId: string,
    keywordId: string,
    bid: number
  ): Promise<PlatformActionResult> {
    try {
      const soapEnvelope = this.buildSoapEnvelope('UpdateKeywordBid', {
        CampaignId: campaignId,
        KeywordId: keywordId,
        Bid: bid,
      });

      const response = await this.sendSoapRequest(soapEnvelope);
      const result = this.parseSoapResponse(response);

      return {
        success: result.success,
        message: result.success
          ? `Bid adjusted to ${bid} for keyword ${keywordId}`
          : `Failed to adjust bid: ${result.error}`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error adjusting bid: ${error}`,
      };
    }
  }

  private async getCampaignData(campaignId: string): Promise<PlatformActionResult> {
    try {
      const soapEnvelope = this.buildSoapEnvelope('GetCampaign', {
        CampaignId: campaignId,
      });

      const response = await this.sendSoapRequest(soapEnvelope);
      const result = this.parseSoapResponse(response);

      return {
        success: result.success,
        message: 'Campaign data retrieved',
        data: result.data as Record<string, unknown>,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error getting campaign data: ${error}`,
      };
    }
  }

  private async getCampaignStats(campaignId: string): Promise<PlatformActionResult> {
    try {
      const soapEnvelope = this.buildSoapEnvelope('GetCampaignStats', {
        CampaignId: campaignId,
      });

      const response = await this.sendSoapRequest(soapEnvelope);
      const result = this.parseSoapResponse(response);

      return {
        success: result.success,
        message: 'Campaign stats retrieved',
        data: result.data as Record<string, unknown>,
      };
    } catch (error) {
      return {
        success: false,
        message: `Error getting campaign stats: ${error}`,
      };
    }
  }

  private buildSoapEnvelope(action: string, params: Record<string, unknown>): string {
    const paramsXml = Object.entries(params)
      .map(([key, value]) => `<${key}>${value}</${key}>`)
      .join('');

    return `<?xml version="1.0" encoding="utf-8"?>
      <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
        xmlns:odd="https://api.oddbytes.com/soap">
        <soap:Header>
          <odd:Authentication>
            <odd:ApiKey>${this.config.apiKey}</odd:ApiKey>
          </odd:Authentication>
        </soap:Header>
        <soap:Body>
          <odd:${action}>
            ${paramsXml}
          </odd:${action}>
        </soap:Body>
      </soap:Envelope>`;
  }

  private async sendSoapRequest(envelope: string): Promise<string> {
    const response = await fetch(this.config.wsdlUrl!, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        'SOAPAction': '',
      },
      body: envelope,
    });

    return response.text();
  }

  private parseSoapResponse(response: string): { success: boolean; error?: string; data?: unknown } {
    if (response.includes('<success>true</success>') || response.includes('<Status>Success</Status>')) {
      return { success: true };
    }

    const errorMatch = response.match(/<Error>(.*?)<\/Error>/);
    if (errorMatch) {
      return { success: false, error: errorMatch[1] };
    }

    return { success: false, error: 'Unknown response format' };
  }
}
