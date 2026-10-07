# CFtracking 下一轮工作计划：R2、归因一致性与运行时验收

> **For Hermes:** 按任务逐个执行；每个代码任务必须先写失败测试（RED），再做最小实现（GREEN），最后运行定向回归、完整 verify 和独立审查。

**目标：** 在不破坏当前工作树既有改动的前提下，把 Hosted Asset 的 R2/D1 双层存储从“单元测试可通过”推进到可验证的 Worker 路由契约，并优先修复 Keitaro 对标中最关键的归因、Postback 幂等和状态转换缺口。

**架构：** CFtracking 继续作为 Campaign、Flow、Landing、Offer、Click、Conversion、Postback 和 Report 的唯一事实源。R2 保存 HTML/ZIP/图片内容，D1 保存元数据、版本、事件和审计；Durable Objects/Queues 只承担实时协调和异步任务，不把大文件放入 D1，不新增未经资源配额确认的 Cron 或 Queue。

**技术栈：** Cloudflare Workers、Hono、D1、R2、Durable Objects、现有 Queue、TypeScript、Vitest、Playwright、k6、Wrangler。

---

## 当前基线与事实

- `HostedAssetService` 已实现 R2 上传、读取、删除、D1 元数据、旧 D1 Base64 回退、图片魔数校验和失败回滚。
- 本轮新增公开路由、路由配置和迁移链测试：`10 tests passed`（公开路由 3、路由配置 3、迁移 073 1、完整迁移链 1，加上相关 Hosted Asset 定向测试）。
- `npm run typecheck`、`npm run verify:frontend`、`npm run build:worker` dry-run 已通过；阶段 4 Landing version、inbound D1 生命周期、manual retry 和 outbound/report integration 已完成完整回归。
- 当前本地回归基线为 `57 test files passed / 236 tests passed`；新增 PostbackLogRepository fresh-table/retry-state 集成测试、ReportService outbound delivery 单元/集成测试、manual retry route 回归和 Flow simulation service/API route/frontend API/UI、GrapesJS lazy-loading 契约回归。
- Wrangler production/dev/local-QA dry-run 能识别 bindings 和 assets 路由；这不是线上资源或 D1 migration 已成功的证明。
- 本地 D1 迁移链测试已暴露并修复 016、057、066、070 的新库兼容问题；完整 001→076 链在 SQLite/D1 兼容面通过。Wrangler `d1 migrations apply --local` 仍受当前 DNS/fetch 失败和 Node UV assertion 阻断，未宣称 CLI 迁移成功。
- 当前工作树包含大量未提交历史改动；本轮只允许修改本计划列出的文件，不得 reset、clean、覆盖其他工作。
- 当前 Postback 幂等仓库已增加显式 delivery state 和 retry due 查询；入站回传路径使用统一 attribution event ledger，但完整的 outbound route/report integration 仍待补齐。
- `PostbackService` 成功后才标记 sent；失败进入 retry/dead-letter；due-retry consumer 已接入现有 5 分钟 Cron。

---

## 阶段 1：Hosted Asset Worker 路由与迁移门禁（P0）

### Task 1.1：增加 Hono 公开资产路由回归测试

**Status: DONE (2026-10-07).** Added route-level coverage for HTML, ZIP, 404, and R2-missing 503 responses, including ETag, CSP, and `nosniff` assertions.

**目标：** 证明 `/hosted-assets/:id/content` 和 `/hosted-assets/:id/archive` 不会被 SPA fallback 吞掉。

**文件：**
- Create: `src/services/hostedAsset/hostedAsset.public.routes.test.ts`
- Modify if needed: `src/services/hostedAsset/hostedAsset.public.routes.ts`
- Test config: `wrangler.dev.toml`, `wrangler.toml`

**测试先行：**
- 构造最小 Hono router 和 mock Env。
- 断言 local HTML 返回 `text/html`、安全响应头和正确 body。
- 断言 R2 ZIP 返回 `application/zip`、`Content-Disposition` 和 ETag。
- 断言不存在资源返回 404；R2 元数据存在但对象缺失返回 503。

