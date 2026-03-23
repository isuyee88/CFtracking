# CFTracking 开发完善计划

## 1. 计划概述

本文档基于Keitaro的对标分析和CFTracking当前的开发状态，制定系统性的开发完善计划。该计划涵盖核心功能模块、技术架构、用户体验和实施路线图，旨在将CFTracking发展为功能完善的广告跟踪系统。

## 2. 当前状态分析

### 2.1 已完成功能

| 模块 | 功能 | 完成度 |
|------|------|--------|
| Campaign | 域名配置、Alias、Group、Flow Rotation | 80% |
| Flow | 创建/编辑、权重、状态 | 70% |
| Landing Page | 创建/编辑、URL配置、状态管理 | 60% |
| Offer | 创建/编辑、URL配置、Payout、货币 | 80% |
| Tracking | 基础点击追踪、参数传递 | 50% |
| Rules | 基础条件规则 | 40% |

### 2.2 关键缺失功能

| 优先级 | 功能 | 缺失原因 |
|--------|------|----------|
| P0 | Uniqueness验证系统 | 核心功能未实现 |
| P0 | Campaign URL自动生成 | 前端界面未完成 |
| P1 | Flow Filters | 规则引擎未完善 |
| P1 | Flow Actions | 动作类型未实现 |
| P1 | Statistics报表系统 | 数据聚合未完成 |
| P2 | S2S Postback | 高级功能待开发 |

## 3. 开发完善路线图

### 3.1 第一阶段：核心追踪功能完善（2-3周）

#### 3.1.1 Uniqueness验证系统

**目标**：实现完整的去重验证功能

**技术方案**：
- 使用Cloudflare KV存储去重数据
- 支持多种去重模式：IP、Cookie、User-Agent、自定义参数
- 实现Uniqueness TTL配置
- 优化存储结构，减少KV操作次数

**实现任务**：
```
1. 创建 uniqueness.kv.ts 服务
   - setUniqueness(key, ttl): 写入去重记录
   - checkUniqueness(key): 检查去重状态
   - deleteUniqueness(key): 删除去重记录

2. 修改 click.service.ts
   - 在点击处理前调用去重验证
   - 根据Campaign配置选择去重模式
   - 返回唯一/非唯一状态

3. 修改 Campaign 数据模型
   - 添加 uniqueness_method 字段
   - 添加 uniqueness_ttl 字段
   - 更新数据库 schema
```

**验收标准**：
- IP去重功能正常工作
- Cookie去重功能正常工作
- 自定义参数去重功能正常工作
- TTL过期后自动清除

#### 3.1.2 Campaign URL自动生成

**目标**：实现自动生成追踪链接

**技术方案**：
- 基于Campaign的Domain和Alias自动生成URL
- 支持自定义参数前缀
- 前端实时预览生成的链接

**实现任务**：
```
1. 在 campaign.service.ts 添加 URL 生成方法
   - generateCampaignUrl(campaign): string
   - generateClickUrl(campaign, params): string

2. 修改前端 CampaignForm.tsx
   - 添加 URL 预览组件
   - 实时显示生成的链接
   - 支持复制链接功能

3. 添加 Domain 管理功能
   - Domain CRUD 接口
   - Domain 验证功能
```

**验收标准**：
- 自动生成正确格式的Campaign URL
- 前端实时显示生成的链接
- 支持自定义参数

### 3.2 第二阶段：Flow高级功能（2-3周）

#### 3.2.1 Flow Filters

**目标**：实现完整的流量过滤功能

**技术方案**：
- 参考Keitaro的Filter设计
- 使用规则引擎处理复杂条件
- 支持多种过滤类型：国家、设备、浏览器、ISP等

**实现任务**：
```
1. 完善 filter.ts 规则引擎
   - GeoFilter: 国家/地区过滤
   - DeviceFilter: 设备类型过滤
   - BrowserFilter: 浏览器过滤
   - IspFilter: ISP过滤
   - CustomFilter: 自定义参数过滤

2. 修改 flow.engine.ts
   - 集成 Filter 引擎
   - 执行过滤逻辑
   - 返回过滤结果

3. 创建 Flow Filter UI
   - FilterBuilder 组件
   - FilterConditions 配置界面
```

