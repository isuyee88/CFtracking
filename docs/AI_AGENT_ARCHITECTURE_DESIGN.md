# CFtracking AI Agent 架构设计方案

> **设计目标**: 使用 Cloudflare AI Agent 实现智能数据分析与自动化决策
> **核心问题**: 增加预算 vs Block？让AI Agent来决策
> **分析日期**: 2026-04-08

---

## 一、架构方案对比

### 方案A: 内嵌式（推荐）⭐

将 AI Agent 作为 Durable Object 直接集成到现有 CFtracking 项目中

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CFtracking Worker (单一Worker)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    HTTP API 路由层                           │   │
│  │  /api/* → 现有API处理                                       │   │
│  │  /agents/* → AI Agent路由 (agents-sdk)                      │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Durable Objects 层                        │   │
│  │                                                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │ SESSION_DO  │  │ COUNTER_DO  │  │ 🤖 OPTIMIZER_AGENT  │  │   │
│  │  │ (现有)      │  │ (现有)      │  │ (新增AI Agent)      │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  │                                                              │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │   │
│  │  │ TRACKING_   │  │ CACHE_      │  │ 📊 ANALYZER_AGENT   │  │   │
│  │  │ STATS_DO    │  │ EVENT_DO    │  │ (新增分析Agent)      │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────────┘  │   │
│  │                                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                              │                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    数据层                                    │   │
│  │  D1 (Campaign/Click/Conversion数据)                         │   │
│  │  KV (配置/缓存)                                             │   │
│  │  R2 (静态资源)                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

**wrangler.toml 配置:**

```toml
name = "cf-tracking"
main = "src/index.ts"
compatibility_date = "2024-12-30"

# AI绑定
[ai]
binding = "AI"

# 现有Durable Objects...
[[durable_objects.bindings]]
name = "SESSION_DO"
class_name = "SessionDurableObject"

# ... 其他现有DO

# 新增AI Agent DO
[[durable_objects.bindings]]
name = "OPTIMIZER_AGENT"
class_name = "CampaignOptimizerAgent"

[[durable_objects.bindings]]
name = "ANALYZER_AGENT"
class_name = "DataAnalyzerAgent"

[[durable_objects.sqlite_namespaces]]
name = "OPTIMIZER_AGENT_SQLITE"
class_name = "CampaignOptimizerAgent"

[[durable_objects.sqlite_namespaces]]
name = "ANALYZER_AGENT_SQLITE"
class_name = "DataAnalyzerAgent"

[[migrations]]
tag = "v11"
new_sqlite_classes = ["CampaignOptimizerAgent", "DataAnalyzerAgent"]
```

---

### 方案B: 独立部署

单独部署一个 AI Agent Worker，通过 HTTP API 与主项目通信

```
┌─────────────────────────────────────────────────────────────────────┐
│                        架构概览                                      │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌─────────────────────────┐      ┌─────────────────────────────┐  │
│  │   CFtracking Main       │◄────►│   CFtracking AI Agent       │  │
│  │   Worker (主项目)        │ HTTP │   Worker (独立部署)          │  │
│  │                         │      │                             │  │
│  │  ┌─────────────────┐   │      │  ┌─────────────────────┐     │  │
│  │  │ D1 Database     │   │      │  │ CampaignOptimizer   │     │  │
│  │  │ (共享数据)       │◄──┘      │  │ Agent (DO)          │     │  │
│  │  └─────────────────┘          │  └─────────────────────┘     │  │
│  │                              │  ┌─────────────────────┐     │  │
│  │  ┌─────────────────┐         │  │ DataAnalyzerAgent   │     │  │
│  │  │ PlatformManager │◄────────┘  │ (DO)                │     │  │
│  │  │ (执行决策)       │            └─────────────────────┘     │  │
│  │  └─────────────────┘                                        │  │
│  └─────────────────────────┘                                   │  │
│                               ┌─────────────────────────────┐  │  │
│                               │  Workers AI (LLM推理)        │  │  │
│                               └─────────────────────────────┘  │  │
│                                                                │  │
└─────────────────────────────────────────────────────────────────┘  │
```

**通信方式:**

```typescript
// Main Worker 调用 AI Agent Worker
async function callAIAgent(decisionRequest: DecisionRequest): Promise<Decision> {
  const response = await fetch('https://ai-agent.cf-tracking.workers.dev/decide', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${AI_AGENT_TOKEN}` },
    body: JSON.stringify(decisionRequest),
  });
  return response.json();
}
```

---

## 二、方案对比分析

| 维度 | 方案A: 内嵌式 ⭐ | 方案B: 独立部署 |
|------|-----------------|----------------|
| **延迟** | 极低 (<10ms，DO间RPC) | 较高 (50-200ms，HTTP往返) |
| **复杂度** | 低 (单一代码库) | 中 (多服务协调) |
| **部署** | 简单 (一次部署) | 复杂 (多Worker管理) |
| **成本** | 低 (共享资源) | 中 (独立计费) |
| **扩展性** | 中 (受限于单Worker) | 高 (可独立扩展) |
| **隔离性** | 低 (共享环境) | 高 (故障隔离) |
| **数据访问** | 直接 (同D1/KV) | 需API/共享绑定 |
| **开发体验** | 好 (TypeScript共享) | 中 (跨项目维护) |

---

## 三、推荐方案：内嵌式 + 模块化设计

基于 CFtracking 的实际情况，推荐**内嵌式方案**，原因：

1. **低延迟要求** - 自动化决策需要毫秒级响应
2. **数据一致性** - 直接访问D1，无需数据同步
3. **简化运维** - 单一Worker，降低复杂度
4. **成本优化** - 共享Durable Objects配额

---

## 四、AI Agent 核心设计

### 4.1 CampaignOptimizerAgent - 智能优化决策Agent

```typescript
/**
 * @fileoverview Campaign优化决策Agent
 * @description 基于AI分析数据，自动决策增加预算、block流量或保持观察
 * @module agents/campaign-optimizer
 */

