# CFTracking 对标 Keitaro 全面评审

评审日期：2026-10-07  
评审对象：当前工作树（包含未提交变更）  
角色视角：Affiliate 运营、流量投放、联盟网络、数据分析、风控和平台运维

## 结论

CFTracking 已经具备一个可运行的流量跟踪器骨架，覆盖 Campaign、Flow、Landing、Offer、Traffic Source、Tracking URL、Postback、报表、名单、反作弊、托管资产、D1/DO/KV/R2/Queue/SSE 等能力。代码层面的功能覆盖约为 7.5/10，桌面界面约为 7/10，交互流程约为 6.5/10，Affiliate 实际可运营性约为 6.5/10；相对 Keitaro 的成熟度约 60–70%。

当前不建议直接作为生产级 Affiliate 主力系统使用。主要原因是：未认证 bootstrap 可能泄露运营数据；通用 inbound postback 在未配置白名单时允许所有来源；转化持久化失败仍可能返回成功；登录缺少抗暴力破解和强密码哈希；tracking/redirect/conversion→report 的线上闭环尚未有当前版本的真实环境证据。功能面虽广，但治理、结算、实验、权限和上线门禁仍不足。

历史报告中曾记录 alias 返回 SPA、redirect 为 `about:blank`、conversion 不入报表等问题。当前代码已加入 alias 转发、tracking cache invalidation、归因和 postback migration，因此这些历史结论不能直接视为当前线上事实；但本次没有可用生产凭据完成闭环回归，应标记为“代码已修复，线上未验证”。`double` 隐私跳转使用 `about:blank` 是显式策略，不能与普通 redirect 缺陷混为一谈。

## 评审方法与验证结果

- 代码盘点：约 382 个 Worker 路由、25 个主要前端业务路由、D1 migration 001–076、Durable Objects、KV、R2、Queues、Cron、SSE。
- 自动验证：`npm run typecheck` 通过；`npm --prefix frontend run verify` 通过。
- 单元测试：56 个文件、235 个测试，234 通过、1 个失败。失败为 `src/routes/postback-inbound.routes.test.ts` 的 pending→approved→reversed 生命周期测试，完整套件在 10 秒超时；单独将该测试超时设为 30 秒后 3/3 通过，说明存在并发/资源争用或测试预算问题。
- Chromium E2E：44 个测试，31 通过、10 失败、3 跳过。可复现失败包括 `/api/health` 返回 404（测试请求的是 `/api/health`，实现为 `/health`）、页面标题为 `CF Tracking` 而旧测试断言 `CFTracking`、部分页面导航超时、`/api/landings` 404、postback 测试状态契约不一致。
- 前端构建警告：GrapesJS chunk 约 1.17 MB，AntD 约 453 KB，Recharts 约 439 KB；Browserslist 数据已过期。性能基线文档标记为 PLANNED/NOT MEASURED，当前不能宣称 P95、Lighthouse 或容量达标。
- 线上 UI：历史生产审计因 `AUTH_MODE=on` 无测试账号而停在登录页，不能证明真实 Dashboard、Campaign detail、弹窗和移动端状态。
- 测试可信度：部分 Playwright 用例在元素不存在时跳过断言，部分 API 用例接受 400/404；测试通过不等于功能存在。仓库没有 coverage script 或覆盖率结果，因此无法证明达到 80% 覆盖率。

## 功能模块对照

