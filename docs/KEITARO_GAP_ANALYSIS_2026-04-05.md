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

## 8. 本轮迭代回顾（2026-04-05 第二轮补强）

### 本轮已完成

1. `Reports` 已从固定报表切换为接近 Keitaro `Create report` 的 `Report Builder`
- 已支持维度、指标、筛选条件、保存视图、报表执行、CSV/Excel 导出
- 后端已同步支持自定义报表查询参数，不再局限于预设 4 类报表

2. `CampaignDetail` 已从基础详情页升级为 Campaign 控制台
- 已补齐 `General / Routing / Tracking / Parameters / Postback / Notes` 六段式工作流
- 已补齐日期范围统计、最近转化、准备度检查、路由摘要等运营信息
- 已补齐 `regular / forced / default` flow 类型编辑、`flowRotation`、`visitorBinding`
- 已补齐 tracking script / KClient 片段、API token、traffic loss、完整 uniqueness 策略编辑能力

### 与上一版对标结论的变化

- 原 `P0：报表中心仍是预置报表` 已由“缺失”调整为“核心能力已落地，仍待继续深化”
- 原 `P0：Campaign 编排能力不完整` 已由“基础能力不足”调整为“主干工作流已建立，仍缺高级编排器”
- 当前项目已经不只是“实体台账 + 基础报表”，而是开始具备可执行的 tracker 控制台形态

### 本轮后重新评估的阶段完成度

#### 第一阶段：从“管理台”升级为“可运行 tracker 控制台”
- `Campaign Tracking / Parameters / Postback` 多页签：已完成
- `Campaign Routing / Flow Editor`：部分完成
- `Domains` 模块：未开始
- `Landing / Offer hosted mode`：未开始
- `Traffic Source / Affiliate Network` 深化配置：未开始

#### 第二阶段：把分析能力补成产品壁垒
- `Report Builder`：已完成首版
- `Exported Reports`：未开始
- `Log Explorer`：未开始
- `Custom Metrics`：未开始
- `Conversion Types`：未开始

#### 第三阶段：补系统治理与运营后台
- 整体仍未开始

#### 第四阶段：预留组织化能力
- 认证仍按既定策略延后，由 Cloudflare One 在交付前统一处理
- 资源权限、API key、审计主体模型仍未展开

## 9. 当前版本新的对标判断

### 已明显缩小差距的部分

- `Campaign` 已具备 Keitaro 风格的主工作流骨架
- `Reports` 已具备自定义查询思路，不再只是“切换几个固定图表”
- Campaign 页面中的追踪、参数、回传、备注已进入真实运营可配置区间

### 仍然存在的关键差距

#### P0：Campaign 高级编排器还不够深
- 目前更多是“配置面”完整，仍缺规则级编排能力
- 还需要把现有 flow 后端能力真正接入前端，包括：
  - flow rule builder
  - 条件树 / 过滤器编辑
  - 路由测试执行
  - schema 驱动规则表单
  - equalize / clone / validate 等运维动作

#### P0：Domains 仍是主链路缺口
- 这是 Keitaro 把“投放入口域名、停放域名、后台访问域名、Cloudflare 代理域”统一治理的核心模块
- 当前缺口依旧会限制 campaign 投放链路的完整性

#### P1：Log Explorer / Exported Reports / Conversion Types 仍未补齐
- `Reports` 已升级，但“调查型日志产品”和“运营沉淀能力”仍然缺位

#### P1：Landing / Offer 托管能力仍弱
- 当前仍偏 URL 资源管理，尚未形成 Keitaro 式的托管资产模型

#### P2：部署元数据暴露风险仍未处理
- `src/index.ts` 对外暴露部署元数据与作者邮箱的评审项仍然开放
- 该问题不影响当前功能推进，但不应带入正式生产交付

## 10. 下一阶段工作任务（建议按顺序执行）

1. 深化 `Campaign Routing`
- 接入 `/api/flows/:id/schema`
- 接入 `/api/flows/:id/rules`
- 接入 `/api/flows/:id/test`
- 在 `CampaignDetail` 中增加可视化 flow rule builder、测试面板、规则摘要