**验收标准**：
- 所有过滤类型正常工作
- 多个过滤条件可以组合使用
- 过滤结果准确

#### 3.2.2 Flow Actions

**目标**：实现多种流量动作

**技术方案**：
- 标准化Action接口
- 支持多种Action类型：重定向、JS注入、iframe等

**实现任务**：
```
1. 创建 action.types.ts
   - RedirectAction: 302/301重定向
   - JavaScriptAction: JS注入
   - IframeAction: 隐藏iframe
   - DirectOfferAction: 直接显示Offer

2. 修改 flow-action.service.ts
   - Action 执行引擎
   - Action 参数处理
   - Action 结果返回

3. 创建 Flow Action UI
   - Action 选择器
   - Action 配置表单
```

**验收标准**：
- 302重定向正常工作
- JavaScript注入正常工作
- 多Action可以组合使用

### 3.3 第三阶段：统计报表系统（2-3周）

#### 3.3.1 实时统计

**目标**：实现完整的统计报表功能

**技术方案**：
- 使用D1进行数据聚合
- 使用KV缓存热点数据
- 实现多维度统计

**实现任务**：
```
1. 完善 aggregation.service.ts
   - 按Campaign聚合
   - 按Flow聚合
   - 按Offer聚合
   - 按流量来源聚合

2. 创建 Dashboard 组件
   - 关键指标卡片
   - 趋势图表
   - 实时数据刷新

3. 创建 Reports 页面
   - Campaign Reports
   - Offers Reports
   - Traffic Sources Reports
```

**验收标准**：
- Dashboard显示真实统计数据
- 支持时间范围选择
- 数据实时刷新

#### 3.3.2 数据导出

**目标**：实现数据导出功能

**技术方案**：
- 支持CSV/Excel导出
- 批量导出大量数据

**实现任务**：
```
1. 完善 export.service.ts
   - CSV格式化
   - Excel格式化
   - 大数据分片导出

2. 创建 Export 组件
   - 导出格式选择
   - 时间范围选择
   - 数据字段选择
```

**验收标准**：
- CSV导出正常
- Excel导出正常
- 支持大量数据导出

### 3.4 第四阶段：高级功能（2-3周）

#### 3.4.1 S2S Postback

**目标**：实现服务器到服务器回传

**技术方案**：
- 标准化的Postback接口
- 支持多种回传协议
- 实现重试机制

**实现任务**：
```
1. 创建 postback.service.ts
   - sendPostback(url, params): Promise
   - retryPostback(postback): Promise
   - verifyPostback signature: boolean

2. 创建 Postback 接口
   - /api/postback/:campaign_id
   - 参数验证
   - 回传触发

3. 创建 Postback 配置界面
   - 回传URL配置
   - 回传参数映射
   - 回传测试工具
```

**验收标准**：
- S2S回传正常工作
- 回传重试机制正常
- 回传日志记录完整

#### 3.4.2 A/B测试

**目标**：实现流量分割测试功能

**技术方案**：
- 基于权重的流量分割
- 统计显著性分析

**实现任务**：
```
1. 完善 abTest.service.ts
   - A/B测试配置
   - 流量分割逻辑
   - 统计分析

2. 创建 A/B测试 UI
   - 测试创建向导
   - 测试监控面板
   - 结果分析图表
```

**验收标准**：
- 流量按配置比例分割
- 统计结果准确
- 支持多个测试并行

### 3.5 第五阶段：用户体验优化（1-2周）

#### 3.5.1 界面优化

**目标**：提升用户体验

**实现任务**：
```
1. 完善 Campaign 界面
   - 向导式创建流程
   - 实时预览功能
   - 批量操作

2. 完善 Dashboard
   - 响应式设计优化
   - 图表交互增强
   - 数据加载优化

3. 添加帮助系统
   - 上下文帮助
   - 工具提示
   - 常见问题
```

#### 3.5.2 性能优化

