# CFtracking × Keitaro 对标执行计划（合并版）
更新日期：2026-04-09

## 1. 合并来源
- `docs/AUDIT_KEITARO_GAP_2026-04-08.md`
- `docs/AUDIT_UI_UX_2026-04-08.md`
- `docs/TRIANGULAR_VALIDATION_ANALYSIS_2026-04-08.md`
- `docs/MULTI_AGENT_BRAINSTORM_FINAL_REPORT.md`
- 本轮三专业评审（外观设计 / 交互体验 / 表格筛选组合效率）

## 2. 完成定义（DoD）
- P0/P1 范围内任务逐项落地，且有可追溯回归证据。
- 关键链路 `Tracking -> Conversion -> Reports/Logs -> Export` 无阻断缺陷。
- 生产审计通过（路由、表单、CRUD）。

## 3. 批次执行状态

### Batch A（P0，主链路阻断）
| ID | 任务 | 状态 | 结果 |
|---|---|---|---|
| A1 | Reports Builder 与 Exported Reports 异步导出链路打通 | ✅ 完成 | Reports 可直接 Queue 导出并跳转队列。 |
| A2 | ExportTask 实体分发修复（非硬编码 campaigns） | ✅ 完成 | 支持 `reports/clicks/conversions/...` 按实体导出。 |
| A3 | ExportTask 后台执行稳定性 | ✅ 完成 | 使用 `executionCtx.waitUntil(...)`，避免 pending 卡死。 |
| A4 | 无 R2 下载兜底 | ✅ 完成 | 支持 data URL 下载回传。 |
| A5 | Tracking 写入触发 cache/SSE invalidation | ✅ 完成 | click/conversion/postback/batch 全链路触发失效。 |

### Batch B（P1，运营能力与交互效率）
| ID | 任务 | 状态 | 结果 |
|---|---|---|---|
| B1 | Domains readiness + 治理快捷修复 | ✅ 完成 | 增加 Readiness Snapshot、治理告警、`Fix now` 直达编辑。 |
| B2 | Log Explorer 筛选可解释性与导出链路 | ✅ 完成（Phase 1） | Clicks/Conversions 新增 Active Filters（可单项移除/Clear All）、Queue Export、导出队列入口、本地筛选持久化。 |
| B3 | Landing/Offer 托管能力（Local/Hosted/ZIP） | ✅ 完成 | 新增 Hosted Asset 上传/托管链路，Landing/Offer 表单支持 Hosted/Local/ZIP 三态。 |
| B4 | Rule 可解释化（冲突检测 + Test Bench） | ✅ 完成 | 新增 `/api/rules/conflicts` 与 `/api/rules/test-bench`，Rule 页面增加冲突报告与决策路径测试台。 |
| B5 | Traffic Source 宏/回传模板预览 + API Verify | ✅ 完成 | 新增宏预览 API、结构化 API Verify 诊断，并已联动前端表单展示。 |

### Batch C（P1，UI/UX 统一与最少点击）
| ID | 任务 | 状态 | 结果 |
|---|---|---|---|
| C1 | 表格规范统一（分页、无误导操作、导出语义一致） | ✅ 完成（Phase 1） | Campaign 导出改为当前筛选结果；移除无效伪按钮；增加行内启停快捷动作；Clicks 补 pageSize。 |
| C2 | 输入约束与前后端长度校验闭环 | ✅ 完成（本轮范围） | 既有长度约束继续下沉至后端服务层（含 Flow Rule 相关校验与测试覆盖）。 |
| C3 | 移动端布局与交互可用性回归 | ✅ 完成（本轮审计） | 生产审计移动端路由未发现溢出/遮挡阻断项。 |