| 模块 | 当前能力 | 对标 Keitaro 的差距 | 评价 |
|---|---|---|---|
| Campaign/Flow | CRUD、状态、alias、cost、uniqueness、forced/regular/default、weight/position、Flow Designer、routing、simulation | 缺少强制上线前 readiness gate；无 default flow 仍可保存/激活；`/campaigns/new` 直达 404；决策路径解释仍不够集中 | 基础完整，生产门禁不足 |
| Landing/Offer | URL、hosted/local/ZIP、preload/action、GrapesJS、版本 draft/publish/pause/rollback、payout/cap | 资产全链路需真实环境验证；`{offer}` 替换、版本发布后的追踪入口、失败回滚尚无端到端证据；移动表格难用 | 能力较全，验收不足 |
| Traffic Source/Network | 多平台模板、宏、postback、API、cost model、mapping、联盟网络 | 缺稳定的 live verify、宏映射测试向导、网络同步/失败告警；API 失败时 AffiliateNetworks 回填伪数据 | 接近运营需求，但错误态危险 |
| Tracking | alias、subid1–30、IP/cookie/fingerprint 去重、geo/device、302/meta/js、KClient/脚本 | 当前版本未完成线上 alias→landing/offer→真实 redirect 的回归；redirect 目标、cookie、参数编码需真实域名验证 | P0 闭环待验 |
| Conversion/Postback | API、S2S webhook、平台参数映射、幂等、pending/approved/reversed、outbound retry/dead-letter | generic webhook 未配置白名单时 fail-open；postback 路径可缺 campaign/offer；转化落库失败仍 success；全局限速未实现 | 财务数据风险高 |
| Reports/Logs | Dashboard、Trends、Report Builder、saved views、funnel/cohort、custom metrics、CSV/XLSX/JSON、async export、Click/Conversion Log | 默认视图未清晰分层 confirmed/pending/reversed/chargeback；Builder、Log Explorer、Exported Reports 的配置复用需验收；移动端操作成本高 | 功能广，运营口径需收敛 |
| Rules/Anti-fraud | Autorules、black/white、ASN/ISP/country、proxy/challenge、bot/geo/simulation、AI optimization | 规则命中→动作→影响的解释、审批、回滚和审计仍分散；真实 Geo/Bot 数据源质量未证明；Target 页面为本地 mock | 治理闭环不完整 |
| Domains/Assets | DNS/SSL/Cloudflare proxy/default mapping、R2 hosted assets、CSP/nosniff/ETag | 缺一页式 readiness snapshot、证书/DNS/默认落地页阻断机制和线上验收证据 | 运营准备度不足 |
| Account/Governance | JWT 管理员登录、设置、偏好 | 无多用户/RBAC/租户隔离/审计日志/密码轮换/真正 2FA；Settings 明文提示这些能力延后到 Cloudflare One | 不满足团队化运营 |

## Affiliate 全流程验收

| 运营阶段 | 预期流程 | 当前判断 | 阻断点 |
|---|---|---|---|
| 1. 建域名与资产 | 配域名、SSL/DNS、默认 Campaign，上传 Landing/Offer 资产并预览 | UI 与后端入口存在 | 缺 readiness 硬门禁；生产状态未验证 |
| 2. 配联盟网络 | 建 Network、凭据、Offer、payout/cap、postback 模板 | 基础 CRUD 和模板存在 | 凭据轮换、分层 payout、账期/拒付/退款未形成结算工作台 |
| 3. 配买量源 | 选择模板、映射宏、生成 tracking URL、验证 API/postback | 模板与宏预览存在 | 缺“生成→测试点击→测试回传”的连续向导 |
| 4. 建 Campaign | 绑定域名/来源/LP/Offer，设置 Flow、去重、成本、规则 | 能力较强，详情页覆盖面广 | 无 default flow 仍可发布；`/campaigns/new` 直达失败 |
| 5. 上线投放 | 复制链接/脚本，真实访问 alias，进入正确 LP/Offer | 代码有 alias 转发与 tracking route | 当前版本没有真实线上成功证据；这是生产 P0 |
| 6. 接收转化 | 通过 clickid/subid 接收 postback，幂等更新状态 | 代码有生命周期与幂等实现 | generic webhook 可伪造；金额/币种/状态校验不足 |
| 7. 看数据 | Dashboard、日志、报表实时反映 click/conversion/revenue/profit/ROI | 数据模型和页面较全 | D1 失败仍返回成功；tracking write→SSE/bootstrap→report 闭环待线上证明 |
| 8. 优化与治理 | A/B、autorule、反作弊、成本同步、回滚和审计 | 有规则、模拟、AI 和成本同步基础 | 独立 A/B 工作台、显著性、审批/回滚、审计、Target 持久化不足 |
| 9. 结算复核 | 按 network/offer/country/device/payout 状态对账 | 有 payout 字段和 conversion 数据 | 缺确认/待确认/拒付/退款、汇率、账期、锁定与调整流程 |

## 关键发现（按优先级）

### P0：上线前必须处理

1. **未认证 bootstrap 泄露业务数据。** `/__bootstrap/*` 位于 `/api/*` JWT 中间件之外，且返回 `public`/CDN 可缓存内容；bundle 会查询 D1 并包含 campaigns、offers、traffic sources、flow logs、tracking scripts、metrics、recent clicks、entity data。证据：`src/index.ts:614-665`、`src/services/bootstrap/admin-bootstrap.ts:256-297`、`src/services/page/admin-page-bundle.ts:209-299`、`src/services/page/dashboard-page-bundle.ts:112-163`。应改为 JWT 或短时一次性签名，响应 `private, no-store`，避免跨用户公共缓存。

