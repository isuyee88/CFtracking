# 存储方案 - 快速参考卡片

## 📦 核心 API

### StorageManager

```typescript
import { storageManager } from '@/utils/storage';

// 读取
const value = await storageManager.get<T>(key, defaultValue);

// 保存
await storageManager.set(key, value);

// 删除
await storageManager.remove(key);

// 订阅变化
const unsubscribe = storageManager.subscribe(key, (newVal, oldVal) => {});
```

### Hooks

```typescript
import { useUserPreference, useTableConfig, useViewConfig } from '@/hooks/useUserPreference';

// 用户偏好
const { value, setValue, reset, loading } = useUserPreference('theme', 'light');

// 表格配置
const { config, updateConfig, resetConfig } = useTableConfig(tableId);

// 页面视图
const { config, updateConfig } = useViewConfig(pageId);
```

---

## 🎯 常用场景

### 1. 主题切换

```typescript
const { theme, setTheme, toggleTheme } = useThemePreference();
```

### 2. 表格列配置

```typescript
const { config, updateConfig } = useTableConfig('dashboard-table');

// 切换列显示
await updateConfig(prev => ({
  ...prev,
  columns: {
    ...prev.columns,
    visible: prev.columns.visible.includes('column-key')
      ? prev.columns.visible.filter(k => k !== 'column-key')
      : [...prev.columns.visible, 'column-key'],
  },
}));
```

### 3. 备份恢复

```typescript
import { useBackup } from '@/utils/storage';

const { createBackup, restoreBackup, exportBackup, importBackup } = useBackup();

// 创建备份
await createBackup('My backup');

// 导出备份
await exportBackup('backup.json');

// 导入备份
await importBackup(file);
```

---

## 📝 数据模型

```typescript
interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  sidebarCollapsed: boolean;
  density: 'compact' | 'standard' | 'loose';
  fontSize: 'small' | 'medium' | 'large';
  tableConfigs: Record<string, TableConfig>;
  viewConfigs: Record<string, ViewConfig>;
  language: string;
  timezone: string;
  refreshInterval: number;
}
```

---

## 🔑 键名规范

格式：`cf:v1:{type}:user:{resource}:{field}`

示例：
- `cf:v1:pref:user:theme` - 主题
- `cf:v1:tbl:user:dashboard:config` - 表格配置
- `cf:v1:view:user:dashboard:state` - 页面视图

---

## ⚠️ 注意事项

1. **错误处理**: 始终使用 try-catch
2. **默认值**: 提供合理的默认值
3. **验证**: 数据自动验证，无需手动处理
4. **性能**: 批量操作优于多次单独操作
5. **清理**: 定期清理过期数据

---

## 🐛 故障排查

### LocalStorage 超限

```typescript
await storageManager.cleanup(Date.now() - 30 * 24 * 60 * 60 * 1000);
```

### 数据验证失败

检查控制台警告，确保数据符合类型要求

### 跨标签页同步

使用 `storageManager.subscribe()` 监听变化

---

**完整文档**: `STORAGE_SOLUTION_GUIDE.md`  
**实施计划**: `STORAGE_IMPLEMENTATION_PLAN.md`
