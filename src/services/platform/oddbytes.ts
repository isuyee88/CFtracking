/**
 * @fileoverview OddBytes 平台适配器
 * @description 基于官方外部 SOAP 1.2 API 实现广告活动管理与统计拉取
 * @module services/platform/oddbytes
 *
 * 为什么重写（2026-09-22）：旧实现为模板代码，协议细节全错（SOAP 1.1 命名空间、
 * 虚构操作名 UpdateCampaign/UpdateKeywordBid、空 SOAPAction、虚构 <success> 响应标记），
 * 实测均无法通信。本实现逐字段对齐实测成功报文，未实测能力显式声明不支持。
 *
 * 协议要点（实测验证，权威清单见 docs/traffic-affiliate-platform-api-inventory.md §OddBytes）：
 * - 端点：POST {origin}/?v3={service}，service ∈ campaigns|targets|creatives|conversions|reports|system
 * - SOAP 1.2 envelope（http://www.w3.org/2003/05/soap-envelope 命名空间）
 * - Content-Type: application/soap+xml; charset=utf-8
 * - SOAPAction: {origin}/?v3={service}#{operation}
 * - 鉴权：SOAP Header 内 <AuthenticateRequest soap-env:mustUnderstand="1"><apiKey>…</apiKey>
 * - 限速：官方要求报告类请求串行且间隔 ≥5 秒
 *
 * 2026-09-22 实测追加：pauseCampaigns 假 ID 探测返回 StatusResult{changedIds,unchangedIds,deletedIds}；
 * reports.getDailyTargetsStats(2026-09-21) 返回 DailyTargetsStats 块（按 target 粒度含 cost/revenue），
 * campaignIds 过滤上限 10/请求（WSDL 权威），按日 cost-sync 通路协议可行性已闭环。
 */

import { PlatformAdapter } from './adapter';
import type { PlatformInfo, PlatformActionResult, OddBytesConfig } from '@/types/platform';

/** 实测可用的服务名：campaigns 覆盖读写与统计，reports 提供按日报表（均实测） */
const SERVICE = 'campaigns';
const REPORTS_SERVICE = 'reports';

/** 官方限速约束：请求最小间隔 5 秒 */
const RATE_LIMIT_MS = 5000;

/** 实测返回的 Campaign 对象字段（xsi:type="ns1:Campaign" 分块内） */
const CAMPAIGN_FIELDS = [
    'id',
    'name',
    'status',
    'costTotal',
    'impressionsTotal',
    'clicksTotal',
    'conversionsTotal',
    'revenueTotal',
] as const;

/** 实测返回的 DailyTargetsStats 字段（xsi:type="ns1:DailyTargetsStats" 分块内，按 target 粒度） */
const DAILY_STATS_FIELDS = [
    'campaignId',
    'creativeId',
    'targetId',
    'targetStatus',
    'impressions',
    'clicks',
    'cost',
    'ctr',
    'cpm',
    'conversions',
    'revenue',
    'cpa',
    'cr',
    'averageRank',
    'maxBid',
    'averageBid',
    'winRate',
] as const;

/** WSDL 约束：getDailyTargetsStats 的 campaignIds 数组上限（array_unsignedInt_1_10） */
const DAILY_STATS_MAX_CAMPAIGN_IDS = 10;

export class OddBytesAdapter extends PlatformAdapter<OddBytesConfig> {
    private initialized = false;
    /** 上次请求完成时间戳：用于 ≥5s 串行节流 */
    private lastRequestAt = 0;

    constructor(config: OddBytesConfig) {
        super(config);
    }

    getInfo(): PlatformInfo {
        return {
            id: 'oddbytes',
            name: 'OddBytes',
            type: 'soap',
            version: '2.0.0',
            description: 'OddBytes external SOAP 1.2 API (api.oddbytes.com) for campaign management and stats',
            actions: [
                'get_campaign_ids',
                'get_campaigns',
                'get_daily_stats',
                'pause_campaigns',
                'resume_campaigns',
                'delete_campaigns',
            ],
        };
    }

