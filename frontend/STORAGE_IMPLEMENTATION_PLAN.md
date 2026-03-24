# 用户习惯统一存储方案 - 实施计划

## 📋 项目概述

本项目实现了一套完整的用户偏好存储解决方案，用于统一管理 CF Tracking 应用中的所有用户交互配置。

### 核心价值

- ✅ **统一管理**: 所有用户偏好集中管理，避免分散存储
- ✅ **类型安全**: 完整的 TypeScript 类型定义
- ✅ **易于使用**: 简洁的 API 和 React Hooks
- ✅ **高可靠性**: 错误处理、数据验证、备份恢复
- ✅ **可扩展**: 支持自定义存储策略和验证器

---

## 🎯 实施阶段

### 阶段一：基础设施（已完成 ✅）

**目标**: 建立核心存储框架

**完成内容**:
1. ✅ 实现 StorageManager 核心类
   - 多存储策略支持（local, session, memory, url）
   - 类型安全的泛型接口
   - 错误处理机制
   - 变化监听

2. ✅ 创建数据模型
   - UserPreferenceSchema 定义
   - TableConfig 和 ViewConfig 子模型
   - 存储键名规范

3. ✅ 实现基础 Hooks
   - useUserPreference
   - useThemePreference
   - useTableConfig
   - useViewConfig
   - useBulkPreferences

**文件清单**:
- `src/utils/storage/StorageManager.ts` - 核心存储管理器
- `src/hooks/useUserPreference.ts` - 用户偏好 Hook
- `src/utils/storage/index.ts` - 模块导出

---

### 阶段二：数据验证（已完成 ✅）

**目标**: 确保数据完整性和有效性

**完成内容**:
1. ✅ 实现验证器集合
   - 主题验证
   - 密度验证
   - 表格配置验证
   - 时区、语言、刷新间隔验证

2. ✅ 注册验证器
   - 自动注册机制
   - 模式匹配验证

**文件清单**:
- `src/utils/storage/storageValidators.ts` - 验证器集合

---

### 阶段三：迁移工具（已完成 ✅）

**目标**: 支持数据结构版本升级

**完成内容**:
1. ✅ 实现迁移框架
   - 版本定义和管理
   - 迁移函数实现
   - 自动迁移机制

2. ✅ 创建迁移工具
   - MigrationTool 类
   - 迁移报告生成
   - 版本检查

**文件清单**:
- `src/utils/storage/storageMigration.ts` - 迁移工具

---

### 阶段四：备份恢复（已完成 ✅）

**目标**: 提供数据备份和恢复能力

**完成内容**:
1. ✅ 实现备份工具
   - 创建备份
   - 恢复备份
   - 文件导出/导入
   - 校验和验证

2. ✅ 创建 React Hook
   - useBackup
   - 自动备份调度

**文件清单**:
- `src/utils/storage/storageBackup.ts` - 备份工具

---

### 阶段五：文档和示例（已完成 ✅）

**目标**: 提供完整的使用文档

**完成内容**:
1. ✅ 编写用户指南
   - 架构设计说明
   - API 参考
   - 使用示例
   - 最佳实践
   - 故障排查

2. ✅ 创建代码示例
   - 基础使用示例
   - Hook 使用示例
   - 备份恢复示例

**文件清单**:
- `frontend/STORAGE_SOLUTION_GUIDE.md` - 完整文档

---

## 🚀 集成计划

### 第一步：集成到现有应用（1-2 天）

**任务**:
1. 在 `main.tsx` 中初始化存储系统
2. 注册验证器
3. 执行自动迁移检查

**代码示例**:

```typescript
// src/main.tsx
import { registerAllValidators, autoMigrate } from '@/utils/storage';

// 注册验证器
registerAllValidators();

// 执行自动迁移
autoMigrate().then(() => {
  console.log('[Init] Storage system ready');
});

// 继续渲染应用
ReactDOM.createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

---

### 第二步：迁移现有配置（2-3 天）

**任务**: 将现有的 localStorage 使用迁移到新系统

**需要迁移的配置**:

| 现有键名 | 新键名 | 迁移脚本 |
|---------|--------|---------|
| `dark-mode` | `cf:v1:pref:user:theme` | ✅ 提供 |
| `user_timezone` | `cf:v1:pref:user:timezone` | ✅ 提供 |
| `table-{id}-filters` | `cf:v1:tbl:user:{id}:config` | ✅ 提供 |
| `table-{id}-sorter` | `cf:v1:tbl:user:{id}:config` | ✅ 提供 |

**迁移脚本**:

```typescript
// src/utils/migrateLegacy.ts
import { storageManager } from './storage/StorageManager';

