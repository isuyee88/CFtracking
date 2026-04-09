# Keitaro 功能对标检查报告（2026-04-08）

## 1. 方法与范围
- 参考文档：`docs/KEITARO_GAP_ANALYSIS_2026-04-05.md`、`docs/MULTI_AGENT_BRAINSTORM_FINAL_REPORT.md`、`docs/AI_AGENT_ARCHITECTURE_DESIGN.md`（按照用户要求先后阅读）。
- 代码触点：前端页面 `frontend/src/pages/{CampaignManagement,CampaignDetail,Landings,Offers,TrafficSources,Reports,ClicksLog,ConversionsLog,RuleManagement,Domains}`、后端 `src/index.ts` / `src/routes/auth.routes.ts` / `src/services/{tracking,antiFraud}` 等，结合 `scripts/production-audit.mjs` 与 `test/e2e-*` 自动化脚本提示。
- 目标：按 Keitaro Demo 的 Campaign/Landing/Offer/Traffic Source、报表/过滤/规则、反作弊、鉴权六个维度评估差距，输出可执行修复清单（P0/P1/P2），并列出“必须先修复”的前 10 项。

## 2. 当前实现与 Keitaro 要求对照（按大类归纳）

### 2.1 Campaign / Flow 控制
- 已实现：`CampaignManagement` 通过虚拟表格展示 Campaign 列表，`CampaignDetail` 提供 `General`/`Routing`/`Tracking`/`Parameters`/`Postback`/`Notes` 标签，集成 `FlowDesigner` + `CampaignRoutingWorkbench` 编辑 `flowRotation`、weight、filters、visitor binding、tracking script、API token、postback、cost model、uniqueness 设置。
- Keitaro 期待：nested group tree、Decision Path 测试台、fallback/forced/default 展示、tracking script 与 KClient 可复制、流量 alias 入口直接进入 Tracking pipeline。当前 Flow 编辑器虽然涵盖 flowType/weight，但缺少 Explainability 和 alias 路径重定向（`docs/KEITARO_GAP_ANALYSIS_2026-04-05.md` 第 4、15、17 项提示该块仍不足）。

### 2.2 Landing / Offer / Traffic Source / Affiliate
- 已实现：`Landings` 与 `Offers` 支持 CRUD、状态、group、redirect/action type、payout、国家、currency；`TrafficSources` 提供参数模板、API 配置、postback config、导出；`AffiliateNetworks` 单独维护 network registry。
- Keitaro 期待：landing 支持 `Local/Redirect/Preload/Action` + ZIP hosting + `{offer}` 替换；offer 可配置 hosted/redirect/preload/alias；traffic source 具备参数宏、postback template、click macro、同步/验证。当前 Landing/Offer 页面仅处理外部 URL，缺 ZIP / hosting 资产管理；Traffic Source 虽有模板，但后台尚未提供宏库/同步校验、postback preview（`docs/KEITARO_GAP_ANALYSIS_2026-04-05.md` 第 3、5 部分列出这些要素）。

### 2.3 报表 / 过滤 / 日志
- 已实现：`Reports` 具备 Builder（Dimension/Metric/Filters/Sort/Limit），支持模板、保存视图、本地 Storage、导出；`ClicksLog` 与 `ConversionsLog` 有日期筛选、分页、GroupBy、bootstrap 缓存；`ExportedReports` 替代导出列表。
- Keitaro 期待：完整的 Report Builder + saved views + exports；Log Explorer 具备 columns/filters/export/save；conversion/logs 的 grouping/geo/device 组合能动态配置。虽然已有基础，但缺少 builder/exports 的联动（`ExportedReports` 与 Builder 无参数共享）、Log Explorer 缺少 column/filters 持久化、export 无 async job 流程（`docs/KEITARO_GAP_ANALYSIS_2026-04-05.md` 第 2、3、22 项强调）。

### 2.4 规则 & 反作弊
- 已实现：`RuleManagement` 通过 JSON 条件/动作定义优先级规则、启用/禁用；`blacklist`/`whitelist`/`TrafficFilter` 页面管理名单；`src/services/antiFraud/antiFraud.service.ts` 提供 IP velocity、duplicate、bot、geographic 检测并写入 KV。
- Keitaro 期待：`Autorules` + Blacklist/Whitelist/Target 的可视化构建、Priority conflict 提示、专用 test bench（Addendum 指出 Priority conflicts 和 Decision Path），反作弊还应包含 Bot lists/Geo DB/Archive/Import/Simulate traffic（`docs/KEITARO_GAP_ANALYSIS_2026-04-05.md` 第 4 部分明确）。