import { Agent } from "agents";
import type { Connection } from "agents";
import { getD1Connection } from '@/handlers/d1';

interface OptimizerState {
  campaignId: string;
  decisionHistory: DecisionRecord[];
  learningProgress: LearningMetrics;
  activeRules: AutoRule[];
}

interface DecisionRequest {
  campaignId: string;
  zoneId?: string;
  creativeId?: string;
  metrics: {
    clicks: number;
    conversions: number;
    cost: number;
    revenue: number;
    roi: number;
    epc: number;
  };
  context: {
    timeOfDay: number;
    dayOfWeek: number;
    geo: string;
    device: string;
    zoneAge: number; // hours
  };
}

interface Decision {
  action: 'INCREASE_BID' | 'DECREASE_BID' | 'BLOCK' | 'PAUSE' | 'OBSERVE';
  confidence: number;
  reason: string;
  parameters?: {
    bidAdjustment?: number;
    blockDuration?: number;
  };
  alternatives?: Decision[];
}

export class CampaignOptimizerAgent extends Agent<Env, OptimizerState> {
  initialState: OptimizerState = {
    campaignId: '',
    decisionHistory: [],
    learningProgress: {
      totalDecisions: 0,
      successfulDecisions: 0,
      avgROIImprovement: 0,
    },
    activeRules: [],
  };

  async onStart() {
    console.log(`[OptimizerAgent] Started for campaign: ${this.state.campaignId}`);
    // 加载该Campaign的历史决策数据
    await this.loadHistoricalDecisions();
  }

  async onConnect(connection: Connection) {
    connection.send(JSON.stringify({
      type: 'connected',
      agent: 'CampaignOptimizer',
      campaignId: this.state.campaignId,
      status: 'ready',
    }));
  }