**验证：**
```bash
npm exec vitest run src/services/hostedAsset/hostedAsset.public.routes.test.ts
```

### Task 1.2：验证并固定 `run_worker_first` 路由契约

**Status: DONE (2026-10-07).** Added `hostedAsset.routing-config.test.ts` and updated production, dev, and local-QA Wrangler assets configuration to include `/hosted-assets/*` explicitly.

**目标：** 生产和开发配置都让 `/hosted-assets/*` 先进入 Worker。

**文件：**
- Modify: `wrangler.toml`
- Modify: `wrangler.dev.toml`
- Create: `src/config/worker-routing-contract.test.ts`（如现有测试组织允许）

**验收：**
- 配置同时包含 `/api/*`、`/events/*`、`/hosted-assets/*`。
- 使用 Wrangler production/dev dry-run 检查 binding 和 assets 路由。
- 不进行生产部署。

### Task 1.3：完成 D1 migration 的本地验证，禁止把新 schema 依赖留在请求路径

**Status: DONE (2026-10-07, migration gate).** Added executable migration tests for 073 and the complete 001→076 chain. The chain passes after fixing fresh-D1 incompatibilities in migrations 016, 057, 066, and 070. Production legacy drift was reconciled without replaying wide-table ALTER statements: existing `clicks` effects were recorded through the 077 boundary, missing Hosted Asset fields/indexes were applied, and remote D1 read-back returned `No migrations to apply` plus confirmed migrations 074–077. The production Worker was then deployed and verified separately; the historical reconciliation boundary remains documented for future migrations.

**目标：** 让 `073_hosted_assets_storage.sql` 成为正式 schema 来源，运行时只保留明确的迁移期兼容逻辑。

**文件：**
- Verify: `schema/migrations/073_hosted_assets_storage.sql`
- Modify: `src/services/hostedAsset/hostedAsset.service.ts`
- Create: `src/services/hostedAsset/hostedAsset.schema.test.ts`
- Verify: `wrangler.local-qa.toml`

**步骤：**
1. 在本地 D1/QA 数据库应用 migration。
2. 回读 `hostedAssets` 的列和索引，确认 `storageBackend`、`r2Key`、`contentBase64 DEFAULT ''` 存在。
3. 只对明确的旧数据库兼容场景保留 fallback；不要吞掉非 duplicate-column 的 D1 错误。
4. 评估移除请求路径 `CREATE TABLE` 的时间点；生产迁移完成前不得贸然删除兼容分支。

**验收：**
- 新库和旧库各有一条可重复执行的验证命令。
- migration 失败能阻断发布，不被公开请求隐式掩盖。

---

## 阶段 2：R2/D1 生命周期与孤儿对象治理（P0/P1）

### Task 2.1：补齐上传/删除失败矩阵

**文件：**
- Modify: `src/services/hostedAsset/hostedAsset.r2.test.ts`
- Modify: `src/services/hostedAsset/hostedAsset.service.ts`

**必须覆盖：**
- R2 `put` 失败：D1 不写入。
- D1 metadata 写入失败：R2 best-effort 删除，原始错误保留。
- D1 删除失败：R2 不应先删除。
- R2 删除失败：D1 元数据已删除，并记录可观测错误，不返回虚假的“完全清理”。
- R2 缺失且 D1 为空 Base64：503、不可缓存。
- R2 缺失且明确为旧 D1 资产：仍可读取 Base64。

### Task 2.2：建立 R2 orphan reconciliation 设计，不新增 Cron

**目标：** 清理 D1 已无对应元数据的 R2 对象，同时遵守 Cloudflare 免费资源限制。

**文件：**
- Create: `src/services/hostedAsset/hostedAsset.reconciliation.ts`
- Create: `src/services/hostedAsset/hostedAsset.reconciliation.test.ts`
- Modify: 现有 Queue/DO consumer（先确认可复用的消息类型）
- Document: `docs/plans/2026-10-07-next-iteration-r2-attribution-runtime-qa.md`

**约束：**
- R2 `list` 必须分页；单次处理有上限。
- 不把全量对象清单放入 D1，也不在请求路径扫描 R2。
- 优先复用已有 Queue/DO 协调能力；若现有 Queue 语义不适合，先记录阻塞，不直接新增生产 Queue。
- 任务必须可重试、可观测、幂等。

