# 云同步功能 - 手动测试指南

**测试版本**: v3 (SSE + Durable Objects)  
**测试日期**: 2026-03-24  
**应用地址**: https://cf-tracking.suyee88.workers.dev

---

## 🎯 测试说明

由于浏览器自动化工具需要特殊配置，请按照以下步骤手动测试。测试过程中我会记录结果。

---

## 📋 测试步骤

### 测试 1: ✅ 部署验证（已完成）

**状态**: ✅ 通过

**验证结果**:
```bash
curl https://cf-tracking.suyee88.workers.dev/health
StatusCode: 200
Content: {"success":true,"data":{"status":"healthy","timestamp":"2026-03-24T14:12:05.656Z"}}
```

**部署日志**:
```
env.USER_PREFERENCE_DO    Durable Object
  UserPreferenceDurableObject
```

---

### 测试 2: 🔄 SSE 连接测试

**测试步骤**:

1. **打开浏览器访问**: https://cf-tracking.suyee88.workers.dev
   
2. **打开开发者工具**:
   - 按 F12
   - 切换到 Console 标签

3. **查找以下日志**:
   ```
   [CloudSync] SSE connected: {type: 'connected', clientId: 'device-xxx', timestamp: ...}
   ```

4. **检查 Network 面板**:
   - 应该有一个 `/events` 请求
   - Type: `eventsource`
   - Status: `pending` (保持连接中)

**预期结果**:
- ✅ Console 显示 "SSE connected"
- ✅ Network 中有 `/events` 连接
- ✅ 连接状态为 pending

**实际结果**: _______________（请填写）

**结论**: ⬜ 通过 / ⬜ 失败

---

### 测试 3: 主题切换同步测试（双设备）

**测试步骤**:

#### 窗口 A（主窗口）
1. 打开浏览器访问应用
2. 打开开发者工具 Console
3. 找到主题切换按钮（设置页面）
4. 点击切换主题为"深色"

**观察点**:
- Console 日志应该显示:
  ```
  [CloudSync] Push success
  ```
- Network 面板应该有 POST 请求到 `/preferences`

#### 窗口 B（测试窗口）
1. 打开另一个浏览器窗口（或无痕窗口）
2. 访问同一应用
3. 观察主题是否自动切换为"深色"

**观察点**:
- Console 日志应该显示:
  ```
  [CloudSync] Received update notification: {type: 'preference_updated', ...}
  [CloudSync] Pull success
  ```
- 主题自动切换

**预期结果**:
- ✅ 窗口 A: 推送成功
- ✅ 窗口 B: 1 秒内收到通知并同步
- ✅ 两个窗口主题一致

**实际结果**: _______________（请填写）

**结论**: ⬜ 通过 / ⬜ 失败

---

### 测试 4: 断线重连测试

**测试步骤**:

1. **打开浏览器**，访问应用
2. **打开开发者工具** Network 面板
3. **找到 SSE 连接** (`/events`)
4. **模拟断网**:
   - 点击 Network 面板的 "No throttling" 下拉框
   - 选择 "Offline"
5. **等待 10 秒**
6. **恢复网络**:
   - 选择 "No throttling"
7. **观察 Console 日志**

**预期日志**:
```
[CloudSync] SSE error
[CloudSync] Attempting to reconnect SSE...
[CloudSync] SSE connected: {...}
```

**预期结果**:
- ✅ 断线时显示错误
- ✅ 5 秒后自动重连
- ✅ 重连成功显示 "SSE connected"

**实际结果**: _______________（请填写）

**结论**: ⬜ 通过 / ⬜ 失败

---

### 测试 5: 并发更新冲突测试

**测试步骤**:

#### 准备
1. 打开两个窗口 A 和 B
2. 两个窗口都访问应用

#### 同时操作
1. **窗口 A**: 快速点击切换主题为"深色"
2. **窗口 B**: 同时点击切换主题为"浅色"
3. **观察最终结果**

**预期结果**:
- ✅ 两个窗口最终主题一致
- ✅ Console 可能显示冲突处理日志
- ✅ 没有错误抛出

**实际结果**: _______________（请填写）

**结论**: ⬜ 通过 / ⬜ 失败

---

### 测试 6: 性能基准测试

**测试工具**: Chrome DevTools Performance

#### 6.1 连接建立时间

**步骤**:
1. 打开 Network 面板
2. 刷新页面
3. 找到 `/events` 请求
4. 查看 Time 列

**目标**: < 100ms  
**实际**: _______ ms

#### 6.2 推送延迟

**步骤**:
1. 切换到 Performance 面板
2. 开始录制
3. 点击主题切换
4. 停止录制
5. 测量从点击到 POST 请求完成的时间

**目标**: < 500ms  
**实际**: _______ ms

#### 6.3 拉取延迟

**步骤**:
1. 窗口 A 修改主题
2. 测量窗口 B 从收到通知到数据更新的时间

**目标**: < 1s  
**实际**: _______ ms

#### 6.4 重连时间

**步骤**:
1. 执行测试 4 的断线重连
2. 测量从断线到重连成功的时间

**目标**: ~5s  
**实际**: _______ s

**总体性能评价**: ⬜ 优秀 / ⬜ 良好 / ⬜ 需优化

---

## 📊 测试结果汇总

| 测试项 | 状态 | 实际结果 | 备注 |
|--------|------|----------|------|
| 部署验证 | ✅ 通过 | HTTP 200 | - |
| SSE 连接 | ⬜ 待测 | - | - |
| 主题同步 | ⬜ 待测 | - | - |
| 断线重连 | ⬜ 待测 | - | - |
| 并发冲突 | ⬜ 待测 | - | - |
| 性能基准 | ⬜ 待测 | - | - |

**总体进度**: __/6 完成

---

## 🔍 问题记录

### 问题 1: DO 导出问题（已修复）
- **状态**: ✅ 已修复
- **描述**: 部署时报错 `Multiple exports with the same name`
- **解决**: 删除重复导出

### 问题 2: _______________
- **状态**: ⬜ 开放 / ⬜ 修复
- **描述**: _______________
- **解决**: _______________

---

## 📝 测试环境记录

### 浏览器信息
- **浏览器**: Chrome / Firefox / Edge / Safari: _______
- **版本**: _______
- **操作系统**: Windows / macOS / Linux: _______

### 网络环境
- **网络类型**: 有线 / WiFi / 4G/5G: _______
- **网络速度**: _______ Mbps

### 测试时间
- **开始时间**: _______
- **结束时间**: _______
- **测试执行人**: _______

---

## ✅ 测试完成检查清单

- [ ] 所有 6 个测试用例已执行
- [ ] 测试结果已记录
- [ ] 性能数据已测量
- [ ] 发现的问题已记录
- [ ] 测试报告已更新
- [ ] 结论已给出

---

## 📚 参考文档

- [DEPLOY_AND_TEST_CLOUD_SYNC.md](./DEPLOY_AND_TEST_CLOUD_SYNC.md) - 详细测试指南
- [CLOUD_SYNC_QUICK_REFERENCE.md](./CLOUD_SYNC_QUICK_REFERENCE.md) - 快速参考
- [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) - 实施总结

---

**最后更新**: 2026-03-24  
**测试状态**: 准备开始