export async function migrateLegacyData(): Promise<void> {
  // 迁移主题
  const darkMode = localStorage.getItem('dark-mode');
  if (darkMode) {
    await storageManager.set(
      'cf:v1:pref:user:theme',
      darkMode === 'true' ? 'dark' : 'light'
    );
    localStorage.removeItem('dark-mode');
  }
  
  // 迁移时区
  const timezone = localStorage.getItem('user_timezone');
  if (timezone) {
    await storageManager.set('cf:v1:pref:user:timezone', timezone);
    localStorage.removeItem('user_timezone');
  }
  
  // 迁移表格配置
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('table-')) {
      const value = localStorage.getItem(key);
      if (value) {
        const tableId = key.replace('table-', '').replace('-filters', '').replace('-sorter', '');
        const newKey = `cf:v1:tbl:user:${tableId}:config`;
        
        // 合并配置
        const existing = await storageManager.get(newKey, {});
        const parsed = JSON.parse(value);
        
        if (key.includes('-filters')) {
          await storageManager.set(newKey, {
            ...existing,
            filters: parsed,
          });
        } else if (key.includes('-sorter')) {
          await storageManager.set(newKey, {
            ...existing,
            sorting: parsed,
          });
        }
        
        localStorage.removeItem(key);
      }
    }
  }
  
  console.log('[Migration] Legacy data migrated successfully');
}
```

---

### 第三步：更新组件（3-5 天）

**任务**: 将现有组件更新为使用新的存储系统

#### 1. 更新 Layout 组件

```typescript
// src/components/Layout.tsx
import { useThemePreference } from '@/hooks/useUserPreference';

function Layout() {
  const { theme } = useThemePreference();
  
  // 根据 theme 应用 dark mode
  useEffect(() => {
    const isDark = theme === 'dark' || (theme === 'auto' && isNightTime());
    document.documentElement.classList.toggle('dark-mode', isDark);
  }, [theme]);
  
  return (/* ... */);
}
```

#### 2. 更新 VirtualTableEnhanced

```typescript
// src/components/VirtualTableEnhanced.tsx
import { useTableConfig } from '@/hooks/useUserPreference';

function VirtualTableEnhanced({ tableId, columns, data }) {
  const { config, updateConfig } = useTableConfig(tableId);
  
  // 应用保存的列配置
  const visibleColumns = useMemo(() => {
    if (!config.columns?.visible?.length) return columns;
    return columns.filter(col => config.columns.visible.includes(col.key));
  }, [columns, config.columns?.visible]);
  
  // 应用列宽
  const columnWidths = config.columns?.widths || {};
  
  return (/* ... */);
}
```

#### 3. 更新 Dashboard

```typescript
// src/pages/Dashboard.tsx
import { useViewConfig, useUserPreference } from '@/hooks/useUserPreference';

function Dashboard() {
  const { config: viewConfig } = useViewConfig('dashboard');
  const { value: system } = useUserPreference('system', { refreshInterval: 30000 });
  
  // 使用保存的视图配置
  const timeRange = viewConfig.timeRange || defaultTimeRange;
  const metrics = viewConfig.metrics || defaultMetrics;
  
  // 使用保存的刷新间隔
  useEffect(() => {
    const timer = setInterval(refreshData, system.refreshInterval);
    return () => clearInterval(timer);
  }, [system.refreshInterval]);
  
  return (/* ... */);
}
```

---

### 第四步：添加设置页面（1-2 天）

**任务**: 创建统一的设置管理页面

```typescript
// src/pages/Settings/Preferences.tsx
import { useUserPreference, useBackup } from '@/hooks/useUserPreference';

