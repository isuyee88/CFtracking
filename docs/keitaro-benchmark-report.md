# Keitaro 对标分析报告

## 1. Offer 创建表单对比

### Keitaro Offer 字段列表

| 字段 | 类型 | 说明 | CFTracking 对应字段 |
|------|------|------|---------------------|
| Offer name | text | 必填，Offer 名称 | ✅ name |
| Group | select | Offer 分组 | ✅ group |
| Affiliate network | select | 关联的广告联盟 | ✅ network |
| **Action type** | radio | Local/Redirect/Preload/Action | ❌ 未实现 |
| **Redirect type** | select | 重定向类型 | ✅ redirectType |
| URL | url | 必填，Offer URL | ✅ url |
| Countries | multi-select | 国家定向 | ❌ 未实现 |
| Payout type | radio | CPA/CPC/RevShare | ✅ payoutType |
| Payout | number | 佣金金额 | ✅ payout |
| Payout currency | select | 货币类型 | ✅ currency (默认 USD) |
| From param 'payout' | checkbox | 从参数获取佣金 | ❌ 未实现 |
| Allow upsells | radio | 是否允许追加销售 | ❌ 未实现 |
| Conversion cap | radio + number | 转化上限 | ❌ 未实现 |
| Notes | textarea | 备注 | ✅ notes |

### Redirect Type 选项对比

| Keitaro 选项 | 说明 | CFTracking 实现 |
|------------|------|------------------|
| HTTP redirect | HTTP 302 重定向 | ✅ http |
| Meta redirect | Meta 标签重定向 | ✅ meta |
| JS redirect | JavaScript 重定向 | ✅ js |
| Redirect with blank referrer | 清除 referrer 的 JS 重定向 | ✅ js_blank |
| Double meta redirect | 双重 Meta 重定向，隐藏来源 | ✅ double |
| CURL | 加载外部页面 | ❌ 移除 |
| FormSubmit | 表单提交重定向 | ❌ 移除 |
| Open in iframe | iframe 显示 | ❌ 移除 |
| REMOTE | 请求 URL 获取重定向地址 | ✅ remote |

## 2. Campaign 创建表单对比

### Keitaro Campaign 字段列表

| 字段 | 类型 | 说明 | CFTracking 对应字段 |
|------|------|------|---------------------|
| Campaign name | text | 必填 | ✅ name |
| Campaign alias | text | URL 别名 | ✅ alias |
| Traffic source | select | 流量来源 | ✅ trafficSourceId |
| Status | select | active/paused/deleted | ✅ status |
| Type | select | Campaign 类型 | ✅ type |
| Uniqueness | select | 去重方式 | ✅ uniquenessMethod |
| Uniqueness TTL | number | 去重有效期 | ✅ uniquenessTTL |
| Cost model | select | 成本模型 | ✅ costModel |
| Default cost | number | 默认成本 | ✅ defaultCost |
| Default payout | number | 默认佣金 | ❌ 未实现 |
| Position | select | 广告位 | ❌ 未实现 |
| Country | select | 国家定向 | ❌ 未实现 |
| Domain | select | 绑定域名 | ✅ domain |
| Cookies TTL | number | Cookie 有效期 | ❌ 未实现 |

## 3. Flow (Stream) 创建表单对比

### Keitaro Stream 字段列表

| 字段 | 类型 | 说明 | CFTracking 对应字段 |
|------|------|------|---------------------|
| Stream name | text | Flow 名称 | ✅ name |
| Stream type | select | regular/forced/default | ✅ type |
| Weight | number | 权重 | ✅ weight |
| Status | select | active/paused | ✅ status |
| Filters | complex | 过滤规则 | ✅ filters |
| Action type | select | redirect/show_offer/traffic_loss | ✅ actionType |
| Redirect type | select | 重定向类型 | 从 Offer 继承 |

## 4. Landing Page 创建表单对比

### Keitaro Landing Page 字段列表

| 字段 | 类型 | 说明 | CFTracking 对应字段 |
|------|------|------|---------------------|
| Landing page name | text | 必填 | ✅ name |
| URL | url | 必填 | ✅ url |
| Group | select | 分组 | ❌ 未实现 |
| Offer | select | 关联的 Offer | ✅ offerId (通过 Flow 关联) |
| Status | select | active/paused | ✅ status |
| Notes | textarea | 备注 | ✅ notes |

## 5. 核心功能对比

### 5.1 重定向实现

| 功能 | Keitaro | CFTracking |
|------|---------|------------|
| HTTP 302 | ✅ | ✅ |
| Meta redirect | ✅ | ✅ |
| JS redirect | ✅ | ✅ |
| JS redirect (blank referrer) | ✅ | ✅ |
| Double meta redirect | ✅ | ✅ |
| Remote redirect | ✅ | ✅ |
| CURL | ✅ | ❌ 移除 |
| FormSubmit | ✅ | ❌ 移除 |
| Iframe | ✅ | ❌ 移除 |

