# Click Tracking 诊断报告

## 问题现象
访问 `https://cf-tracking.suyee88.workers.dev/e2e-test-1774099295214` 后跳转到首页，而不是 Offer 页面。

## 根本原因分析

### 代码流程

1. **路由处理** (`src/index.ts:86-102`)
   - 检测到路径 `/e2e-test-1774099295214`
   - 重定向到 `/api/tracking/click/e2e-test-1774099295214`

2. **ClickService 处理** (`src/services/tracking/click.service.ts:142-230`)
   ```
   1. 获取 Campaign 配置 ✅
   2. 执行去重检查
   3. 获取活跃的 Flows ❌ (可能为 0)
   4. 执行 Flow Filters ❌ (没有 Flow 可匹配)
   5. selectedFlow = null ❌
   6. actionConfig = { type: 'traffic_loss' } ❌
   7. redirectUrl = `/traffic-loss?...` ❌
   ```

3. **重定向行为** (`src/services/tracking/click.service.ts:487`)
   - traffic_loss 返回 `/traffic-loss?clickid=xxx&visitor=yyy`
   - 前端路由将其当作普通页面处理，显示首页

### 可能的原因

1. **Campaign 没有配置 Flow**
   - Campaign 创建时没有关联 Flow
   - Flow 状态不是 'active'

2. **Flow Filters 不匹配**
   - Flow 配置了 Filters（如 country、device 等）
   - 当前请求不满足 Filter 条件

3. **Flow 没有关联 Offer 或 Landing Page**
   - Flow 存在但没有配置要跳转的目标

## 诊断步骤

### 方法 1: 检查 Campaign 配置

```sql
-- 检查 Campaign 是否存在且状态正确
SELECT id, name, alias, domain, status, flowRotation 
FROM campaigns 
WHERE alias = 'e2e-test-1774099295214';

-- 检查是否有活跃的 Flow
SELECT f.id, f.name, f.campaignId, f.actionType, f.status
FROM flows f
WHERE f.campaignId = (SELECT id FROM campaigns WHERE alias = 'e2e-test-1774099295214')
  AND f.status = 'active';

-- 检查 Flow 关联的 Offer
SELECT fo.flowId, fo.offerId, fo.weight, o.name, o.url
FROM flowOffers fo
JOIN offers o ON fo.offerId = o.id
WHERE fo.flowId IN (
  SELECT id FROM flows 
  WHERE campaignId = (SELECT id FROM campaigns WHERE alias = 'e2e-test-1774099295214')
);

-- 检查 Flow 关联的 Landing Page
SELECT flp.flowId, flp.landingPageId, flp.weight, lp.name, lp.url
FROM flowLandingPages flp
JOIN landingPages lp ON flp.landingPageId = lp.id
WHERE flp.flowId IN (
  SELECT id FROM flows 
  WHERE campaignId = (SELECT id FROM campaigns WHERE alias = 'e2e-test-1774099295214')
);
```

### 方法 2: 查看 Worker 日志

访问 [Cloudflare Dashboard](https://dash.cloudflare.com/) → Workers & Pages → cf-tracking → Logs

筛选关键字：
- `[ClickService] Found flows`
- `[ClickService] Selected flow`
- `Action config`
- `Redirect URL`

### 方法 3: 使用浏览器开发者工具

1. 打开 `https://cf-tracking.suyee88.workers.dev/e2e-test-1774099295214`
2. 按 F12 打开开发者工具
3. 查看 Network 标签
4. 查看重定向 URL 是什么

## 解决方案

### 方案 1: 在 Campaign 详情页面配置 Flow

1. 访问 Campaign 详情页面
2. 点击 "Flow" 标签
3. 点击 "Edit Flow"
4. 添加至少一个 Flow
5. 为 Flow 关联 Offer 或 Landing Page
6. 保存 Flow 配置

### 方案 2: 修改默认行为（代码层面）

如果 Campaign 没有配置 Flow，可以：
- 返回错误页面而不是 traffic-loss
- 显示友好的提示信息
- 重定向到配置的默认 URL

修改 `src/services/tracking/click.service.ts:487`:
```typescript
case 'traffic_loss':
  // 流量损失，返回错误信息或默认 URL
  console.warn(`[ClickService] No matching flow for campaign. Redirecting to default page.`);
  return new URL(`/traffic-loss?clickid=${clickId}&reason=no-flow`, fullBaseUrl).toString();
```

## 预期行为

配置 Flow 后：
1. 访问追踪 URL
2. ClickService 找到匹配的 Flow
3. Flow 关联了 Offer 或 Landing Page
4. 重定向到 Offer URL 或 Landing Page URL
5. 记录点击数据到 Analytics Engine

## 测试用例

### 测试 1: 无 Flow 的 Campaign
- 输入：`https://cf-tracking.suyee88.workers.dev/e2e-test-no-flow`
- 预期：重定向到 `/traffic-loss`
- 日志：`Found flows: 0`

### 测试 2: 有 Flow 的 Campaign
- 输入：`https://cf-tracking.suyee88.workers.dev/test-with-flow`
- 预期：重定向到 Offer URL
- 日志：
  ```
  [ClickService] Found flows: 1 for campaign: xxx
  [ClickService] Selected flow: yyy
  Selected offer: zzz
  Redirect URL: https://offer-url.com?...
  ```

## 修复建议

1. **前端优化**: 在 Campaign 详情页面，如果没有配置 Flow，显示警告提示
2. **后端优化**: 在 traffic-loss 页面显示具体原因（无 Flow、Filters 不匹配等）
3. **日志优化**: 添加更详细的诊断日志，包括 Campaign 配置信息

## 相关知识图谱记录

- Error Pattern: `Click Tracking Redirects to Home Page`
- Solution Pattern: `Configure Campaign Flow for Click Tracking`
- Auto-Fix Rule: `Validate Campaign Flow Configuration`
