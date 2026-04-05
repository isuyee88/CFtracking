# Keitaro Demo 对标分析

日期：2026-04-05

范围：
- 通过浏览器自动化访问 `https://demo.keitaro.io/admin/`
- 账号密码：`admin / admin`
- 采样主导航页面、创建页、部分弹窗/系统菜单
- 结合 Keitaro 官方文档，对当前项目进行能力对标
- 按用户要求，不把“用户认证实现”纳入本轮补齐范围

采样产物：
- 自动化结果：`/D:/suyee/github/CFtracking/output/playwright/keitaro-benchmark-2026-04-05T05-21-40-846Z/benchmark.json`
- 页面截图目录：`/D:/suyee/github/CFtracking/output/playwright/keitaro-benchmark-2026-04-05T05-21-40-846Z/screenshots`

## 1. Keitaro 产品骨架

基于实际后台采样，Keitaro 后台可归纳为 6 大能力层：

1. 流量追踪主链路
- Dashboard
- Campaigns
- Landing Pages
- Offers
- Traffic Sources
- Affiliate Networks

2. 报表与日志
- Create report
- Clicks log
- Conversions log
- Exported reports
- Trends

3. 投放基础设施
- Domains
- Tracking / Integrations
- Postback / Conversion types
- Custom metrics

4. 规则与系统数据治理
- Bot lists
- Geo DBs / Geo profiles
- Archive
- Logs
- Delete statistics
- Import conversions
- Simulate traffic

5. 团队与权限
- Users
- Resource-level permissions
- API keys

6. 系统配置
- Main / System / Privacy / Branding
- Dashboard by IP
- Currency / cookies / autosave / retention / timeouts

## 2. 自动化观察到的关键页面与业务特征

### Dashboard
- 顶部有全局搜索与全局 `New`
- 默认展示当日 KPI 卡片、趋势图、实体 Top 榜、Recent Clicks
- Dashboard 支持用户级指标/表格列偏好保存

### Campaigns
- 列表页自带来源筛选、分组、状态、时间范围、导出
- `Create campaign` 是核心复合表单
- 创建页包含多个页签：`General / Tracking / Parameters / S2S postbacks / Notes`
- 单个 campaign 内置：
  - domain / alias
  - group
  - source
  - flow rotation
  - cost model / cost value
  - traffic loss
  - uniqueness 策略
  - API token
  - flows

### Landing Pages
- 列表页以效果指标管理 landing
- 创建 UI 是弹窗
- 支持 `Local / Redirect / Preload / Action`
- 支持 ZIP 上传、本地目录、offer link 占位符说明

### Offers
- 列表页展示 payout、network、conversion cap、收益指标
- 采样中 demo 的创建入口未走到独立页面，但列表功能完整

### Traffic Sources
- 列表页展示流量源效果指标
- demo 明确提示某些创建能力在演示版不可用
- 文档与 Campaign Create 页共同说明：traffic source 不只是名称，还包括参数模板、postback、integration 入口

### Affiliate Networks
- 列表页为 network 级管理
- 创建页在 demo 里没有完整开放，但文档和 campaign setup 明确依赖它参与完整投放链路

### Reports
- `Create report` 是高度可配置的报表构建器
- 可按 `Source / Flow / GEO / Connection / Device / IP / Sub ID / Params / Calendar` 等维度分组
- 支持多层 grouping、filters、导出
- Clicks log / Conversions log 均为独立日志产品，而不是简单列表页

### Domains
- 独立 Domains 模块
- 展示域名状态、功能、首页映射、Campaign 数量、Registrar、DNS Provider
- 明显承担“域名停车、SSL、DNS 接入、后台访问域”等职责

### Users
- 有独立 Users 管理
- 创建用户弹窗包含 `Account / Access`
- 可配置 role、language、timezone、theme 等
- 文档显示支持资源级权限控制，而不只是角色名义区分

### Settings / Maintenance
- Settings 有 `Main / Bot lists / System / Privacy / Branding`
- Maintenance 有 `Custom metrics / Conversion types / Geo DBs / Geo profiles / Status / Logs / Archive / Import conversions / Simulate traffic / Delete statistics`
- 这部分已经不是“偏好设置”，而是完整的 tracker 运维与治理中台

### Integrations
- 后台有独立 Integrations 页面
- 不是单纯 API 文档页，而是面向业务配置的三方接入中心

## 3. 与当前项目的对标结论

### 已具备或部分具备

1. 主实体框架已存在
- 我们已有 `Campaigns / Landings / Offers / Traffic Sources / Affiliate Networks`
- 也有 `Dashboard / Trends / Click Log / Conversions / Reports`