**验收：**
- 有 dry-run 模式。
- 有单批上限和失败重试策略。
- 没有新增未经账户配额确认的 Cron。

---

## 阶段 3：归因与 Postback 状态机（最高优先级 P0）

### Task 3.1：先定义统一 conversion identity/event contract

**Status: DONE (2026-10-07).** Unified event types, migration 074, D1 repository, explicit status transitions, idempotent append, and conversion-id attachment are implemented and covered by repository tests.

**文件：**
- Create: `src/types/attribution-event.ts`
- Create: `schema/migrations/074_attribution_events.sql`
- Create: `src/handlers/d1/attribution-event.repo.ts`
- Create: `src/handlers/d1/attribution-event.repo.test.ts`

**最小字段：**
- `sourcePlatform`
- `transactionId`
- `clickId`
- `conversionId`（可为空，后续补齐）
- `eventStatus`
- `payout`
- `currency`
- `occurredAt`
- `receivedAt`
- `rawHash`（仅用于去重/审计，不保存敏感原始 payload）
- `requestId`

**约束：**
- 唯一键至少包含 `sourcePlatform + transactionId + eventStatus`。
- 状态转换必须显式允许：`pending → approved → reversed` 等；非法逆向转换拒绝或记录为异常事件。
- 不用 KV 做高频幂等状态；D1 是最终一致性账本，DO 只做短时协调。

### Task 3.2：修复 inbound postback 的重复与状态变化

**Status: DONE (2026-10-07).** Inbound now requires transaction identity, appends the canonical attribution event, preserves missing-click evidence, maps provider lifecycle states, avoids duplicate approved conversion creation, and updates existing conversion status for reversal/rejection. Local migrated D1 route integration now covers pending→approved→reversed, duplicate status idempotency, conversion-id reuse, and attribution-event evidence. Production D1 migration read-back is verified; production postback execution remains unverified because no authenticated production fixture was available.
- Modify: `src/routes/postback-inbound.routes.ts`
- Modify: `src/handlers/d1/postback-idempotency.repo.ts`
- Create: `src/routes/postback-inbound.routes.test.ts`

**RED 测试：**
- 同一 transaction/status 重复请求只落一条事件。
- 同一 transaction 的 `pending → approved` 会更新当前 conversion 状态但不重复计数 click。
- `approved → reversed` 会产生 reversal 影响，不新增一次 approved conversion。
- 缺少 transaction ID 时按平台契约拒绝或进入明确的低可信兼容分支，不能静默伪造唯一键。
- 未找到 click 时保留可重试/待匹配状态；不要只返回成功并丢失事件证据。

### Task 3.3：修复 outbound postback delivery state

**Status: DONE (2026-10-07).** Delivery persistence models pending→sending→sent, retry, and dead_letter; failed sends are no longer marked sent; attempt count, error, status code, request ID, and retry time are persisted. Sender tests cover 500/429 retry, timeout retry, and non-retryable 4xx. The bounded due-retry consumer rebuilds conversions/configuration, claims rows atomically, sends through the existing PostbackSender, records sent/retry/dead_letter outcomes, and is wired into the existing 5-minute platform Cron without adding a Queue/Cron binding. Manual retry now selects only logs backed by a persisted `retry` delivery state, uses the same state machine, and is covered by route/service/repository tests. Reports now expose confirmed conversion counts separately from outbound `sent`, `pending` (`pending`/`sending`/`retry`), and `dead_letter` delivery counts. Production deployment is complete, but authenticated delivery/read-back remains unverified.
- Modify: `src/services/postback/postback.service.ts`
- Modify: `src/services/postback/postback.sender.ts`
- Create/Modify: `src/handlers/d1/postback.repo.ts`
- Create: `schema/migrations/075_postback_delivery_state.sql`
- Create: `src/services/postback/postback.service.test.ts`
- Create: `src/services/postback/postback.retry-consumer.test.ts`
- Create: `src/services/postback/postback-retry.consumer.ts`
- Modify: `src/services/platform/cron.worker.ts`
- Modify: `src/handlers/d1/postback-idempotency.repo.ts`（使用 julianday 兼容 ISO retry timestamp）