### 2.5 鉴权 / Tracking / Domain
- 已实现：`src/index.ts` 利用 `AUTH_MODE`/`BYPASS_AUTH` + JWT 中间件保护 `/api/*`（除 auth/tracking）；`auth.routes.ts` 实现 `login`/`verify`；`CampaignDetail` 提供 `Tracking Script`、Tracking URL 复制；`Domains.tsx` 管理 hostname、usage、SSL、DNS provider、Cloudflare zone、默认 campaign/landing。
- Keitaro 期待：alias/domain 行为直接进入 tracking pipeline、click 返回正确 redirect、conversion 立刻写入 logs 并触发 SSE、Domains 提供 readiness snapshot + Cloudflare readiness + SSL/DNS 状态（`docs/KEITARO_GAP_ANALYSIS_2026-04-05.md` 第 6、22 项及 Addendum 中的 1-5 项）。当前 alias 仍被 SPA shell 捕获、`click` redirectUrl 正在写死 `about:blank`、conversion 返回后 bootstrap 304、SSE 无变化，Domains 缺少 readiness 视图。

## 3. 差距与风险（按优先级归纳）

### 3.1 P0 风险（业务阻断）
1. 别名入口（alias/domain）依然返回 SPA shell，Keitaro 要求直接进入 Tracking pipeline；否则 Campaign 控制台永远拿不到入口数据（`docs/KEITARO_GAP_ANALYSIS_2026-04-05.md` Addendum 中第一/第二项指明）。\n+2. 跟踪点击返回的 `redirectUrl` 为 `about:blank`，用户无法到达 landing/offer，CampaignDetail 的 FlowDesigner 也无法展示目标 URL，Blocking issue。\n+3. 转化事件未入库/UI 不刷新：`/api/tracking/conversion` 后续没有 invalidation，Conversion Log/Reports 仍旧 0，无法满足 Keitaro“conversion → reporting”模型（Addendum 第 3、5 项强调转换必须立即推送）。\n+4. Click/Conversion 写入不触发 SSE & cache refresh，Dashboard/Reports/Trends bootstrap 一直 `304`，Keitaro 要求将 Tracking 写操作纳入 cache invalidation 流（Addendum 第 5 项）。\n+
### 3.2 P1 风险（体验/管理）
1. Domains 缺 README-style readiness snapshot（Cloudflare zone/SSL/default campaign + landing、DNS/Registrar 状态），现有 `Domains.tsx` 仅字段列出，无法跟踪 readiness（Keitaro “Domain Governance”流程所需）。\n+2. Report Builder 虽具备维度/filters，但缺少与 `ExportedReports` 的 params 共享，Log Explorer（Clicks/Conversions）也没有 filters/columns 保存 & async export，导致导出与可复用视图断开（`docs/KEITARO` 第 2 部分说明需要 saved views + async export）。\n+3. Landings/Offers 仅处理 URL/redirect，没有 Zip hosting/local asset 管理，不满足 Keitaro `Local/Hosted` 模式与 `{offer}` 替换。`\n+4. Rule 管理只提供 JSON 文本，缺 nested group tree、priority conflict、test bench，可视化决策路径不可用，无法解释何时会触发哪个 rule（Addendum 16、20 项强调）。\n+5. Traffic Source 表单缺少参数宏预览/ postback template/ click macro preview、API config live verify，无法覆盖 Keitaro “Traffic Source” 的字段宏与 postback 流程。`\n+
### 3.3 P2 风险（增强/扩展）
1. 反作弊缺 Bot lists、Geo profiles、Simulate traffic、Archive/Import conversions，只能用 KV + 检测函数，运维场景不足；Keitaro 要求的 “Logs → Archive → Import” 套件未完成。`\n+2. `CustomMetrics`、`ConversionTypes` 页面存在，但 `Reports` API 是静态配置，没法直接拉取自定义 metric/charge，未完成 Keitaro “Custom Metric → Report” 流。`\n+3. `docs/AI_AGENT_ARCHITECTURE_DESIGN.md` 描述的 Agent (CampaignOptimizer/DataAnalyzer) 未形成“Agent→PlatformManager→UI 反馈”闭环，AutoOptimization Center 仍未对接 AI 评分。`\n+
## 4. 修复计划（P0/P1/P2）\n+
### P0（立即修复）\n+1. Tracking alias 必须跳过 SPA shell、直连 `/api/tracking/*`，并在 `click` 结果中返回真实的 landing/offer URL，保证 `CampaignDetail` FlowDesigner 能展示目标链接。\n+2. Conversion 写入后直接触发 bootstrap cache invalidation 与 SSE，使 Conversion Log/Reports 能实时反映（`CacheRefreshConsumer`、`CacheEventBroker` 需订阅 conversion channel）。\n+3. 所有 Tracking 写操作（click/conversion）必须驱动缓存/Bootstrap 重新生成，避免 dashboard/trends/audit manifest 一直 `304`。\n+
### P1（高优先级体验）\n+1. Domains 页面增加 readiness snapshot（Cloudflare zone/SSL/DNS/Registrar/default campaign/landing）、状态 badge、验证步骤，以满足 Keitaro 的 Domain Governance 流程。`\n+2. Report Builder 与 ExportedReports 共享 config，Clicks/Conversions log 增加 column/filter 保存、async export job，并提供 saved view registry。`\n+3. Landings/Offers 支持 `Local/Hosted` 资产，增加 Zip upload + hosted asset preview，FlowDesigner 中显示 action type；`TrafficSources` 加入 macro/postback preview + API verify。`\n+4. Rule 管理器提供 nested group + priority conflict 预览、Decision Path 测试台、condition/action schema 反馈，使规则可解释。`\n+5. Traffic Source 配置添加 parameter macro helper、postback script builder、push test API（前端 `TrafficSourceForm` + 后端 `src/services/trafficSource`）。\n+
### P2（常规完善）\n+1. 反作弊扩展 Bot list/Geo profile/Simulate traffic/Archive+Import endpoint，配 `Blacklist`/`Whitelist` 前端，形成完整运维链。`\n+2. `CustomMetrics`、`ConversionTypes` 页面动态驱动 `Reports` API 的 metrics 列表，避免硬编码。`\n+3. Auto Optimization Agent（`AutoOptimizationCenter.tsx` / `useOptimizerAgent.ts`）与 PlatformManager 反馈闭环，落地 `docs/AI_AGENT_ARCHITECTURE_DESIGN.md` 的 Agent 输出。`\n+
## 5. 自动化与验证提示\n+- `scripts/production-audit.mjs` / `scripts/prod-audit.mjs` 与 `test/e2e-*` 依赖真实 admin 登录，请在自动化环境中设置 `ADMIN_USERNAME`/`ADMIN_PASSWORD_HASH`、`JWT_SECRET`，`AUTH_MODE=on`（或临时 `AUTH_MODE=off` 供 R&D），本地代理端口 `12334` 需一致以保证 `wrangler dev` 与 scripts 使用同一端口。否则 `login` 页面会卡在 Loading（浏览器 context 无法访问 storage）。\n+- 自动化覆盖 Campaign CRUD、Landing/Offer/TrafficSource forms、Reports builder + Click/Conversion log、Tracking Script/Postback/Conversion pipeline，并验证 SSE/cache push（`frontend/src/pages/*` 与 `src/services/*`）。\n+
## 6. 必须先修复的前 10 项\n+1. Alias 域名必须直接走 Tracking pipeline（P0）。\n+2. Tracking click 必须返回真实 redirect（P0）。\n+3. Conversion 写入必须刷新 Reports/Logs（P0）。\n+4. Click/Conversion 必须驱动 cache/SSE 重新生成（P0）。\n+5. Domains 增加 readiness snapshot、SSL/DNS/Cloudflare 状态（P1）。\n+6. Report Builder 与 ExportedReports 联动、添加 saved view/async export（P1）。\n+7. Landing/Offer 支持 Local/Hosted/ZIP 资产与 `{offer}` 替换（P1）。\n+8. Rule 管理提供 nested tree/conflict/test bench（P1）。\n+9. Traffic Source 加 macro/postback preview + API verify（P1）。\n+10. 反作弊补充 Bot list/Geo profile/Simulate traffic/Archive Import（P2）。\n*** End Patch
