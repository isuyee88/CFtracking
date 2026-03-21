/**
 * @fileoverview 点击追踪服务
 * @description 处理点击追踪的业务逻辑，集成去重、Flow 过滤和 Action 执行
 * @module services/tracking/click.service
 * 
 * 输入: 点击请求（包含 campaign、IP、UA 等）
 * 输出: 点击结果（包含重定向 URL、去重状态、Flow 信息）
 * 逻辑交互: 
 *   - 调用 UniquenessService 进行去重检查
 *   - 调用 FilterService 进行 Flow 过滤
 *   - 调用 FlowRepository 获取 Flow 配置
 *   - 调用 CampaignRepository 获取 Campaign 配置
 *   - 调用 OfferRepository 获取 Offer 配置
 *   - 调用 LandingPageRepository 获取 Landing Page 配置
 * 前后端交互: 通过 tracking.routes.ts 处理 HTTP 请求
 */

import { AnalyticsService } from '@/handlers/analytics';
import { FlowRepository } from '@/handlers/d1/flow.repo';
import { CampaignRepository } from '@/handlers/d1/campaign.repo';
import { OfferRepository } from '@/handlers/d1/offer.repo';
import { LandingPageRepository } from '@/handlers/d1/landingPage.repo';
import { getD1Connection, getAnalyticsClient } from '@/handlers/d1';
import { DOService } from '@/handlers/do';
import { UniquenessService, type UniquenessMethod } from './uniqueness.service';
import { FilterService } from './filter.service';

import type { Env } from '@/config/env';
import type { ClickData } from '@/types/tracking';
import type { Flow } from '@/types/flow';
import type { Offer } from '@/types/offer';
import type { LandingPage } from '@/types/landingPage';
import { generateClickId, generateVisitorId } from '@/utils/crypto';
import type { CloudflareRequestInfo } from '@/utils/cloudflare';

export interface RiskAssessment {
  isBot: boolean;
  isSuspicious: boolean;
  riskScore: number;
  reasons: string[];
}

export interface ClickRequest {
  campaignId: string;
  ip: string;
  userAgent: string;
  referer?: string;
  country?: string;
  city?: string;
  region?: string;
  device?: string;
  browser?: string;
  os?: string;
  subId1?: string;
  subId2?: string;
  subId3?: string;
  subId4?: string;
  subId5?: string;
  cost?: number;
  /** 去重方法 */
  uniquenessMethod?: UniquenessMethod;
  /** 参数去重时的参数名 */
  uniquenessParameter?: string;
  /** 去重有效期（秒） */
  uniquenessTTL?: number;
  /** Cookie 中的 visitorId */
  existingVisitorId?: string;
  /** URL 参数 */
  urlParams?: URLSearchParams;
  /** Cloudflare 请求信息 */
  cfInfo?: CloudflareRequestInfo;
  /** 访客指纹 */
  fingerprint?: string;
  /** 风险评估 */
  riskAssessment?: RiskAssessment;
}

export interface ClickResult {
  clickId: string;
  visitorId: string;
  redirectUrl: string;
  flowId: string | null;
  landingPageId: string | null;
  offerId: string | null;
  /** 是否唯一（首次访问） */
  isUnique: boolean;
  /** 去重方法 */
  uniquenessMethod: UniquenessMethod;
  /** 是否需要设置 Cookie */
  shouldSetCookie: boolean;
  /** 已存在的 clickId（如果重复） */
  existingClickId: string | null;
  /** 流量损失标记 */
  isTrafficLoss: boolean;
  /** 执行的操作类型 */
  actionType: 'redirect' | 'show_offer' | 'traffic_loss';
}

/**
 * Action 配置类型
 */
export interface ActionConfig {
  type: 'redirect' | 'show_offer' | 'traffic_loss';
  url?: string;
  offerId?: string;
  landingPageId?: string;
}

