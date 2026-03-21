/**
 * @fileoverview 防作弊服务
 * @description 实现流量质量检测和防作弊功能
 * @module services/antiFraud/antiFraud.service
 */

import type { Env } from '@/config/env';
import type { FraudDetectionResult, TrafficEvent, AntiFraudConfig, TrafficQualityMetrics, FraudRecord, FraudReason } from '@/types/antiFraud';
import { KV } from '@/handlers/kv';
import { nanoid } from 'nanoid';

export class AntiFraudService {
  private kv: KV;
  private config: AntiFraudConfig;

  constructor(env: Env) {
    this.kv = new KV(env);
    this.config = this.getDefaultConfig();
  }

  /**
   * 获取默认防作弊配置
   */
  private getDefaultConfig(): AntiFraudConfig {
    return {
      enabled: true,
      thresholds: {
        suspicious: 2,
        fraudulent: 4
      },
      rules: {
        ipVelocity: {
          enabled: true,
          maxClicksPerMinute: 10,
          maxClicksPerHour: 100
        },
        duplicateCheck: {
          enabled: true,
          windowMinutes: 5
        },
        botDetection: {
          enabled: true,
          userAgentCheck: true,
          behaviorAnalysis: true
        },
        geographic: {
          enabled: false,
          blockedCountries: []
        }
      }
    };
  }

  /**
   * 检测流量事件是否存在欺诈行为
   */
  async detectFraud(event: TrafficEvent): Promise<FraudDetectionResult> {
    const reasons: FraudReason[] = [];
    const details: Record<string, any> = {};
    let score: FraudScore = 0;

    // 检查IP速度
    if (this.config.rules.ipVelocity.enabled) {
      const ipVelocityResult = await this.checkIpVelocity(event.ip, event.timestamp);
      if (ipVelocityResult.fraudulent) {
        reasons.push('ip_abuse');
        details.ipVelocity = ipVelocityResult.details;
        score += 3;
      } else if (ipVelocityResult.suspicious) {
        reasons.push('velocity_check');
        details.ipVelocity = ipVelocityResult.details;
        score += 1;
      }
    }

    // 检查重复点击
    if (this.config.rules.duplicateCheck.enabled) {
      const duplicateResult = await this.checkDuplicate(event);
      if (duplicateResult.fraudulent) {
        reasons.push('duplicate_clicks');
        details.duplicate = duplicateResult.details;
        score += 2;
      }
    }

    // 检查机器人流量
    if (this.config.rules.botDetection.enabled) {
      const botResult = this.checkBot(event);
      if (botResult.fraudulent) {
        reasons.push('bot_traffic');
        details.bot = botResult.details;
        score += 4;
      } else if (botResult.suspicious) {
        reasons.push('bot_traffic');
        details.bot = botResult.details;
        score += 2;
      }
    }

    // 检查地理位置异常
    if (this.config.rules.geographic.enabled) {
      const geoResult = this.checkGeographic(event);
      if (geoResult.fraudulent) {
        reasons.push('geographic_anomaly');
        details.geographic = geoResult.details;
        score += 3;
      }
    }

    // 计算最终状态
    const status = this.calculateStatus(score);

    // 记录欺诈检测结果
    await this.recordFraudResult(event, { score, status, reasons, details });

    return { score, status, reasons, details };
  }

  /**
   * 检查IP速度
   */
  private async checkIpVelocity(ip: string, timestamp: string): Promise<{ fraudulent: boolean; suspicious: boolean; details: any }> {
    const now = new Date(timestamp).getTime();
    const minuteWindow = now - 60 * 1000;
    const hourWindow = now - 60 * 60 * 1000;

    // 获取IP最近的点击记录
    const key = `ip:${ip}:clicks`;
    const existingClicks = await this.kv.get<Array<{ timestamp: number }>>(key) || [];

    // 过滤时间窗口内的点击
    const recentMinuteClicks = existingClicks.filter(c => c.timestamp >= minuteWindow);
    const recentHourClicks = existingClicks.filter(c => c.timestamp >= hourWindow);

    // 检查是否超过阈值
    const fraudulent = 
      recentMinuteClicks.length >= this.config.rules.ipVelocity.maxClicksPerMinute ||
      recentHourClicks.length >= this.config.rules.ipVelocity.maxClicksPerHour;

    const suspicious = 
      recentMinuteClicks.length >= this.config.rules.ipVelocity.maxClicksPerMinute * 0.5 ||
      recentHourClicks.length >= this.config.rules.ipVelocity.maxClicksPerHour * 0.5;

    // 更新IP点击记录
    const updatedClicks = [...existingClicks.filter(c => c.timestamp >= hourWindow), { timestamp: now }];
    await this.kv.set(key, updatedClicks, 60 * 60); // 1 hour TTL

    return {
      fraudulent,
      suspicious,
      details: {
        minuteClicks: recentMinuteClicks.length,
        hourClicks: recentHourClicks.length,
        maxMinuteClicks: this.config.rules.ipVelocity.maxClicksPerMinute,
        maxHourClicks: this.config.rules.ipVelocity.maxClicksPerHour
      }
    };
  }

  /**
   * 检查重复点击
   */
  private async checkDuplicate(event: TrafficEvent): Promise<{ fraudulent: boolean; details: any }> {
    const now = new Date(event.timestamp).getTime();
    const windowStart = now - this.config.rules.duplicateCheck.windowMinutes * 60 * 1000;

    // 生成事件哈希
    const eventHash = this.generateEventHash(event);
    const key = `event:${eventHash}`;

    // 检查是否存在相同事件
    const existingEvent = await this.kv.get<{ timestamp: number }>(key);

    if (existingEvent && existingEvent.timestamp >= windowStart) {
      return {
        fraudulent: true,
        details: {
          previousTimestamp: existingEvent.timestamp,
          currentTimestamp: now,
          windowMinutes: this.config.rules.duplicateCheck.windowMinutes
        }
      };
    }

    // 记录事件
    await this.kv.set(key, { timestamp: now }, this.config.rules.duplicateCheck.windowMinutes * 60);

    return { fraudulent: false, details: {} };
  }

