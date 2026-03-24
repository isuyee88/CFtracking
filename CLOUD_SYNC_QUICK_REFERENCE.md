# 云同步快速参考

## 🚀 快速开始

### 1. 基本用法

```tsx
import { useCloudSync } from '@/hooks/useCloudSync';

function MyComponent() {
  const userId = useAuth().userId;
  
  const { setWithSync } = useCloudSync({ userId });

  const handleClick = async () => {
    await setWithSync('cf:v1:pref:user:ui', { theme: 'dark' });
  };
}
```

### 2. 常用场景

#### 主题切换
```tsx
await setWithSync('cf:v1:pref:user:ui', { 
  theme: 'dark' // 'light' | 'dark' | 'auto'
});
```

#### 表格配置
```tsx
await setWithSync(`cf:v1:pref:table:${tableId}`, {
  columnVisibility: { name: true, status: false },
  columnOrder: ['name', 'status', 'date'],
  columnWidths: { name: 200, status: 100 },
});
```

#### 系统设置
```tsx
await setWithSync('cf:v1:pref:system', {
  language: 'zh',
  timezone: 'Asia/Shanghai',
  refreshInterval: 30000,
});
```

---

## 📊 数据流

```
用户操作 
  │
  ├─► localStorage (立即保存)
  │
  └─► HTTP POST → Durable Object
                  │
                  └─► SSE 广播 → 所有设备
                              │
                              └─► 拉取最新数据
```

---

## 🔑 Key Points

| 概念 | 说明 |
|------|------|
| **本地优先** | 所有更改先保存到 localStorage，保证快速响应 |
| **自动推送** | 保存到本地后自动推送到云端 |
| **SSE 广播** | 云端自动通知所有连接的设备 |
| **按需拉取** | 收到通知后才拉取数据，避免无效请求 |
| **冲突处理** | 支持自定义冲突解决策略 |

---

## 🎯 API 速查

### useCloudSync Hook

```typescript
const {
  // 状态
  isSyncing,      // 是否正在同步
  isConnected,    // SSE 连接状态
  lastSyncTime,   // 上次同步时间
  error,          // 错误信息
  
  // 方法
  setWithSync,    // 保存并同步（最常用）
  pushToCloud,    // 推送到云端
  pullFromCloud,  // 从云端拉取
  forceSync,      // 强制同步（推送 + 拉取）
  reconnect,      // 手动重连
} = useCloudSync({ userId });
```

---

## 💡 最佳实践

### ✅ 推荐

```tsx
// 1. 批量更新
await setWithSync('cf:v1:pref:user:ui', {
  theme: 'dark',
  density: 'standard',
  fontSize: 'medium',
});

// 2. 从认证获取 userId
const userId = useAuth().userId;

// 3. 处理冲突
const { setWithSync } = useCloudSync({
  userId,
  onConflict: (local, server) => {
    // 自定义合并逻辑
  },
});
```

### ❌ 避免

```tsx
// 1. 频繁单独更新
await setWithSync('key1', value1);
await setWithSync('key2', value2); // 合并为一次

// 2. 硬编码 userId
const userId = 'user-123'; // 应该从认证获取

// 3. 忽略错误
// 应该监听 error 状态并处理
```

---

## 🔧 调试技巧

### 客户端日志

```tsx
useCloudSync({
  userId,
  onSync: (data) => {
    console.log('[Sync] 同步成功:', data);
  },
});
```

### 服务端日志

```bash
# 查看 Workers 日志
npx wrangler tail

# 过滤特定日志
npx wrangler tail | grep "UserPreferenceDO"
```

---

## 📦 文件结构

```
src/
├── handlers/do/
│   ├── user-preference.do.ts    # Durable Object 实现
│   └── index.ts                  # DO 导出（已更新）
├── services/user-preferences/
│   └── user-preferences.routes.ts # API 路由
└── index.ts                      # 主入口（已更新）

frontend/src/
├── hooks/
│   └── useCloudSync.ts           # React Hook
└── examples/
    └── cloud-sync-example.tsx    # 使用示例

wrangler.toml                     # Cloudflare 配置（已更新）
```

---

## 🎨 使用示例

### 完整示例

```tsx
import { useCloudSync } from '@/hooks/useCloudSync';

function ThemeSettings() {
  const userId = useAuth().userId;
  
  const { 
    isConnected, 
    lastSyncTime,
    setWithSync,
    forceSync,
    isSyncing 
  } = useCloudSync({ userId });

  return (
    <div>
      <h3>主题设置</h3>
      
      {/* 状态显示 */}
      <div>
        <span>连接：{isConnected ? '✅' : '❌'}</span>
        <span>上次同步：{lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : '从未'}</span>
      </div>
      
      {/* 操作按钮 */}
      <button onClick={() => setWithSync('cf:v1:pref:user:ui', { theme: 'light' })}>
        浅色
      </button>
      <button onClick={() => setWithSync('cf:v1:pref:user:ui', { theme: 'dark' })}>
        深色
      </button>
      <button onClick={() => setWithSync('cf:v1:pref:user:ui', { theme: 'auto' })}>
        自动
      </button>
      
      <button onClick={forceSync} disabled={isSyncing}>
        {isSyncing ? '同步中...' : '立即同步'}
      </button>
    </div>
  );
}
```

---

## 📚 相关文档

- [CLOUDFLARE_DO_SYNC_PROPOSAL.md](./CLOUDFLARE_DO_SYNC_PROPOSAL.md) - 完整技术方案
- [CLOUD_SYNC_INTEGRATION_GUIDE.md](./CLOUD_SYNC_INTEGRATION_GUIDE.md) - 详细集成指南
- [cloud-sync-example.tsx](./frontend/src/examples/cloud-sync-example.tsx) - 代码示例

---

## 💰 成本估算

| 资源 | 免费额度 | 预估用量 | 月成本 |
|------|---------|---------|--------|
| DO 请求 | 100 万次 | 50 万次 | ~$1.35 |
| DO 存储 | 1 GB | 100 MB | ~$0.05 |
| DO 运行 | - | 少量 | ~$1 |
| **总计** | - | - | **~$2-5/月** |

---

## 🎯 性能指标

- **连接建立**: < 100ms
- **推送延迟**: < 500ms
- **重连间隔**: 5 秒
- **心跳间隔**: 30 秒
- **空闲连接**: ~1KB/连接