2. **通用 inbound postback 默认 fail-open。** `/api/webhook/*` 公开跳过 JWT；generic 平台只依赖 IP 白名单，而空白名单允许所有来源。攻击者只要拿到或猜到 clickId，就可能伪造 approved/payout 转化。证据：`src/services/auth/public-api-path.ts:6-9`、`src/routes/postback-inbound.routes.ts:189-212,311-345`、`src/middleware/postback-security.ts:75-89,129-133`。生产必须 fail-closed，要求平台签名或明确白名单，并验证 clickId 与来源归属。

3. **转化写入失败会被报告为成功。** `ConversionService` 先写 DO，再写 D1；D1 失败只记录日志，流程继续增加计数并返回 `success: true`。这会造成财务报表、实时计数和 postback 状态永久分叉。证据：`src/services/tracking/conversion.service.ts:161-199,236-245`。应采用 D1 outbox/补偿队列、幂等键、重试状态，并把持久化结果显式返回。

4. **Traffic Source 凭据可能随 API/bootstrap 返回。** Traffic source repository 解析 `apiConfig` 后，列表和详情 DTO 未见统一脱敏；bootstrap 又预取 traffic sources。若与未保护 bootstrap 叠加，API key/secret 可能被直接读取。证据：`src/handlers/d1/trafficSource.repo.ts:23-37`、`src/routes/trafficSource.routes.ts:19-41,97-110`、`src/services/page/admin-page-bundle.ts:212-214,271-284`。默认 DTO 必须移除 secret，凭据应进入 secret store，前端只显示掩码。

### P1：高优先级修复

5. **登录安全强度不足。** 密码使用无盐快速 SHA-256，未见账号/IP 失败窗口、指数退避或锁定；JWT 存在前端 `localStorage`，XSS 后可直接窃取。证据：`src/routes/auth.routes.ts:92-101,127-163`、`frontend/src/pages/Login.tsx:101`。应使用 Argon2id/scrypt/PBKDF2、Cloudflare/DO 限速、HttpOnly Secure SameSite cookie，并实现轮换/撤销。

6. **JWT 缓存键碰撞风险。** `JWTCacheManager` 使用 32-bit hash 作为缓存键，命中后直接信任 payload，理论上存在不同 token 碰撞导致跨 token 复用。证据：`src/services/cache/jwt-cache.ts:31-39`、`src/middleware/auth.ts:105-110`。使用 token 的 SHA-256/完整 token 作为键，并绑定 secret/version。

7. **URL 抓取可能造成 SSRF/内存 DoS。** Landing preload 直接 fetch 用户配置 URL，读取完整 body 后才检查 5 MB，batch 没有限制条目数；URL 校验也未限制为 http/https 和公网地址。证据：`src/services/landingPage/lp.preload.service.ts:220-249`、`src/services/landingPage/lp.preload.routes.ts:140-148`、`src/utils/validator.ts:21-27`。需逐跳限制重定向、拒绝 loopback/private/link-local/metadata IP，使用流式大小上限并限制 batch。

7. **转化输入契约不一致。** `/api/tracking/conversion` 校验 clickId/campaignId/offerId，但 `/conversion/postback` 只校验 clickId，campaign/offer 可为空；revenue/payout 未做 finite、范围、长度、币种和状态校验。证据：`src/services/tracking/tracking.routes.ts:311-365`。应统一 schema、金额范围和状态机。

8. **CORS 信任边界过宽。** 对任意 `*.suyee88.workers.dev` 和 `*.pages.dev` 反射 Origin，同时启用 credentials；pages.dev 子域可能属于其他项目。证据：`src/index.ts:399-421`。改成明确域名白名单，禁止凭据模式下的宽泛子域匹配。

9. **生产日志打印完整 Cloudflare 指纹和 IP。** `/api/tracking/*` debug middleware 无环境保护，输出 connectingIP、geo、bot、TLS 指纹等 PII/高基数数据。证据：`src/index.ts:358-382`。生产默认关闭，必要时只采样和脱敏。

