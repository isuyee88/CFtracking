# CFtracking Keitaro 收敛与着陆页合并实施计划

> **For Hermes:** 按阶段执行；每个阶段必须先建立可失败的回归测试，再实现、验证并记录证据。

**目标：** 将 `D:\suyee\github\CFtracking` 收敛为可验证的 Cloudflare-native Tracker + Landing 管理平台，逐项关闭既有评审的 P0/P1 阻塞，并把 `D:\suyee\codex\AFF\workers-landing` 的着陆页能力以单一事实源方式并入，而不是复制一套归因数据库。

**架构决策：** CFtracking 作为 Campaign/Flow/Attribution/Conversion/Postback/Reporting 的唯一事实源；着陆页管理、模板、托管资产和页面渲染纳入 CFtracking 的 Landing bounded context。workers-landing 暂不直接合并 Git 历史或双写数据，先通过兼容适配器/导出迁移完成可回滚迁移；所有 pageview/click/conversion 事件只进入 CFtracking。

**完成定义：** 根目录 `npm run verify` 通过；前端 build 通过；关键点击→Flow→Landing→Offer→Postback→Conversion→Report 具备自动化回归；重复回传、状态变化、权限、托管页面安全和 landing 合并适配器有证据；每个未能验证的 Cloudflare 生产能力必须明确标记为 blocker，而不能标记为通过。

---

## 阶段 0：基线、隔离与证据台账

1. 保留当前工作树未提交改动，不 reset、不覆盖用户改动。
2. 建立 `docs/verification/` 台账：命令、环境、通过/失败、证据路径、时间。
3. 将 workers-landing 合并拆为“代码能力迁移”和“部署切换”两个独立门，不在本地验证前部署。
4. 验收：当前分支、dirty files、node/npm、数据库基线和测试基线均有记录。

## 阶段 1：工程门禁与依赖可重复安装（P0）

**目标：** 解除 root verify 的 `@grapesjs/react` peer dependency 冲突。

- 检查全仓是否实际使用 `@grapesjs/react`；当前 Pro editor 直接调用 `grapesjs`，若无引用则移除未使用依赖及 lock entry。
- 不使用 `--legacy-peer-deps` 作为默认修复；`npm install` 必须可重复。
- 添加依赖一致性检查脚本或 verify gate。
- 验收：`npm --prefix frontend install --ignore-scripts`、frontend typecheck/build、root `npm run verify` 均通过。

## 阶段 2：Campaign 创建与表单交互回归（P0）

**目标：** Create Campaign 只能打开创建流程；无效输入不得发出保存请求。

- 添加组件/路由回归测试，覆盖空表单、字段级错误、提交 loading、成功和 API 400。
- 修复 CampaignManagement → CampaignForm 的打开/保存职责分离。
- 所有 icon-only controls 增加 `aria-label`；字段使用 label/`htmlFor`。
- 验收：空提交网络请求数为 0；有效提交仅 1 次；错误可定位；重复点击被禁用。

## 阶段 3：归因、转换状态和幂等（P0）

**目标：** 证明 click/conversion/revenue 状态链不会重复计数或错误回传。

- 先增加失败测试：重复 inbound postback、pending→approved、approved→reversed、跨平台 outbound、发送失败重试。
- 明确定义 conversion identity 与 state transition：`transaction_id + event/status`，原始事件和当前状态分离。
- 将 outbound 发送改成可审计的 delivery state（pending/sending/sent/retry/dead-letter）；数据库表通过 migration 初始化，不在请求路径 DDL。
- 验收：重复请求不会产生重复 conversion/revenue；状态变更可对账；失败可重试且不丢失；每次发送有 platform、attempt、lastError、nextRetryAt。

## 阶段 4：报表口径、时间和成本收入（P0/P1）

- 固定 click/conversion/financial 三种 reportType 的口径。
- 明确 UTC、America/New_York 和用户时区边界；日期窗口采用半开区间。
- 固定 USD 默认并保留 CAD；Revenue、Cost、Profit、ROI、EPC、CR 的 null/zero 规则。
- 添加 raw events 与 report aggregation 对账测试。
- 验收：相同数据在不同分组下 conversion 口径一致；时区边界不重复；导出与页面总数一致。