2. 同步补强 `CampaignDetail` 的业务完整性
- 强化 `forced/default flow` 的创建、排序、启停和降级逻辑
- 增加更完整的 routing diagnostics、异常流量去向、命中路径解释
- 让 uniqueness / visitor binding / traffic loss 形成可验证配置，而不只是表单字段

3. 启动 `Domains` 模块首版
- 建立域名台账、状态、DNS / SSL / Provider 字段
- 预留 Cloudflare zone / proxy / access 域名映射字段
- 建立 default campaign / index page 关联关系

4. 准备第二批分析壁垒能力
- `Exported Reports`
- `Log Explorer`
- `Conversion Types`
- `Custom Metrics`

5. 在进入正式上线前处理安全收口项
- 收敛部署元数据暴露
- 将认证统一切换到 Cloudflare One

## 11. 后续每轮完成后的文档更新模板

每完成一轮实施后，都在本文件追加以下结构：

### 本轮迭代回顾（日期 + 轮次）
- 本轮目标
- 实际完成
- 与 Keitaro 对标后差距变化
- 阶段计划完成度变化
- 新发现的问题 / 风险

### 下一阶段工作任务
- 下一轮主任务 1
- 下一轮主任务 2
- 依赖项 / 风险项
- 是否需要上线验证 / 浏览器回归 / 性能复测

## 12. 本轮迭代回顾（2026-04-05 第三轮补强）

### 本轮目标
- 把 `CampaignDetail / Routing` 从“Flow 类型和状态编辑”继续升级为真正可编排、可测试、可解释的工作台
- 接入既有 flow 后端能力：`schema / rules / test / equalize / clone`

### 实际完成

1. 新增 `Campaign Routing Workbench`
- 已在 `CampaignDetail` 中接入独立的 Routing 工作台
- 已支持 flow 选择、schema 刷新、规则列表查看、诊断摘要
- 已支持 `equalize regular flows` 与 `clone selected flow`

2. 已打通 flow rule builder
- 已接入 `/api/flows/:id/schema`
- 已接入 `/api/flows/:id/rules`
- 已接入规则创建、更新、删除、启停
- 已支持基于 target / operator / value 的平铺式 `AND / OR` 规则编辑
- 已支持 `showPage / showOffer / redirect / block / allow` 动作配置

3. 已打通 routing test bench
- 已接入 `/api/flows/:id/test`
- 已支持输入 `source / medium / campaign / subId / clickId / referrer / visitsCount / firstVisit / returning`
- 已支持查看最终命中动作、命中规则、规则逐条命中结果

4. 已修复后端 flow rule 创建的基础缺陷
- 修复 `flowRules` 创建时错误复用 `flowId` 作为 `ruleId` 的问题
- 现在规则会使用独立唯一 ID，避免多规则编排场景下的写入冲突

### 本轮验证结果
- `npm run typecheck`：通过
- `npm --prefix frontend run build`：通过

### 与 Keitaro 对标后差距变化
- 原本 `Campaign Routing` 只是“标记 regular / forced / default”的配置层，现在已经进入“规则可编排 + 结果可验证”的可运营区间
- 当前差距已从“没有编排器”收敛为“编排器仍需更强的规则深度、日志闭环和可视化解释”

### 阶段计划完成度变化

#### 第一阶段：从“管理台”升级为“可运行 tracker 控制台”
- `Campaign Tracking / Parameters / Postback` 多页签：已完成
- `Campaign Routing / Flow Editor`：由“部分完成”提升为“主体完成，仍需深化”
- `Domains` 模块：未开始
- `Landing / Offer hosted mode`：未开始
- `Traffic Source / Affiliate Network` 深化配置：未开始

#### 第二阶段：把分析能力补成产品壁垒
- `Report Builder`：已完成首版
- 其余未变

### 新发现的问题 / 风险
- 当前 routing editor 第一版对“嵌套 filter groups”仍按只读处理，可查看、可测试，但还不能可视化编辑
- 评审项 `src/index.ts` 的部署元数据与作者邮箱暴露问题仍然开放，不能带入正式生产交付