  async onMessage(connection: Connection, message: string) {
    const data = JSON.parse(message);

    switch (data.type) {
      case 'decide':
        const decision = await this.makeDecision(data.request);
        connection.send(JSON.stringify({
          type: 'decision',
          decision,
          timestamp: Date.now(),
        }));
        break;

      case 'feedback':
        await this.recordFeedback(data.decisionId, data.outcome);
        connection.send(JSON.stringify({
          type: 'feedback_recorded',
          success: true,
        }));
        break;

      case 'get_insights':
        const insights = await this.generateInsights(data.campaignId);
        connection.send(JSON.stringify({
          type: 'insights',
          insights,
        }));
        break;
    }
  }

  /**
   * 核心决策逻辑：增加预算 vs Block vs 观察
   */
  private async makeDecision(request: DecisionRequest): Promise<Decision> {
    const { metrics, context } = request;

    // 1. 规则引擎快速筛选
    const ruleDecision = this.applyHardRules(metrics, context);
    if (ruleDecision.action !== 'OBSERVE') {
      return ruleDecision;
    }

    // 2. AI模型深度分析
    const aiAnalysis = await this.aiAnalyze(request);

    // 3. 综合决策
    const finalDecision = this.ensembleDecision(ruleDecision, aiAnalysis);

    // 4. 记录决策
    await this.recordDecision(request, finalDecision);

    return finalDecision;
  }

  /**
   * 硬规则引擎 - 不可违背的止损规则
   */
  private applyHardRules(metrics: DecisionRequest['metrics'], context: DecisionRequest['context']): Decision {
    // 规则1: ROI极低且置信度高 → 立即Block
    if (metrics.roi < -0.8 && metrics.clicks > 100) {
      return {
        action: 'BLOCK',
        confidence: 0.95,
        reason: `Hard stop: ROI ${(metrics.roi * 100).toFixed(1)}% is critically low with ${metrics.clicks} clicks`,
        parameters: { blockDuration: 24 * 60 * 60 * 1000 }, // 24小时
      };
    }

    // 规则2: 新Zone保护期 → 延长观察
    if (context.zoneAge < 24 && metrics.clicks < 50) {
      return {
        action: 'OBSERVE',
        confidence: 0.9,
        reason: `New zone protection: Only ${metrics.clicks} clicks in ${context.zoneAge} hours`,
      };
    }

    // 规则3: 凌晨时段低ROI → 暂停时段
    if (context.timeOfDay >= 2 && context.timeOfDay <= 5 && metrics.roi < 0) {
      return {
        action: 'PAUSE',
        confidence: 0.85,
        reason: `Night time pattern: Low ROI during hours ${context.timeOfDay}:00`,
      };
    }

    // 规则4: ROI优秀 → 增加出价
    if (metrics.roi > 0.5 && metrics.clicks > 200) {
      return {
        action: 'INCREASE_BID',
        confidence: 0.8,
        reason: `Strong performance: ROI ${(metrics.roi * 100).toFixed(1)}% with sufficient data`,
        parameters: { bidAdjustment: 1.2 }, // 增加20%
      };
    }

    return { action: 'OBSERVE', confidence: 0.5, reason: 'No hard rule matched' };
  }

  /**
   * AI模型分析 - 使用Workers AI进行深度分析
   */
  private async aiAnalyze(request: DecisionRequest): Promise<Decision> {
    const prompt = this.buildAnalysisPrompt(request);

    // 调用Workers AI
    const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        {
          role: "system",
          content: `You are an expert affiliate marketing optimizer. Analyze the campaign data and recommend one action:
- INCREASE_BID: When ROI is positive and stable
- DECREASE_BID: When ROI is marginal or declining
- BLOCK: When ROI is consistently negative
- PAUSE: When temporary issues detected
- OBSERVE: When insufficient data or uncertain

Respond in JSON format: {"action": "...", "confidence": 0.0-1.0, "reason": "..."}`
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 500,
    });