**目标**：提升系统性能

**实现任务**：
```
1. 前端优化
   - 代码分割
   - 懒加载
   - 缓存优化

2. 后端优化
   - KV缓存策略
   - D1查询优化
   - 请求合并
```

## 4. 技术架构

### 4.1 数据存储策略

| 数据类型 | 存储方案 | 用途 | 生命周期 |
|----------|----------|------|----------|
| 唯一性检查 | Cloudflare Durable Objects (DO) | 原子计数器、去重判断 | 临时 |
| 点击/访客数据 | Cloudflare Analytics Engine (AE) | 主存储、时序数据、趋势分析 | 3个月免费 |
| 归档数据 | Cloudflare D1 | 永久存储、精确报表 | 永久 |
| 结构化配置 | Cloudflare D1 | Campaign、Flow、Offer等配置 | 永久 |
| 缓存数据 | Cloudflare KV | 热点数据缓存（仅缓存） | 临时 |
| 文件存储 | Cloudflare R2 | 导出文件、日志文件 | 永久 |

#### 4.1.1 Analytics Engine 数据模型设计

```typescript
// AE数据结构设计
interface AnalyticsDataPoint {
  // blobs: 字符串数组，最多4个
  blobs: [
    string, // blob1: Campaign ID
    string, // blob2: Flow ID / Country
    string, // blob3: Device Type / Traffic Source
    string  // blob4: Custom Parameter
  ];
  
  // doubles: 数值数组，最多8个
  doubles: [
    number, // double1: Clicks (1)
    number, // double2: Conversions (1)
    number, // double3: Revenue
    number, // double4: Cost
    number  // double5: unique visitors
  ];
  
  // indexes: 索引数组，最多3个（用于快速查询）
  indexes: [
    string  // index1: Campaign ID (核心索引)
  ];
}

// 自动字段
timestamp: number; // 自动添加时间戳
}

// AE SQL查询示例
const queries = {
  // 按Campaign统计
  byCampaign: `
    SELECT 
      blob1 as campaign_id,
      SUM(double1) as clicks,
      SUM(double2) as conversions,
      SUM(double3) as revenue,
      SUM(double4) as cost
    FROM cftracking_analytics
    WHERE timestamp BETWEEN ? AND ?
    GROUP BY blob1
    ORDER BY clicks DESC
  `,
  
  // 按国家和设备维度统计
  byGeoDevice: `
    SELECT 
      blob2 as country,
      blob3 as device,
      SUM(double1) as clicks,
      SUM(double2) as conversions
    FROM cftracking_analytics
    WHERE blob1 = ?
    GROUP BY blob2, blob3
  `,
  
  // 每日趋势
  dailyTrend: `
    SELECT 
      DATE(timestamp) as date,
      SUM(double1) as clicks,
      SUM(double2) as conversions
    FROM cftracking_analytics
    WHERE blob1 = ?
    GROUP BY DATE(timestamp)
    ORDER BY date DESC
  `
};
```

#### 4.1.2 数据存储架构

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         数据存储架构                                      │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  点击请求处理流程:                                                        │
│                                                                          │
│  点击请求                                                                 │
│      │                                                                   │
│      ▼                                                                   │
│  ┌─────────┐  唯一性检查                                                  │
│  │   DO   │ ───────────────────────────────────────────────────────►   │
│  │(去重)   │  原子操作，高吞吐量                                           │
│  └─────────┘                                                             │
│      │                                                                   │
│      │ 通过                                                               │
│      ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │                    Analytics Engine (AE)                          │     │
│  │  • 主存储，每点击直接写入                                           │     │
│  │  • 免费3个月存储                                                   │     │
│  │  • 高吞吐，非阻塞写入                                               │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│      │                                                                   │
│      │ 每天凌晨 Cron Job (汇总前一天数据)                                │
│      ▼                                                                   │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │                    D1 (归档存储)                                  │     │
│  │  • 永久存储                                                        │     │
│  │  • 3个月前历史数据                                                 │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  Dashboard数据读取:                                                        │
│  ┌─────────────────────────────────────────────────────────────────┐     │
│  │  时间范围判断                                                       │     │
│  │                                                                  │     │
│  │  ├── < 3个月 ──► AE读取 (时序数据、趋势分析)                      │     │
│  │  │                 优点: 写入即查、高吞吐                         │     │
│  │  │                 缺点: 数分钟延迟                               │     │
│  │  │                                                                  │     │
│  │  └── > 3个月 ──► D1读取 (归档数据、精确报表)                      │     │
│  │                      优点: 完整准确、永久存储                      │     │
│  │                      缺点: 需要等待每日汇总                         │     │
│  └─────────────────────────────────────────────────────────────────┘     │
│                                                                          │
│  KV用途（仅缓存）:                                                         │
│  • Campaign配置缓存                                                       │
│  • 热点数据缓存                                                           │
│  • 读取多写入少场景                                                       │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