    async initialize(): Promise<void> {
        if (!this.validateConfig()) {
            throw new Error('Missing required configuration: baseUrl and apiKey');
        }
        this.initialized = true;
    }

    validateConfig(): boolean {
        return !!(this.config.baseUrl && this.config.apiKey);
    }

    async testConnection(): Promise<boolean> {
        if (!this.validateConfig()) return false;
        try {
            // 用真实读操作探活（getCampaignIds 实测可用），代替旧的 GET wsdlUrl（对 SOAP 端点无意义）
            const response = await this.sendRequest(
                'getCampaignIds',
                '<parameters><includeDeleted>false</includeDeleted></parameters>'
            );
            return !this.extractFault(response);
        } catch {
            return false;
        }
    }

    async execute(action: string, parameters: Record<string, unknown>): Promise<PlatformActionResult> {
        if (!this.initialized) {
            return { success: false, message: 'Platform not initialized' };
        }

        try {
            switch (action) {
                case 'get_campaign_ids':
                    return await this.getCampaignIds();
                case 'get_campaigns':
                    return await this.getCampaigns(parameters);
                case 'get_daily_stats':
                    return await this.getDailyStats(parameters);
                case 'pause_campaigns':
                    return await this.setCampaignsStatus('pauseCampaigns', parameters);
                case 'resume_campaigns':
                    return await this.setCampaignsStatus('resumeCampaigns', parameters);
                case 'delete_campaigns':
                    return await this.setCampaignsStatus('deleteCampaigns', parameters);
                case 'adjust_bid':
                    // 显式不支持：targets service 的出价报文未实测，禁止虚构协议（诚实性原则）
                    return {
                        success: false,
                        message: 'OddBytes adjust_bid requires targets service operations, not yet implemented',
                    };
                default:
                    return { success: false, message: `Action ${action} not supported` };
            }
        } catch (error) {
            return {
                success: false,
                message: `OddBytes ${action} failed: ${error instanceof Error ? error.message : String(error)}`,
            };
        }
    }

    /** 拉取全部 campaign id（getCampaignIds 实测报文） */
    private async getCampaignIds(): Promise<PlatformActionResult> {
        const response = await this.sendRequest(
            'getCampaignIds',
            '<parameters><includeDeleted>false</includeDeleted></parameters>'
        );
        const fault = this.extractFault(response);
        if (fault) {
            return { success: false, message: `OddBytes getCampaignIds fault: ${fault}` };
        }
        const campaignIds = [...response.matchAll(/<item[^>]*>(\d+)<\/item>/g)].map((m) => Number(m[1]));
        return {
            success: true,
            message: `Retrieved ${campaignIds.length} campaign ids`,
            data: { campaignIds },
        };
    }

    /**
     * 拉取 campaign 列表与统计（getCampaigns + fetchStats 实测报文）
     * 未传 campaignIds 时先拉全量 id 再查询，等价于「拉取全部活动统计」
     */
    private async getCampaigns(parameters: Record<string, unknown>): Promise<PlatformActionResult> {
        let ids = Array.isArray(parameters.campaignIds)
            ? parameters.campaignIds.map(Number).filter(Number.isFinite)
            : [];
        if (ids.length === 0) {
            const idResult = await this.getCampaignIds();
            if (!idResult.success) return idResult;
            ids = (idResult.data?.campaignIds as number[]) ?? [];
        }
        if (ids.length === 0) {
            return { success: true, message: 'No campaigns found', data: { campaigns: [] } };
        }

        const fetchStats = parameters.fetchStats !== false;
        const idsXml = ids.map((id) => `<item>${id}</item>`).join('');
        const parametersXml = `<parameters><campaignIds>${idsXml}</campaignIds><fetchStats>${fetchStats}</fetchStats></parameters>`;
        const response = await this.sendRequest('getCampaigns', parametersXml);
        const fault = this.extractFault(response);
        if (fault) {
            return { success: false, message: `OddBytes getCampaigns fault: ${fault}` };
        }
        const campaigns = this.parseCampaigns(response);
        return {
            success: true,
            message: `Retrieved ${campaigns.length} campaigns`,
            data: { campaigns },
        };
    }

