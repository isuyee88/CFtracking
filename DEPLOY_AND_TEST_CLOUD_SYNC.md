# 云同步功能部署和测试指南

## 🚀 快速部署

### 1. 部署到 Cloudflare

```bash
# 进入项目根目录
cd d:\suyee\github\CFtracking

# 部署 Workers 和 Durable Objects
npx wrangler deploy

# 查看部署日志
npx wrangler tail
```

### 2. 验证部署

```bash
# 检查 DO 是否注册成功
npx wrangler durable-objects list

# 检查路由是否正确
curl https://cf-tracking.suyee88.workers.dev/health
```

---

## 🧪 测试步骤

### 前置准备

1. **部署应用**
   ```bash
   npx wrangler deploy
   ```

2. **打开两个浏览器窗口**
   - 窗口 A: Chrome 普通窗口
   - 窗口 B: Chrome 无痕窗口（或 Firefox）

3. **打开开发者工具**
   - 两个窗口都打开 Console 和 Network 面板

---

### 测试场景 1: 基础同步功能

#### 步骤

**窗口 A (主窗口):**
1. 访问应用首页
2. 打开 Console
3. 在 Console 中输入：
   ```javascript
   // 模拟用户操作
   localStorage.setItem('cf_device_id', 'device-A-123');
   ```

**窗口 B (测试窗口):**
1. 访问应用首页
2. 打开 Console
3. 观察日志

#### 预期结果

窗口 A Console 应该显示:
```
[CloudSync] SSE connected: {type: 'connected', clientId: 'device-A-123', ...}
```

窗口 B Console 应该显示:
```
[CloudSync] SSE connected: {type: 'connected', clientId: 'device-B-456', ...}
```

---

### 测试场景 2: 主题切换同步

#### 步骤

**窗口 A:**
1. 找到主题切换按钮
2. 点击切换到"深色"模式
3. 观察 Network 面板

**窗口 B:**
1. 观察主题是否自动切换
2. 查看 Console 日志

#### 预期结果

窗口 A Network 面板:
```
POST /api/user-preferences/stub
Status: 200

POST {do-url}/preferences
Status: 200
Response: {success: true, version: "1.1", ...}
```

窗口 B Console:
```
[CloudSync] Received update notification: {
  type: 'preference_updated',
  version: 1711234567890,
  modifiedBy: 'device-A-123'
}

[CloudSync] Pull success
```

窗口 B 界面:
- ✅ 主题自动切换为深色

---

### 测试场景 3: 断线重连

#### 步骤

**两个窗口:**
1. 打开 Network 面板
2. 选择 "Offline" 模式
3. 等待 10 秒
4. 切换回 "No throttling" 模式

#### 预期结果

Console 日志:
```
[CloudSync] SSE error
[CloudSync] Attempting to reconnect SSE...
[CloudSync] SSE connected: {...}
```

连接状态:
- 断线时：`isConnected: false` ❌
- 重连后：`isConnected: true` ✅

---

### 测试场景 4: 多设备并发更新

#### 步骤

**窗口 A 和窗口 B 同时操作:**
1. 窗口 A: 切换主题为"深色"
2. 窗口 B: 同时切换主题为"浅色"
3. 观察两个窗口的最终状态

#### 预期结果

- ✅ 后提交的请求会检测到冲突
- ✅ 根据冲突策略处理（默认服务器版本）
- ✅ 最终两个窗口数据一致

Console 日志（窗口 B）:
```
[CloudSync] Conflict detected
[CloudSync] Using server version
```

---

## 📊 监控和调试

### 1. 查看 Workers 日志

```bash
# 实时查看日志
npx wrangler tail

# 过滤特定日志
npx wrangler tail | grep "UserPreferenceDO"

# 查看 SSE 广播日志
npx wrangler tail | grep "Broadcasted"
```

### 2. 查看 Durable Object 状态

```bash
# 列出所有 DO
npx wrangler durable-objects list

# 查看特定 DO 的存储
npx wrangler durable-object get USER_PREFERENCE_DO --id <id>
```

### 3. 浏览器调试