## 13. 下一阶段工作任务

1. 深化 `Routing` 的规则表达能力
- 支持 nested groups / condition tree
- 支持更多 visitor / proxy / bot / schedule 规则模板
- 支持规则复制、批量启停、优先级拖拽排序

2. 补齐 `Routing` 的运维闭环
- 接入 flow stats / flow logs
- 在 `CampaignDetail` 增加 routing diagnostics、命中路径解释、异常流量去向和最近执行样本

3. 启动 `Domains` 模块首版
- 继续保持其为最优先的 Keitaro 主链路缺口

4. 收口生产风险项
- 处理 `src/index.ts` 对外暴露部署元数据与作者邮箱的问题
- 交付前统一切换 Cloudflare One 认证

## 14. 本轮迭代回顾（2026-04-05 第四轮补强）

### 本轮目标
- 在已有 `Routing Workbench` 基础上补足运行观测层
- 让 `CampaignDetail / Routing` 同时具备“配置、测试、运行反馈”三层能力

### 实际完成

1. 补齐 flow 运行观测数据接入
- 新增前端 `fetchCampaignFlowStats`
- 新增前端 `fetchFlowLogs`
- 已将 flow 统计与 recent execution logs 接入 `Campaign Routing Workbench`

2. 补齐 Routing Observability 面板
- 已新增 `Routing Observability` 区块
- 已展示 `Total Hits / Dominant Action / Avg Exec / Rule Coverage`
- 已展示选中 flow 的 recent logs，包括：
  - action
  - matchedRule
  - unique / repeat
  - bot 标记
  - IP / 国家 / 设备 / 浏览器
  - target / clickId / visitorId
  - execution time

3. Flow Diagnostics 已升级为更接近运营视角
- 已补充 selected flow 的 `clicks / conversions / revenue / CR`
- `Routing` 页面现在不再只有规则配置，而是开始具备运行诊断能力

### 本轮验证结果
- `npm run typecheck`：通过
- `npm --prefix frontend run build`：通过

### 与 Keitaro 对标后差距变化
- `Campaign Routing` 已从“可配置 + 可测试”继续推进到“可观测”
- 当前与 Keitaro 的差距进一步从“缺工作台”收敛为“缺更深的规则树、执行轨迹解释、批量运维动作与主链路模块补齐”

### 阶段计划完成度变化

#### 第一阶段：从“管理台”升级为“可运行 tracker 控制台”
- `Campaign Routing / Flow Editor`：继续提升，现阶段可定义、可测试、可观测，已接近主体完成
- `Domains` 模块：仍未开始，继续保持最优先主链路缺口

### 新发现的问题 / 风险
- 目前 logs 仍是 KV 驱动的轻量查询模型，更适合作为近期执行样本，不足以替代完整的日志产品
- nested groups 仍处于只读状态，尚未进入可视化编辑
- 生产风险项 `src/index.ts` 部署元数据暴露仍未处理

## 15. 下一阶段工作任务

1. 深化 `Routing` 的可解释性
- 增加命中路径解释
- 增加规则优先级冲突提示
- 增加 fallback / traffic loss 去向解释

2. 深化 `Routing` 的规则表达能力
- nested groups / condition tree 可视化编辑
- 规则复制、优先级排序、批量启停

3. 启动 `Domains` 模块首版
- 这是当前与 Keitaro 主链路最明显的结构性差距

4. 安全收口
- 修复 `src/index.ts` 对外暴露部署元数据和作者邮箱

## 16. 本轮迭代回顾（2026-04-05 第五轮补强）

### 本轮目标
- 继续推进 `Routing` 的可解释性
- 把“为什么会这样路由”直接展示在 `CampaignDetail / Routing` 中

### 实际完成

1. 新增 `Routing Explainability` 区块
- 已展示 `rotation`
- 已展示 `regular weight`
- 已展示 `forced flows / default flows`
- 已展示 `fallback target`
- 已展示 `traffic loss` 解释