## 阶段 5：Landing 合并（P1，先适配后切换）

**目标：** 将 workers-landing 的落地页能力纳入 CFtracking，同时保持单一 Tracker 事实源。

### 5.1 能力归属

- CFtracking：Campaign、Flow、Traffic Source、Offer、Landing entity、Click/Conversion/Report、Postback、权限。
- Landing bounded context：模板、皮肤、页面内容、托管 HTML/ZIP/图片、预览、版本、发布状态。
- workers-landing：作为迁移输入和兼容来源；不再单独写 clicks/UV/conversion 数据。

### 5.2 兼容契约

- 实现版本化 Landing manifest importer/exporter，将 `public/campaigns/*.json`、templates、theme.skin、CTA tracking link 映射为 CFtracking Landing/Campaign 数据。
- 建立 `/api/landing-events` 或等价 S2S event adapter；pageview/click 事件进入 CFtracking，失败不阻塞页面渲染。
- 统一 `click_id`、`campaign_id`、`landing_page_id`、`sub1..subN`、UTC timestamp 和 disclosure metadata。
- 禁止将 token、密码或连接字符串写入 manifest、HTML、日志或前端 bundle。

### 5.3 页面管理闭环

- 保留 Quick Editor + GrapesJS Pro Studio + Source 模式。
- 增加 landing 版本、预览、发布/暂停、复制、归档和回滚。
- 保持 hosted-assets 的 MIME 白名单、XSS 清洗、图片大小限制、缓存策略。
- 验收：导入一个 workers-landing manifest → CFtracking 中创建实体 → Pro/Quick 编辑 → 发布托管 → 页面访问上报 → `/go` 点击上报 → Report 可查；原页面可回滚。

## 阶段 6：Filter/anti-fraud/Flow 模拟（P1）

- 为每条规则记录 matchedRule、reason、action、risk score、latency。
- 覆盖 GEO/device/OS/language/ISP/ASN/referrer/bot/proxy/blacklist/whitelist。
- 增加 Flow simulation API 和 UI，输入请求上下文即可显示命中的 Stream/规则/目的地。
- 验收：同一输入 deterministic；规则优先级可解释；模拟结果与真实 tracking path 一致。

## 阶段 7：RBAC、租户、审计与密钥边界（P1）

- 建立 admin/operator/analyst/read-only 权限矩阵和拒绝测试。
- 所有资源查询强制 tenant scope；跨 tenant ID 访问必须返回 404/403 且不泄露资源存在性。
- 增加用户动作审计事件：actor、tenant、action、resource、before/after 摘要、request ID、时间。
- secret-store 只允许 masked read/write/rotate，明文不进入响应、日志、HTML 或 manifest。
- 验收：权限矩阵自动化通过；跨租户负路径通过；审计事件可查询。

## 阶段 8：性能、可观测性和运行时回归（P1）

- Worker 热路径禁止非必要同步 D1 写；统计采用 DO/Queue 聚合并标记新鲜度。
- 增加 request ID、event ID、click ID、latency、retry、dead-letter 指标。
- 运行 k6 API/tracking 负载测试，记录 p50/p95/p99、错误率、D1/DO 状态。
- 前端拆分 GrapesJS、Recharts、Ant Design 大 chunk；首屏不加载编辑器。
- 验收：定义的基线阈值通过；超阈值自动失败，不用“能跑”代替性能通过。

## 每阶段循环

1. 写一个能证明缺陷的测试，确认 RED。
2. 做最小修复，确认 GREEN。
3. 运行相关测试，再运行完整 verify/build。
4. 对 diff 做安全和代码质量审查。
5. 记录证据和剩余风险；未通过则回到该阶段，不进入下一阶段。
6. 只有所有 P0/P1 验收通过，才将“Keitaro 对标通过”作为最终结论；Cloudflare 生产部署另需 deploy/read-back 门禁。
