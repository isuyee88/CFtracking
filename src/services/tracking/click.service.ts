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

import { FlowRepository } from '@/handlers/d1/flow.repo';
import { CampaignRepository } from '@/handlers/d1/campaign.repo';
import { OfferRepository } from '@/handlers/d1/offer.repo';
import { LandingPageRepository } from '@/handlers/d1/landingPage.repo';
import { ClickRepository } from '@/handlers/d1/click.repo';
import { MultiOfferRepository } from '@/handlers/d1/multi-offer.repo';
import { getD1Connection } from '@/handlers/d1';
import { DOService } from '@/handlers/do';
import { UniquenessService, type UniquenessMethod } from './uniqueness.service';
import { FilterService } from './filter.service';
import { FlowActionService } from './flow-action.service';
import { MultiOfferEngine } from '@/services/flow/multi-offer.engine';

import type { Env } from '@/config/env';
import type { ClickData } from '@/types/tracking';
import type { Flow } from '@/types/flow';
import type { Offer } from '@/types/offer';
import type { LandingPage } from '@/types/landingPage';
import { generateClickId, generateDeviceFingerprint } from '@/utils/crypto';
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
  // Sub ID 追踪参数 (支持1-30个, 对标Keitaro完整Sub ID支持)
  subId1?: string;
  subId2?: string;
  subId3?: string;
  subId4?: string;
  subId5?: string;
  subId6?: string;
  subId7?: string;
  subId8?: string;
  subId9?: string;
  subId10?: string;
  subId11?: string;
  subId12?: string;
  subId13?: string;
  subId14?: string;
  subId15?: string;
  subId16?: string;
  subId17?: string;
  subId18?: string;
  subId19?: string;
  subId20?: string;
  subId21?: string;
  subId22?: string;
  subId23?: string;
  subId24?: string;
  subId25?: string;
  subId26?: string;
  subId27?: string;
  subId28?: string;
  subId29?: string;
  subId30?: string;
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
  actionType: 'redirect' | 'show_offer' | 'show_landing' | 'traffic_loss';
  /** 重定向类型 */
  redirectType?: 'http' | 'meta' | 'js' | 'js_blank' | 'double' | 'remote';
  /** 响应 body（用于非 HTTP 重定向） */
  responseBody?: string;
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
  private clickRepo: ClickRepository;
  private flowRepo: FlowRepository;
  private campaignRepo: CampaignRepository;
  private offerRepo: OfferRepository;
  private lpRepo: LandingPageRepository;
  private multiOfferRepo: MultiOfferRepository;
  private doService: DOService;
  private uniquenessService: UniquenessService;
  private filterService: FilterService;
  private flowActionService: FlowActionService;
  private multiOfferEngine: MultiOfferEngine;
  private env: Env;

  constructor(env: Env) {
    const db = getD1Connection(env);
    this.clickRepo = new ClickRepository(db);
    this.flowRepo = new FlowRepository(db);
    this.campaignRepo = new CampaignRepository(db);
    this.offerRepo = new OfferRepository(db);
    this.lpRepo = new LandingPageRepository(db);
    this.multiOfferRepo = new MultiOfferRepository(db);
    this.doService = new DOService(env);
    this.uniquenessService = new UniquenessService(env);
    this.filterService = new FilterService();
    this.flowActionService = new FlowActionService();
    this.multiOfferEngine = new MultiOfferEngine(env as unknown as { UNIQUENESS_KV?: KVNamespace; [key: string]: unknown });
    this.env = env;
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
      // 1. 生成基础标识
      const clickId = generateClickId();
      const visitorId = await this.generateVisitorId(request);
      
      // 2. 解析 Campaign
      const campaign = await this.resolveCampaign(request.campaignId);
      if (!campaign) {
        throw new Error('Campaign not found');
      }
      
      // 3. 构建基础 URL
      const baseUrl = this.buildBaseUrl(campaign, request);
      
      // 4. 执行去重检查
      const uniquenessResult = await this.checkUniqueness(request, clickId, campaign);
      
      // 5. 获取并选择 Flow
      const flows = await this.flowRepo.findByCampaignIdAndStatus(campaign.id, 'active');
      console.log('[ClickService] Found flows:', flows.length, 'for campaign:', campaign.id, 'Campaign alias:', request.campaignId);
      
      const selectedFlow = await this.selectFlow(flows, request);
      console.log('[ClickService] Selected flow:', selectedFlow?.id || 'No flow selected');
      console.log('[ClickService] Selected flow details:', selectedFlow ? {
        id: selectedFlow.id,
        name: selectedFlow.name,
        actionType: selectedFlow.actionType,
        filters: selectedFlow.filters?.length || 0
      } : null);

      // 如果没有 Flow，记录警告信息
      if (flows.length === 0) {
        console.warn(`[ClickService] Campaign ${campaign.id} (${campaign.name}) has NO active flows configured!`);
      }
      
      // 6. 选择 Landing Page 和 Offer
      let selectedLP: LandingPage | null = null;
      let selectedOffer: Offer | null = null;
      
      if (selectedFlow) {
        selectedLP = await this.selectLandingPage(selectedFlow);
        selectedOffer = await this.selectOffer(selectedFlow, visitorId);
      }
      
      // 7. 执行 Action 获取重定向 URL
      const { redirectUrl, redirectType, responseBody } = await this.executeFlowAction(
        selectedFlow,
        selectedLP,
        selectedOffer,
        request,
        clickId,
        visitorId,
        baseUrl
      );
      
      console.log('Redirect URL:', redirectUrl);
      
      // 8. 记录点击数据
      const clickData = this.buildClickData({
        clickId,
        campaign,
        flow: selectedFlow,
        landingPage: selectedLP,
        offer: selectedOffer,
        visitorId,
        request,
        redirectUrl,
      });
      
      await this.clickRepo.saveClick(clickData);
      
      // 9. 记录分析数据
      await this.trackAnalytics({
        clickId,
        campaign,
        flow: selectedFlow,
        request,
        isUnique: uniquenessResult.isUnique,
      });
      
      // 10. 返回结果
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
        isTrafficLoss: !selectedFlow || redirectUrl.includes('/traffic-loss'),
        actionType: selectedFlow?.actionType || 'traffic_loss',
        redirectType,
        responseBody,
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
   * 优先使用请求中的配置，否则使用 Campaign 的默认配置
   */
  private async checkUniqueness(
    request: ClickRequest,
    clickId: string,
    campaign: { 
      id: string; 
      uniquenessTTL: number;
      uniquenessMethod?: string;
      uniquenessParameter?: string | null;
    }
  ) {
    // 优先使用请求中的配置，否则使用 Campaign 的默认配置
    const method = (request.uniquenessMethod || campaign.uniquenessMethod || 'none') as UniquenessMethod;
    const ttl = request.uniquenessTTL || campaign.uniquenessTTL || 86400;
    const uniquenessParameter = request.uniquenessParameter || campaign.uniquenessParameter || undefined;

    // 使用 Cloudflare TLS 指纹生成设备指纹
    let visitorIdForUniqueness: string;
    if (request.cfInfo) {
      visitorIdForUniqueness = request.existingVisitorId || await generateDeviceFingerprint(request.cfInfo);
    } else {
      visitorIdForUniqueness = request.existingVisitorId || await generateDeviceFingerprint({
        connectingIP: request.ip,
        userAgent: request.userAgent,
        asn: null,
        botManagement: null,
      } as CloudflareRequestInfo);
    }

    return this.uniquenessService.check(
      {
        campaignId: campaign.id,
        method,
        uniquenessParameter,
        ttl,
        ip: request.ip,
        userAgent: request.userAgent,
        visitorId: visitorIdForUniqueness,
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
    let fullBaseUrl = baseUrl || 'http://localhost';
    if (typeof fullBaseUrl !== 'string') {
      fullBaseUrl = 'http://localhost';
    }
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
   * 支持完整的Sub ID参数 (sub_id_1 到 sub_id_30)
   */
  private buildTrackingParams(
    clickId: string,
    visitorId: string,
    request: ClickRequest
  ): URLSearchParams {
    const params = new URLSearchParams();

    params.set('clickid', clickId);
    params.set('visitor', visitorId);

    // 动态读取所有 Sub ID 参数 (1-30)
    for (let i = 1; i <= 30; i++) {
      const subIdValue = request[`subId${i}` as keyof ClickRequest] as string | undefined;
      if (subIdValue) {
        params.set(`subid${i}`, subIdValue);
      }
    }

    return params;
  }

  /**
   * 追加参数到 URL
   */
  private appendParams(url: string, params: URLSearchParams): string {
    if (!url || typeof url !== 'string') {
      return `/traffic-loss?${params.toString()}`;
    }
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

  /**
   * 生成或获取访客ID
   * 优先使用 Cloudflare TLS 指纹，其次使用 IP + User-Agent
   */
  private async generateVisitorId(request: ClickRequest): Promise<string> {
    if (request.cfInfo) {
      // 使用 Cloudflare TLS 指纹生成设备指纹 (准确率 ~95%)
      return request.existingVisitorId || await generateDeviceFingerprint(request.cfInfo);
    } else {
      // 后备方案：使用 IP + User-Agent (准确率 ~70%)
      return request.existingVisitorId || await generateDeviceFingerprint({
        connectingIP: request.ip,
        userAgent: request.userAgent,
        asn: null,
        botManagement: null,
      } as CloudflareRequestInfo);
    }
  }

  /**
   * 构建基础 URL
   * 优先使用 Campaign domain，其次使用原始请求的 origin
   */
  private buildBaseUrl(
    campaign: { domain?: string | null },
    request: ClickRequest
  ): string {
    // 优先使用 Campaign domain
    if (campaign.domain && typeof campaign.domain === 'string') {
      return campaign.domain;
    }

    // 其次使用原始请求的 origin
    try {
      const originalUrl = request.urlParams ? request.urlParams.get('__originalUrl') : null;
      if (originalUrl && typeof originalUrl === 'string') {
        const requestUrl = new URL(originalUrl);
        return requestUrl.origin;
      }
    } catch (err) {
      console.error('URL creation error:', err);
    }

    // 默认使用 localhost
    return 'http://localhost';
  }

  /**
   * 选择 Landing Page
   * 按权重随机选择一个关联的 Landing Page
   */
  private async selectLandingPage(flow: Flow): Promise<LandingPage | null> {
    const lpAssociations = await this.flowRepo.getLandingPages(flow.id);
    if (lpAssociations.length === 0) {
      return null;
    }

    const lpAssoc = this.selectByWeight(lpAssociations);
    const selectedLP = await this.lpRepo.findById(lpAssoc.landingPageId);
    console.log('Selected landing page:', selectedLP?.id || 'No landing page');
    return selectedLP;
  }

  /**
   * 选择 Offer
   * 优先使用 MultiOfferEngine，回退到传统方式
   */
  private async selectOffer(flow: Flow, visitorId: string): Promise<Offer | null> {
    // 尝试使用 MultiOfferEngine
    const multiOffers = await this.multiOfferRepo.getFlowOffersWithDetails(flow.id);
    if (multiOffers.length > 0) {
      const offerDetails = this.buildOfferDetailsMap(multiOffers);
      
      const selectionResult = await this.multiOfferEngine.selectOffer({
        flowId: flow.id,
        visitorId,
        offers: multiOffers,
        offerDetails,
        env: this.env as unknown as { UNIQUENESS_KV?: KVNamespace; [key: string]: unknown },
      });

      if (selectionResult) {
        // 异步增加点击统计
        this.multiOfferRepo.incrementClicks(selectionResult.flowOfferId).catch(err => {
          console.error('[ClickService] Failed to increment multi-offer clicks:', err);
        });

        console.log('[ClickService] Multi-offer selected:', {
          offerId: selectionResult.offerId,
          method: selectionResult.selectionMethod,
          weight: selectionResult.weight,
        });

        return {
          id: selectionResult.offer.id,
          name: selectionResult.offer.name,
          url: selectionResult.offer.url,
          payout: selectionResult.offer.payout,
          currency: selectionResult.offer.currency,
          payoutType: 'fixed',
          redirectType: 'http',
          actionType: 'redirect',
          countries: [],
          network: '',
          group: '',
          status: 'active',
          createdAt: '',
          updatedAt: '',
        };
      }
    }

    // 回退到传统方式
    const offerAssociations = await this.flowRepo.getOffers(flow.id);
    if (offerAssociations.length > 0) {
      const offerAssoc = this.selectByWeight(offerAssociations);
      const selectedOffer = await this.offerRepo.findById(offerAssoc.offerId);
      console.log('Selected offer (fallback):', selectedOffer?.id || 'No offer');
      return selectedOffer;
    }

    return null;
  }

  /**
   * 构建 Offer 详情映射
   */
  private buildOfferDetailsMap(multiOffers: any[]): Map<string, {
    id: string;
    name: string;
    url: string;
    payout: number;
    currency: string;
  }> {
    const offerDetails = new Map<string, {
      id: string;
      name: string;
      url: string;
      payout: number;
      currency: string;
    }>();

    for (const mo of multiOffers) {
      if (mo.offer) {
        offerDetails.set(mo.offerId, {
          id: mo.offer.id,
          name: mo.offer.name,
          url: mo.offer.url,
          payout: mo.offer.payout,
          currency: mo.offer.currency,
        });
      }
    }

    return offerDetails;
  }

  /**
   * 执行 Flow Action
   * 统一使用 FlowActionService 处理各种 action 类型
   */
  private async executeFlowAction(
    flow: Flow | null,
    landingPage: LandingPage | null,
    offer: Offer | null,
    request: ClickRequest,
    clickId: string,
    visitorId: string,
    baseUrl: string
  ): Promise<{ redirectUrl: string; redirectType: ClickResult['redirectType']; responseBody?: string }> {
    if (!flow) {
      // 没有 Flow，执行流量损失
      const redirectUrl = await this.executeAction(
        { type: 'traffic_loss' },
        clickId,
        visitorId,
        request,
        baseUrl
      );
      return { redirectUrl, redirectType: 'http' };
    }

    // 统一使用 FlowActionService，不区分是否有 offer
    const actionResult = await this.flowActionService.execute({
      flow,
      request,
      offer: offer || undefined,
      landingPage: landingPage || undefined,
    });

    console.log('FlowAction result:', {
      actionType: actionResult.actionType,
      redirectUrl: actionResult.redirectUrl,
      redirectType: actionResult.redirectType,
      hasBody: !!actionResult.body,
    });

    // 如果 FlowActionService 返回 traffic_loss 或空 URL，构建 traffic-loss URL
    if (actionResult.actionType === 'traffic_loss' || !actionResult.redirectUrl) {
      const redirectUrl = await this.executeAction(
        { type: 'traffic_loss' },
        clickId,
        visitorId,
        request,
        baseUrl
      );
      return { redirectUrl, redirectType: 'http' };
    }

    return {
      redirectUrl: actionResult.redirectUrl,
      redirectType: actionResult.redirectType,
      responseBody: actionResult.body,
    };
  }

  /**
   * 构建点击数据对象
   */
  private buildClickData(params: {
    clickId: string;
    campaign: { id: string };
    flow?: Flow | null;
    landingPage?: LandingPage | null;
    offer?: Offer | null;
    visitorId: string;
    request: ClickRequest;
    redirectUrl: string;
  }): ClickData {
    const { clickId, campaign, flow, landingPage, offer, visitorId, request, redirectUrl } = params;
    const cfInfo = request.cfInfo;
    const bm = cfInfo?.botManagement;
    const tlsAuth = cfInfo?.tlsClientAuth;

    return {
      clickId,
      campaignId: campaign.id,
      flowId: flow?.id || null,
      landingPageId: landingPage?.id || null,
      offerId: offer?.id || null,
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
      // Sub ID 追踪参数 (支持1-30个)
      ...this.extractSubIds(request),
      cost: request.cost || 0,
      redirectUrl,
      // Cloudflare 特定信息
      ...this.extractCloudflareInfo(cfInfo),
      // Bot Management
      ...this.extractBotManagementInfo(bm),
      // TLS Client Auth
      ...this.extractTLSClientAuthInfo(tlsAuth),
      // 指纹和风险评估
      fingerprint: request.fingerprint ?? null,
      riskScore: request.riskAssessment?.riskScore ?? 0,
      isBot: request.riskAssessment?.isBot ?? false,
      isSuspicious: request.riskAssessment?.isSuspicious ?? false,
      riskReasons: request.riskAssessment?.reasons ?? [],
    };
  }

  /**
   * 提取 Sub ID 参数
   */
  private extractSubIds(request: ClickRequest): Pick<ClickData, 
    'subId1' | 'subId2' | 'subId3' | 'subId4' | 'subId5' | 
    'subId6' | 'subId7' | 'subId8' | 'subId9' | 'subId10' |
    'subId11' | 'subId12' | 'subId13' | 'subId14' | 'subId15' |
    'subId16' | 'subId17' | 'subId18' | 'subId19' | 'subId20' |
    'subId21' | 'subId22' | 'subId23' | 'subId24' | 'subId25' |
    'subId26' | 'subId27' | 'subId28' | 'subId29' | 'subId30'
  > {
    return {
      subId1: request.subId1 ?? null,
      subId2: request.subId2 ?? null,
      subId3: request.subId3 ?? null,
      subId4: request.subId4 ?? null,
      subId5: request.subId5 ?? null,
      subId6: request.subId6 ?? null,
      subId7: request.subId7 ?? null,
      subId8: request.subId8 ?? null,
      subId9: request.subId9 ?? null,
      subId10: request.subId10 ?? null,
      subId11: request.subId11 ?? null,
      subId12: request.subId12 ?? null,
      subId13: request.subId13 ?? null,
      subId14: request.subId14 ?? null,
      subId15: request.subId15 ?? null,
      subId16: request.subId16 ?? null,
      subId17: request.subId17 ?? null,
      subId18: request.subId18 ?? null,
      subId19: request.subId19 ?? null,
      subId20: request.subId20 ?? null,
      subId21: request.subId21 ?? null,
      subId22: request.subId22 ?? null,
      subId23: request.subId23 ?? null,
      subId24: request.subId24 ?? null,
      subId25: request.subId25 ?? null,
      subId26: request.subId26 ?? null,
      subId27: request.subId27 ?? null,
      subId28: request.subId28 ?? null,
      subId29: request.subId29 ?? null,
      subId30: request.subId30 ?? null,
    };
  }

  /**
   * 提取 Cloudflare 信息
   */
  private extractCloudflareInfo(cfInfo?: CloudflareRequestInfo): Partial<ClickData> {
    if (!cfInfo) {
      return {};
    }

    return {
      cfRayId: cfInfo.rayId,
      cfConnectingIP: cfInfo.connectingIP,
      cfIPCountry: cfInfo.ipCountry,
      cfIsEUCountry: cfInfo.isEUCountry,
      cfASN: cfInfo.asn,
      cfASOrganization: cfInfo.asOrganization,
      cfColo: cfInfo.colo,
      cfLatitude: cfInfo.latitude,
      cfLongitude: cfInfo.longitude,
      cfPostalCode: cfInfo.postalCode,
      cfMetroCode: cfInfo.metroCode,
      cfTimezone: cfInfo.timezone,
      cfContinent: cfInfo.continent,
      cfHTTPProtocol: cfInfo.httpProtocol,
      cfTLSVersion: cfInfo.tlsVersion,
      cfTLSCipher: cfInfo.tlsCipher,
      cfTLSClientRandom: cfInfo.tlsClientRandom,
      cfTLSClientHelloLength: cfInfo.tlsClientHelloLength,
      cfTLSClientCiphersSha1: cfInfo.tlsClientCiphersSha1,
      cfTLSClientExtensionsSha1: cfInfo.tlsClientExtensionsSha1,
    };
  }

  /**
   * 提取 Bot Management 信息
   */
  private extractBotManagementInfo(bm?: any): Partial<ClickData> {
    if (!bm) {
      return {};
    }

    return {
      cfBotScore: bm.score ?? null,
      cfBotVerified: bm.verifiedBot ?? false,
      cfBotStaticResource: bm.staticResource ?? false,
      cfBotJA3Hash: bm.ja3Hash ?? null,
      cfBotJA4: bm.ja4 ?? null,
      cfBotDetectionIds: bm.detectionIds ?? [],
      cfBotJSDetectionPassed: bm.jsDetectionPassed ?? null,
    };
  }

  /**
   * 提取 TLS Client Auth 信息
   */
  private extractTLSClientAuthInfo(tlsAuth?: any): Partial<ClickData> {
    if (!tlsAuth) {
      return {};
    }

    return {
      cfTLSClientAuthCertVerified: tlsAuth.certVerified ?? false,
      cfTLSClientAuthCertFingerprintSHA1: tlsAuth.certFingerprintSHA1 ?? null,
      cfTLSClientAuthCertFingerprintSHA256: tlsAuth.certFingerprintSHA256 ?? null,
      cfTLSClientAuthCertIssuerDN: tlsAuth.certIssuerDN ?? null,
      cfTLSClientAuthCertSubjectDN: tlsAuth.certSubjectDN ?? null,
      cfTLSClientAuthCertSerial: tlsAuth.certSerial ?? null,
      cfTLSClientAuthCertNotBefore: tlsAuth.certNotBefore ?? null,
      cfTLSClientAuthCertNotAfter: tlsAuth.certNotAfter ?? null,
      cfTLSClientAuthCertRevoked: tlsAuth.certRevoked ?? null,
      cfTLSClientAuthCertPresented: tlsAuth.certPresented ?? null,
    };
  }

  /**
   * 记录分析数据到 Durable Objects
   */
  private async trackAnalytics(params: {
    clickId: string;
    campaign: { id: string };
    flow?: Flow | null;
    request: ClickRequest;
    isUnique: boolean;
  }): Promise<void> {
    const { clickId, campaign, flow, request, isUnique } = params;

    console.log('[ClickService] About to track click to Durable Objects:', {
      clickId,
      campaignId: campaign.id,
      flowId: flow?.id,
      timestamp: new Date().toISOString()
    });

    try {
      await this.doService.trackClick({
        id: clickId,
        campaignId: campaign.id,
        ip: request.ip,
        country: request.country,
        city: request.city,
        region: request.region,
        timestamp: Date.now(),
        cost: request.cost
      });
      console.log('[ClickService] trackClick called successfully');
    } catch (err) {
      console.error('[ClickService] Failed to track click to Durable Objects:', err);
    }

    // 更新计数器
    await this.doService.incrementCounter(`campaign:${campaign.id}:today`, {
      clicks: 1,
      spend: request.cost || 0,
    });

    // 如果不是唯一点击，更新重复点击计数
    if (!isUnique) {
      await this.doService.incrementCounter(`campaign:${campaign.id}:duplicates`, {
        clicks: 1,
      });
    }
  }
}

/**
 * 创建 ClickService 实例的工厂函数
 */
export function createClickService(env: Env): ClickService {
  return new ClickService(env);
}