2. 新增优先级冲突提示
- 已检测 active rules 中的重复 `priority`
- 已在工作台中显式提示 `Priority conflicts`
- 使规则冲突从“隐性风险”变成“可见问题”

3. 已把 Campaign 级路由配置注入工作台
- `flowRotation`
- `trafficLoss`
- 让 Routing Explainability 不再只看单个 flow，而是能结合 campaign 级策略解释行为

### 本轮验证结果
- `npm run typecheck`：通过
- `npm --prefix frontend run build`：通过

### 与 Keitaro 对标后差距变化
- `Routing` 现在已经具备：
  - 配置
  - 测试
  - 观测
  - 解释
- 当前差距继续收敛，剩余重点已经集中到：
  - nested groups / condition tree
  - 命中路径解释进一步细化
  - `Domains` 主链路模块

### 阶段计划完成度变化

#### 第一阶段：从“管理台”升级为“可运行 tracker 控制台”
- `Campaign Routing / Flow Editor`：已进入高完成度阶段，剩余主要是深度和细节完善
- `Domains` 模块：仍未开始，继续保持第一优先级的结构性缺口

### 新发现的问题 / 风险
- 当前 explainability 仍是“摘要级解释”，还不是完整的 rule path trace
- nested groups 依旧只读
- `src/index.ts` 部署元数据暴露风险依旧未处理

## 17. 下一阶段工作任务

1. 深化 `Routing` 的命中路径解释
- 展示本次测试是如何逐条经过规则并最终命中
- 展示 fallback / default / traffic loss 的实际决策路径

2. 深化 `Routing` 的规则结构表达
- nested groups / condition tree 编辑
- 规则优先级拖拽排序
- 规则复制 / 批量启停

3. 启动 `Domains` 模块首版
- 继续作为当前最优先的 Keitaro 主链路差距项

4. 收口生产风险
- 修复 `src/index.ts` 对外暴露部署元数据与作者邮箱

## 18. 本轮迭代回顾（2026-04-05 第六轮补强）

### 本轮目标
- 收口明确的生产风险项
- 把 `Domains` 从台账页继续推进到首版治理模块
- 继续深化 `Routing` 的命中路径解释

### 实际完成

1. 已收口部署元数据公开暴露风险
- 生产环境下不再通过响应头暴露部署调试信息
- `/api/deployment/info` 在生产环境下改为仅返回最小化信息
- 详细部署版本信息继续保留在非生产环境用于调试

2. `Domains` 模块已从 CRUD 台账升级为治理面板首版
- 新增 `Domain Governance` 区块
- 新增 `Readiness Snapshot`
- 已显式展示 Cloudflare zone、默认 campaign、默认 landing、proxy、SSL readiness 等治理信号
- 已新增治理问题检测，包括：
  - tracking / mixed 域名未绑定默认 campaign
  - landing / mixed 域名未绑定默认 landing
  - Cloudflare proxy 开启但 zone id 缺失
  - active 域名 SSL 仍 pending / disabled
  - admin 域名未启用 proxy

3. `Domains` 表单能力已补强
- 默认 campaign 不再只是手填 ID，而是接入真实 campaign 选项
- 默认 landing 不再只是手填 ID，而是接入真实 landing 选项
- 让主链路映射更接近实际运营配置，而不是纯台账字段

4. `Routing` 命中路径解释已继续增强
- test bench 现在新增 `Decision Path`
- 会解释 forced flow、rotation、规则逐条命中/未命中、winning rule、fallback/default flow 与 traffic loss 提示
- `Routing` 已基本形成“配置 + 测试 + 观测 + 解释 + 路径说明”

### 本轮验证结果
- `npm run typecheck`：通过
- `npm --prefix frontend run build`：通过

### 与 Keitaro 对标后差距变化
- `Domains` 已不再只是存在菜单项，而是开始承担域名治理职责
- `Routing` 的工作台深度继续提升，离 Keitaro 风格的可运营编排台又近了一步
- 明确的生产风险项中，部署元数据暴露问题已进入已处理状态