#### 4.1.3 AE→D1每日汇总机制

**实现方式**：Cloudflare Cron Trigger

```typescript
// wrangler.toml
{
  "triggers": {
    "crons": ["0 0 * * *"]  // 每天凌晨0点执行
  }
}

// cron.worker.ts 或专门的 aggregation.worker.ts
export default {
  async scheduled(controller: Controller, env: Env, ctx: ExecutionContext) {
    // 1. 从AE查询昨天的数据
    const yesterdayStart = getYesterdayStart();
    const yesterdayEnd = getYesterdayEnd();

    const aeData = await queryAEForDateRange(yesterdayStart, yesterdayEnd);

    // 2. 汇总数据
    const aggregated = aggregateByCampaign(aeData);

    // 3. 写入D1
    await writeToD1(aggregated);

    // 4. 清理AE过期数据 (可选，AE会自动清理3个月前数据)
    console.log(`Aggregated ${aeData.length} records to D1`);
  }
};
```

#### 4.1.4 KV用途说明（仅缓存）

KV免费额度：每天100,000次读取，1,000次写入

| 缓存场景 | 读取频率 | 写入频率 | 适用性 |
|----------|----------|----------|--------|
| Campaign配置 | 高 | 低 | ✅ 适合 |
| 热点统计缓存 | 高 | 中 | ✅ 适合 |
| 会话数据 | 高 | 高 | ❌ 不适合 |
| 唯一性检查 | 高 | 高 | ❌ 用DO |

### 4.2 API设计

```
/api
  /campaigns          # Campaign CRUD
    GET/POST /campaigns
    GET/PUT/DELETE /campaigns/:id
    GET /campaigns/:id/stats
    
  /flows              # Flow CRUD
    GET/POST /flows
    GET/PUT/DELETE /flows/:id
    
  /offers             # Offer CRUD
    GET/POST /offers
    GET/PUT/DELETE /offers/:id
    
  /landings           # Landing Page CRUD
    GET/POST /landings
    GET/PUT/DELETE /landings/:id
    
  /traffic-sources    # Traffic Source CRUD
    GET/POST /traffic-sources
    GET/PUT/DELETE /traffic-sources/:id
    
  /tracking           # Tracking API
    GET /click        # 点击追踪
    POST /postback    # 转化回传
    
  /analytics          # Analytics API
    GET /dashboard    # Dashboard数据
    GET /reports      # 报表数据
    GET /trends      # 趋势数据
    
  /export             # Export API
    POST /csv         # CSV导出
    POST /excel       # Excel导出
    
  /ab-test            # A/B Test API
    GET/POST /ab-test
    GET/PUT/DELETE /ab-test/:id
```

### 4.3 目录结构

```
/src
  /config              # 配置文件
    constants.ts
    env.ts
    
  /handlers
    /d1                # D1数据库操作
      campaign.repo.ts
      flow.repo.ts
      offer.repo.ts
      ...
    /kv                # KV存储操作
      uniqueness.kv.ts
      cache.kv.ts
      ...
      
  /services
    /campaign          # Campaign服务
    /flow              # Flow服务
    /offer             # Offer服务
    /tracking          # Tracking服务
    /analytics         # Analytics服务
    /ab-test           # A/B Test服务
    /export            # Export服务
    
  /routes              # API路由
    campaign.routes.ts
    flow.routes.ts
    ...
    
  /types               # 类型定义
    campaign.ts
    flow.ts
    ...
    
  /utils               # 工具函数
    date.ts
    crypto.ts
    url.ts
    ...
    
  /middleware          # 中间件
    auth.ts
    cors.ts
    error.ts
    
  /index.ts            # 入口文件
```

