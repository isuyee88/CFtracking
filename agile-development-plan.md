# CFTracking vs Keitaro 敏捷开发改进计划

## 📋 执行摘要

基于 Keitaro Demo 的深度分析和智能体蜂群头脑风暴，制定了完整的敏捷开发计划，分 6 个 Sprint 逐步缩小与 Keitaro 的功能差距。

---

## 🎯 产品愿景 (Product Vision)

**愿景声明:**
> 打造 Cloudflare 生态下最强大的开源广告追踪平台，为全球广告主提供实时、精准、可扩展的流量追踪和优化解决方案。

**核心价值:**
1. **实时性** - 秒级数据更新，实时点击流监控
2. **精准性** - 多维度去重，精确归因分析
3. **可扩展性** - Cloudflare 边缘部署，全球低延迟
4. **易用性** - 直观的 Dashboard，完整的 URL 状态管理

---

## 📊 功能差距分析 (Gap Analysis)

### Keitaro 优势功能
| 功能 | Keitaro | CFTracking | 优先级 |
|------|---------|------------|--------|
| URL 状态管理 | ✅ 完整编码 | ❌ 缺失 | P0 |
| 实时点击流 | ✅ 43图表+实时表格 | ⚠️ 基础图表 | P0 |
| 数据导出 | ✅ CSV/Excel/PDF | ❌ 缺失 | P0 |
| 时区支持 | ✅ 全球时区 | ❌ 缺失 | P1 |
| A/B 测试 | ✅ 分流+统计 | ❌ 缺失 | P1 |
| 定时报告 | ✅ Cron+邮件 | ❌ 缺失 | P2 |
| Bot 检测 | ✅ 多维度检测 | ❌ 缺失 | P2 |
| 移动端优化 | ✅ 响应式 | ⚠️ 基础 | P3 |

---

## 📅 Sprint 规划

### Sprint 1: 核心基础 (2周) - 32 Story Points
**Sprint Goal:** 实现 URL 状态管理、时区支持和 Campaign 状态管理

| ID | 用户故事 | 优先级 | SP | 验收标准 |
|----|----------|--------|----|----------|
| US-001 | 作为广告主，我希望 URL 状态能持久化，便于分享和导航 | P0 | 5 | URL 编码所有筛选条件，支持前进/后退 |
| US-002 | 作为广告主，我希望支持多时区显示 | P1 | 3 | 支持全球主要时区，自动转换 |
| US-003 | 作为广告主，我希望 Dashboard 自动刷新 | P0 | 3 | 30秒自动刷新，显示最后更新时间 |
| US-004 | 作为广告主，我希望自定义显示指标 | P0 | 5 | 可启用/禁用指标，保存偏好 |
| US-005 | 作为广告主，我希望 Campaign 有状态管理 | P0 | 3 | Active/Paused/Draft 三种状态 |
| US-006 | 作为广告主，我希望看到实时点击流 | P0 | 8 | 最近点击表格，显示 IP/设备/来源 |
| US-007 | 作为系统管理员，我希望点击去重验证 | P0 | 5 | IP/UA/Cookie 多维度去重 |

**风险缓解:**
- KV 存储性能瓶颈 → 实施数据分片，D1 作为备选
- 实时数据延迟 → 缓存机制，30秒刷新间隔

---

### Sprint 2: 数据能力 (2周) - 28 Story Points
**Sprint Goal:** 实现数据导出、高级筛选和点击日志

| ID | 用户故事 | 优先级 | SP | 验收标准 |
|----|----------|--------|----|----------|
| US-008 | 作为广告主，我希望导出 CSV/Excel | P0 | 5 | 支持字段选择，最大10万条 |
| US-009 | 作为广告主，我希望查看点击日志 | P1 | 8 | 详细点击记录，支持筛选 |
| US-010 | 作为广告主，我希望高级筛选功能 | P1 | 5 | 多条件组合筛选，保存筛选模板 |
| US-011 | 作为广告主，我希望自定义表格列 | P1 | 3 | 显示/隐藏列，拖拽排序 |
| US-012 | 作为系统管理员，我希望查看转化日志 | P1 | 5 | 转化详情，归因分析 |
| US-013 | 作为广告主，我希望数据可视化配置 | P2 | 2 | 图表类型切换，颜色配置 |

---

### Sprint 3: 流量管理 (2周) - 30 Story Points
**Sprint Goal:** 实现黑白名单、流量限制和重定向规则