    try {
      const aiDecision = JSON.parse(response.response);
      return {
        action: aiDecision.action,
        confidence: aiDecision.confidence,
        reason: `AI Analysis: ${aiDecision.reason}`,
      };
    } catch {
      // AI返回格式异常，返回观察
      return {
        action: 'OBSERVE',
        confidence: 0.3,
        reason: 'AI analysis inconclusive',
      };
    }
  }

  /**
   * 构建AI分析Prompt
   */
  private buildAnalysisPrompt(request: DecisionRequest): string {
    const { metrics, context } = request;
    return `
Campaign Performance Analysis:

Metrics:
- Clicks: ${metrics.clicks}
- Conversions: ${metrics.conversions}
- Cost: $${metrics.cost.toFixed(2)}
- Revenue: $${metrics.revenue.toFixed(2)}
- ROI: ${(metrics.roi * 100).toFixed(1)}%
- EPC: $${metrics.epc.toFixed(3)}

Context:
- Time: ${context.timeOfDay}:00 (Day ${context.dayOfWeek})
- Geo: ${context.geo}
- Device: ${context.device}
- Zone Age: ${context.zoneAge} hours

Historical Context:
${this.getRelevantHistory(context.zoneId || 'campaign')}

What action should be taken?
`;
  }

  /**
   * 集成决策 - 融合规则和AI决策
   */
  private ensembleDecision(ruleDecision: Decision, aiDecision: Decision): Decision {
    // 如果规则决策置信度极高，优先采用
    if (ruleDecision.confidence > 0.9) {
      return ruleDecision;
    }

    // 如果AI置信度低，采用规则决策
    if (aiDecision.confidence < 0.5) {
      return ruleDecision;
    }

    // 如果两者一致，增强置信度
    if (ruleDecision.action === aiDecision.action) {
      return {
        ...ruleDecision,
        confidence: Math.min(1, (ruleDecision.confidence + aiDecision.confidence) / 2 + 0.1),
        reason: `Consensus: ${ruleDecision.reason} | ${aiDecision.reason}`,
      };
    }

    // 如果冲突，根据置信度选择
    return ruleDecision.confidence >= aiDecision.confidence ? ruleDecision : aiDecision;
  }

  /**
   * 生成优化洞察报告
   */
  private async generateInsights(campaignId: string): Promise<string> {
    const history = this.state.decisionHistory;
    const successful = history.filter(d => d.outcome === 'positive');
    const failed = history.filter(d => d.outcome === 'negative');

    return `
Campaign ${campaignId} Optimization Insights:

Total Decisions: ${history.length}
Success Rate: ${(successful.length / history.length * 100).toFixed(1)}%
Avg ROI Improvement: ${this.state.learningProgress.avgROIImprovement.toFixed(2)}%

Top Performing Actions:
${this.getTopActions(successful)}

Failed Patterns:
${this.getFailedPatterns(failed)}

Recommendations:
${this.generateRecommendations()}
`;
  }

  // 辅助方法...
  private async loadHistoricalDecisions() {
    // 从D1加载历史决策
    const db = getD1Connection(this.env);
    // ...
  }

  private async recordDecision(request: DecisionRequest, decision: Decision) {
    const record: DecisionRecord = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      request,
      decision,
      outcome: 'pending',
    };

    this.setState({
      ...this.state,
      decisionHistory: [...this.state.decisionHistory, record],
    });
  }

  private async recordFeedback(decisionId: string, outcome: 'positive' | 'negative' | 'neutral') {
    // 更新决策结果，用于模型学习
  }

  private getRelevantHistory(zoneId: string): string {
    // 获取相关历史决策
    return 'No relevant history';
  }

  private getTopActions(successful: DecisionRecord[]): string {
    return successful.slice(0, 3).map(d => `- ${d.decision.action}: ${d.decision.reason}`).join('\n');
  }

  private getFailedPatterns(failed: DecisionRecord[]): string {
    return failed.slice(0, 3).map(d => `- ${d.decision.action}: ${d.decision.reason}`).join('\n');
  }

  private generateRecommendations(): string {
    return '- Continue monitoring night-time performance\n- Consider increasing bids on high-performing zones';
  }
}
```

---

### 4.2 DataAnalyzerAgent - 数据分析Agent

```typescript
/**
 * @fileoverview 数据分析Agent
 * @description 定期分析Campaign数据，发现趋势和异常
 * @module agents/data-analyzer
 */

