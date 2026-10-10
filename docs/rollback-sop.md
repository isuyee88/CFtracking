# Worker 回滚操作手册 (SOP)

**版本**: 1.0  
**最后更新**: 2026-10-12  
**负责人**: dev-lead

---

## 🚨 紧急回滚场景

### 场景 1: 发现严重 Bug

**触发条件**:
- 影响所有用户的关键功能
- 数据完整性问题
- 安全漏洞

**操作步骤**:

#### Step 1: 确认问题
```bash
# 检查 Worker 日志
npx wrangler tail cf-tracking-v2

# 查看错误率
curl https://cf-tracking-v2.suyee88.workers.dev/health
```

#### Step 2: 查看部署历史
```bash
npx wrangler deployments list --name cf-tracking-v2
```

输出示例:
```
Created:     2026-10-12T08:00:00.000Z
Author:      dev@example.com
Source:      Upload
Version(s):  (100%) abc123-current
                 Created:  2026-10-12T08:00:00.000Z

Created:     2026-10-11T20:00:00.000Z
Author:      dev@example.com  
Version(s):  (100%) xyz789-previous (← 回滚到这个)
```

#### Step 3: 执行回滚
```bash
# 使用脚本（推荐）
./scripts/rollback.sh "Bug in bulk delete operation"

# 或手动执行
npx wrangler rollback cf-tracking-v2 --message "Emergency rollback: critical bug"
```

#### Step 4: 验证回滚
```bash
# 健康检查
curl https://cf-tracking-v2.suyee88.workers.dev/health

# 版本验证
curl https://cf-tracking-v2.suyee88.workers.dev/api/deployment/info

# 功能测试
curl https://cf-tracking-v2.suyee88.workers.dev/api/campaigns
```

#### Step 5: 通知团队
- 在团队群发送回滚通知
- 记录回滚原因和时间
- 创建事故报告

---

### 场景 2: 性能严重下降

**触发条件**:
- API 响应时间 >5秒
- 超时率 >10%
- CPU/内存使用率异常

**操作步骤**:

#### Step 1: 性能诊断
```bash
# 查看实时日志
npx wrangler tail cf-tracking-v2 --format pretty

# 测试响应时间
time curl https://cf-tracking-v2.suyee88.workers.dev/api/campaigns
```

#### Step 2: 决策
- 如果是配置问题 → 调整配置
- 如果是代码问题 → 立即回滚

#### Step 3: 执行回滚（同场景1）

---

### 场景 3: 数据库迁移失败

**触发条件**:
- D1 Database 错误
- 数据不一致
- 查询失败

**操作步骤**:

#### Step 1: 停止写入（如果可能）
```bash
# 设置 Worker 为只读模式（需要提前实现该功能）
```

#### Step 2: 数据库状态检查
```bash
# 检查 D1 Database
npx wrangler d1 execute cf-tracking-db --command "SELECT COUNT(*) FROM campaigns"
```

#### Step 3: 回滚 Worker
```bash
./scripts/rollback.sh "Database migration failure"
```

#### Step 4: 数据恢复（如果需要）
```bash
# 从备份恢复（需要提前配置自动备份）
```

---

## 🔄 计划性回滚

### 适用场景
- A/B 测试结果不理想
- 用户反馈负面
- 决定撤回某个功能

### 操作步骤

#### Step 1: 评估影响
- 回滚是否影响数据？
- 回滚是否影响正在运行的 Campaign？
- 是否需要通知用户？

#### Step 2: 选择回滚时间
- 低流量时段（凌晨 2-4 点）
- 周末
- 避开营销活动高峰

#### Step 3: 准备回滚
```bash
# 测试回滚流程（在 staging）
npx wrangler deploy --env staging

# 验证 staging
curl https://cf-tracking-staging.suyee88.workers.dev/health
```

#### Step 4: 执行回滚
```bash
./scripts/rollback.sh "Planned rollback: feature removal"
```

#### Step 5: 验证和监控
- 监控错误率
- 检查关键指标
- 用户反馈

---

## 🧪 回滚测试

### 定期测试（每月一次）

#### 测试回滚脚本
```bash
cd D:\suyee\workspace\projects\cf-tracking

# 运行回滚测试（dry-run）
./scripts/rollback.sh --help

# 模拟回滚（不实际执行）
# 手动走一遍流程，确保熟悉步骤
```

#### 测试 Staging 回滚
```bash
# 在 staging 环境测试真实回滚
npx wrangler deploy --env staging

# 回滚 staging
npx wrangler rollback cf-tracking-staging

# 验证
curl https://cf-tracking-staging.suyee88.workers.dev/health
```

---

## 📊 回滚决策矩阵

| 问题严重程度 | 影响范围 | 决策 | 执行时间 |
|-------------|---------|------|----------|
| P0 严重 | 全部用户 | 立即回滚 | <5分钟 |
| P1 重要 | 部分功能 | 评估后回滚 | <30分钟 |
| P2 一般 | 小范围 | 计划回滚 | 24小时内 |
| P3 轻微 | 个别情况 | 下次发布修复 | 不回滚 |

---

## 🔔 回滚后行动清单

### 立即行动（0-30分钟）
- [ ] 验证回滚成功
- [ ] 通知团队
- [ ] 监控关键指标
- [ ] 记录回滚原因

### 短期行动（1-4小时）
- [ ] 分析根本原因
- [ ] 创建修复任务
- [ ] 更新文档
- [ ] 客户沟通（如需要）

### 长期行动（1-3天）
- [ ] 修复问题
- [ ] 添加测试
- [ ] 代码审查
- [ ] 重新部署

---

## 📝 回滚记录模板

```markdown
# 回滚记录

**日期**: 2026-10-12 15:30 UTC  
**执行人**: dev-lead  
**Worker**: cf-tracking-v2

## 回滚详情
- **原因**: [详细描述问题]
- **受影响功能**: [列出受影响的功能]
- **用户影响**: [估计受影响用户数]

## 回滚前状态
- **版本**: abc123-buggy
- **部署时间**: 2026-10-12 14:00 UTC
- **问题发现时间**: 2026-10-12 15:15 UTC

## 回滚后状态
- **版本**: xyz789-stable
- **回滚时间**: 2026-10-12 15:30 UTC
- **验证结果**: ✅ 成功

## 后续行动
1. [ ] 修复 bug
2. [ ] 添加测试
3. [ ] 重新部署
4. [ ] 更新文档

## 经验教训
[记录从这次事件中学到的经验]
```

---

## 🔗 相关资源

### Wrangler 文档
- [Rollback 命令](https://developers.cloudflare.com/workers/wrangler/commands/#rollback)
- [Deployments](https://developers.cloudflare.com/workers/platform/deployments/)

### 内部文档
- 部署流程: `docs/deployment.md`
- 监控指南: `docs/monitoring.md`
- 事故响应: `docs/incident-response.md`

---

**维护**: 每次回滚后更新此文档  
**评审**: 每季度评审一次
