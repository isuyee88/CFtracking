# 用户习惯统一存储方案

## 📋 目录

1. [概述](#概述)
2. [架构设计](#架构设计)
3. [快速开始](#快速开始)
4. [API 参考](#api 参考)
5. [使用示例](#使用示例)
6. [最佳实践](#最佳实践)
7. [故障排查](#故障排查)

---

## 概述

### 目标

提供一套统一、类型安全、可扩展的用户偏好存储解决方案，用于管理：

- ✅ 界面偏好（主题、布局、密度等）
- ✅ 表格配置（列显示、排序、筛选等）
- ✅ 页面视图（时间范围、指标选择等）
- ✅ 系统设置（语言、时区、刷新频率等）

### 特性

- **类型安全**: 完整的 TypeScript 类型定义
- **多存储策略**: 支持 localStorage、sessionStorage、IndexedDB、URL 参数
- **自动持久化**: 数据自动保存和恢复
- **变化监听**: 支持跨组件状态同步
- **数据验证**: 内置验证机制，确保数据完整性
- **备份恢复**: 支持数据导出和导入
- **版本迁移**: 支持数据结构版本升级

---

## 架构设计

### 存储策略矩阵

```
┌─────────────────────────────────────────────────────┐
│                  StorageManager                      │
├─────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │  Local   │  │ Session  │  │  Memory  │         │
│  │ Storage  │  │ Storage  │  │ Storage  │         │
│  └──────────┘  └──────────┘  └──────────┘         │
│  ┌──────────┐  ┌──────────┐                         │
│  │   URL    │  │ IndexedDB│                         │
│  │ Storage  │  │ (Future) │                         │
│  └──────────┘  └──────────┘                         │
└─────────────────────────────────────────────────────┘
```

### 数据模型

```typescript
interface UserPreferenceSchema {
  $meta: {
    version: string;        // 数据模型版本
    userId: string;         // 用户 ID
    lastUpdated: number;    // 最后更新时间戳
    checksum: string;       // 数据校验和
  };
  
  ui: {                      // 界面偏好
    theme: 'light' | 'dark' | 'auto';
    sidebarCollapsed: boolean;
    density: 'compact' | 'standard' | 'loose';
    fontSize: 'small' | 'medium' | 'large';
  };
  
  tables: {                  // 表格配置
    [tableId: string]: TableConfig;
  };
  
  views: {                   // 页面视图
    [pageId: string]: ViewConfig;
  };
  
  system: {                  // 系统设置
    language: string;
    timezone: string;
    refreshInterval: number;
  };
}
```

### 存储键名规范

格式：`{app}:{version}:{type}:{userId}:{resource}:{field}`

示例：
- `cf:v1:pref:user:theme` - 主题偏好
- `cf:v1:tbl:user:dashboard-recent-clicks:config` - 表格配置
- `cf:v1:view:user:dashboard:state` - 页面视图
- `cf:v1:sys:user:settings:all` - 系统设置

---

## 快速开始

### 1. 基础使用

```typescript
import { storageManager } from '@/utils/storage/StorageManager';

// 保存数据
await storageManager.set('my-key', { name: 'John', age: 30 });

// 读取数据
const data = await storageManager.get('my-key');

// 删除数据
await storageManager.remove('my-key');
```

### 2. 使用 Hook

```typescript
import { useUserPreference } from '@/hooks/useUserPreference';

function MyComponent() {
  const { value: theme, setValue: setTheme } = useUserPreference('theme', 'light');
  
  return (
    <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Toggle Theme
    </button>
  );
}
```

---

## API 参考

### StorageManager

#### 基础操作

```typescript
// 获取数据
async get<T>(key: string, defaultValue?: T, options?: StorageOptions): Promise<T | null>

// 保存数据
async set<T>(key: string, value: T, options?: StorageOptions): Promise<void>

// 删除数据
async remove(key: string, options?: StorageOptions): Promise<void>

// 清空数据
async clear(prefix?: string, options?: StorageOptions): Promise<void>
```

#### 批量操作

```typescript
// 批量获取
async getBatch<T>(keys: string[], options?: StorageOptions): Promise<Record<string, T>>

// 批量保存
async setBatch<T>(entries: Record<string, T>, options?: StorageOptions): Promise<void>
```

#### 订阅与发布

```typescript
// 订阅变化
const unsubscribe = storageManager.subscribe(key, (newValue, oldValue) => {
  console.log('Changed:', newValue);
});

// 取消订阅
unsubscribe();
```

#### 备份与恢复

```typescript
// 备份数据
const backup = await storageManager.backup();

// 恢复数据
await storageManager.restore(backup);

// 导出为 JSON
const json = await storageManager.export();

// 从 JSON 导入
await storageManager.import(json);
```

### Hooks

#### useUserPreference

```typescript
function useUserPreference<K extends keyof UserPreferences>(
  key: K,
  defaultValue?: UserPreferences[K]
): {
  value: UserPreferences[K];
  setValue: (value: UserPreferences[K] | ((prev: UserPreferences[K]) => UserPreferences[K])) => void;
  reset: () => void;
  loading: boolean;
  error: Error | null;
}
```

#### useTableConfig

```typescript
function useTableConfig(tableId: string): {
  config: TableConfig;
  updateConfig: (updater: (prev: TableConfig) => TableConfig) => Promise<void>;
  resetConfig: () => Promise<void>;
}
```

#### useViewConfig

```typescript
function useViewConfig(pageId: string): {
  config: ViewConfig;
  updateConfig: (updater: (prev: ViewConfig) => ViewConfig) => Promise<void>;
  resetConfig: () => Promise<void>;
}
```

---

## 使用示例

### 1. 主题切换

```typescript
import { useThemePreference } from '@/hooks/useUserPreference';

function ThemeToggle() {
  const { theme, setTheme, toggleTheme } = useThemePreference();
  
  return (
    <div>
      <p>Current theme: {theme}</p>
      <button onClick={toggleTheme}>Toggle Theme</button>
      <button onClick={() => setTheme('light')}>Light</button>
      <button onClick={() => setTheme('dark')}>Dark</button>
      <button onClick={() => setTheme('auto')}>Auto</button>
    </div>
  );
}
```

### 2. 表格列配置

```typescript
import { useTableConfig } from '@/hooks/useUserPreference';

function DataTable({ tableId }) {
  const { config, updateConfig, resetConfig } = useTableConfig(tableId);
  
  const toggleColumn = async (columnKey: string) => {
    await updateConfig(prev => ({
      ...prev,
      columns: {
        ...prev.columns,
        visible: prev.columns.visible.includes(columnKey)
          ? prev.columns.visible.filter(k => k !== columnKey)
          : [...prev.columns.visible, columnKey],
      },
    }));
  };
  
  const resizeColumn = async (columnKey: string, width: number) => {
    await updateConfig(prev => ({
      ...prev,
      columns: {
        ...prev.columns,
        widths: {
          ...prev.columns.widths,
          [columnKey]: width,
        },
      },
    }));
  };
  
  return (
    <div>
      <button onClick={resetConfig}>Reset Columns</button>
      {/* Table rendering logic */}
    </div>
  );
}
```

### 3. 页面视图配置

```typescript
import { useViewConfig } from '@/hooks/useUserPreference';

function Dashboard() {
  const { config, updateConfig } = useViewConfig('dashboard');
  
  const updateTimeRange = async (range: { from: string; to: string }) => {
    await updateConfig(prev => ({
      ...prev,
      timeRange: {
        interval: 'custom',
        ...range,
      },
    }));
  };
  
  const toggleMetric = async (metric: string) => {
    await updateConfig(prev => ({
      ...prev,
      metrics: prev.metrics?.includes(metric)
        ? prev.metrics.filter(m => m !== metric)
        : [...(prev.metrics || []), metric],
    }));
  };
  
  return (
    <div>
      {/* Dashboard UI */}
    </div>
  );
}
```

### 4. 批量保存设置

```typescript
import { useBulkPreferences } from '@/hooks/useUserPreference';

function SettingsPage() {
  const { saveAll, loading, error } = useBulkPreferences();
  
  const handleSave = async (settings) => {
    try {
      await saveAll({
        theme: settings.theme,
        language: settings.language,
        timezone: settings.timezone,
        refreshInterval: settings.refreshInterval,
      });
      alert('Settings saved!');
    } catch (err) {
      alert('Failed to save settings');
    }
  };
  
  return (
    <form onSubmit={handleSubmit(handleSave)}>
      {/* Settings form */}
      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Save Settings'}
      </button>
    </form>
  );
}
```

---

## 最佳实践

### 1. 键名命名

✅ 推荐：
```typescript
`cf:v1:pref:user:${key}`
`cf:v1:tbl:user:${tableId}:config`
`cf:v1:view:user:${pageId}:state`
```

❌ 避免：
```typescript
`user-settings`  // 缺少命名空间
`table-${id}`    // 缺少版本和用户标识
```

### 2. 数据结构

✅ 推荐：
```typescript
{
  $meta: {
    version: '1.0',
    lastUpdated: Date.now(),
  },
  data: { ... }
}
```

❌ 避免：
```typescript
{ ... }  // 缺少元数据
```

### 3. 错误处理

✅ 推荐：
```typescript
try {
  await storageManager.set(key, value);
} catch (error) {
  console.error('Failed to save:', error);
  // 降级处理或提示用户
}
```

❌ 避免：
```typescript
await storageManager.set(key, value);  // 无错误处理
```

### 4. 性能优化

✅ 推荐：
```typescript
// 批量保存
await storageManager.setBatch({
  'key1': value1,
  'key2': value2,
});

// 使用默认值避免重复读取
const { value } = useUserPreference('theme', 'light');
```

❌ 避免：
```typescript
// 多次单独保存
await storageManager.set('key1', value1);
await storageManager.set('key2', value2);
```

### 5. 数据迁移

```typescript
// 版本 1.0 -> 2.0
await storageManager.migrate('1.0', '2.0', (data) => ({
  ...data,
  newField: 'defaultValue',
  oldField: undefined,
}));
```

---

## 故障排查

### 常见问题

#### 1. LocalStorage 配额超限

**症状**: `QuotaExceededError`

**解决方案**:
```typescript
// 自动清理旧数据
await storageManager.cleanup(Date.now() - 30 * 24 * 60 * 60 * 1000);

// 检查使用情况
const usage = await storageManager.usage();
console.log(`Usage: ${usage.percentage.toFixed(2)}%`);
```

#### 2. 数据验证失败

**症状**: 控制台警告 `Validation failed`

**解决方案**:
```typescript
// 注册自定义验证器
storageManager.registerValidator('cf:v1:pref:user:theme', (value) => {
  const validThemes = ['light', 'dark', 'auto'];
  if (!validThemes.includes(value)) {
    return { valid: false, errors: ['Invalid theme'] };
  }
  return { valid: true, data: value };
});
```

#### 3. 跨标签页同步

**症状**: 其他标签页数据不同步

**解决方案**:
```typescript
// 使用订阅机制
useEffect(() => {
  const unsubscribe = storageManager.subscribe(key, (newValue) => {
    setState(newValue);
  });
  
  return unsubscribe;
}, [key]);
```

#### 4. 数据损坏

**症状**: `JSON.parse` 错误

**解决方案**:
```typescript
// 带错误处理的读取
const data = await storageManager.get(key, defaultValue, {
  type: 'local',
});

if (!data) {
  // 使用默认值或提示用户
}
```

---

## 迁移指南

### 从旧系统迁移

如果您之前使用 `localStorage` 直接存储，可以使用以下脚本迁移：

```typescript
// 迁移脚本
async function migrateFromLegacy() {
  const legacyKeys = ['dark-mode', 'user_timezone', 'table-filters'];
  
  for (const key of legacyKeys) {
    const value = localStorage.getItem(key);
    if (value) {
      const newKey = `cf:v1:pref:user:${key}`;
      await storageManager.set(newKey, JSON.parse(value));
      localStorage.removeItem(key);
    }
  }
}

// 执行迁移
migrateFromLegacy().then(() => {
  console.log('Migration completed');
});
```

---

## 总结

本存储方案提供了：

✅ **统一管理**: 所有用户偏好集中管理
✅ **类型安全**: 完整的 TypeScript 支持
✅ **易于使用**: 简洁的 API 和 Hooks
✅ **高可靠性**: 错误处理和备份恢复
✅ **可扩展**: 支持自定义存储策略和验证器

通过遵循本文档的最佳实践，您可以构建出健壮、可维护的用户偏好管理系统。