| ID | 用户故事 | 优先级 | SP | 验收标准 |
|----|----------|--------|----|----------|
| US-014 | 作为广告主，我希望设置黑白名单 | P1 | 5 | IP/UA/国家级别黑白名单 |
| US-015 | 作为广告主，我希望流量限制功能 | P1 | 5 | 点击数/预算/时间限制 |
| US-016 | 作为广告主，我希望重定向规则 | P1 | 8 | 多条件重定向，权重分配 |
| US-017 | 作为广告主，我希望时间计划投放 | P1 | 5 | 按时间段启用/暂停 |
| US-018 | 作为系统管理员，我希望 Bot 检测 | P2 | 5 | 多维度 Bot 识别，自动过滤 |
| US-019 | 作为广告主，我希望流量质量评分 | P2 | 2 | 质量指标，异常告警 |

---

### Sprint 4: A/B 测试 (2周) - 26 Story Points
**Sprint Goal:** 实现 A/B 测试分流和报告

| ID | 用户故事 | 优先级 | SP | 验收标准 |
|----|----------|--------|----|----------|
| US-020 | 作为广告主，我希望 Landing Page A/B 测试 | P1 | 8 | 多 LP 分流，权重设置 |
| US-021 | 作为广告主，我希望 Offer A/B 测试 | P1 | 8 | 多 Offer 分流，智能优化 |
| US-022 | 作为广告主，我希望查看 A/B 测试报告 | P1 | 5 | 统计显著性，置信区间 |
| US-023 | 作为广告主，我希望自动优化流量分配 | P2 | 3 | 基于 ROI 自动调整权重 |
| US-024 | 作为系统管理员，我希望多域名管理 | P2 | 2 | 域名绑定，SSL 配置 |

---

### Sprint 5: 报告系统 (2周) - 24 Story Points
**Sprint Goal:** 实现定时报告和趋势分析

| ID | 用户故事 | 优先级 | SP | 验收标准 |
|----|----------|--------|----|----------|
| US-025 | 作为广告主，我希望定时邮件报告 | P2 | 5 | Cron 配置，邮件模板 |
| US-026 | 作为广告主，我希望趋势分析报告 | P2 | 5 | 同比环比，趋势预测 |
| US-027 | 作为广告主，我希望自定义报告模板 | P2 | 3 | 保存模板，重复使用 |
| US-028 | 作为广告主，我希望导出 PDF 报告 | P2 | 5 | 专业排版，图表导出 |
| US-029 | 作为系统管理员，我希望报告权限管理 | P3 | 3 | 角色权限，数据隔离 |
| US-030 | 作为广告主，我希望报告订阅功能 | P3 | 3 | 多收件人，频率设置 |

---

### Sprint 6: 优化完善 (2周) - 20 Story Points
**Sprint Goal:** 移动端优化、性能提升和智能告警

| ID | 用户故事 | 优先级 | SP | 验收标准 |
|----|----------|--------|----|----------|
| US-031 | 作为广告主，我希望移动端友好 | P3 | 5 | 响应式布局，触摸优化 |
| US-032 | 作为系统管理员，我希望智能告警 | P3 | 5 | 异常检测，多渠道通知 |
| US-033 | 作为广告主，我希望性能优化 | P3 | 3 | <2秒加载，流畅交互 |
| US-034 | 作为系统管理员，我希望日志审计 | P3 | 3 | 操作日志，安全审计 |
| US-035 | 作为广告主，我希望帮助文档 | P3 | 2 | 使用指南，视频教程 |
| US-036 | 作为系统管理员，我希望系统监控 | P3 | 2 | 健康检查，性能指标 |

---

## 🏗️ 技术架构方案

### 系统架构图
```
┌─────────────────────────────────────────────────────────────┐
│                        客户端层                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Web App    │  │  Mobile App  │  │   API 调用   │      │
│  │  React 19    │  │  PWA/响应式  │  │   Postback   │      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
└─────────┼─────────────────┼─────────────────┼──────────────┘
          │                 │                 │
          └─────────────────┼─────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                    Cloudflare Edge                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Cloudflare Workers                        │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ │  │
│  │  │  API     │ │ Tracking │ │  Export  │ │  Report  │ │  │
│  │  │  Service │ │  Service │ │  Service │ │  Service │ │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Durable Objects (WebSocket)               │  │
│  │         实时点击流推送 / 状态管理                      │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│                      数据存储层                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │   D1     │  │   KV     │  │   R2     │  │  Queue   │    │
│  │  (主库)  │  │ (缓存)   │  │ (文件)   │  │(异步)    │    │
│  │ Campaign │  │  Click   │  │  Export  │  │  Report  │    │
│  │  Click   │  │  Session │  │   File   │  │   Job    │    │
│  │Conversion│  │   Cache  │  │          │  │          │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### 关键技术决策

#### 1. URL 状态管理
```typescript
// 使用 React Router + 自定义 Hook
const useURLState = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  
  const encodeState = (state: DashboardState) => {
    // 使用 LZ-String 压缩
    return LZString.compressToEncodedURIComponent(JSON.stringify(state));
  };
  
  const decodeState = (encoded: string) => {
    return JSON.parse(LZString.decompressFromEncodedURIComponent(encoded));
  };
  
  return { encodeState, decodeState, setSearchParams };
};
```

#### 2. 实时点击流
```typescript
// WebSocket + Durable Objects
export class ClickStream extends DurableObject {
  async fetch(request: Request) {
    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);
    