import { Agent } from "agents";

interface AnalyzerState {
  lastAnalysisTime: number;
  analysisResults: AnalysisResult[];
  scheduledTasks: string[];
}

interface AnalysisResult {
  timestamp: number;
  campaignId: string;
  findings: Finding[];
  recommendations: Recommendation[];
}

interface Finding {
  type: 'trend' | 'anomaly' | 'opportunity';
  description: string;
  severity: 'low' | 'medium' | 'high';
  data: Record<string, unknown>;
}

interface Recommendation {
  action: string;
  priority: number;
  expectedImpact: string;
}

export class DataAnalyzerAgent extends Agent<Env, AnalyzerState> {
  initialState: AnalyzerState = {
    lastAnalysisTime: 0,
    analysisResults: [],
    scheduledTasks: [],
  };

  async onStart() {
    console.log('[DataAnalyzerAgent] Started');

    // 启动定期分析任务
    await this.scheduleAnalysisTasks();
  }

  /**
   * 调度定期分析任务
   */
  private async scheduleAnalysisTasks() {
    // 每15分钟分析一次高花费Campaign
    await this.schedule(15 * 60, 'analyzeHighSpendCampaigns', {});

    // 每小时生成完整报告
    await this.schedule(60 * 60, 'generateHourlyReport', {});

    // 每天深度分析
    await this.schedule('0 0 * * *', 'dailyDeepAnalysis', {}); // 每天午夜
  }

  /**
   * 分析高花费Campaign
   */
  async analyzeHighSpendCampaigns() {
    const db = getD1Connection(this.env);

    // 获取过去1小时花费超过$100的Campaign
    const highSpendCampaigns = await db.prepare(`
      SELECT 
        c.id,
        c.name,
        COUNT(DISTINCT cl.id) as clicks,
        COUNT(DISTINCT cv.id) as conversions,
        SUM(cl.cost) as total_cost,
        SUM(cv.payout) as total_revenue
      FROM campaigns c
      JOIN clicks cl ON cl.campaignId = c.id
      LEFT JOIN conversions cv ON cv.clickId = cl.id
      WHERE cl.timestamp > datetime('now', '-1 hour')
      GROUP BY c.id
      HAVING total_cost > 100
    `).all();

    for (const campaign of highSpendCampaigns.results) {
      const roi = (campaign.total_revenue - campaign.total_cost) / campaign.total_cost;

      if (roi < -0.3) {
        // ROI过低，触发OptimizerAgent决策
        await this.triggerOptimizerDecision(campaign.id);
      }
    }
  }

  /**
   * 生成小时报告
   */
  async generateHourlyReport() {
    const db = getD1Connection(this.env);

    // 聚合过去1小时的数据
    const hourlyStats = await db.prepare(`
      SELECT 
        strftime('%Y-%m-%d %H:00:00', cl.timestamp) as hour,
        COUNT(*) as clicks,
        COUNT(cv.id) as conversions,
        AVG(cl.cost) as avg_cpc,
        SUM(cv.payout) as revenue
      FROM clicks cl
      LEFT JOIN conversions cv ON cv.clickId = cl.id
      WHERE cl.timestamp > datetime('now', '-1 hour')
      GROUP BY hour
    `).all();

    // 使用AI生成洞察
    const insights = await this.generateAIInsights(hourlyStats.results);

    // 存储结果
    this.setState({
      ...this.state,
      analysisResults: [
        ...this.state.analysisResults,
        {
          timestamp: Date.now(),
          campaignId: 'all',
          findings: insights.findings,
          recommendations: insights.recommendations,
        },
      ],
    });

    // 发送通知
    await this.sendNotification('hourly_report', insights);
  }

