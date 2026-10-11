# Phase 2 + AMIS 实施启动清单

**日期**: 2026-10-10  
**状态**: 准备启动

---

## ✅ 已完成准备工作

### 1. 项目验证
- ✅ Phase 1 验收通过（94%）
- ✅ 架构符合性验证完成
- ✅ 本地开发环境配置完成
- ✅ 模拟模式守卫验证通过

### 2. 文档交付
- ✅ 项目验证报告（14KB）
- ✅ AMIS 渐进式测试计划（19KB）
- ✅ Phase 2 + AMIS 实施计划（22KB）
- ✅ Cloudflare 开发指南（41KB）

### 3. 开发环境
- ✅ wrangler dev 服务器配置
- ✅ 本地 D1 数据库（23 个表）
- ✅ 测试脚本就绪
- ⚠️ 开发服务器重启中（构建缓存已清理）

---

## 🎯 Phase 2 + AMIS 双轨实施

### 主线：Phase 2 实战功能（8 周）

**Week 1-2: 扩展适配器**
- [ ] Outbrain 适配器（2 天）
- [ ] MGID 适配器（2 天）
- [ ] MyLead 适配器（1.5 天）
- [ ] Impact 适配器（2.5 天）

**Week 3-4: Campaign 半自动创建**
- [ ] 平台推荐引擎
- [ ] Campaign 草稿生成器
- [ ] 人工审核流程
- [ ] 创建 API 实现

**Week 5-6: ROI 监控与告警**
- [ ] ROI 监控规则
- [ ] 告警通知系统
- [ ] Cron 监控任务
- [ ] Slack 集成

**Week 7-8: 生产部署与验证**
- [ ] Staging 部署
- [ ] 生产部署
- [ ] 30 天运行验证

### 副线：AMIS 概念验证（8 周）

**Week 1-2: T0 纯逻辑测试**
- [ ] AI 解析器 Mock
- [ ] 规则引擎实现
- [ ] 步骤选择器实现
- [ ] 10+ 单元测试

**Week 3-4: T1 本地模拟测试**
- [ ] 完整数据流测试
- [ ] Mock 适配器
- [ ] 集成测试

**Week 5-6: 融合到 Phase 2**
- [ ] 可选规则引擎
- [ ] A/B 测试
- [ ] 性能对比

**Week 7-8: 可行性评估**
- [ ] 数据收集
- [ ] 性能分析
- [ ] 评估报告

---

## 🚀 立即可做（今天）

### 1. 获取 API 凭据

**需要申请**:
```bash
# 流量平台
- Outbrain API Key（测试账号）
- MGID API Key（测试账号）

# 联盟平台
- MyLead API Token（测试账号）
- Impact OAuth 凭据（测试账号）
```

### 2. 创建测试目录

```bash
cd /d/suyee/github/CFtracking

# AMIS 测试目录
mkdir -p test/unit/amis
mkdir -p test/integration/amis
mkdir -p test/e2e/amis

# Phase 2 功能目录
mkdir -p src/services/recommendation
mkdir -p src/services/campaign
mkdir -p src/services/monitoring
```

### 3. 配置环境变量

```bash
# 更新 .dev.vars
cat >> .dev.vars << 'EOF'

# Phase 2 新增平台
OUTBRAIN_API_KEY=test-outbrain-key
MGID_API_KEY=test-mgid-key
MYLEAD_API_TOKEN=test-mylead-token
IMPACT_ACCOUNT_SID=test-impact-sid
IMPACT_AUTH_TOKEN=test-impact-token

# AMIS 实验功能
ENABLE_RULE_ENGINE=false
ENABLE_AI_PARSER=false
EOF
```

### 4. 安装测试依赖

```bash
cd /d/suyee/github/CFtracking
npm install -D vitest @vitest/ui
```

---

## 📋 Week 1 任务清单

### Day 1-2: Outbrain 适配器

**文件创建**:
```bash
# 创建适配器
touch src/services/platform/outbrain.ts

# 创建测试
touch src/services/platform/outbrain.test.ts

# 创建类型定义
# 在 src/types/platform.ts 添加 OutbrainConfig
```

**实现任务**:
- [ ] `OutbrainAdapter` 类实现
- [ ] `getInfo()` 方法
- [ ] `testConnection()` 方法
- [ ] `pauseCampaign()` + `simulationGuard()`
- [ ] `startCampaign()` + `simulationGuard()`
- [ ] 单元测试 5+ 个