    /**
     * 按日报表（getDailyTargetsStats 实测报文，2026-09-22 HTTP 200，服务 reports）。
     * date 必填（yyyy-mm-dd，默认昨天）；campaignIds 可选且上限 10/请求（WSDL array_unsignedInt_1_10），
     * 超限显式拒绝而非静默截断（显式性原则）。返回按 target 粒度行（一个 campaign 每日可多行）。
     */
    private async getDailyStats(parameters: Record<string, unknown>): Promise<PlatformActionResult> {
        const date = typeof parameters.date === 'string'
            ? parameters.date
            : new Date(Date.now() - 86400000).toISOString().slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return { success: false, message: `Invalid date format: ${date} (expected yyyy-mm-dd)` };
        }
        const ids = Array.isArray(parameters.campaignIds)
            ? parameters.campaignIds.map(Number).filter(Number.isFinite)
            : [];
        if (ids.length > DAILY_STATS_MAX_CAMPAIGN_IDS) {
            return {
                success: false,
                message: `campaignIds supports at most ${DAILY_STATS_MAX_CAMPAIGN_IDS} items per request`,
            };
        }
        const idsXml = ids.length > 0 ? `<campaignIds>${ids.map((id) => `<item>${id}</item>`).join('')}</campaignIds>` : '';
        const parametersXml = `<parameters><date>${date}</date>${idsXml}</parameters>`;
        const response = await this.sendRequest('getDailyTargetsStats', parametersXml, REPORTS_SERVICE);
        const fault = this.extractFault(response);
        if (fault) {
            return { success: false, message: `OddBytes getDailyTargetsStats fault: ${fault}` };
        }
        const stats = this.parseTypedItems(response, 'DailyTargetsStats', DAILY_STATS_FIELDS);
        return {
            success: true,
            message: `Retrieved ${stats.length} daily target stats rows for ${date}`,
            data: { date, stats },
        };
    }

    /** 批量状态操作：pauseCampaigns/resumeCampaigns/deleteCampaigns（文档声明操作，报文同构） */
    private async setCampaignsStatus(
        operation: string,
        parameters: Record<string, unknown>
    ): Promise<PlatformActionResult> {
        const ids = Array.isArray(parameters.campaignIds)
            ? parameters.campaignIds.map(Number).filter(Number.isFinite)
            : [];
        if (ids.length === 0) {
            return { success: false, message: `${operation} requires non-empty numeric campaignIds array` };
        }
        const idsXml = ids.map((id) => `<item>${id}</item>`).join('');
        const parametersXml = `<parameters><campaignIds>${idsXml}</campaignIds></parameters>`;
        const response = await this.sendRequest(operation, parametersXml);
        const fault = this.extractFault(response);
        if (fault) {
            return { success: false, message: `OddBytes ${operation} fault: ${fault}` };
        }
        return { success: true, message: `${operation} completed (no SOAP fault returned)` };
    }

    /** 按实测模板构造 SOAP 1.2 envelope：ns1=操作命名空间，ns2=鉴权 Header 命名空间（二者同值，随 service 变化） */
    private buildEnvelope(operation: string, parametersXml: string, service: string = SERVICE): string {
        const ns = `${this.getApiOrigin()}/?v3=${service}`;
        return `<?xml version="1.0" encoding="UTF-8"?>
<soap-env:Envelope xmlns:soap-env="http://www.w3.org/2003/05/soap-envelope"
  xmlns:ns1="${ns}"
  xmlns:ns2="${ns}">
  <soap-env:Header>
    <ns2:AuthenticateRequest soap-env:mustUnderstand="1">
      <apiKey>${this.config.apiKey}</apiKey>
    </ns2:AuthenticateRequest>
  </soap-env:Header>
  <soap-env:Body>
    <ns1:${operation}>
      ${parametersXml}
    </ns1:${operation}>
  </soap-env:Body>
</soap-env:Envelope>`;
    }

    /** 发送 SOAP 请求：POST {origin}/?v3={service}，带 #operation SOAPAction 与 5s 串行节流 */
    private async sendRequest(
        operation: string,
        parametersXml: string,
        service: string = SERVICE
    ): Promise<string> {
        const elapsed = Date.now() - this.lastRequestAt;
        if (this.lastRequestAt > 0 && elapsed < RATE_LIMIT_MS) {
            await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_MS - elapsed));
        }

        const origin = this.getApiOrigin();
        const response = await fetch(`${origin}/?v3=${service}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/soap+xml; charset=utf-8',
                SOAPAction: `${origin}/?v3=${service}#${operation}`,
            },
            body: this.buildEnvelope(operation, parametersXml, service),
        });
        this.lastRequestAt = Date.now();

        const text = await response.text();
        if (!response.ok && !text) {
            throw new Error(`HTTP ${response.status} with empty body`);
        }
        return text;
    }

    /**
     * 从配置取 API origin。
     * 存量配置可能是脏值（如 https://api.oddbytes.com/?v3=targets.wsdl），统一取 origin 清洗
     */
    private getApiOrigin(): string {
        return new URL(this.config.baseUrl).origin;
    }

    /** 检测 SOAP Fault（兼容 1.1/1.2 前缀），提取 faultstring/Reason 文本 */
    private extractFault(response: string): string | null {
        if (!/<(?:[\w-]+:)?Fault[\s/>]/.test(response)) return null;
        const reason = response.match(
            /<(?:[\w-]+:)?(?:Reason|faultstring)[^>]*>([\s\S]*?)<\/(?:[\w-]+:)?(?:Reason|faultstring)>/
        );
        if (reason) {
            return (reason[1] ?? '').replace(/<[^>]+>/g, '').trim();
        }
        return 'SOAP fault returned (no detail extracted)';
    }

    /** 解析带 xsi:type 标记的 <item> 分块（Campaign/DailyTargetsStats 等同构结构），提取实测字段 */
    private parseTypedItems(
        response: string,
        xsiType: string,
        fields: readonly string[]
    ): Array<Record<string, unknown>> {
        const items: Array<Record<string, unknown>> = [];
        const pattern = new RegExp(`<item[^>]*xsi:type="ns1:${xsiType}"[^>]*>([\\s\\S]*?)</item>`, 'g');
        for (const block of response.matchAll(pattern)) {
            const body = block[1];
            if (!body) continue;
            const item: Record<string, unknown> = {};
            for (const field of fields) {
                const raw = this.extractField(body, field);
                item[field] = raw === null ? null : this.toNumberOrString(raw);
            }
            items.push(item);
        }
        return items;
    }

    /** 解析 Campaign 分块（xsi:type="ns1:Campaign"），提取实测字段 */
    private parseCampaigns(response: string): Array<Record<string, unknown>> {
        return this.parseTypedItems(response, 'Campaign', CAMPAIGN_FIELDS);
    }

    /** 提取单个字段值；自闭合 nil 标签（<costTotal xsi:nil="true"/>）无闭合对，返回 null 即 nil 语义 */
    private extractField(block: string, tag: string): string | null {
        const match = block.match(new RegExp(`<${tag}(\\s[^>]*)?>([\\s\\S]*?)</${tag}>`));
        if (!match) return null;
        if (match[1] && /nil\s*=\s*"true"/.test(match[1])) return null;
        return (match[2] ?? '').trim();
    }

    /** 数值字段转 number（失败回落原字符串），id/name/status 保持语义类型 */
    private toNumberOrString(raw: string): number | string {
        const num = Number(raw);
        return Number.isFinite(num) && raw !== '' ? num : raw;
    }
}