### 5.2 去重功能

| 功能 | Keitaro | CFTracking |
|------|---------|------------|
| IP 去重 | ✅ | ✅ |
| Cookie 去重 | ✅ | ✅ |
| 指纹去重 | ✅ | ✅ |
| 参数去重 | ✅ | ✅ |
| 无去重 | ✅ | ✅ |

### 5.3 过滤功能

| 功能 | Keitaro | CFTracking |
|------|---------|------------|
| 国家过滤 | ✅ | ✅ |
| 设备过滤 | ✅ | ✅ |
| 浏览器过滤 | ✅ | ✅ |
| 操作系统过滤 | ✅ | ✅ |
| IP 过滤 | ✅ | ✅ |
| 自定义参数过滤 | ✅ | ✅ |
| 规则组合 (AND/OR) | ✅ | ✅ |

### 5.4 统计分析

| 功能 | Keitaro | CFTracking |
|------|---------|------------|
| 点击统计 | ✅ | ✅ |
| 转化统计 | ✅ | ✅ |
| 收入统计 | ✅ | ✅ |
| 成本统计 | ✅ | ✅ |
| EPC/CR 计算 | ✅ | ✅ |
| Analytics Engine | ❌ | ✅ (Cloudflare) |

## 6. 待实现功能

根据对标分析，以下功能需要添加到 CFTracking：

### 6.1 Offer 表单增强
- [ ] Action type 字段 (Local/Redirect/Preload/Action)
- [ ] Countries 多选字段
- [ ] From param 'payout' 复选框
- [ ] Allow upsells 选项
- [ ] Conversion cap 功能

### 6.2 Campaign 表单增强
- [ ] Default payout 字段
- [ ] Position 广告位字段
- [ ] Country 定向字段
- [ ] Cookies TTL 配置

### 6.3 Landing Page 表单增强
- [ ] Group 分组字段

### 6.4 其他功能
- [ ] Affiliate Network 管理增强
- [ ] Traffic Source 管理增强
- [ ] 报表导出功能增强

## 7. 数据库结构对比

### Keitaro 表结构
```sql
-- offers 表
CREATE TABLE offers (
  id INTEGER PRIMARY KEY,
  name TEXT,
  group_id INTEGER,
  affiliate_network_id INTEGER,
  action_type TEXT,  -- 'local', 'redirect', 'preload', 'action'
  redirect_type TEXT,  -- 'http', 'meta', 'js', 'js_blank', 'double', 'remote', 'curl', 'form', 'iframe'
  url TEXT,
  payout REAL,
  payout_type TEXT,  -- 'cpa', 'cpc', 'revshare'
  payout_currency TEXT,
  payout_auto INTEGER,  -- boolean
  payout_upsell INTEGER,  -- boolean
  conversion_cap INTEGER,
  notes TEXT
);
```

### CFTracking 表结构
```sql
-- offers 表
CREATE TABLE offers (
  id TEXT PRIMARY KEY,
  displayId TEXT,
  name TEXT,
  url TEXT,
  payout REAL,
  payoutType TEXT,  -- 'fixed', 'revshare', 'cpa'
  redirectType TEXT,  -- 'http', 'meta', 'js', 'js_blank', 'double', 'remote'
  currency TEXT,
  network TEXT,
  "group" TEXT,
  status TEXT,
  notes TEXT,
  createdAt TEXT,
  updatedAt TEXT
);
```

## 8. API 接口对比

### Keitaro API 端点
- POST /admin/api/offers
- GET /admin/api/offers/:id
- PUT /admin/api/offers/:id
- DELETE /admin/api/offers/:id
- POST /admin/api/campaigns
- GET /admin/api/campaigns/:id
- PUT /admin/api/campaigns/:id
- DELETE /admin/api/campaigns/:id

### CFTracking API 端点
- POST /api/offers
- GET /api/offers
- GET /api/offers/:id
- PUT /api/offers/:id
- DELETE /api/offers/:id
- POST /api/campaigns
- GET /api/campaigns
- GET /api/campaigns/:id
- PUT /api/campaigns/:id
- DELETE /api/campaigns/:id

## 9. 总结

CFTracking 已实现大部分 Keitaro 的核心功能，主要差异在于：

1. **Action Type 字段** - Keitaro 有 Local/Redirect/Preload/Action 四种类型，CFTracking 目前未实现
2. **Countries 定向** - Keitaro 支持国家多选，CFTracking 未实现
3. **Conversion Cap** - 转化上限控制功能未实现
4. **Upsell 功能** - 追加销售功能未实现

建议优先级：
1. 高优先级： Action Type 字段 (影响 Offer 行为)
2. 中优先级: Countries 定向 (影响流量分发)
3. 低优先级: Conversion Cap, Upsell (增强功能)