### 阶段计划完成度变化

#### 第一阶段：从“管理台”升级为“可运行 tracker 控制台”
- `Campaign Routing / Flow Editor`：高完成度，剩余主要是 nested groups 和更深的 rule tree
- `Domains` 模块：由“未开始”提升为“首版已具备主链路治理能力”
- `Landing / Offer hosted mode`：仍未开始
- `Traffic Source / Affiliate Network` 深化配置：仍未开始

### 新发现的问题 / 风险
- `Domains` 当前仍缺真正的 Cloudflare zone 校验、SSL 实时检测和 DNS 自动化动作
- `Routing` 仍未进入 nested groups / condition tree 可编辑阶段
- 正式生产前仍需确认 Cloudflare One 接入切换路径

## 19. 下一阶段工作任务

1. 深化 `Routing` 的规则结构能力
- nested groups / condition tree 编辑
- 优先级拖拽排序
- 规则复制 / 批量启停

2. 深化 `Domains` 的真实治理能力
- Cloudflare zone / proxy / SSL 实时校验
- 域名验证状态刷新
- 更明确的 campaign / landing / admin 使用拓扑

3. 启动 `Landing / Offer hosted mode`
- 这是当前与 Keitaro 资产托管能力的主要差距

4. 交付前收口
- Cloudflare One 认证切换

## 22. 本轮回顾（2026-04-06，缓存链路与文档回写）

### 本轮目标
- 收敛“静态壳 + bootstrap object”在真实生产环境下的读链路
- 检查页面是否还存在前端 `GET /api/*` 读取
- 回写当前与 Keitaro 对标的真实完成情况，避免旧结论继续污染下一轮判断

### 实际完成

1. 管理页 bootstrap 重定向风暴已修复
- 原问题是 admin bootstrap 的 scope/hash 计算混入了 `__mode`、`__version` 这类对象读取临时参数
- 结果导致 `campaigns / trends / audit / conversions / settings` 的 object 请求不断重算 hash，形成多次重定向
- 现已在前后端统一排除这些瞬时参数，管理页恢复为稳定的两段读取：
  - current manifest
  - object payload

2. 线上自动化复核结果已更新
- 已重新用浏览器自动化检查：
  - `/campaigns?range=yesterday`
  - `/campaigns?range=last30days`
  - `/trends`
  - `/audit`
  - `/conversions`
  - `/settings`
- 这些页面当前首屏均未再出现前端 `GET /api/*` 读请求
- 请求形态已收敛为 bootstrap GET + SSE

3. 生产环境元数据暴露问题继续确认已收口
- `/api/deployment/info` 在生产环境下只保留最小化信息
- 生产响应头中不再暴露 worker 版本与部署调试头
- 这项风险已从“待修复”转为“已处理并线上验证”

4. 文档缓存链路继续推进
- HTML shell 当前已确认：
  - `CF-Cache-Status: HIT`
  - `Server-Timing` 正常返回
  - 文档请求已脱离运行时 HTML 注入模型
- bootstrap current 已实测支持 `ETag + If-None-Match -> 304`
- HTML shell 现已在线上稳定返回：
  - 强 `ETag`
  - `Last-Modified`
- 文档壳缓存重验证链路已从“待确认”提升为“已验证通过”

### 与 Keitaro 对标后的变化
- 旧结论中“Settings hydration 仍依赖前端 GET”的判断已不再成立，需要从主分析结论中降级或移除
- 旧结论中“管理页缓存链路尚不稳定”的判断已明显改善，列表型页面基本完成架构切换
- 当前与 Keitaro 的差距，进一步从“主读链路未成型”收敛为：
  - Campaign Detail 深层工作流仍需继续做 server-bootstrap-only 收口
  - Platforms 运维动作可见性与可操作性仍不足
  - Landing / Offer hosted mode 仍未启动
  - Domains 仍缺少更真实的 Cloudflare 在线校验闭环

### 当前阶段完成度更新