**验收**:
```bash
# 测试连接
curl -X POST http://localhost:8787/api/platforms/outbrain/test

# 测试守卫
curl -X POST http://localhost:8787/api/platforms/outbrain/pause \
  -d '{"campaignId":"test"}'
# 预期：Simulation mode blocked
```

### Day 3-4: MGID 适配器

**实现任务**:
- [ ] `MGIDAdapter` 类实现
- [ ] 核心方法实现
- [ ] 守卫添加
- [ ] 单元测试 5+ 个

### Day 5: AMIS T0 - AI Parser Mock

**文件创建**:
```bash
# 创建 AMIS 核心模块
mkdir -p src/amis/ai
mkdir -p src/amis/rule-engine
mkdir -p src/amis/workflows

# 创建 AI 解析器
touch src/amis/ai/offer-parser.ts
touch test/unit/amis/ai-parser.test.ts
```

**实现任务**:
- [ ] `OfferParser` 类（Mock 模式）
- [ ] `setMockResponse()` 方法
- [ ] `parse()` 方法
- [ ] 5 个单元测试

**测试用例**:
```typescript
it('should parse offer type from description', () => {
  const parser = new OfferParser();
  parser.setMockResponse({
    offerType: 'lead',
    vertical: 'finance',
    confidence: 0.85
  });
  
  const result = parser.parse({
    name: 'Credit Card Lead',
    description: 'US only'
  });
  
  expect(result.offerType).toBe('lead');
  expect(result.confidence).toBeGreaterThan(0.7);
});
```

---

## 📊 Week 1 验收标准

### Phase 2 主线
- ✅ Outbrain 适配器连接测试通过
- ✅ MGID 适配器连接测试通过
- ✅ 所有写方法添加 `simulationGuard()`
- ✅ 单元测试覆盖率 > 80%

### AMIS 副线
- ✅ AI Parser Mock 实现
- ✅ 5 个单元测试通过
- ✅ 测试执行时间 < 1s

---

## 🔄 每日工作流

### 早上（规划）
1. 查看当天任务清单
2. 启动开发服务器 `wrangler dev`
3. 运行测试确认基线 `npm test`

### 开发中（实施）
1. 实现功能代码
2. 编写单元测试
3. 本地验证 `curl http://localhost:8787/...`
4. 查看实时日志

### 晚上（总结）
1. 运行完整测试套件 `npm test`
2. 提交代码 `git commit`
3. 更新任务清单
4. 准备第二天任务

---

## 📞 需要决策的事项

### 优先级 P0（阻塞）

1. **API 凭据获取**
   - ⚠️ 需要申请 Outbrain 测试账号
   - ⚠️ 需要申请 MGID 测试账号
   - ⚠️ 需要申请 MyLead 测试账号
   - ⚠️ 需要申请 Impact 测试账号

2. **CEO 批准**
   - ⚠️ Phase 2 预算批准（$80/月运维成本）
   - ⚠️ 8 周开发时间线确认
   - ⚠️ AMIS 实验授权

### 优先级 P1（建议）

1. **监控配置**
   - Slack Webhook URL（告警通知）
   - 监控频率设置（建议每小时）

2. **部署策略**
   - Staging 环境配置
   - 金丝雀部署比例

---

## 🎯 成功指标

### Phase 2（8 周后）
- ✅ 6 个适配器生产就绪
- ✅ Campaign 创建成功率 > 90%
- ✅ ROI 监控准确率 > 95%
- ✅ 30 天无 P0/P1 故障

### AMIS（8 周后）
- ✅ T0 测试通过率 > 90%
- ✅ T1 测试通过率 > 85%
- ✅ 可行性评估报告完整
- ✅ Phase 5 实施建议明确

---

## 📖 参考文档

- [Phase 2 + AMIS 实施计划](C:\Users\isuye\Documents\richang\affiliate-ops\plans\2026-10-10-Phase2-AMIS-implementation-plan.md)
- [AMIS 渐进式测试计划](C:\Users\isuye\Documents\richang\affiliate-ops\guides\2026-10-10-AMIS-progressive-testing-plan.md)
- [项目验证报告](C:\Users\isuye\Documents\richang\affiliate-ops\reports\2026-10-10-cf-tracking-validation-report.md)
- [Cloudflare 开发指南](C:\Users\isuye\Documents\richang\affiliate-ops\guides\2026-10-10-cloudflare-dev-guide-summary.md)

---

**✅ 准备就绪！可以开始 Phase 2 Week 1 的开发工作了。**

**建议**: 从 Outbrain 适配器开始，这是最直接的任务，可以快速建立信心并验证开发流程。