2. 规则控制能力已有雏形
- 我们有 `Autorules / Blacklist / Whitelist / Target`
- 这部分甚至比 Keitaro demo 的主导航更显式

3. 云原生实时能力更强
- 当前项目已经围绕 Cloudflare Workers、Durable Objects、SSE、cache 做了架构布局
- 这是 Keitaro 传统单机 tracker 产品线没有直接体现的优势

### 明显缺失或能力深度不足

#### P0：Campaign 编排能力不完整

Keitaro 的 `Campaign` 是调度中心，不只是一个基础实体。当前项目虽然有 Campaign 管理页，但缺少以下关键能力：
- Flow 方案编辑器
- Forced / Regular / Default flow 概念
- Weight / Position rotation
- Visitor binding
- Campaign 参数模板
- Tracking 页签
- S2S postbacks 页签
- API token
- Traffic loss
- 完整 uniqueness 配置链路

影响：
- 当前项目更像“实体台账 + 基础报表”，还不是一个可直接承载复杂投放分流的 tracker 控制台。

建议：
- 以 Campaign Detail 为核心，补一个 `General / Routing / Tracking / Parameters / Postback / Notes` 六段式编辑结构。

#### P0：Domains 模块完全缺位

Keitaro 把域名当成一等公民：
- 域名停车
- SSL 自动化
- 后台访问域
- DNS Provider / Registrar
- Campaign index page
- Cloudflare 集成

当前项目没有独立 Domains 页面，也没有域名生命周期管理。

影响：
- 无法把“投放入口域、LP 域、后台访问域、Cloudflare 代理域”统一纳管。

建议：
- 新增 `Domains` 模块，首批先做：
  - domain 基础台账
  - status 检查
  - SSL / DNS / provider 字段
  - default campaign / index page 映射
  - Cloudflare zone / proxy 标记

#### P0：报表中心仍是预置报表，不是自定义报表引擎

当前项目 `Reports` 只有固定的 4 类报表切换，维度与列配置有限。

Keitaro 的 `Create report` 具备：
- 多层 grouping
- 可选 metrics
- filters builder
- 维度树式展开
- Click log / Conversion log 联动
- 导出与 exported reports

影响：
- 当前项目无法支撑分析师自助报表，也难支撑复杂排障。

建议：
- 把 `Reports` 升级为报表构建器：
  - 维度选择器
  - metrics 选择器
  - filters builder
  - saved views
  - async export / exported reports

#### P0：Landing / Offer 托管能力不足

Keitaro 的 landing 管理明显包含：
- Local ZIP 上传
- Redirect / Preload / Action 模式
- 本地目录
- `{offer}` 占位符说明
- Local PHP/HTML 执行规则

当前项目的 `Landings` 和 `Offers` 主要还是 URL 与基础属性管理，没有形成“托管内容 + 跳转策略 + 追踪注入”能力。

影响：
- 不能承载实际投放链路中的 LP/Offer 资产管理。

建议：
- 给 Landing 和 Offer 增加 `hosted / remote` 类型
- 首批支持 ZIP 上传、静态托管目录、跳转类型、占位符替换

#### P1：Traffic Source / Affiliate Network 仍停留在台账层

Keitaro 这两类实体明显承担：
- 参数模板
- Postback 对接
- 成本拉取
- Conversion 回传
- 模板化复用

当前项目虽有实体页，但业务深度不足。

建议：
- Traffic Source 增加：
  - parameter aliases
  - click macros
  - source postback
  - sync / verify 工具
- Affiliate Network 增加：
  - offer source API config
  - payout / status mapping
  - pull offers / import offers

#### P1：系统治理能力缺口大

Keitaro 的 `Settings + Maintenance` 几乎是一套运维后台：
- Bot lists
- Custom metrics
- Conversion types
- Geo DBs
- Geo profiles
- Logs
- Archive
- Import conversions
- Simulate traffic
- Delete statistics

当前项目的 Settings 主要是用户偏好，不是系统治理。

建议按顺序补齐：
1. `Custom Metrics`
2. `Conversion Types`
3. `Logs / Audit`
4. `Archive`
5. `Simulate Traffic`
6. `Import Conversions`

#### P1：日志产品能力不足

我们有 Click Log / Conversions Log，但仍偏基础：
- Click log 时间字段当前还存在 `Invalid Date`
- 缺少可配置 metrics 管理
- 缺少更丰富 filters
- 缺少导出能力深度

Keitaro 的日志页已经是调查工具，不是简单流水表。