#### 第一阶段：从“管理台”升级为“可运行 tracker 控制台”
- Dashboard / Campaigns / Trends / Audit / Conversions / Settings：
  - 页面级 bootstrap 读模型已基本成型
- Campaign Routing / Flow Editor：
  - 继续保持高完成度
- CampaignDetail 全链路：
  - 仍是下一阶段最重要的主链路收口点
- Platforms / Hosted assets / Domains 实时治理：
  - 仍是 Keitaro 对标中的主要外围缺口

### 下一阶段任务

1. 收口 `CampaignDetail` 读链路
- 保证 `General / Routing / Tracking / Parameters / Postback / Notes` 全部优先走 server bootstrap
- 清理残留前端 GET fallback

2. 继续扩展页面级验证覆盖
- 把同样的缓存验证标准继续扩展到 `CampaignDetail` 及更深工作流页面
- 验证更多页面切换、时间切换、SSE 更新后的缓存替换行为

3. 更新生产审计报告
- 把已经失效的旧 findings 降级或标注为已修复
- 保证后续测试与对标结论建立在最新线上现实之上

## 20. 本轮迭代回顾（2026-04-05 第七轮补强）

### 本轮目标
- 完成 `Routing` 中最关键的剩余结构性缺口：`nested groups / condition tree`

### 实际完成

1. `Routing` 规则编辑器已升级为条件树模型
- 不再局限于单层 filters
- 规则表单状态已改为 root group + nested groups 结构
- 已支持 group 内添加 filter
- 已支持 group 内继续添加 nested group
- 已支持 group 级别的 `name / logic / enabled`

2. nested groups 已从只读变成可编辑
- 之前只能查看 / 测试 nested groups
- 现在已支持在前端可视化编辑 nested groups
- 规则 payload 也已升级为递归 group DTO 提交

3. rule create / update payload 进一步补齐
- 已补齐 group/filter 的 `id`
- 已补齐 group/filter 的 `enabled`
- 让前端提交的数据结构更贴近后端验证器与 schema 预期

4. `Routing Test Bench` 与 `Decision Path` 继续受益
- 复杂规则树现在不只可展示、可测试，也可以直接在当前工作台内改动

### 本轮验证结果
- `npm run typecheck`：通过
- `npm --prefix frontend run build`：通过

### 与 Keitaro 对标后差距变化
- `Routing` 的主要结构性缺口已被进一步填平
- 当前 `Campaign Routing` 已具备：
  - flow 管理
  - rule builder
  - condition tree
  - test bench
  - observability
  - explainability
- 剩余差距已更多落在“批量运维效率”和“外围主链路模块”上

### 阶段计划完成度变化

#### 第一阶段：从“管理台”升级为“可运行 tracker 控制台”
- `Campaign Routing / Flow Editor`：由高完成度继续提升为接近完整
- `Domains` 模块：保持首版治理能力已就位
- `Landing / Offer hosted mode`：仍未开始
- `Traffic Source / Affiliate Network` 深化配置：仍未开始

### 新发现的问题 / 风险
- `Routing` 现在的 condition tree 已可编辑，但仍未加入拖拽排序、规则复制、批量启停
- `Domains` 仍缺真实的 Cloudflare 在线校验
- 交付前仍需切换 Cloudflare One

## 21. 下一阶段工作任务

1. 提升 `Routing` 运维效率
- 规则优先级拖拽排序
- 规则复制
- 批量启停

2. 深化 `Domains` 实时治理
- Cloudflare zone / proxy / SSL 实时校验
- 更清晰的域名拓扑与状态刷新

3. 启动 `Landing / Offer hosted mode`
- 继续作为当前与 Keitaro 资产托管能力的最大差距

4. 交付前收口
- Cloudflare One 认证切换
## 22. Keitaro Alignment Addendum (2026-04-06, Production Chain Validation)

This addendum records the latest production validation against the Keitaro-aligned tracker workflow.