**目标状态：**
`pending → sending → sent`；失败进入 `retry`，超过上限进入 `dead_letter`。

**必须修复：**
- 不得在发送失败后无条件 `markSent`。
- retry 需要 `attempt`、`lastError`、`nextRetryAt`、`statusCode`、`requestId`。
- 同一个 conversion/status/platform 的发送必须幂等。
- 是否使用现有 Queue/DO 必须先核对 consumer、批量限制和账户配额；不能未经核对新增资源。

**验收：**
- 网络 500/429、超时、4xx 的 retry 分类有测试。
- due retry consumer 有 bounded batch、原子 claim、conversion/config rebuild、send/retry/dead_letter 结果测试，并复用既有 5 分钟 Cron。
- 重复 worker 执行不会造成重复发送。
- 报表可区分已确认 conversion 与尚未成功送达的 outbound postback。

---

## 阶段 4：Landing 版本、发布和回滚（P1）

### Task 4.1：建立 Landing version schema

**Status: DONE (2026-10-07).** Migration 076, version types, D1 repository, publish/archive lifecycle, pause state, rollback metadata, service, API routes, and repository/service/route/migration-chain tests are implemented.
- Create: `schema/migrations/076_landing_page_versions.sql`
- Create: `src/handlers/d1/landingPageVersion.repo.ts`
- Create: `src/types/landingPageVersion.ts`
- Create: `src/services/landingPage/landingPageVersion.service.ts`
- Create: 对应 Vitest 测试

**版本至少包含：**
- landing page ID
- version number
- asset ID / manifest snapshot
- status：draft/preview/published/paused/archived
- publishedAt、publishedBy
- rollbackFromVersion
- content hash / ETag

### Task 4.2：接入 API 和前端交互

**Status: DONE (2026-10-07).** Landing version API routes, frontend API client, and Landings page version-management UI are implemented and regression-tested. The UI provides list/create-draft/publish/pause/rollback/copy/preview actions, confirmation dialogs for state-changing actions, action loading/error feedback, narrow-screen-safe modal/table overflow, and keeps monetized external links explicitly non-sponsored where they are ordinary previews.
- Modify: `src/services/landingPage/lp.routes.ts`
- Modify: `frontend/src/pages/Landings.tsx`
- Modify: `frontend/src/services/api.ts`
- Create: frontend interaction tests

**验收：**
- Backend routes cover list/create-draft/publish/pause/rollback; direct published creation is rejected so edits cannot auto-publish.
- Frontend API client covers list/create/publish/pause/rollback and has endpoint/body tests.
- Migration chain test now covers 001→076 and asserts Hosted Asset, attribution event, Postback delivery, and Landing Page version schema.
- `npm run typecheck` passes.
- `npm run test:run` passes: 57 files / 236 tests.
- `npm run verify:frontend` passes; existing GrapesJS chunk warning and dependency audit findings remain recorded, not treated as resolved.
- `npm run build:worker` passes with Wrangler production dry-run. Production deployment and bounded online read-back completed on 2026-10-07; authenticated data-bearing fixtures were not available, so this is not a full production UI/API regression claim.
- 预览、发布、暂停、复制、回滚动作有确认和 loading 状态。
- 发布失败不会改变当前 published version。
- 长 URL、长文件名、错误信息在桌面和 390px 窄屏不撑破布局。
- Disclosure 在可见内容中位于 monetized CTA 附近；链接使用 `rel="sponsored"`（适用时）。

---

## 阶段 5：Flow/Filter/反作弊模拟（P1）

### Task 5.1：统一规则输入和解释结果

**Status: DONE (2026-10-07).** Added a side-effect-free `FlowSimulationService` that reuses `FlowValidator` semantics, evaluates active forced/regular/default flows deterministically, returns matched rule/reason/action/risk/latency/trace fields, preserves unknown risk as `null`, and is covered by service tests.

