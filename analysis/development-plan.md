# CFTracking 开发计划书

## 基于 Keitaro Demo 分析的系统性开发规划

**分析日期**: 2026-03-19  
**参考平台**: Keitaro Demo (https://demo.keitaro.io/admin/)  
**目标**: 全面优化 CFTracking 平台，达到行业领先水平

---

## 一、现状分析与差距评估

### 1.1 功能完整性差距

| 功能模块 | Keitaro | CFTracking | 差距等级 |
|----------|---------|------------|----------|
| Dashboard | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 中等 |
| Campaigns | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 中等 |
| Landing Pages | ⭐⭐⭐⭐⭐ | ⭐⭐ | 较大 |
| Offers | ⭐⭐⭐⭐⭐ | ⭐⭐ | 较大 |
| Traffic Sources | ⭐⭐⭐⭐⭐ | ⭐⭐ | 较大 |
| Affiliate Networks | ⭐⭐⭐⭐⭐ | ⭐⭐ | 较大 |
| Reports | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | 中等 |
| Trends | ⭐⭐⭐⭐ | ❌ | 缺失 |
| Domains | ⭐⭐⭐⭐ | ❌ | 缺失 |
| Users | ⭐⭐⭐⭐ | ❌ | 缺失 |
| Settings | ⭐⭐⭐⭐⭐ | ⭐ | 很大 |

### 1.2 设计系统差距

| 维度 | Keitaro | CFTracking | 优先级 |
|------|---------|------------|--------|
| 色彩一致性 | 优秀 | 良好 | 高 |
| 布局规范 | 优秀 | 良好 | 高 |
| 组件统一 | 优秀 | 一般 | 高 |
| 数据可视化 | 优秀 | 一般 | 中 |
| 交互体验 | 优秀 | 一般 | 中 |
| 响应式设计 | 良好 | 良好 | 低 |

---

## 二、开发阶段规划

### 阶段一：核心功能完善 (4周)

#### Week 1-2: Dashboard 重构
**目标**: 打造专业级数据仪表盘

**任务清单**:
- [ ] 重新设计 Dashboard 布局
  - 参考 Keitaro 的统计卡片布局
  - 实现 7 个核心指标卡片 (Clicks, UC, Conv., Cost, Revenue, Profit, ROI)
  - 添加趋势指示器 (上升/下降箭头)
  
- [ ] 集成图表组件
  - 使用 Recharts 实现面积图 (Clicks & Conversions Trend)
  - 添加时间范围选择器 (Today, Yesterday, Last 7 Days, etc.)
  
- [ ] 实现 Entity 统计表
  - Campaigns 统计表
  - Landings 统计表
  - Offers 统计表
  
- [ ] Recent Clicks 实时日志
  - 实现最近点击记录表格
  - 添加自动刷新功能 (30秒)

**技术要点**:
```typescript
// Dashboard 状态管理
interface DashboardState {
  range: {
    from: string;
    to: string;
    interval: 'today' | 'yesterday' | 'week' | 'month';
  };
  enabledMetrics: string[];
  enabledEntities: string[];
  recentClicksColumns: string[];
}
```

**交付物**:
- Dashboard.tsx 重构完成
- Dashboard 组件库
- 截图对比报告

---

#### Week 3-4: Campaigns 模块增强
**目标**: 实现完整的 Campaign 管理功能

**任务清单**:
- [ ] Campaign 列表页优化
  - 添加高级筛选器 (流量源、分组、状态、时间)
  - 实现列自定义功能
  - 添加批量操作 (启用/禁用/删除)
  - 实现分页组件
  
- [ ] Campaign 创建/编辑表单
  - 设计多标签页表单 (Main, Schema, Filters, Monitoring, Notes)
  - 实现 Flow 架构设计器
  - 添加过滤器配置界面
  - 实现监控设置
  
- [ ] Campaign 详情页
  - 添加 Overview 标签页 (统计数据、图表)
  - 实现 Flow 可视化
  - 添加 Clicks Log 查看
  - 实现 Conversions 统计

**表单字段设计**:
```typescript
// Campaign 表单字段
interface CampaignForm {
  // Main Tab
  name: string;
  domain: string;
  alias: string;
  group: string;
  trafficSource: string;
  flowRotation: 'weight' | 'priority' | 'random';
  costModel: 'cpc' | 'cpa' | 'cpm';
  uniquenessTTL: number;
  visitorBinding: 'none' | 'cookie' | 'ip';
  status: 'active' | 'paused';
  
  // Schema Tab
  flows: Flow[];
  
  // Filters Tab
  filters: Filter[];
  filterLogic: 'AND' | 'OR';
  
  // Monitoring Tab
  monitoringEnabled: boolean;
  alerts: AlertConfig[];
}
```

**交付物**:
- CampaignManagement.tsx 重构
- CampaignDetail.tsx 重构
- CampaignForm 组件
- FlowDesigner 组件

---

### 阶段二：功能模块扩展 (4周)

#### Week 5-6: Landing Pages & Offers
**目标**: 实现 Landing Page 和 Offer 管理

**Landing Pages 模块**:
- [ ] Landing Page 列表
  - 显示关联 Campaign 数量
  - 显示点击/转化统计
  
- [ ] Landing Page 创建/编辑
  - 名称、URL、分组
  - 关联 Campaign 选择
  - 参数配置

**Offers 模块**:
- [ ] Offer 列表
  - 显示 Affiliate Network
  - 显示 payout 信息
  - 显示状态
  
- [ ] Offer 创建/编辑
  - 名称、URL、分组
  - Affiliate Network 选择
  - Payout 设置
  - 参数模板配置

**交付物**:
- Landings.tsx 完整实现
- Offers.tsx 完整实现
- 相关 API 接口

---

#### Week 7-8: Traffic Sources & Affiliate Networks
**目标**: 实现流量源和联盟网络管理

**Traffic Sources 模块**:
- [ ] Traffic Source 列表
  - 显示参数模板
  - 显示 Postback URL
  
- [ ] Traffic Source 创建/编辑
  - 名称、类型
  - 参数模板配置
  - Postback URL 设置
  - Cost 模型配置

**Affiliate Networks 模块**:
- [ ] Affiliate Network 列表
  - 显示 Offer 数量
  - 显示参数模板
  
- [ ] Affiliate Network 创建/编辑
  - 名称、类型
  - Offer 参数模板
  - Postback URL 配置
  - Payout 设置

**交付物**:
- TrafficSources.tsx 完整实现
- AffiliateNetworks.tsx 完整实现
- 相关 API 接口

---

### 阶段三：报告系统升级 (3周)

#### Week 9-10: Reports 重构
**目标**: 打造专业级报告系统

**任务清单**:
- [ ] 报告查询界面
  - 时间范围选择器 (日历组件)
  - 多级分组选择 (最多5层)
  - 指标选择器
  - 高级筛选器
  
- [ ] 报告展示
  - 统计概览卡片
  - 趋势图表
  - 数据表格 (支持展开/折叠)
  - 导出功能 (CSV, Excel)
  
- [ ] 报告类型
  - Default Campaign Report
  - Default Source Report
  - Default Landing Page Report
  - Default Offer Report
  - Custom Report

**分组选项**:
```typescript
const GROUPING_OPTIONS = [
  // Campaign
  { value: 'campaign', label: 'Campaign', category: 'Campaign' },
  { value: 'flow', label: 'Flow', category: 'Campaign' },
  { value: 'landing', label: 'Landing Page', category: 'Campaign' },
  { value: 'offer', label: 'Offer', category: 'Campaign' },
  { value: 'source', label: 'Traffic Source', category: 'Campaign' },
  
  // Geo
  { value: 'country', label: 'Country', category: 'Geo' },
  { value: 'region', label: 'Region/State', category: 'Geo' },
  { value: 'city', label: 'City', category: 'Geo' },
  { value: 'isp', label: 'ISP', category: 'Geo' },
  
  // Device
  { value: 'device_type', label: 'Device Type', category: 'Device' },
  { value: 'os', label: 'Operating System', category: 'Device' },
  { value: 'browser', label: 'Browser', category: 'Device' },
  
  // Network
  { value: 'ip', label: 'IP Address', category: 'Network' },
  { value: 'connection_type', label: 'Connection Type', category: 'Network' },
];
```

**交付物**:
- Reports.tsx 重构
- ReportBuilder 组件
- 图表组件库

---

#### Week 11: Clicks Log & Conversions Log
**目标**: 实现详细的点击和转化日志

**任务清单**:
- [ ] Clicks Log
  - 详细的点击记录表格
  - 支持筛选和搜索
  - 显示设备、地理位置信息
  
- [ ] Conversions Log
  - 转化记录表格
  - 显示转化详情
  - 支持导出

**交付物**:
- ClicksLog.tsx
- ConversionsLog.tsx

---

### 阶段四：设计系统统一 (3周)

#### Week 12-13: UI 组件库建设
**目标**: 建立统一的设计系统

**任务清单**:
- [ ] 色彩系统规范
  ```css
  :root {
    /* Primary - 保持现有蓝色系 */
    --color-primary: #041627;
    --color-primary-light: #1a2b3c;
    --color-secondary: #006b5c;
    --color-secondary-light: #44ddc1;
    
    /* Semantic Colors */
    --color-success: #65c367;
    --color-warning: #f5a623;
    --color-error: #ba1a1a;
    --color-info: #1e88e5;
    
    /* Neutrals */
    --color-background: #ffffff;
    --color-surface: #f7f9fb;
    --color-border: #c4c6cd;
    --color-text-primary: #212121;
    --color-text-secondary: #44474c;
  }
  ```
  
- [ ] 组件规范
  - Button 组件 (Primary, Secondary, Ghost, Link)
  - Input 组件 (Text, Select, DatePicker)
  - Table 组件 (Sortable, Filterable, Paginated)
  - Card 组件
  - Modal/Drawer 组件
  - Chart 组件
  
- [ ] 布局规范
  - 侧边栏 (240px 固定宽度)
  - 顶部导航栏 (56px 高度)
  - 内容区域 (自适应)
  - 间距系统 (4px, 8px, 12px, 16px, 24px, 32px)

**交付物**:
- UI 组件库文档
- Storybook 配置
- 组件代码

---

#### Week 14: 全局优化
**目标**: 完善细节和性能优化

**任务清单**:
- [ ] 响应式适配
  - 移动端侧边栏折叠
  - 表格横向滚动
  - 表单自适应
  
- [ ] 性能优化
  - 代码分割 (Code Splitting)
  - 懒加载 (Lazy Loading)
  - 虚拟滚动 (Virtual Scrolling)
  
- [ ] 交互优化
  - 加载状态统一
  - 错误提示优化
  - 空状态设计
  - 动画效果

**交付物**:
- 性能优化报告
- 响应式适配完成

---

### 阶段五：高级功能 (4周)

#### Week 15-16: Trends & Analytics
**目标**: 实现趋势分析和高级统计

**任务清单**:
- [ ] Trends 模块
  - 时间序列图表
  - 对比分析
  - 预测功能
  
- [ ] 实时数据
  - WebSocket 连接
  - 实时点击流
  - 实时统计更新

**交付物**:
- Trends.tsx
- RealtimeDashboard.tsx

---

#### Week 17-18: Settings & System
**目标**: 实现完整的系统设置

**Settings 模块**:
- [ ] Main Settings
  - 基础配置
  - 时区设置
  - 货币设置
  
- [ ] Bot Lists
  - Bot 检测规则
  - IP 黑名单/白名单
  
- [ ] System
  - 系统状态
  - 日志查看
  - 备份恢复
  
- [ ] Users
  - 用户管理
  - 权限控制
  
- [ ] Integrations
  - 第三方集成
  - API 密钥管理

**交付物**:
- Settings.tsx
- 各设置子页面

---

## 三、技术实现方案

### 3.1 前端架构

```
frontend/
├── src/
│   ├── components/          # UI 组件库
│   │   ├── ui/             # 基础组件
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Table.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── Chart.tsx
│   │   ├── layout/         # 布局组件
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   └── Layout.tsx
│   │   └── forms/          # 表单组件
│   │       ├── CampaignForm.tsx
│   │       ├── FilterBuilder.tsx
│   │       └── FlowDesigner.tsx
│   ├── pages/              # 页面组件
│   │   ├── Dashboard.tsx
│   │   ├── Campaigns/
│   │   │   ├── List.tsx
│   │   │   ├── Detail.tsx
│   │   │   └── Form.tsx
│   │   ├── Reports/
│   │   │   ├── Index.tsx
│   │   │   └── Builder.tsx
│   │   └── Settings/
│   ├── hooks/              # 自定义 Hooks
│   │   ├── useURLState.ts
│   │   ├── useCampaign.ts
│   │   └── useReports.ts
│   ├── services/           # API 服务
│   │   ├── api.ts
│   │   ├── campaign.ts
│   │   └── reports.ts
│   ├── utils/              # 工具函数
│   │   ├── format.ts
│   │   ├── validate.ts
│   │   └── chart.ts
│   ├── types/              # TypeScript 类型
│   │   ├── campaign.ts
│   │   ├── reports.ts
│   │   └── common.ts
│   └── styles/             # 样式文件
│       ├── variables.css
│       └── components.css
```

### 3.2 后端 API 规划

```typescript
// Campaign API
GET    /api/campaigns              // 列表
POST   /api/campaigns              // 创建
GET    /api/campaigns/:id          // 详情
PUT    /api/campaigns/:id          // 更新
DELETE /api/campaigns/:id          // 删除
GET    /api/campaigns/:id/stats    // 统计
GET    /api/campaigns/:id/clicks   // 点击日志

// Reports API
GET    /api/reports                // 报告列表
POST   /api/reports                // 创建报告
GET    /api/reports/:id            // 报告详情
POST   /api/reports/query          // 查询数据
GET    /api/reports/export         // 导出报告

// Analytics API
GET    /api/analytics/dashboard    // Dashboard 数据
GET    /api/analytics/trends       // 趋势数据
GET    /api/analytics/realtime     // 实时数据
```

### 3.3 数据库 Schema 扩展

```sql
-- Campaigns 表扩展
ALTER TABLE campaigns ADD COLUMN flow_rotation TEXT DEFAULT 'weight';
ALTER TABLE campaigns ADD COLUMN cost_model TEXT DEFAULT 'cpc';
ALTER TABLE campaigns ADD COLUMN uniqueness_ttl INTEGER DEFAULT 86400;
ALTER TABLE campaigns ADD COLUMN visitor_binding TEXT DEFAULT 'none';
ALTER TABLE campaigns ADD COLUMN parameters TEXT; -- JSON

-- Flows 表
CREATE TABLE flows (
  id TEXT PRIMARY KEY,
  campaign_id TEXT REFERENCES campaigns(id),
  name TEXT NOT NULL,
  weight INTEGER DEFAULT 100,
  position INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Filters 表
CREATE TABLE filters (
  id TEXT PRIMARY KEY,
  campaign_id TEXT REFERENCES campaigns(id),
  flow_id TEXT REFERENCES flows(id),
  type TEXT NOT NULL,
  operator TEXT NOT NULL,
  value TEXT NOT NULL,
  is_not BOOLEAN DEFAULT 0,
  position INTEGER DEFAULT 0
);

-- Reports 表
CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT DEFAULT 'custom',
  config TEXT, -- JSON
  created_by TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 四、里程碑与验收标准

### 里程碑一：核心功能 (Week 4)
**验收标准**:
- [ ] Dashboard 页面功能完整，数据展示正常
- [ ] Campaigns 列表、创建、编辑、详情功能完整
- [ ] 所有页面无 JavaScript 错误
- [ ] 响应式适配完成

### 里程碑二：功能扩展 (Week 8)
**验收标准**:
- [ ] Landing Pages、Offers、Traffic Sources、Affiliate Networks 功能完整
- [ ] 数据关联正常 (Campaign -> Landing -> Offer)
- [ ] 所有 CRUD 操作正常

### 里程碑三：报告系统 (Week 11)
**验收标准**:
- [ ] Reports 查询功能完整
- [ ] 支持多级分组
- [ ] 图表展示正常
- [ ] 导出功能可用

### 里程碑四：设计统一 (Week 14)
**验收标准**:
- [ ] UI 组件库完成
- [ ] 所有页面风格统一
- [ ] 性能指标达标 (首屏 < 3s)

### 里程碑五：高级功能 (Week 18)
**验收标准**:
- [ ] Trends 功能完整
- [ ] Settings 功能完整
- [ ] 系统稳定性测试通过

---

## 五、资源分配

### 人力资源
- **前端开发**: 1-2 人
- **后端开发**: 1 人
- **UI/UX 设计**: 1 人 (兼职)
- **测试**: 1 人 (兼职)

### 技术资源
- **开发环境**: Cloudflare Workers + D1
- **测试环境**: 已部署的 Workers 环境
- **设计工具**: Figma (可选)

### 时间投入
- **总工期**: 18 周 (约 4.5 个月)
- **每周工时**: 40 小时
- **总工时**: 720 小时

---

## 六、风险评估与应对

| 风险 | 可能性 | 影响 | 应对措施 |
|------|--------|------|----------|
| 后端 API 开发延迟 | 中 | 高 | 使用 Mock 数据先行开发前端 |
| 性能优化困难 | 中 | 中 | 提前进行性能测试，预留优化时间 |
| 设计变更 | 低 | 中 | 建立设计评审机制 |
| 第三方依赖问题 | 低 | 低 | 选择成熟稳定的库 |

---

## 七、下一步行动

1. **立即执行**: Dashboard 重构 (Week 1-2)
2. **准备资源**: 确认后端 API 开发计划
3. **设计确认**: 确定最终色彩体系和组件规范
4. **开发启动**: 按照阶段规划逐步实施

---

**报告生成时间**: 2026-03-19  
**负责人**: AI Assistant  
**审核状态**: 待确认
