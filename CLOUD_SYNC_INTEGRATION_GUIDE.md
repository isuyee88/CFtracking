# 云同步集成指南

## 📋 目录

1. [概述](#概述)
2. [架构设计](#架构设计)
3. [快速开始](#快速开始)
4. [API 参考](#api-参考)
5. [使用示例](#使用示例)
6. [最佳实践](#最佳实践)
7. [故障排查](#故障排查)

---

## 🎯 概述

基于 Cloudflare Durable Objects 和 Server-Sent Events (SSE) 的实时云同步解决方案。

### 核心特性

- ✅ **实时同步**：延迟 < 1 秒
- ✅ **本地优先**：离线可用，快速响应
- ✅ **事件驱动**：无需轮询，服务器主动推送
- ✅ **自动重连**：SSE 断线自动恢复
- ✅ **冲突处理**：版本管理和合并策略

### 技术栈

| 组件 | 技术 | 说明 |
|------|------|------|
| 云端存储 | Cloudflare Durable Objects | 强一致性 SQLite 存储 |
| 本地存储 | localStorage | 快速读取，离线支持 |
| 实时推送 | Server-Sent Events | 服务器主动推送通知 |
| 前端框架 | React Hooks | 集成到组件 |

---

## 🏗️ 架构设计

### 数据流

```
┌──────────────────────────────────────────────────────┐
│                   用户设备                            │
│  ┌─────────────┐         ┌─────────────┐           │
│  │ localStorage│◄───────►│  Sync Hook  │           │
│  │  (快速读取)  │         │  (SSE 监听)  │           │
│  └─────────────┘         └──────┬──────┘           │
│                                  │                  │
│                                  │ HTTP + SSE       │
└──────────────────────────────────┼──────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  Cloudflare Durable Object   │
                    │  - SQLite 存储用户偏好        │
                    │  - SSE 广播通知所有客户端     │
                    │  - 版本管理                   │
                    └──────────────────────────────┘
```

### 同步流程

```
1. 用户操作 → localStorage (立即保存)
              │
              └─► HTTP POST → DO (推送更新)
                          │
                          └─► SSE 广播 → 所有设备
                                      │
                                      └─► 拉取最新数据
```

---

## 🚀 快速开始

### 1. 安装依赖

无需额外依赖，使用项目现有的 React 和 Cloudflare Workers。

### 2. 配置 Durable Object

在 `wrangler.toml` 中添加：

```toml
[durable_objects.bindings]]
name = "USER_PREFERENCE_DO"
class_name = "UserPreferenceDurableObject"

[[migrations]]
tag = "v3"
new_sqlite_classes = ["UserPreferenceDurableObject"]
```

### 3. 在组件中使用

```tsx
import { useCloudSync } from '@/hooks/useCloudSync';

function MyComponent() {
  const userId = 'user-123'; // 从认证系统获取
  
  const { 
    isConnected, 
    lastSyncTime, 
    setWithSync,
    forceSync,
  } = useCloudSync({ userId });

  const handleThemeChange = async (theme: string) => {
    await setWithSync('cf:v1:pref:user:ui', { theme });
  };

  return (
    <div>
      <button onClick={() => handleThemeChange('dark')}>
        深色模式
      </button>
      <span>
        连接状态：{isConnected ? '✅' : '❌'}
      </span>
    </div>
  );
}
```

---

## 📖 API 参考

### useCloudSync Hook

```typescript
function useCloudSync(options: CloudSyncOptions): CloudSyncReturn
```

#### 参数

```typescript
interface CloudSyncOptions {
  userId: string;              // 用户 ID（必需）
  apiBaseUrl?: string;         // API 基础地址，默认 '/api/user-preferences'
  onSync?: (data: any) => void; // 同步完成回调
  onConflict?: (local: any, server: any) => void; // 冲突处理回调
  reconnectInterval?: number;  // 重连间隔（毫秒），默认 5000
}
```

#### 返回值

```typescript
interface CloudSyncReturn {
  // 状态
  isSyncing: boolean;          // 是否正在同步
  lastSyncTime: number | null; // 上次同步时间戳
  error: Error | null;         // 错误信息
  isConnected: boolean;        // SSE 连接状态
  
  // 方法
  pushToCloud: (preferences: any) => Promise<boolean>;  // 推送到云端
  pullFromCloud: () => Promise<boolean>;                // 从云端拉取
  forceSync: () => Promise<void>;                       // 强制同步
  setWithSync: (key: string, value: any) => Promise<void>; // 保存并同步
  reconnect: () => Promise<void>;                       // 手动重连
}
```

---

## 💡 使用示例

### 示例 1: 主题切换

```tsx
import { useCloudSync } from '@/hooks/useCloudSync';

function ThemeToggle() {
  const userId = useAuth().userId;
  
  const { setWithSync } = useCloudSync({ userId });

  const handleThemeChange = async (theme: 'light' | 'dark' | 'auto') => {
    await setWithSync('cf:v1:pref:user:ui', { theme });
  };

  return (
    <div>
      <button onClick={() => handleThemeChange('light')}>浅色</button>
      <button onClick={() => handleThemeChange('dark')}>深色</button>
      <button onClick={() => handleThemeChange('auto')}>自动</button>
    </div>
  );
}
```

### 示例 2: 表格配置

```tsx
import { useCloudSync } from '@/hooks/useCloudSync';
import { storageManager } from '@/utils/storage/StorageManager';

function TableConfig({ tableId }: { tableId: string }) {
  const userId = useAuth().userId;
  const { setWithSync } = useCloudSync({ userId });

  const handleColumnVisibility = async (columnId: string, visible: boolean) => {
    const current = await storageManager.get(`cf:v1:pref:table:${tableId}`);
    
    await setWithSync(`cf:v1:pref:table:${tableId}`, {
      ...current,
      columnVisibility: {
        ...current?.columnVisibility,
        [columnId]: visible,
      },
    });
  };

  return (
    <div>
      <label>
        <input 
          type="checkbox"
          onChange={(e) => handleColumnVisibility('name', e.target.checked)}
        />
        显示名称列
      </label>
    </div>
  );
}
```

### 示例 3: 系统设置

```tsx
function SystemSettings() {
  const userId = useAuth().userId;
  const { setWithSync } = useCloudSync({ userId });

  const handleLanguageChange = async (language: string) => {
    await setWithSync('cf:v1:pref:system', { language });
  };

  return (
    <select onChange={handleLanguageChange}>
      <option value="en">English</option>
      <option value="zh">中文</option>
    </select>
  );
}
```

---

## 📋 最佳实践

### 1. 用户 ID 管理

```tsx
// ✅ 推荐：从认证上下文获取
const userId = useAuth().userId;

// ❌ 避免：硬编码
const userId = 'user-123';
```

### 2. 错误处理

```tsx
const { setWithSync, error } = useCloudSync({ 
  userId,
  onSync: (data) => {
    console.log('同步成功:', data);
  },
  onConflict: (local, server) => {
    // 自定义冲突处理
    console.log('冲突:', { local, server });
  },
});

// 监听错误
useEffect(() => {
  if (error) {
    toast.error('同步失败：' + error.message);
  }
}, [error]);
```

### 3. 性能优化

```tsx
// ✅ 推荐：批量更新
const updateMultipleSettings = async () => {
  const updates = {
    theme: 'dark',
    language: 'zh',
    timezone: 'Asia/Shanghai',
  };
  
  await setWithSync('cf:v1:pref:user:ui', updates);
};

// ❌ 避免：多次单独更新
await setWithSync('cf:v1:pref:user:ui', { theme: 'dark' });
await setWithSync('cf:v1:pref:user:ui', { language: 'zh' });
await setWithSync('cf:v1:pref:user:ui', { timezone: 'Asia/Shanghai' });
```

### 4. 离线支持

```tsx
// localStorage 自动支持离线
// 网络恢复后会自动同步到云端

const { isConnected } = useCloudSync({ userId });

// 显示离线状态
if (!isConnected) {
  return <div>离线模式 - 更改将在网络恢复时同步</div>;
}
```

---

## 🔧 故障排查

### 问题 1: SSE 连接失败

**症状**: `isConnected` 始终为 `false`

**解决方案**:
1. 检查 Durable Object 是否正确部署
2. 检查 `/api/user-preferences/stub` 接口是否返回正确的 URL
3. 查看浏览器控制台错误信息

### 问题 2: 同步冲突

**症状**: 数据在不同设备间不一致

**解决方案**:
```tsx
// 自定义冲突处理
const { setWithSync } = useCloudSync({
  userId,
  onConflict: (local, server) => {
    // 策略 1: 总是使用服务器版本
    return server;
    
    // 策略 2: 总是使用本地版本
    return local;
    
    // 策略 3: 合并（需要自定义逻辑）
    return { ...local, ...server };
    
    // 策略 4: 让用户选择
    showConflictDialog(local, server);
  },
});
```

### 问题 3: 性能问题

**症状**: 同步延迟高

**解决方案**:
1. 减少同步频率（避免频繁调用 `setWithSync`）
2. 批量更新（一次性更新多个字段）
3. 使用 `debounce` 处理快速连续的操作

---

## 📊 监控和日志

### 客户端日志

```typescript
// 启用详细日志
const { setWithSync } = useCloudSync({
  userId,
  onSync: (data) => {
    console.log('[Sync] 数据已同步:', data);
  },
});
```

### 服务端日志

查看 Cloudflare Workers 日志：
```bash
npx wrangler tail
```

---

## 📝 总结

云同步功能已完全集成到项目中，可以立即使用。

### 下一步

1. ✅ 在组件中使用 `useCloudSync` Hook
2. ✅ 测试多设备同步场景
3. ✅ 根据实际需求调整冲突处理策略
4. ✅ 监控性能和同步延迟

### 支持

如有问题，请查看：
- [CLOUDFLARE_DO_SYNC_PROPOSAL.md](./CLOUDFLARE_DO_SYNC_PROPOSAL.md) - 完整技术方案
- [cloud-sync-example.tsx](./frontend/src/examples/cloud-sync-example.tsx) - 使用示例