**文件：**
- Modify: `src/services/flow/flow.engine.ts`
- Modify: `src/services/autorule/realtime-rule-engine.service.ts`
- Modify: `src/types/flow.schema.ts` / 相关类型文件
- Create: `src/services/flow/flow.simulation.service.ts`
- Create: 对应测试

**覆盖维度：**
- GEO、device、OS、browser、language、ISP、ASN、referrer
- bot/proxy 标记
- whitelist/blacklist
- forced/regular/default flow
- matched rule、reason、action、risk score、latency

**Cloudflare 约束：**
- 仅使用 Worker 实际可得到的 `request.cf` 或已存在的可信输入。
- 未提供的 GEO/ASN 数据必须标记 unknown，不得猜测。
- 真实 tracking path 与 simulation path 共用规则 evaluator，避免两套逻辑漂移。

### Task 5.2：增加 Simulation API/UI

**Status: DONE (2026-10-07).** Added `POST /api/flows/simulation`, typed frontend API client support, and a Traffic Filter Flow Simulation tab with JSON context/schema inputs, rotation and trusted risk controls, validation/error state, deterministic decision/trace display, and raw-result inspection. API/UI regression tests cover endpoint payload wiring and visible UI contracts.

**文件：**
- Create/Modify: `src/services/flow/flow.routes.ts`
- Modify: `frontend/src/pages/TrafficFilter.tsx` 或规则管理页面
- Create: API/UI regression tests

**验收：**
- 相同输入 deterministic。
- 可解释命中顺序。
- 未命中时明确返回 default/do-nothing，而不是空白页面。

---

## 阶段 6：运行时、UI 和性能回归（P1）

### Task 6.1：把 Hosted Asset 场景加入 Playwright regression matrix

**Status: PARTIAL DONE (2026-10-07).** Added `e2e/hosted-assets.spec.ts` and wired the same unknown/HTML/ZIP/R2-missing/viewport matrix into `test/e2e-regression-matrix.ts`. With the no-AI `wrangler.local-qa.toml` local Worker on `8787`, the Chromium project passed the unknown-asset 404 and desktop/mobile overflow checks (`3 passed`, `3 skipped` for missing fixture IDs). The default `wrangler.dev.toml` startup still times out on its remote AI binding; Mobile Safari is not installed locally. Fixture-backed HTML/ZIP/R2-missing cases remain pending explicit QA fixture IDs, so the full matrix is not marked DONE.

**文件：**
- Modify: `test/e2e-regression-matrix.ts`
- Modify: `test/e2e-comprehensive.ts`（如适用）
- Create: `e2e/hosted-assets.spec.ts`

**场景：**
- `/health`
- hosted HTML 正常访问
- hosted ZIP archive 正常下载
- 不存在资源 404
- R2 缺失资源 503 且无缓存
- `/hosted-assets/*` 不返回 SPA `index.html`
- desktop 1440px / mobile 390px 页面错误状态不溢出

### Task 6.2：建立 k6 基线和硬门槛

**Status: PARTIAL DONE (2026-10-07).** Added explicit `smoke` and opt-in `stress` profiles to both k6 scripts and recorded a planned-only baseline with measurable acceptance fields. No k6 runtime result is claimed: k6 is not installed on this host and no approved QA endpoint/fixture or quota evidence was supplied.

**文件：**
- Verify/Modify: `k6/scripts/api-benchmark.js`
- Verify/Modify: `k6/scripts/tracking-load.js`
- Create: `docs/verification/2026-10-07-runtime-baseline.md`

**指标：**
- tracking redirect p50/p95/p99
- postback endpoint p50/p95/p99
- error rate
- D1/DO/Queue 失败数
- R2 content response latency

**规则：**
- 先记录 baseline，再设阈值。
- 没有真实环境数据时只能标记 planned，不得伪造性能结果。
- 不在免费 Cloudflare 配额不明时运行高并发生产压测。

### Task 6.3：拆分 GrapesJS 首屏加载