  /**
   * 每日深度分析
   */
  async dailyDeepAnalysis() {
    // 1. 识别趋势
    const trends = await this.identifyTrends();

    // 2. 检测异常
    const anomalies = await this.detectAnomalies();

    // 3. 发现机会
    const opportunities = await this.discoverOpportunities();

    // 4. 生成AI总结
    const summary = await this.generateDailySummary({
      trends,
      anomalies,
      opportunities,
    });

    // 存储并通知
    console.log('[DailyAnalysis]', summary);
  }

  /**
   * 触发OptimizerAgent决策
   */
  private async triggerOptimizerDecision(campaignId: string) {
    // 通过DO RPC调用OptimizerAgent
    const optimizerId = this.env.OPTIMIZER_AGENT.idFromName(campaignId);
    const optimizer = this.env.OPTIMIZER_AGENT.get(optimizerId);

    await optimizer.fetch('http://internal/decide', {
      method: 'POST',
      body: JSON.stringify({ campaignId, urgency: 'high' }),
    });
  }

  /**
   * 使用AI生成洞察
   */
  private async generateAIInsights(stats: unknown[]): Promise<{ findings: Finding[]; recommendations: Recommendation[] }> {
    const prompt = `
Analyze the following hourly performance data and identify trends, anomalies, and opportunities:

${JSON.stringify(stats, null, 2)}

Provide findings and recommendations in JSON format.
`;

    const response = await this.env.AI.run("@cf/meta/llama-3.1-8b-instruct", {
      messages: [
        { role: "system", content: "You are a data analyst specializing in affiliate marketing performance." },
        { role: "user", content: prompt },
      ],
      max_tokens: 1000,
    });

    try {
      return JSON.parse(response.response);
    } catch {
      return { findings: [], recommendations: [] };
    }
  }

  // 其他分析方法...
  private async identifyTrends(): Promise<unknown[]> {
    return [];
  }

  private async detectAnomalies(): Promise<unknown[]> {
    return [];
  }

  private async discoverOpportunities(): Promise<unknown[]> {
    return [];
  }

  private async generateDailySummary(data: unknown): Promise<string> {
    return 'Daily summary';
  }

  private async sendNotification(type: string, data: unknown): Promise<void> {
    // 发送Webhook或邮件通知
  }
}
```

---

## 五、与现有系统集成

### 5.1 路由配置

```typescript
// src/index.ts
import { routeAgentRequest } from "agents";
import { CampaignOptimizerAgent } from "./agents/campaign-optimizer";
import { DataAnalyzerAgent } from "./agents/data-analyzer";

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);

    // 1. 优先处理Agent请求
    const agentResponse = await routeAgentRequest(request, env);
    if (agentResponse) {
      return agentResponse;
    }

    // 2. 现有API路由
    if (url.pathname.startsWith('/api/')) {
      return handleAPI(request, env);
    }

    // 3. 静态资源
    return env.ASSETS.fetch(request);
  },
};

export { CampaignOptimizerAgent, DataAnalyzerAgent };
```

### 5.2 触发Agent决策

```typescript
// src/services/platform/auto-executor.ts

export class AutoExecutor {
  async evaluateAndDecide(campaignId: string, metrics: Metrics) {
    // 获取或创建Agent实例
    const optimizerId = this.env.OPTIMIZER_AGENT.idFromName(campaignId);
    const optimizer = this.env.OPTIMIZER_AGENT.get(optimizerId);

    // 发送决策请求
    const response = await optimizer.fetch('http://internal/message', {
      method: 'POST',
      body: JSON.stringify({
        type: 'decide',
        request: {
          campaignId,
          metrics,
          context: this.buildContext(),
        },
      }),
    });

    const { decision } = await response.json();

    // 执行决策
    await this.executeDecision(campaignId, decision);

    return decision;
  }