### Batch D（P2，增强项）
| ID | 任务 | 状态 | 说明 |
|---|---|---|---|
| D1 | 反作弊增强（Bot list/Geo profile/Simulate/Archive Import） | 🚧 进行中 | 后端 API 已完成；前端工作台已启动；报表系统已接入反作弊维度/指标（source/zoneid/utm/subid + fraud/blacklist 指标）。 |
| D2 | CustomMetrics/ConversionTypes 驱动 Reports 动态指标 | ⏳ 待实施 | P2 非阻断。 |
| D3 | AutoOptimization 与 Agent 闭环 | ⏳ 待实施 | 依赖规则引擎稳定后推进。 |

## 4. 本轮新增修复清单（代码已落地）
- Campaign
  - 导出数据源由全量改为当前筛选结果。
  - 工具栏移除未选择场景下的“伪可点击”批量按钮。
  - 行内新增单条启停快捷动作，减少点击路径。
- Clicks Log
  - 新增 Active Filters 条（单项移除 + Clear All）。
  - 新增 Queue CSV（异步导出任务）+ Export Queue 入口。
  - 补齐 page size 切换，筛选状态本地持久化。
- Conversions Log
  - 新增 Active Filters 条（单项移除 + Clear All）。
  - 新增 Queue CSV + Export Queue 入口。
  - 状态修改前置到主行，减少“先展开再修改”操作。
  - 筛选状态本地持久化。
- Domains
  - 新增批量动作：Activate / Pause / Delete / Clear Selection。
  - 治理告警新增 `Fix now`，直达对应 Domain 编辑。
- Rule Management
  - 新增冲突检测面板（重复优先级 / 条件重叠 / 动作冲突）。
  - 新增 Decision Path Test Bench（输入上下文后返回匹配链路与赢家规则）。
  - 前后端新增能力接口：`GET /api/rules/conflicts`、`POST /api/rules/test-bench`。

## 5. 回归与验收证据

### 5.1 本地门禁
1. `npm run typecheck` ✅ 通过  
2. `npm run test:run` ✅ 通过（61 tests passed）

### 5.2 生产审计
1. `node scripts/production-auth-e2e-audit.mjs` ✅ 通过  
2. 报告路径：  
`output/playwright/prod-auth-audit-2026-04-09T01-55-33-801Z/report.json`
3. 摘要：
  - `routesAudited=34`
  - `routeIssueCount=0`
  - `formsAudited=9`
  - `formsNotOpened=0`
  - `crudSteps=39`
  - `crudFailureCount=0`

## 6. 下一批执行顺序（继续直至全部通过）
1. D1 前端闭环补齐（设置/日志视图接入 + 回归）
2. D2 指标动态化（CustomMetrics/ConversionTypes → Reports）
3. D3 Agent 闭环（AutoOptimization 接入）

## 7. 执行约定
- 每完成 1 个任务批次，立即执行：
  - 本地门禁（typecheck + tests）
  - 生产登录态审计（route/form/CRUD）
  - 回填本文件状态与证据路径
- 任一门禁失败则先修复再推进下一批。

## 8. 2026-04-09 增量更新（Batch B5）
- 状态：已完成
- 实施范围：
  - 新增 `POST /api/traffic-sources/macro-preview`，支持参数宏与回传模板预演。
  - 增强 `POST /api/traffic-sources/test-connection` 返回结构化诊断字段：
    - `checkedAt`、`durationMs`、`platformType`、`baseUrl`、可选 `httpStatus`、可选 `hint`。
    - 连接失败场景改为返回结构化结果（HTTP 200），便于前端直接展示排障信息。
  - 前端联动：
    - Traffic Source 表单新增“样本上下文 JSON + 宏预览”。
    - 新增回传 URL 渲染预览与 unresolved 宏提醒。
    - API Verify 展示延迟/状态/提示等诊断信息。
- 回归证据：
  - `npm run typecheck` ✅ 通过
  - `npm run test:run` ✅ 通过（64 tests passed）
  - `node scripts/production-auth-e2e-audit.mjs` ✅ 通过
  - 审计报告：`output/playwright/prod-auth-audit-2026-04-09T04-51-10-846Z/report.json`