    this.ctx.acceptWebSocket(server);
    
    // 订阅点击事件
    this.ctx.storage.put('subscribers', [...this.subscribers, server]);
    
    return new Response(null, {
      status: 101,
      webSocket: client
    });
  }
  
  async broadcastClick(click: ClickEvent) {
    this.subscribers.forEach(ws => {
      ws.send(JSON.stringify(click));
    });
  }
}
```

#### 3. 数据导出
```typescript
// 流式导出 + R2 存储
async function exportToCSV(env: Env, query: ExportQuery) {
  const stream = new ReadableStream({
    async start(controller) {
      // 写入表头
      controller.enqueue(formatCSVHeader(query.fields));
      
      // 分页查询
      let offset = 0;
      while (true) {
        const rows = await env.DB.prepare(query.sql)
          .bind(query.params)
          .all();
        
        if (rows.length === 0) break;
        
        for (const row of rows) {
          controller.enqueue(formatCSVRow(row));
        }
        
        offset += rows.length;
      }
      
      controller.close();
    }
  });
  
  // 上传到 R2
  await env.EXPORT_BUCKET.put(`exports/${fileId}.csv`, stream);
  
  return { downloadUrl: `/api/exports/${fileId}` };
}
```

#### 4. 时区支持
```typescript
// 统一 UTC 存储，前端转换
import { formatInTimeZone } from 'date-fns-tz';

const formatClickTime = (utcTime: string, userTimezone: string) => {
  return formatInTimeZone(
    new Date(utcTime),
    userTimezone,
    'yyyy-MM-dd HH:mm:ss'
  );
};
```

---

## 🧪 测试策略

### 测试金字塔
```
       /\
      /  \  E2E Tests (10%)
     /----\     Playwright
    /      \
   /--------\  Integration Tests (30%)
  /          \    Vitest + MSW
 /------------\
/              \ Unit Tests (60%)
/________________\   Vitest
```

### 核心测试用例

#### URL 状态管理 (TC-001~004)
| 用例 | 场景 | 预期结果 |
|------|------|----------|
| TC-001 | 筛选条件编码到 URL | URL 包含 s=xxx 参数 |
| TC-002 | 浏览器前进/后退 | 状态正确恢复 |
| TC-003 | 分享 URL | 其他用户看到相同视图 |
| TC-004 | 特殊字符处理 | 正确编码/解码 |

#### 实时点击流 (TC-005~009)
| 用例 | 场景 | 预期结果 |
|------|------|----------|
| TC-005 | WebSocket 连接 | 成功建立连接 |
| TC-006 | 数据推送 | 新点击实时显示 |
| TC-007 | 断线重连 | 自动恢复连接 |
| TC-008 | 大数据量 | 性能不下降 |
| TC-009 | 多标签页 | 同步更新 |

#### 数据导出 (TC-010~014)
| 用例 | 场景 | 预期结果 |
|------|------|----------|
| TC-010 | CSV 导出 | 文件正确生成 |
| TC-011 | Excel 导出 | 格式正确 |
| TC-012 | 大数据量 | 流式处理不OOM |
| TC-013 | 字段选择 | 只导出选中字段 |
| TC-014 | 权限控制 | 只能导出授权数据 |

---

## 📈 性能指标

| 指标 | 目标 | 测量方法 |
|------|------|----------|
| Dashboard 加载 | < 2秒 | Lighthouse |
| API 响应时间 | < 200ms | k6 |
| WebSocket 延迟 | < 100ms | 自定义埋点 |
| 数据导出速度 | > 1000条/秒 | 日志统计 |
| 并发用户 | > 1000 | 压力测试 |
| 可用性 | 99.9% | Uptime 监控 |

---

## 🚀 实施路线图

```
Month 1          Month 2          Month 3
├─ Sprint 1 ─┼─ Sprint 2 ─┼─ Sprint 3 ─┤
│ URL状态管理 │ 数据导出   │ 流量管理   │
│ 时区支持    │ 点击日志   │ 黑白名单   │
│ 实时点击流  │ 高级筛选   │ A/B测试    │
└────────────┴────────────┴────────────┘