建议：
- 把 Click Log / Conversion Log 抽成统一 `Log Explorer`
- 统一支持 filters / columns / export / saved views

#### P1：Integrations 中台缺位

Keitaro 有独立 Integrations 页面与脚本接入文档体系。

当前项目虽然底层已有 tracking script、Cloudflare 能力和 API，但 UI 层没有形成“接入中心”。

建议：
- 新增 `Integrations` 页面
- 首批整理为：
  - tracking script
  - postback templates
  - Cloudflare
  - webhook / API
  - external ad platform adapters

#### P2：Users / 权限中心缺失

用户认证本轮不处理，但 Keitaro 的用户体系不只是登录，还包括：
- user profile
- resource permissions
- report restrictions
- API keys

建议：
- 本轮不做登录
- 但数据模型应先预留：
  - workspace member
  - resource scope
  - API key
  - audit actor

#### P2：分组体系与批量操作还不够统一

Keitaro 在 Campaigns、Landings、Offers、Domains 等多页都有 groups 与 group filters。

当前项目 group 概念零散，页面间不统一。

建议：
- 抽象 `Group` 为通用实体
- 所有主实体统一支持 group filter / group CRUD / bulk move

## 4. 建议的补强优先级

### 第一阶段：从“管理台”升级为“可运行 tracker 控制台”
- Domains
- Campaign Routing / Flow Editor
- Campaign Tracking / Parameters / Postback
- Landing / Offer 托管模式
- Traffic Source / Affiliate Network 深化配置

### 第二阶段：把分析能力补成产品壁垒
- Report Builder
- Exported Reports
- Log Explorer
- Custom Metrics
- Conversion Types

### 第三阶段：补系统治理与运营后台
- Logs
- Archive
- Import Conversions
- Simulate Traffic
- Delete Statistics
- Bot Lists / Geo Profiles
- Integrations Center

### 第四阶段：预留组织化能力
- Users
- Resource permissions
- API keys
- 审计主体模型

## 5. 建议的产品信息架构调整

建议将当前导航从“页面集合”升级为“能力域”：

1. Overview
- Dashboard
- Trends

2. Tracking
- Campaigns
- Flows
- Landings
- Offers
- Traffic Sources
- Affiliate Networks
- Domains

3. Analytics
- Report Builder
- Click Log
- Conversions Log
- Exported Reports

4. Control
- Autorules
- Blacklist
- Whitelist
- Target
- Custom Metrics
- Conversion Types

5. System
- Settings
- Logs
- Archive
- Integrations

## 6. 对当前项目最值得马上落地的 10 个功能

1. `Domains` 模块
2. `Campaign Flow Editor`
3. `Campaign Tracking / Parameters / Postback` 多页签
4. `Landing ZIP Upload + hosted mode`
5. `Offer redirect / preload / hosted mode`
6. `Report Builder`
7. `Exported Reports`
8. `Custom Metrics`
9. `Conversion Types`
10. `Integrations` 中心页

## 7. 参考资料

官方文档：
- Campaign 创建与路由：https://docs.keitaro.io/en/campaigns-and-streams/creating-campaign.html
- 首个 Campaign 完整搭建示例：https://docs.keitaro.io/en/get-started/first-campaign.html
- Create report：https://docs.keitaro.io/en/reports/custom-report.html
- Dashboard：https://docs.keitaro.io/en/reports/dashboard.html
- Landing page（总览）：https://docs.keitaro.io/en/landing-pages
- Landing page Local：https://docs.keitaro.io/en/landing-pages-and-offers/landing-page-local.html
- Campaign parameters：https://docs.keitaro.io/en/campaigns-and-streams/campaign-parameters.html
- Campaign integrations：https://docs.keitaro.io/en/campaigns-and-streams/campaign-integrations.html
- Tracking Script：https://docs.keitaro.io/en/tracking
- KClient JS：https://docs.keitaro.io/en/campaign-integrations/kclient-js.html
- Admin API：https://docs.keitaro.io/en/admin-api
- User permissions：https://docs.keitaro.io/en/team-management/user-permissions.html
- Settings page：https://docs.keitaro.io/en/settings
- Bot lists：https://docs.keitaro.io/en/settings/bot-lists.html
- Conversion log：https://docs.keitaro.io/en/conversions-and-postback/conversions-report.html
- Conversion types：https://docs.keitaro.io/en/maintenance/custom-conversions.html
- Domain setup：https://docs.keitaro.io/en/domains/setup-domain.html
- Cloudflare integration：https://docs.keitaro.io/en/third-party-integrations/cloudflare.html

实际采样页面：
- Keitaro demo 后台：https://demo.keitaro.io/admin/