export class ClickService {
  private analytics: AnalyticsService;
  private flowRepo: FlowRepository;
  private campaignRepo: CampaignRepository;
  private offerRepo: OfferRepository;
  private lpRepo: LandingPageRepository;
  private doService: DOService;
  private uniquenessService: UniquenessService;
  private filterService: FilterService;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.analytics = new AnalyticsService(getAnalyticsClient(env));
    this.flowRepo = new FlowRepository(db);
    this.campaignRepo = new CampaignRepository(db);
    this.offerRepo = new OfferRepository(db);
    this.lpRepo = new LandingPageRepository(db);
    this.doService = new DOService(env);
    this.uniquenessService = new UniquenessService(env);
    this.filterService = new FilterService();
  }

  /**
   * 处理点击请求
   * 核心流程：
   * 1. 获取 Campaign 配置
   * 2. 执行去重检查
   * 3. 选择 Flow
   * 4. 执行 Filters
   * 5. 选择 Landing Page 和 Offer
   * 6. 执行 Action
   * 7. 记录分析数据
   */
  async handleClick(request: ClickRequest): Promise<ClickResult> {
    try {
      const clickId = generateClickId();
      const visitorId = request.existingVisitorId || generateVisitorId();

      // 1. 获取 Campaign 配置（支持 alias 或 id）
      const campaign = await this.resolveCampaign(request.campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }

      // 获取请求的完整URL，用于构建重定向URL
      let baseUrl = 'http://localhost';
      try {
        console.log('Request URL Params:', request.urlParams);
        const originalUrl = request.urlParams ? request.urlParams.get('__originalUrl') : null;
        console.log('Original URL:', originalUrl);
        
        // 确保 originalUrl 是有效的
        if (originalUrl && typeof originalUrl === 'string') {
          const requestUrl = new URL(originalUrl);
          baseUrl = campaign.domain || requestUrl.origin;
        } else {
          // 如果没有原始URL，使用默认值
          baseUrl = campaign.domain || 'http://localhost';
        }
        console.log('Base URL:', baseUrl);
      } catch (err) {
        console.error('URL creation error:', err);
        // Fallback to localhost if URL creation fails
        baseUrl = campaign.domain || 'http://localhost';
      }

      // 2. 执行去重检查
      const uniquenessResult = await this.checkUniqueness(request, clickId, campaign);

      // 3. 获取活跃的 Flows
      const flows = await this.flowRepo.findByCampaignIdAndStatus(campaign.id, 'active');
      console.log('Found flows:', flows.length);
      
      // 4. 执行 Flow Filters 选择合适的 Flow
      const selectedFlow = await this.selectFlow(flows, request);
      console.log('Selected flow:', selectedFlow?.id || 'No flow selected');

      // 5. 准备 Action 执行
      let actionConfig: ActionConfig;
      let selectedLP: LandingPage | null = null;
      let selectedOffer: Offer | null = null;

      if (selectedFlow) {
        // 获取 Landing Page 和 Offer
        const [lpAssociations, offerAssociations] = await Promise.all([
          this.flowRepo.getLandingPages(selectedFlow.id),
          this.flowRepo.getOffers(selectedFlow.id),
        ]);

        // 选择 Landing Page
        if (lpAssociations.length > 0) {
          const lpAssoc = this.selectByWeight(lpAssociations);
          selectedLP = await this.lpRepo.findById(lpAssoc.landingPageId);
          console.log('Selected landing page:', selectedLP?.id || 'No landing page');
        }

        // 选择 Offer
        if (offerAssociations.length > 0) {
          const offerAssoc = this.selectByWeight(offerAssociations);
          selectedOffer = await this.offerRepo.findById(offerAssoc.offerId);
          console.log('Selected offer:', selectedOffer?.id || 'No offer');
        }

        // 构建 Action 配置
        actionConfig = this.buildActionConfig(selectedFlow, selectedLP, selectedOffer);
      } else {
        // 没有匹配的 Flow，执行流量损失
        actionConfig = { type: 'traffic_loss' };
      }

      console.log('Action config:', actionConfig);

      // 6. 执行 Action 获取重定向 URL
      const redirectUrl = await this.executeAction(actionConfig, clickId, visitorId, request, baseUrl);
      console.log('Redirect URL:', redirectUrl);

      // 7. 记录点击数据（包含 Cloudflare 信息）
      const cfInfo = request.cfInfo;
      const bm = cfInfo?.botManagement;
      const tlsAuth = cfInfo?.tlsClientAuth;
      
      const clickData: ClickData = {
        clickId,
        campaignId: campaign.id,
        flowId: selectedFlow?.id || null,
        landingPageId: selectedLP?.id || null,
        offerId: selectedOffer?.id || null,
        timestamp: new Date().toISOString(),
        ip: request.ip,
        userAgent: request.userAgent,
        referer: request.referer || null,
        country: request.country || null,
        city: request.city || null,
        region: request.region || null,
        device: request.device || null,
        browser: request.browser || null,
        os: request.os || null,
        isp: cfInfo?.asOrganization || null,
        connectionType: null,
        visitorId,
        subId1: request.subId1 || null,
        subId2: request.subId2 || null,
        subId3: request.subId3 || null,
        subId4: request.subId4 || null,
        subId5: request.subId5 || null,
        cost: request.cost || 0,
        // Cloudflare 特定信息
        cfRayId: cfInfo?.rayId,
        cfConnectingIP: cfInfo?.connectingIP,
        cfIPCountry: cfInfo?.ipCountry,
        cfIsEUCountry: cfInfo?.isEUCountry,
        cfASN: cfInfo?.asn,
        cfASOrganization: cfInfo?.asOrganization,
        cfColo: cfInfo?.colo,
        cfLatitude: cfInfo?.latitude,
        cfLongitude: cfInfo?.longitude,
        cfPostalCode: cfInfo?.postalCode,
        cfMetroCode: cfInfo?.metroCode,
        cfTimezone: cfInfo?.timezone,
        cfContinent: cfInfo?.continent,
        cfHTTPProtocol: cfInfo?.httpProtocol,
        cfTLSVersion: cfInfo?.tlsVersion,
        cfTLSCipher: cfInfo?.tlsCipher,
        cfTLSClientRandom: cfInfo?.tlsClientRandom,
        cfTLSClientHelloLength: cfInfo?.tlsClientHelloLength,
        cfTLSClientCiphersSha1: cfInfo?.tlsClientCiphersSha1,
        cfTLSClientExtensionsSha1: cfInfo?.tlsClientExtensionsSha1,
        // Bot Management
        cfBotScore: bm?.score ?? null,
        cfBotVerified: bm?.verifiedBot ?? false,
        cfBotStaticResource: bm?.staticResource ?? false,
        cfBotJA3Hash: bm?.ja3Hash ?? null,
        cfBotJA4: bm?.ja4 ?? null,
        cfBotDetectionIds: bm?.detectionIds ?? [],
        cfBotJSDetectionPassed: bm?.jsDetectionPassed ?? null,
        // TLS Client Auth
        cfTLSClientAuthCertVerified: tlsAuth?.certVerified ?? false,
        cfTLSClientAuthCertFingerprintSHA1: tlsAuth?.certFingerprintSHA1 ?? null,
        cfTLSClientAuthCertFingerprintSHA256: tlsAuth?.certFingerprintSHA256 ?? null,
        cfTLSClientAuthCertIssuerDN: tlsAuth?.certIssuerDN ?? null,
        cfTLSClientAuthCertSubjectDN: tlsAuth?.certSubjectDN ?? null,
        cfTLSClientAuthCertSerial: tlsAuth?.certSerial ?? null,
        cfTLSClientAuthCertNotBefore: tlsAuth?.certNotBefore ?? null,
        cfTLSClientAuthCertNotAfter: tlsAuth?.certNotAfter ?? null,
        cfTLSClientAuthCertRevoked: tlsAuth?.certRevoked ?? null,
        cfTLSClientAuthCertPresented: tlsAuth?.certPresented ?? null,
        // 指纹和风险评估
        fingerprint: request.fingerprint ?? null,
        riskScore: request.riskAssessment?.riskScore ?? 0,
        isBot: request.riskAssessment?.isBot ?? false,
        isSuspicious: request.riskAssessment?.isSuspicious ?? false,
        riskReasons: request.riskAssessment?.reasons ?? [],
      };

      // 异步记录分析数据到 Analytics Engine
      console.log('[ClickService] About to track click to Analytics Engine:', {
        clickId,
        campaignId: campaign.id,
        flowId: selectedFlow?.id,
        timestamp: new Date().toISOString()
      });
      try {
        this.analytics.trackClick(clickData);
        console.log('[ClickService] trackClick called successfully');
      } catch (err) {
        console.error('[ClickService] Failed to track click to Analytics Engine:', err);
      }

      // D1 数据库只用于统计汇总，不存储原始点击数据

      // 更新计数器
      await this.doService.incrementCounter(`campaign:${campaign.id}:today`, {
        clicks: 1,
        spend: request.cost || 0,
      });

      // 如果不是唯一点击，更新重复点击计数（使用 clicks 字段）
      if (!uniquenessResult.isUnique) {
        await this.doService.incrementCounter(`campaign:${campaign.id}:duplicates`, {
          clicks: 1,
        });
      }

      return {
        clickId,
        visitorId,
        redirectUrl,
        flowId: selectedFlow?.id || null,
        landingPageId: selectedLP?.id || null,
        offerId: selectedOffer?.id || null,
        isUnique: uniquenessResult.isUnique,
        uniquenessMethod: uniquenessResult.method,
        shouldSetCookie: uniquenessResult.shouldSetCookie,
        existingClickId: uniquenessResult.existingClickId,
        isTrafficLoss: actionConfig.type === 'traffic_loss',
        actionType: actionConfig.type,
      };
    } catch (err) {
      console.error('Handle click error:', err);
      throw err;
    }
  }

  /**
   * 解析 Campaign（支持 alias 或 id）
   */
  private async resolveCampaign(campaignIdOrAlias: string) {
    // 先尝试按 ID 查找
    let campaign = await this.campaignRepo.findById(campaignIdOrAlias);
    
    // 如果未找到，尝试按 alias 查找
    if (!campaign) {
      campaign = await this.campaignRepo.findByAlias(campaignIdOrAlias);
    }

    return campaign;
  }

  /**
   * 执行去重检查
   */
  private async checkUniqueness(
    request: ClickRequest,
    clickId: string,
    campaign: { id: string; uniquenessTTL: number }
  ) {
    const method = request.uniquenessMethod || 'none';
    const ttl = request.uniquenessTTL || campaign.uniquenessTTL || 86400;

    return this.uniquenessService.check(
      {
        campaignId: campaign.id,
        method,
        uniquenessParameter: request.uniquenessParameter,
        ttl,
        ip: request.ip,
        userAgent: request.userAgent,
        visitorId: request.existingVisitorId || generateVisitorId(),
        urlParams: request.urlParams || new URLSearchParams(),
      },
      clickId
    );
  }

  /**
   * 选择 Flow
   * 先执行 Filters，再按权重选择
   */
  private async selectFlow(flows: Flow[], request: ClickRequest): Promise<Flow | null> {
    if (flows.length === 0) {
      return null;
    }

    // 使用 FilterService 选择匹配的 Flow
    return this.filterService.selectMatchingFlow(flows, request);
  }

  /**
   * 构建 Action 配置
   */
  private buildActionConfig(
    _flow: Flow,
    landingPage: LandingPage | null,
    offer: Offer | null
  ): ActionConfig {
    // 优先使用 Landing Page
    if (landingPage) {
      return {
        type: 'redirect',
        url: landingPage.url,
        landingPageId: landingPage.id,
        offerId: offer?.id,
      };
    }

    // 其次使用 Offer
    if (offer) {
      return {
        type: 'show_offer',
        offerId: offer.id,
        url: offer.url,
      };
    }

    // 默认流量损失
    return { type: 'traffic_loss' };
  }

  /**
   * 执行 Action
   */
  private async executeAction(
    config: ActionConfig,
    clickId: string,
    visitorId: string,
    request: ClickRequest,
    baseUrl: string
  ): Promise<string> {
    const params = this.buildTrackingParams(clickId, visitorId, request);

    // 确保 baseUrl 是完整的 URL 格式
    let fullBaseUrl = baseUrl;
    if (!fullBaseUrl.startsWith('http://') && !fullBaseUrl.startsWith('https://')) {
      fullBaseUrl = `https://${fullBaseUrl}`;
    }

    try {
      switch (config.type) {
        case 'redirect':
          if (config.url) {
            return this.appendParams(config.url, params);
          }
          return new URL(`/click/${clickId}`, fullBaseUrl).toString();

        case 'show_offer':
          if (config.url) {
            return this.appendParams(config.url, params);
          }
          if (config.offerId) {
            return new URL(`/offer/${config.offerId}?${params.toString()}`, fullBaseUrl).toString();
          }
          return new URL(`/click/${clickId}`, fullBaseUrl).toString();

        case 'traffic_loss':
        default:
          // 流量损失，返回空页面或默认 URL
          return new URL(`/traffic-loss?${params.toString()}`, fullBaseUrl).toString();
      }
    } catch (err) {
      console.error('Execute action error:', err);
      // Fallback to a safe URL
      return `https://${baseUrl}/traffic-loss?${params.toString()}`;
    }
  }

  /**
   * 构建追踪参数
   */
  private buildTrackingParams(
    clickId: string,
    visitorId: string,
    request: ClickRequest
  ): URLSearchParams {
    const params = new URLSearchParams();
    
    params.set('clickid', clickId);
    params.set('visitor', visitorId);
    
    if (request.subId1) params.set('subid1', request.subId1);
    if (request.subId2) params.set('subid2', request.subId2);
    if (request.subId3) params.set('subid3', request.subId3);
    
    return params;
  }

  /**
   * 追加参数到 URL
   */
  private appendParams(url: string, params: URLSearchParams): string {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${params.toString()}`;
  }

  /**
   * 按权重选择
   */
  private selectByWeight<T extends { weight: number }>(items: T[]): T {
    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    let random = Math.random() * totalWeight;

    for (const item of items) {
      random -= item.weight;
      if (random <= 0) {
        return item;
      }
    }

    return items[items.length - 1] as T;
  }
}

/**
 * 创建 ClickService 实例的工厂函数
 */
export function createClickService(env: Env): ClickService {
  return new ClickService(env);
}