10. **目标管理是假实现。** `Target.tsx` 使用 `mockTargets` 与本地 state，刷新即丢失，未调用后端 API。证据：`frontend/src/pages/Target.tsx:26-63`。应接入持久化实体并纳入 flow/rule 引用完整性。

11. **错误状态可能继续执行危险操作。** Auto Optimization 在 stats fetch 失败时仍显示 Engine Status/Run AI Now；AffiliateNetworks API 异常时展示硬编码网络和收益数据。证据：`frontend/src/pages/AutoOptimizationCenter.tsx`、`frontend/src/pages/AffiliateNetworks.tsx:237-280`。数据不可用时必须阻断执行，明确 stale/error 状态。

12. **默认 flow 和上线 readiness 不是硬门禁。** Campaign detail 可提示无 default flow 但仍允许保存/激活，生产流量可能落入 traffic loss。应在激活和发布动作前强制校验 fallback、域名、LP/Offer、postback 和 tracking URL。

13. **公开点击端点允许客户端伪造归因数据。** `/api/tracking/click` 接受 body/query 中的 IP、geo、device、cost、uniqueness 和任意长度 sub IDs；公开端点没有统一 body 上限和通用频控，攻击者可批量污染 ROI/反作弊/地域统计或制造 click flood。证据：`src/services/auth/public-api-path.ts:3`、`src/services/tracking/tracking.routes.ts:88-115,228-274`。应只信任 Cloudflare 服务端字段，成本改为签名 S2S，增加 schema、字段长度、数值范围和 per-IP/campaign 限速。

14. **Postback 限速在并发和故障下可能失效。** check 与 record 分离，存在 TOCTOU；D1 查询异常返回 0 继续放行，更新异常也被吞掉；全局 `maxGlobalPerSecond` 仍是预留接口。证据：`src/services/postback/rate-limiter.ts:64-67,150-203,283-336`。应使用原子 UPSERT/DO token bucket，故障时 fail-closed 或进入明确的降级队列。

15. **完整 E2E 契约已漂移。** `/api/health` 与测试路径不一致，页面标题断言过期，多个深链导航超时/404。测试不能作为当前交付门禁，需先统一路由和 fixture，再增加真正的 tracking→conversion→report 验收。

16. **JWT 声明校验不严格且无资源级授权。** 校验逻辑未强制 `alg`、`typ`、`exp`、`iat`、`userId/email` 类型，JWT 缓存也未绑定 secret/version；当前 token 只有 admin 身份，未见角色、租户或资源范围。证据：`src/index.ts:523-548`、`src/middleware/auth.ts:50-85`、`src/services/cache/jwt-cache.ts:31-39`。应使用标准 verifier、强制 claims、密钥版本化和 RBAC/tenant scope。

16. **部署配置允许认证被关闭。** `wrangler.dev.toml` 设置 `AUTH_MODE=off` 是本地测试需要，但 CI 必须阻止该配置进入生产；生产应验证所有 admin API 均处于 strict auth/Cloudflare Access 保护下。本地未认证结果不能直接等同生产漏洞，但暴露了部署门禁风险。

17. **监控入口仍是占位状态。** Campaign 创建流程的 Monitoring 页面显示 “Coming soon”，运营人员会误以为已经配置告警。应隐藏未实现入口或提供真正的阈值、通知渠道、测试告警和故障历史。

18. **点击持久化与实时统计可能分叉。** D1 click 写入后，DO trackClick/counter 异常只记录日志；请求层没有重试或死信。证据：`src/services/tracking/click.service.ts:1308-1335`、`src/services/tracking/tracking.routes.ts:277-289`。应通过 outbox/queue 实现可重试、幂等和可观测的统计事件。

19. **Durable Object 统计缺少事件幂等。** `TrackingStatsDO` 对重复 click/conversion 事件直接累加，公开 click flood 或队列重投会重复计数并扩大待写队列。证据：`src/handlers/do/tracking-stats.do.ts:221-249,267-287`。应以 clickId/conversionId 建唯一事件记录，并设置有界队列和背压。

补充一致性风险：`TrackingStatsDO.flushPendingWrites()` 使用 `INSERT OR REPLACE`，延迟 click 重投可能覆盖已写入的 conversion/revenue；pending writes 也没有明确上限和死信路径。证据：`src/handlers/do/tracking-stats.do.ts:452-471`。应改为保留转化字段的冲突更新，并暴露 backlog、重试和丢弃指标。