export function PreferencesSettings() {
  const { value: ui, setValue: setUi } = useUserPreference('ui');
  const { value: system, setValue: setSystem } = useUserPreference('system');
  const { createBackup, importBackup } = useBackup();
  
  return (
    <div className="settings-page">
      {/* 界面偏好 */}
      <section>
        <h2>Interface Preferences</h2>
        
        <div className="setting-item">
          <label>Theme</label>
          <select
            value={ui.theme}
            onChange={(e) => setUi({ ...ui, theme: e.target.value as any })}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
            <option value="auto">Auto</option>
          </select>
        </div>
        
        <div className="setting-item">
          <label>Density</label>
          <select
            value={ui.density}
            onChange={(e) => setUi({ ...ui, density: e.target.value as any })}
          >
            <option value="compact">Compact</option>
            <option value="standard">Standard</option>
            <option value="loose">Loose</option>
          </select>
        </div>
      </section>
      
      {/* 系统设置 */}
      <section>
        <h2>System Settings</h2>
        
        <div className="setting-item">
          <label>Refresh Interval</label>
          <input
            type="number"
            value={system.refreshInterval}
            onChange={(e) => setSystem({ ...system, refreshInterval: Number(e.target.value) })}
            step={5000}
            min={5000}
            max={300000}
          />
        </div>
      </section>
      
      {/* 备份恢复 */}
      <section>
        <h2>Backup & Restore</h2>
        
        <button onClick={() => createBackup('Settings backup')}>
          Create Backup
        </button>
        
        <input
          type="file"
          accept=".json"
          onChange={(e) => e.target.files?.[0] && importBackup(e.target.files[0])}
        />
      </section>
    </div>
  );
}
```

---

## 📊 性能指标

### 存储使用情况

**目标**:
- localStorage 使用率 < 50% (< 2.5MB)
- 单次读取时间 < 10ms
- 单次写入时间 < 20ms

**监控**:

```typescript
// 定期检查存储使用情况
setInterval(async () => {
  const usage = await storageManager.usage();
  console.log(`Storage usage: ${usage.percentage.toFixed(2)}%`);
  
  if (usage.percentage > 80) {
    console.warn('Storage usage is high, consider cleaning up');
  }
}, 60 * 60 * 1000); // 每小时检查一次
```

---

## 🔒 安全性考虑

### 数据安全

1. **敏感数据不存储**: 避免存储 token、密码等敏感信息
2. **数据验证**: 所有写入的数据都经过验证
3. **校验和**: 备份数据包含校验和验证

### XSS 防护

1. **输入验证**: 所有用户输入都经过验证
2. **输出编码**: 显示数据时进行适当的编码
3. **CSP**: 配置 Content Security Policy

---

## 🧪 测试计划

### 单元测试

```typescript
// src/utils/storage/__tests__/StorageManager.test.ts
import { storageManager } from '../StorageManager';

describe('StorageManager', () => {
  beforeEach(async () => {
    await storageManager.clear();
  });
  
  test('should set and get value', async () => {
    await storageManager.set('test-key', { data: 'value' });
    const result = await storageManager.get('test-key');
    expect(result).toEqual({ data: 'value' });
  });
  
  test('should return default value', async () => {
    const result = await storageManager.get('non-existent', 'default');
    expect(result).toBe('default');
  });
  
  test('should subscribe to changes', async () => {
    const callback = jest.fn();
    const unsubscribe = storageManager.subscribe('test-key', callback);
    
    await storageManager.set('test-key', 'new-value');
    await new Promise(resolve => setTimeout(resolve, 100));
    
    expect(callback).toHaveBeenCalledWith('new-value', null);
    unsubscribe();
  });
});
```

### 集成测试

```typescript
// src/hooks/__tests__/useUserPreference.test.tsx
import { renderHook, act } from '@testing-library/react';
import { useUserPreference } from '../useUserPreference';

describe('useUserPreference', () => {
  test('should load and save preference', async () => {
    const { result } = renderHook(() => useUserPreference('theme', 'light'));
    
    // Wait for loading
    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    
    expect(result.current.value).toBe('light');
    
    // Change preference
    await act(async () => {
      await result.current.setValue('dark');
    });
    
    expect(result.current.value).toBe('dark');
  });
});
```

---

## 📈 监控和日志

### 性能监控

```typescript
// 监控存储操作性能
const originalSet = storageManager.set.bind(storageManager);
storageManager.set = async (key, value, options) => {
  const start = performance.now();
  try {
    return await originalSet(key, value, options);
  } finally {
    const duration = performance.now() - start;
    console.log(`[Perf] storageManager.set(${key}) took ${duration.toFixed(2)}ms`);
  }
};
```

### 错误监控

```typescript
// 全局错误处理
window.addEventListener('error', (event) => {
  if (event.message.includes('QuotaExceededError')) {
    console.error('[Storage] Quota exceeded, attempting cleanup');
    storageManager.cleanup(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }
});
```

---

## 📝 总结

### 已完成工作

✅ **核心功能**:
- StorageManager 实现
- 多存储策略支持
- 类型安全的 Hooks
- 数据验证
- 迁移工具
- 备份恢复

✅ **文档**:
- 完整使用指南
- API 参考
- 代码示例
- 最佳实践

### 下一步行动

1. **集成到应用**: 在 main.tsx 中初始化
2. **迁移数据**: 运行迁移脚本
3. **更新组件**: 逐步替换现有 localStorage 使用
4. **测试**: 执行单元测试和集成测试
5. **监控**: 上线后持续监控性能和错误

### 预期收益

- 📉 减少 80% 的 localStorage 直接使用
- 📈 提高 50% 的开发效率（统一的 API）
- 🔒 提高数据安全性（验证和错误处理）
- 🎯 改善用户体验（配置持久化和备份）

---

**文档版本**: 1.0  
**最后更新**: 2024-03-24  
**维护者**: CF Tracking Team