  private async executeDecision(campaignId: string, decision: Decision) {
    const platformManager = PlatformManager.createDefault();

    switch (decision.action) {
      case 'BLOCK':
        await platformManager.executeAction('propellerads', 'exclude_zone', {
          campaignId,
          zoneId: decision.zoneId,
        });
        break;

      case 'INCREASE_BID':
        await platformManager.executeAction('propellerads', 'adjust_bid', {
          campaignId,
          bid: decision.parameters?.bidAdjustment,
        });
        break;

      case 'PAUSE':
        await platformManager.executeAction('propellerads', 'pause_campaign', {
          campaignId,
        });
        break;

      // ... 其他操作
    }

    // 记录执行结果
    await this.logAction(campaignId, decision);
  }
}
```

### 5.3 前端集成

```typescript
// frontend/src/hooks/useOptimizerAgent.ts
import { useAgent } from "agents/react";

export function useCampaignOptimizer(campaignId: string) {
  const { state, send, connected } = useAgent({
    agent: "OPTIMIZER_AGENT",
    name: campaignId,
  });

  const requestDecision = (metrics: Metrics) => {
    send(JSON.stringify({
      type: 'decide',
      request: { campaignId, metrics },
    }));
  };

  const getInsights = () => {
    send(JSON.stringify({
      type: 'get_insights',
      campaignId,
    }));
  };

  return {
    decision: state?.lastDecision,
    insights: state?.insights,
    history: state?.decisionHistory,
    connected,
    requestDecision,
    getInsights,
  };
}
```

---

## 六、部署步骤

### 6.1 安装依赖

```bash
npm install agents
```

### 6.2 更新 wrangler.toml

```toml
# 添加AI绑定
[ai]
binding = "AI"

# 添加Agent DO
[[durable_objects.bindings]]
name = "OPTIMIZER_AGENT"
class_name = "CampaignOptimizerAgent"

[[durable_objects.bindings]]
name = "ANALYZER_AGENT"
class_name = "DataAnalyzerAgent"

[[durable_objects.sqlite_namespaces]]
name = "OPTIMIZER_AGENT_SQLITE"
class_name = "CampaignOptimizerAgent"

[[durable_objects.sqlite_namespaces]]
name = "ANALYZER_AGENT_SQLITE"
class_name = "DataAnalyzerAgent"

[[migrations]]
tag = "v11"
new_sqlite_classes = ["CampaignOptimizerAgent", "DataAnalyzerAgent"]
```

### 6.3 部署

```bash
# 本地测试
npm run dev

# 部署
npx wrangler deploy
```

---

## 七、成本估算

| 组件 | 免费额度 | 预估用量 | 月成本 |
|------|---------|---------|--------|
| Workers AI (LLM) | 10K requests/day | ~5K/day | $0 |
| Durable Objects | 1M requests/day | ~100K/day | $0 |
| D1 | 5M rows read/day | ~1M/day | $0 |
| **总计** | - | - | **$0** (免费额度内) |

---

## 八、总结

**推荐方案**: 内嵌式部署

**核心优势**:
1. 低延迟 (<10ms) - DO间直接RPC
2. 数据一致性 - 直接访问D1
3. 简化运维 - 单一Worker
4. 成本优化 - 免费额度内

**关键Agent**:
1. **CampaignOptimizerAgent** - 实时决策：增加预算 vs Block vs 观察
2. **DataAnalyzerAgent** - 定期分析，发现趋势和异常

**决策流程**:
```
数据输入 → 规则引擎筛选 → AI深度分析 → 集成决策 → 自动执行 → 效果追踪
```

---

**文档版本**: 1.0.0
**更新日期**: 2026-04-08
**维护者**: AI Assistant