```javascript
// 在 Console 中检查状态
const state = {
  isConnected: true, // SSE 连接状态
  lastSyncTime: 1711234567890, // 上次同步时间
  preferences: localStorage.getItem('cf:v1:pref:user:ui'),
};

// 手动触发同步
// 假设 useCloudSync 已挂载到 window
window.cloudSync?.forceSync();

// 检查 SSE 连接状态
// EventSource 应该在 Network 面板中可见
```

---

## 🔍 常见问题排查

### 问题 1: SSE 连接失败

**症状:**
```
[CloudSync] SSE error: EventSource failed to connect
```

**排查步骤:**
1. 检查 DO 是否部署成功
   ```bash
   npx wrangler durable-objects list
   ```

2. 检查 `/api/user-preferences/stub` 接口
   ```javascript
   fetch('/api/user-preferences/stub', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({userId: 'test-123'})
   }).then(r => r.json()).then(console.log);
   ```

3. 检查返回的 DO URL 格式
   - 应该是 `http://do/user-prefs-xxx` 格式

---

### 问题 2: 推送失败

**症状:**
```
[CloudSync] Push failed: 404 Not Found
```

**排查步骤:**
1. 检查 DO 绑定是否正确
   ```bash
   # 查看 wrangler.toml
   cat wrangler.toml | grep -A 2 "USER_PREFERENCE_DO"
   ```

2. 检查路由是否注册
   ```bash
   # 查看 Workers 日志
   npx wrangler tail | grep "user-preferences"
   ```

---

### 问题 3: 同步不触发

**症状:**
- 窗口 A 更新了，窗口 B 没反应

**排查步骤:**
1. 检查窗口 B 的 SSE 连接状态
   ```javascript
   // 在 Console 中检查
   console.log('SSE state:', {
     readyState: window.eventSource?.readyState,
     url: window.eventSource?.url,
   });
   ```

2. 检查 Workers 日志
   ```bash
   npx wrangler tail | grep "Broadcasted"
   ```

3. 验证设备 ID 是否不同
   ```javascript
   console.log('Device ID:', localStorage.getItem('cf_device_id'));
   ```

---

## ✅ 验收标准

### 功能验收

- [ ] 能够建立 SSE 连接
- [ ] 本地更改能立即推送到云端
- [ ] 收到通知后能自动拉取更新
- [ ] 断线后能自动重连
- [ ] 多设备数据保持一致

### 性能验收

- [ ] 连接建立时间 < 100ms
- [ ] 推送延迟 < 500ms
- [ ] 拉取延迟 < 1s
- [ ] 重连时间 ~5 秒
- [ ] 空闲连接占用 ~1KB

### 兼容性验收

- [ ] Chrome/Edge 正常工作
- [ ] Firefox 正常工作
- [ ] Safari 正常工作
- [ ] iOS Safari 正常工作

---

## 📝 测试报告模板

```markdown
# 云同步测试报告

## 测试环境
- 日期：2026-03-24
- 部署版本：v3
- 测试浏览器：Chrome 122, Firefox 123

## 测试结果

### 功能测试
- ✅ SSE 连接建立
- ✅ 本地推送
- ✅ 云端拉取
- ✅ 自动重连
- ✅ 冲突处理

### 性能测试
- 连接建立：85ms ✅
- 推送延迟：320ms ✅
- 拉取延迟：650ms ✅
- 重连时间：5.2s ✅

### 问题记录
1. [问题描述]
   - 复现步骤
   - 预期结果
   - 实际结果
   - 解决方案

## 结论
[通过/不通过]
```

---

## 🎯 下一步

1. **部署到生产环境**
   ```bash
   npx wrangler deploy --env production
   ```

2. **监控运行状况**
   - 设置告警
   - 监控错误率
   - 跟踪性能指标

3. **收集用户反馈**
   - 同步延迟反馈
   - 冲突处理满意度
   - 功能改进建议

---

## 📚 相关文档

- [CLOUDFLARE_DO_SYNC_PROPOSAL.md](./CLOUDFLARE_DO_SYNC_PROPOSAL.md) - 技术方案
- [CLOUD_SYNC_INTEGRATION_GUIDE.md](./CLOUD_SYNC_INTEGRATION_GUIDE.md) - 集成指南
- [CLOUD_SYNC_QUICK_REFERENCE.md](./CLOUD_SYNC_QUICK_REFERENCE.md) - 快速参考