## 9. 2026-04-09 增量更新（Batch B3）
- 状态：已完成
- 实施范围：
  - 新增 Hosted Asset 管理能力：
    - `POST /api/hosted-assets/upload`
    - `GET /api/hosted-assets/:id`
    - `DELETE /api/hosted-assets/:id`
    - `GET /hosted-assets/:id/content`（公开访问）
    - `GET /hosted-assets/:id/archive`（ZIP 下载）
  - Landing / Offer 表单新增 Hosting Mode（Hosted URL / Local HTML / ZIP Archive）。
  - Local/ZIP 模式下自动上传托管资源并回填可访问 URL 到 `url` 字段，兼容现有 Tracking 跳转链路。
  - EntityForm 新增文件字段支持，并修复 hidden 字段不应参与必填校验的问题（用于多模式表单）。
- 回归证据：
  - `npm run typecheck` ✅ 通过
  - `npm run test:run` ✅ 通过（64 tests passed）
  - `npm run verify:frontend` ✅ 通过
  - `node scripts/production-auth-e2e-audit.mjs` ✅ 执行完成
  - 审计报告：`output/playwright/prod-auth-audit-2026-04-09T06-01-02-453Z/report.json`
  - 审计摘要：`routesAudited=34`，`routeIssueCount=1`，`formsAudited=9`，`crudFailureCount=0`

## 10. 2026-04-09 增量更新（Batch D1 启动）
- 状态：进行中（Start）
- 实施范围：
  - 前端新增 `Anti Fraud Workbench` 页面（`/anti-fraud`）并加入导航入口。
  - 新增反作弊 API 封装：
    - `simulateAntiFraudDetection`
    - `fetchAntiFraudBotList`
    - `fetchAntiFraudGeoProfile`
    - `importAntiFraudArchive`
  - 工作台首批能力：
    - 模拟事件检测（Simulate）
    - Bot 列表拉取
    - Geo 风险画像拉取
    - 归档导入触发与结果回显
- 待续项（D1 下一步）：
  - 反作弊日志/统计视图接入与筛选
  - 人机验证配置（Turnstile/Recaptcha）前端管理面板
  - 与规则/自动化模块的联动动作（challenge/block）可视化

## 11. 2026-04-09 增量更新（Batch D1 报表接入）
- 状态：已实施（本轮）
- 实施范围：
  - Report Builder 新增反作弊相关维度：
    - `source`、`zoneid`、`utm_source`、`utm_campaign`、`subid1`、`subid2`、`subid3`
  - Report Builder 新增反作弊相关指标：
    - `fraud_clicks`、`bot_clicks`、`avg_fraud_score`、`blacklist_hits`、`blacklist_rate`
  - 后端报表查询在命中上述维度/指标时自动切换为 clicks 明细聚合，支持：
    - source/zone/utm/subid 组合筛选
    - 欺诈流量识别与均值评分
    - 黑名单命中与占比统计
- 回归证据：
  - `npm run typecheck` ✅ 通过
  - `npm --prefix frontend run lint` ✅ 通过

## 12. 2026-04-09 Incremental Update (D1 + D2 integration)
- Status: In progress (implemented in this round)
- Completed in this round:
  - Added `GET /api/analytics/reports/metadata` to expose dynamic dimensions/metrics.
  - Wired active Custom Metrics into report metadata and report builder metric options.
  - Upgraded report query engine to support custom metric computation (including dependency resolution), custom-metric filter, and custom-metric sort.
  - Ensured report query/export share the same backend calculation path via `DashboardQueryService`.
  - Refactored frontend `CustomMetrics` page to match backend schema (`type/status/dataType=format/decimals/prefix/suffix`) and list shape (`{ list, total, page, pageSize }`).
  - Removed standalone Anti-Fraud report entry from main navigation/route. Anti-fraud analysis is now expected in Reports builder.
- Next validation gates:
  - `npm run typecheck`
  - `npm --prefix frontend run lint`
  - `npm run test:run`