  /**
   * 检查机器人流量
   */
  private checkBot(event: TrafficEvent): { fraudulent: boolean; suspicious: boolean; details: any } {
    const details: any = {};
    let fraudulent = false;
    let suspicious = false;

    // 检查用户代理
    if (this.config.rules.botDetection.userAgentCheck) {
      const userAgent = event.userAgent.toLowerCase();
      const botPatterns = [
        'bot', 'crawler', 'spider', 'robot', 'slurp', 'crawling',
        'axios', 'curl', 'wget', 'python-requests', 'http-client'
      ];

      const isBot = botPatterns.some(pattern => userAgent.includes(pattern));
      if (isBot) {
        fraudulent = true;
        details.userAgent = event.userAgent;
        details.matchedPatterns = botPatterns.filter(pattern => userAgent.includes(pattern));
      }
    }

    // 检查行为分析
    if (this.config.rules.botDetection.behaviorAnalysis) {
      // 这里可以添加更复杂的行为分析逻辑
      // 例如：检查鼠标移动、点击模式等
      // 简化版：检查屏幕分辨率是否异常
      if (event.screenResolution && (event.screenResolution.includes('0x0') || event.screenResolution.includes('1x1'))) {
        suspicious = true;
        details.screenResolution = event.screenResolution;
      }
    }

    return { fraudulent, suspicious, details };
  }

  /**
   * 检查地理位置异常
   */
  private checkGeographic(event: TrafficEvent): { fraudulent: boolean; details: any } {
    if (!event.country) {
      return { fraudulent: false, details: {} };
    }

    const isBlocked = this.config.rules.geographic.blockedCountries.includes(event.country);
    return {
      fraudulent: isBlocked,
      details: {
        country: event.country,
        blockedCountries: this.config.rules.geographic.blockedCountries
      }
    };
  }

  /**
   * 生成事件哈希
   */
  private generateEventHash(event: TrafficEvent): string {
    const { ip, userAgent, eventType, url, campaignId } = event;
    return `${campaignId}:${eventType}:${ip}:${userAgent.substring(0, 100)}:${url.substring(0, 100)}`;
  }

  /**
   * 计算欺诈状态
   */
  private calculateStatus(score: number): FraudStatus {
    if (score >= this.config.thresholds.fraudulent) {
      return 'fraudulent';
    } else if (score >= this.config.thresholds.suspicious) {
      return 'suspicious';
    } else {
      return 'clean';
    }
  }

  /**
   * 记录欺诈检测结果
   */
  private async recordFraudResult(event: TrafficEvent, result: FraudDetectionResult): Promise<void> {
    const fraudRecord: FraudRecord = {
      id: nanoid(),
      trafficEventId: event.id,
      campaignId: event.campaignId,
      score: result.score,
      status: result.status,
      reasons: result.reasons,
      ip: event.ip,
      userAgent: event.userAgent,
      timestamp: event.timestamp,
      details: result.details
    };

    // 记录到KV
    const key = `fraud:${fraudRecord.id}`;
    await this.kv.set(key, fraudRecord, 24 * 60 * 60); // 24 hours TTL

    // 记录到按IP索引
    const ipKey = `fraud:ip:${event.ip}`;
    const existingRecords = await this.kv.get<string[]>(ipKey) || [];
    const updatedRecords = [...existingRecords.filter(id => id !== fraudRecord.id), fraudRecord.id].slice(-100); // 保留最近100条
    await this.kv.set(ipKey, updatedRecords, 24 * 60 * 60);
  }

  /**
   * 获取流量质量指标
   */
  async getTrafficQualityMetrics(campaignId: string, startDate: string, endDate: string): Promise<TrafficQualityMetrics> {
    // 这里可以从KV或数据库中获取流量质量数据
    // 简化版：返回模拟数据
    return {
      totalTraffic: 1000,
      cleanTraffic: 850,
      suspiciousTraffic: 100,
      fraudulentTraffic: 50,
      cleanPercentage: 85,
      suspiciousPercentage: 10,
      fraudulentPercentage: 5,
      topFraudReasons: [
        { reason: 'bot_traffic', count: 20 },
        { reason: 'ip_abuse', count: 15 },
        { reason: 'duplicate_clicks', count: 10 },
        { reason: 'velocity_check', count: 5 }
      ]
    };
  }

  /**
   * 获取欺诈记录
   */
  async getFraudRecords(campaignId: string, limit = 50): Promise<FraudRecord[]> {
    // 这里可以从KV或数据库中获取欺诈记录
    // 简化版：返回空数组
    return [];
  }

  /**
   * 更新防作弊配置
   */
  async updateConfig(config: Partial<AntiFraudConfig>): Promise<AntiFraudConfig> {
    this.config = {
      ...this.config,
      ...config,
      rules: {
        ...this.config.rules,
        ...(config.rules || {})
      }
    };

    // 保存配置到KV
    await this.kv.set('antiFraud:config', this.config, 365 * 24 * 60 * 60);

    return this.config;
  }

  /**
   * 获取防作弊配置
   */
  async getConfig(): Promise<AntiFraudConfig> {
    // 从KV中获取配置
    const storedConfig = await this.kv.get<AntiFraudConfig>('antiFraud:config');
    if (storedConfig) {
      this.config = storedConfig;
    }

    return this.config;
  }
}

export function createAntiFraudService(env: Env): AntiFraudService {
  return new AntiFraudService(env);
}