**Status: DONE (2026-10-07).** Verified the existing GrapesJS split instead of adding a duplicate loader: `Landings.tsx` keeps `React.lazy(() => import('../components/GrapesVisualEditor'))`, starts in `none`, and mounts the heavy editor only after the explicit Pro Studio action. Added `src/frontend/grapes-lazy-loading.test.js` for the static-import and mount-gating contract. Production build output records a separate `GrapesVisualEditor` chunk at `1,170.19 kB` (gzip `310.93 kB`); this is build evidence, not a claim that the chunk is loaded on non-editing pages.

**文件：**
- Verify: `frontend/src/pages/Landings.tsx`
- Verify: `frontend/src/components/GrapesVisualEditor.tsx`
- Create: `src/frontend/grapes-lazy-loading.test.js`
- Verify: Vite production build output

**验收：**
- 非编辑页面不加载 GrapesJS 大 chunk。
- 现有功能、编辑器初始化和移动端布局不回归。
- 以实际 build 输出记录 chunk size，不以警告消失作为唯一指标。

---

## 阶段 7：Cloudflare 资源与生产发布门禁（最后执行）

**Status: PARTIAL DONE (2026-10-07).** Production deployment completed at `https://cf-tracking.suyee88.workers.dev` with Worker Version ID `4c2970a1-0ac6-47c4-a4c3-6667786caa31`. Online smoke through the approved local proxy verified `/health=200`, `/api/auth/status=200` with `AUTH_MODE=on`, unknown Hosted Asset `404`, unauthenticated `/api/campaigns=401`, public tracking GET route handling (`c1` fixture absent, expected `404 Campaign not found`), and unauthenticated SPA routes rendering the login screen. The local matrix passed `63 total / 60 passed / 0 failed / 3 skipped`; the three skips are fixture-dependent Hosted Asset cases. Full authenticated conversion/postback/report read-back and k6 performance evidence remain blocked by missing approved production fixtures and k6 availability.

1. 仅使用项目当前 Wrangler 部署路径；不在未迁移项目中运行 `cf dev/build/deploy`。
2. 先对 development 配置执行 D1 migration、R2 binding、Worker dry-run 和 read-back。
3. 线上资源检查必须确认：account ID 格式、D1 database、R2 bucket、Queue、DO migrations、KV 和 cron 配额；凭据只走 vault/本地安全环境，不进入计划、日志或聊天。
4. 生产部署前必须有版本 ID、migration 结果、binding 摘要和回滚版本。
5. 部署后逐项 read-back：`/health`、hosted HTML、ZIP、tracking click、conversion、postback、report、rollback。
6. 任一线上资源无法读回时，结论只能是 blocked，不能写成 deployed/verified。

---

## 每个任务的执行循环

1. 明确文件和行为边界。
2. 写一个最小失败测试并运行确认 RED。
3. 实现最小修复并运行 GREEN。
4. 运行任务定向测试。
5. 运行 `npm run typecheck`、`npm run test:run`、`npm run verify:frontend`。
6. 需要时运行 `npm run build:worker` 和对应 Wrangler dry-run。
7. 对新增 diff 做安全审查，尤其是 HTML、R2 key、SQL、日志和外部请求。
8. 记录证据、未验证项、owner、deadline、metric 和下一文件。

## 本轮建议执行顺序

1. 阶段 1.1 + 1.2：公开资产路由契约和 SPA fallback 防回归。
2. 阶段 1.3：开发 D1 migration/read-back，确认 schema 门禁。
3. 阶段 3.1 + 3.2：先固定 inbound conversion identity 和状态转换。
4. 阶段 3.3：修复 outbound 失败标记与重试。
5. 阶段 4：Landing version/publish/rollback。
6. 阶段 5：Flow simulation 与反作弊解释。
7. 阶段 6：Playwright、k6、GrapesJS lazy loading。
8. 阶段 7：production deploy 已完成；只有补齐剩余 P0/P1 证据后，才可宣称完整线上回归和对标完成。

**最终门槛：** 当前已形成 production deployed 与 bounded online smoke 证据，但 P0/P1 的完整 Hosted Asset fixture、authenticated conversion/postback/report read-back 和 k6 性能证据仍未齐全。因此不得宣称“Keitaro 对标完成”，不得启动生产 paid traffic，不得把本轮 bounded smoke 扩大解释为完整线上回归。