Month 4          Month 5          Month 6
├─ Sprint 4 ─┼─ Sprint 5 ─┼─ Sprint 6 ─┤
│ A/B测试     │ 定时报告   │ 移动端优化 │
│ 分流算法    │ 趋势分析   │ 智能告警   │
│ 统计报告    │ PDF导出    │ 性能优化   │
└────────────┴────────────┴────────────┘
```

---

## 📝 下一步行动

请确认以下事项，我们将开始 Sprint 1 的实施：

1. **Sprint 1 Backlog 确认** - 是否同意 32 Story Points 的范围？
2. **技术方案确认** - 是否同意使用 Durable Objects 实现 WebSocket？
3. **优先级调整** - 是否有功能需要调整优先级？
4. **开始实施** - 确认后 Dev 团队开始编写代码

**建议:** 先实现 US-001 (URL 状态管理) 和 US-006 (实时点击流)，这两个功能对用户体验提升最大。

---

## 📊 Analytics Engine 字段映射

### 数据模型 (Analytics Engine 限制: blobs≤20, doubles≤20, indexes≤1)

#### indexes (1个)

| 索引 | 字段名 | 说明 |
|------|--------|------|
| index1 | campaignId | Campaign ID (用于索引查询) |

#### blobs (18个)

| 索引 | 字段名 | 说明 |
|------|--------|------|
| blob1 | ip | IP 地址 |
| blob2 | country | 国家代码 (如 HK, SG, US) |
| blob3 | city | 城市名称 |
| blob4 | device | 设备类型 (desktop, mobile, tablet) |
| blob5 | browser | 浏览器名称 (Chrome, Firefox, Safari) |
| blob6 | os | 操作系统 (Windows, macOS, iOS, Android) |
| blob7 | subId1 | 子 ID 1 |
| blob8 | subId2 | 子 ID 2 |
| blob9 | subId3 | 子 ID 3 |
| blob10 | subId4 | 子 ID 4 |
| blob11 | subId5 | 子 ID 5 |
| blob12 | utmSource | UTM 来源 |
| blob13 | utmMedium | UTM 媒介 |
| blob14 | utmCampaign | UTM 活动 |
| blob15 | referer | 来源页面 URL |
| blob16 | userAgent | 浏览器 User Agent 字符串 |
| blob17 | isp | 网络提供商名称 |
| blob18 | fingerprint | 硬件指纹 ID |

#### doubles (11个)

| 索引 | 字段名 | 说明 |
|------|--------|------|
| double1 | clickId | 点击 ID (数字格式，16位) |
| double2 | flowId | 流程 ID (数字格式) |
| double3 | landingPageId | 落地页 ID (数字格式) |
| double4 | offerId | Offer ID (数字格式) |
| double5 | visitorId | 访客 ID (数字格式，16位) |
| double6 | cost | 点击成本 |
| double7 | riskScore | 风险分数 (0-100) |
| double8 | cfBotScore | Cloudflare Bot 分数 (0-100) |
| double9 | connectionType | 连接类型编码 (0=未知, 4=4G, 5=5G, 6=WiFi) |
| double10 | proxy | 是否代理 (0=否, 1=是) |
| double11 | isBot | 是否机器人 (0=否, 1=是) |

### ID 生成规则

| ID 类型 | 格式 | 示例 | 数字位数 |
|---------|------|------|----------|
| Click ID | `clk_{时间戳13位}{随机数3位}` | `clk_1774106597680676` | 16 位 |
| Visitor ID | `vst_{时间戳13位}{随机数3位}` | `vst_1774106597123456` | 16 位 |
| Conversion ID | `cnv_{时间戳13位}{随机数3位}` | `cnv_1774106597987654` | 16 位 |
| Campaign ID | `c{数字}` | `c1`, `c100` | 自增 |
| Flow ID | `f{数字}` | `f1`, `f50` | 自增 |
| Landing Page ID | `lp{数字}` | `lp1`, `lp20` | 自增 |
| Offer ID | `o{数字}` | `o1`, `o50` | 自增 |

### 数据流架构

```
点击请求 → ClickService → Analytics Engine (实时写入)
                           ↓
                    D1 数据库 (通过定时任务聚合)
                           ↓
查询请求 → /api/clicks → 判断日期范围
                           ↓
           < 3个月 → Analytics Engine (实时查询)
           >= 3个月 → D1 数据库 (历史查询)
```

### 字段映射代码位置

| 文件 | 说明 |
|------|------|
| `src/handlers/analytics/index.ts` | Analytics Engine 写入逻辑 |
| `src/services/analytics/analytics-query.service.ts` | Analytics Engine 查询逻辑 |
| `src/services/analytics/analytics.routes.ts` | API 输出格式化 |
| `src/utils/crypto.ts` | ID 生成函数 |