Validation artifacts:
- `output/playwright/prod-chain-2026-04-06T10-11-07-248Z/summary.json`
- `output/playwright/prod-chain-2026-04-06T10-11-07-248Z/manifest-recheck.json`
- `output/playwright/prod-chain-2026-04-06T10-11-07-248Z/tracking-chain.json`
- `output/playwright/prod-chain-2026-04-06T10-11-07-248Z/tracking-sse-check.json`
- `output/playwright/prod-chain-2026-04-06T10-11-07-248Z/conversion-manifest-check.json`

### What Is Now Confirmed

1. Admin mutation flows are materially stronger than the earlier benchmark state.
- Settings writes refresh their page bootstrap and emit SSE.
- Campaign admin updates refresh the campaigns bootstrap and emit SSE.
- This closes part of the earlier gap where Keitaro-like admin screens lacked a reliable production refresh loop.

2. Cache envelope behavior is now observable and production-grade on the tested admin flows.
- settings manifest tested at `s-maxage=300`
- campaigns manifest tested at `s-maxage=60`
- manifest `ETag + If-None-Match` behaved correctly when the manifest actually changed

3. Browser automation for the tested flows produced zero console errors.

### Remaining High-Value Gaps Versus Keitaro

1. Redirect entry behavior is still below Keitaro tracker expectations.
- direct alias route on the primary domain still returns the SPA shell:
  - `GET /pw-test-1775182453486 -> 200 text/html`
- Keitaro-style expectation:
  - alias/domain entry should resolve into the tracking pipeline immediately

2. Resolved flow execution still does not produce a correct redirect target.
- `GET /api/tracking/click/pw-test-1775182453486?... -> 302`
- observed `Location: about:blank`
- This remains a blocker for Keitaro-grade flow execution fidelity.

3. Click recording exists, but redirect assembly is still incorrect.
- POST click tracking successfully writes a click record and binds `flowId/offerId`
- the returned `redirectUrl` still matched the submitted referer instead of the target offer/landing destination
- This means the write plane is ahead of the redirect plane.

4. Conversion success is not yet connected to the reporting plane.
- postback success returns a `conversionId`
- conversion log lookup by click id returns empty
- conversion stats remain zero after success
- Against Keitaro, this is still a major gap because tracker success must immediately feed reports/auditability

5. Tracking writes are still outside the realtime refresh loop.
- live SSE probe stayed unchanged after:
  - successful tracking click
  - successful conversion postback
- conversions bootstrap manifest remained `304` after successful conversion postback
- This indicates `/api/tracking/*` mutations are still not participating in the same cache/SSE refresh chain used by admin writes

6. Settings mutation payload mapping still leaks a logical mismatch.
- observed SSE `data-changed` payload:
  - `entity = user-preferences`
  - `entityId = preferences`
- For a Keitaro-like operational model, this should resolve to the real logical entity/user scope rather than the route segment name

7. Campaign invalidation fan-out is broader than the actual payload delta.
- name-only campaign mutation invalidated dashboard/trends/audit/conversions bootstrap keys
- dashboard manifest still returned `304`
- This is not a correctness break, but it is still below an ideal production tracker control-plane efficiency level

### Updated Progress View

#### Stronger Than Before
- Admin page bootstrap-only read path
- Settings write -> cache refresh -> SSE
- Campaign admin write -> cache refresh -> SSE

#### Still Behind Keitaro
- entry redirect correctness
- final redirect target resolution
- conversion persistence into reports/logs
- tracking-write-driven cache invalidation and SSE
- campaign detail deep workflow end-to-end production verification

### Recommended Next Phase

1. Fix tracker entry and redirect correctness first.
- primary-domain alias should dispatch into tracking
- resolved flow should never redirect to `about:blank`
- POST click redirect payload should return the actual execution destination

2. Connect conversion success to reports/logs/bootstrap refresh.
- persist conversion rows
- update conversion stats
- invalidate and rebuild conversions/report caches
- publish SSE for affected report pages

3. Bring `/api/tracking/*` into the same refresh contract as admin mutations.
- clicks
- conversions
- any downstream report-affecting tracking mutation

4. Re-run the Keitaro-aligned production checklist after those fixes.
- redirect chain
- click record
- conversion record
- reports visibility
- SSE/cache propagation