## 5. 实施计划

### 5.1 迭代计划

| 迭代 | 时间 | 内容 | 交付物 |
|------|------|------|--------|
| Iteration 1 | 1周 | Uniqueness验证系统 | 去重功能可用 |
| Iteration 2 | 1周 | Campaign URL生成 | URL自动生成可用 |
| Iteration 3 | 1周 | Flow Filters | 过滤功能可用 |
| Iteration 4 | 1周 | Flow Actions | 动作功能可用 |
| Iteration 5 | 1周 | 实时统计 | Dashboard数据可用 |
| Iteration 6 | 1周 | 数据导出 | 导出功能可用 |
| Iteration 7 | 1周 | S2S Postback | 回传功能可用 |
| Iteration 8 | 1周 | A/B测试 | 测试功能可用 |
| Iteration 9 | 1周 | 体验优化 | UI/UX优化 |
| Iteration 10 | 1周 | 性能优化 | 性能提升 |

### 5.2 里程碑

| 里程碑 | 时间 | 验收标准 |
|--------|------|----------|
| M1: 核心追踪 | 2周 | Uniqueness + Campaign URL完成 |
| M2: Flow高级 | 2周 | Filters + Actions完成 |
| M3: 统计报表 | 2周 | Dashboard + Reports完成 |
| M4: 高级功能 | 2周 | S2S + A/B Test完成 |
| M5: 优化发布 | 2周 | 体验 + 性能优化完成 |

### 5.3 资源需求

| 角色 | 人数 | 负责内容 |
|------|------|----------|
| 前端开发 | 1人 | UI组件、页面开发 |
| 后端开发 | 1人 | API服务、业务逻辑 |
| 全栈开发 | 1人 | 数据模型、存储优化 |

## 6. 风险与对策

### 6.1 技术风险

| 风险 | 影响 | 对策 |
|------|------|------|
| KV存储限制 | 高并发下去重性能 | 批量操作 + 缓存优化 |
| D1查询性能 | 复杂统计查询慢 | 预聚合 + 缓存 |
| Workers配额 | 超出免费配额 | 优化请求 + 合理规划 |

### 6.2 功能风险

| 风险 | 影响 | 对策 |
|------|------|------|
| Filter规则复杂 | 实现困难 | 分阶段实现 |
| A/B测试统计 | 计算复杂 | 使用现有统计服务 |

## 7. 验收标准

### 7.1 功能验收

| 功能 | 验收条件 |
|------|----------|
| Uniqueness | IP/Cookie/自定义参数去重正常 |
| Campaign URL | 自动生成 + 前端预览 |
| Flow Filters | 6种过滤类型正常 |
| Flow Actions | 4种动作类型正常 |
| 统计报表 | Dashboard + Reports可用 |
| 数据导出 | CSV + Excel导出正常 |
| S2S Postback | 回传 + 重试正常 |
| A/B测试 | 分割 + 统计正常 |

### 7.2 性能验收

| 指标 | 目标 |
|------|------|
| 点击响应时间 | < 100ms |
| Dashboard加载 | < 2s |
| 报表生成 | < 5s |
| 并发支持 | 1000 QPS |

## 8. 总结

本计划基于Keitaro对标分析和CFTracking当前状态，制定了系统性的开发完善路线图。通过10个迭代的开发，将CFTracking打造为功能完善的广告跟踪系统。

计划涵盖：
- 核心追踪功能完善
- Flow高级功能实现
- 统计报表系统构建
- 高级功能开发
- 用户体验优化

通过分阶段、迭代式的开发方式，确保每个阶段都有可交付的成果，最终实现CFTracking的完整功能。