补充错误契约：空 JSON 调用 `/api/tracking/kclient/process` 可得到 500 并暴露 D1 类型错误，空 JSON 的 tracking script `track` 却可能返回 200 并生成 click；边界校验和错误脱敏不一致，应统一为可预测的 400/422。

### P2：中期完善

20. 无多用户、RBAC、租户隔离、审计日志、密码轮换、真实 2FA；Settings 明确提示这些能力延后到 Cloudflare One。
21. 缺独立 A/B 测试工作台：实验创建、样本、置信区间、胜者发布、暂停/回滚和显著性。
22. 缺完整结算/对账：分层 payout、生效时间、币种汇率、确认/待确认/拒付/退款、账期锁定和修正。
23. 移动端 Landing/Traffic Source 表格宽度约 1160–1239px，375px 视口需横向滚动；多个图标按钮小于 44px 且缺 aria-label，表单 label 关联不完整。
24. 自定义指标使用 `new Function` 计算公式。当前有字符过滤，但应改为受限 AST/解释器，避免未来规则扩展后重新引入代码执行风险。证据：`src/services/customMetric/metric.engine.ts:82`。
25. 根依赖审计发现 14 个漏洞（1 moderate、13 high），涉及 axios、hono、puppeteer、react-router、ws 等；应锁定升级窗口并验证兼容性。前端依赖另有 19 个漏洞（含 2 个 critical），需单独处置。

## 外观与交互评审

优点：桌面端 256px 分组侧栏、顶部搜索/主题/通知/用户、Breadcrumb、虚拟表格、懒加载和移动底部导航结构清楚；Campaign detail、Flow Designer、Landing visual editor、Reports Builder 的信息架构已接近专业 tracker。

主要问题：移动端把桌面宽表格压缩到窄容器，用户必须横向寻找关键列；底部导航可横滑但无渐变提示；小图标按钮和表单标签影响触屏、键盘和读屏；关键运营动作分散在多个页面，缺少“创建资产→生成链接→测试点击→模拟转化→确认报表”的向导；错误、空状态和数据新鲜度提示不统一。

本地实测 Dashboard 曾持续显示 “Realtime reconnecting” 同时保留实时数据文案，说明 SSE 断线时缺少明确的 stale/offline 状态、最后更新时间和手动刷新入口。

Dashboard 代码支持 revenue、profit、ROI、confirmed/pending 等指标，但默认空数据视图没有清楚呈现 confirmed/pending/reversed/chargeback 分层，也缺少 Keitaro 风格的 Campaign/LP/Offer/Source 排行和 Recent Clicks 运营入口。应区分“数据模型已支持”和“默认运营视图已可用”。

## 建议的修复顺序

### 阶段 0：生产安全闸门

1. 保护全部 bootstrap current/object，关闭公共 CDN 缓存。
2. generic postback 改 fail-closed，加入签名、来源归属、重放保护和全局限速。
3. 修复 conversion durable write 语义：outbox、重试、幂等、失败可见。
4. 关闭 tracking debug PII 日志，限制 CORS，修复 SSRF 和金额输入校验。

### 阶段 1：闭环可运营

1. 用隔离 fixture 建立真实 E2E：创建 Campaign→绑定 LP/Offer→访问 alias→验证 redirect/click→发送 postback→验证 conversion log、stats、SSE、bootstrap 和 report。
2. 发布前强制 readiness：域名、SSL/DNS、default flow、LP/Offer、tracking URL、postback、fallback 全部通过才可激活。
3. 修复 `/campaigns/new`、`/api/health`、landing API 和 postback 状态契约，清理过期测试。
4. Target 接入后端，AffiliateNetworks/Auto Optimization 在数据失败时不显示伪数据或继续执行。

### 阶段 2：Keitaro 运营深度

1. 增加 payout/结算/对账工作台和 conversion 状态口径。
2. 增加独立 A/B test、模拟流量、Decision Path、规则审批/回滚/审计。
3. 增加多用户/RBAC/租户隔离、审计、密码轮换、2FA 和运维/隐私/删除统计页面。
4. 移动端卡片/列配置、44px 触控目标、完整 aria-label/label 关联，并重新跑 Lighthouse 与容量测试。

## 交付判定

在 P0 项目关闭、tracking→conversion→report 线上闭环通过、单元测试和核心 E2E 全绿、依赖高危漏洞有明确处置、RBAC/数据隔离得到部署证明之前，判定为“功能演示可用、生产交付未就绪”。

