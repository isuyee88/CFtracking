/**
 * @fileoverview 云同步使用示例
 * @description 展示如何在组件中使用 useCloudSync Hook 实现跨设备同步
 * @module examples/cloud-sync-example
 */

import React from 'react';
import { useCloudSync } from '@/hooks/useCloudSync';
import { storageManager } from '@/utils/storage/StorageManager';

/**
 * 示例 1: 主题切换组件
 */
export function ThemeToggleExample() {
  const userId = 'user-123'; // 从认证系统获取
  
  const { 
    isConnected, 
    lastSyncTime, 
    forceSync,
    setWithSync,
    isSyncing,
  } = useCloudSync({
    userId,
    onSync: (data) => {
      console.log('从云端同步了主题设置:', data);
    },
  });

  const handleThemeChange = async (theme: 'light' | 'dark' | 'auto') => {
    // 自动保存到本地 + 推送到云端
    await setWithSync('cf:v1:pref:user:ui', { theme });
  };

  return (
    <div>
      <h3>主题设置</h3>
      <button onClick={() => handleThemeChange('light')}>浅色</button>
      <button onClick={() => handleThemeChange('dark')}>深色</button>
      <button onClick={() => handleThemeChange('auto')}>自动</button>
      
      <div>
        <button onClick={forceSync} disabled={isSyncing}>
          {isSyncing ? '同步中...' : '立即同步'}
        </button>
        <span>
          连接状态：{isConnected ? '✅ 已连接' : '❌ 未连接'}
        </span>
        <span>
          上次同步：{lastSyncTime ? new Date(lastSyncTime).toLocaleTimeString() : '从未'}
        </span>
      </div>
    </div>
  );
}

/**
 * 示例 2: 表格配置组件
 */
export function TableConfigExample() {
  const userId = 'user-123';
  const tableId = 'campaigns-table';
  
  const { setWithSync } = useCloudSync({ userId });

  const handleColumnVisibilityChange = async (columnId: string, visible: boolean) => {
    const currentConfig = await storageManager.get(`cf:v1:pref:table:${tableId}`);
    
    const newConfig = {
      ...currentConfig,
      columnVisibility: {
        ...currentConfig?.columnVisibility,
        [columnId]: visible,
      },
    };

    // 保存到本地 + 推送到云端
    await setWithSync(`cf:v1:pref:table:${tableId}`, newConfig);
  };

  return (
    <div>
      <h3>表格列配置</h3>
      <label>
        <input 
          type="checkbox"
          onChange={(e) => handleColumnVisibilityChange('name', e.target.checked)}
        />
        显示名称列
      </label>
      <label>
        <input 
          type="checkbox"
          onChange={(e) => handleColumnVisibilityChange('status', e.target.checked)}
        />
        显示状态列
      </label>
    </div>
  );
}

/**
 * 示例 3: 系统设置组件
 */
export function SystemSettingsExample() {
  const userId = 'user-123';
  
  const { setWithSync } = useCloudSync({ userId });

  const handleLanguageChange = async (language: string) => {
    await setWithSync('cf:v1:pref:system', { language });
  };

  const handleTimezoneChange = async (timezone: string) => {
    await setWithSync('cf:v1:pref:system', { timezone });
  };

  return (
    <div>
      <h3>系统设置</h3>
      <select onChange={(e) => handleLanguageChange(e.target.value)}>
        <option value="en">English</option>
        <option value="zh">中文</option>
      </select>
      
      <select onChange={(e) => handleTimezoneChange(e.target.value)}>
        <option value="UTC">UTC</option>
        <option value="Asia/Shanghai">上海时间</option>
        <option value="America/New_York">纽约时间</option>
      </select>
    </div>
  );
}

/**
 * 示例 4: 完整的用户偏好管理组件
 */
export function UserPreferenceManagerExample() {
  const userId = 'user-123';
  
  const {
    isConnected,
    isSyncing,
    lastSyncTime,
    forceSync,
    setWithSync,
    pushToCloud,
    pullFromCloud,
  } = useCloudSync({
    userId,
    syncInterval: 30000,
    onSync: (data) => {
      console.log('数据已同步:', data);
    },
    onConflict: (local, server) => {
      // 自定义冲突处理逻辑
      console.log('检测到冲突:', { local, server });
      // 默认使用服务器版本
    },
  });

  // 导出所有偏好
  const handleExport = async () => {
    const allPrefs = await storageManager.get('cf:v1:all:preferences');
    const blob = new Blob([JSON.stringify(allPrefs, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `preferences-backup-${Date.now()}.json`;
    a.click();
  };

  // 导入偏好
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string);
        await storageManager.setBatch(imported);
        await pushToCloud(imported);
        alert('导入成功！');
      } catch (error) {
        alert('导入失败：' + (error as Error).message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div>
      <h2>用户偏好管理</h2>
      
      {/* 状态显示 */}
      <div>
        <p>连接状态：{isConnected ? '✅ 已连接' : '❌ 未连接'}</p>
        <p>同步状态：{isSyncing ? '同步中...' : '就绪'}</p>
        <p>上次同步：{lastSyncTime ? new Date(lastSyncTime).toLocaleString() : '从未'}</p>
      </div>

      {/* 操作按钮 */}
      <div>
        <button onClick={forceSync} disabled={isSyncing}>
          立即同步
        </button>
        <button onClick={handleExport}>
          导出偏好
        </button>
        <label>
          导入偏好
          <input 
            type="file" 
            accept=".json"
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </label>
      </div>

      {/* 其他组件 */}
      <ThemeToggleExample />
      <TableConfigExample />
      <SystemSettingsExample />
    </div>
  );
}

/**
 * 示例 5: 在应用根组件中初始化
 */
export function AppWithCloudSyncExample({ children }: { children: React.ReactNode }) {
  const userId = 'user-123'; // 从认证上下文获取
  
  // 在应用级别初始化同步
  const cloudSync = useCloudSync({
    userId,
    onSync: (data) => {
      // 全局同步处理
      console.log('全局数据同步:', data);
    },
  });

  return (
    <div>
      {/* 可以在这里显示全局同步状态 */}
      {cloudSync.isSyncing && (
        <div className="sync-indicator">同步中...</div>
      )}
      
      {children}
    </div>
  );
}
