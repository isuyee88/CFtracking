/**
 * File: index.ts
 * Purpose: 存储模块统一导出
 * Input/Output: 导出所有存储相关的工具、Hook 和工具类
 * Logic: 集中管理模块导出，简化导入路径
 */

// ==================== 核心模块 ====================

export {
  StorageManager,
  storageManager,
  StorageOptions,
  StorageType,
  ValidationResult,
  BackupData,
  CleanupResult,
  MigrationResult,
  getUserPreference,
  setUserPreference,
  getTableConfig,
  setTableConfig,
  getPageView,
  setPageView,
} from './StorageManager';

// ==================== Hooks ====================

export {
  useUserPreference,
  useThemePreference,
  useTableConfig,
  useViewConfig,
  useBulkPreferences,
  UserPreferences,
  TableConfig,
  ViewConfig,
} from '../hooks/useUserPreference';

// ==================== 验证器 ====================

export {
  Validators,
  registerAllValidators,
} from './storageValidators';

// ==================== 迁移工具 ====================

export {
  migrateFrom10To11,
  migrateToLatest,
  MigrationTool,
  migrationTool,
  autoMigrate,
  generateMigrationReport,
  DataModelVersion,
  DATA_MODEL_VERSIONS,
} from './storageMigration';

// ==================== 备份工具 ====================

export {
  BackupTool,
  backupTool,
  exportBackup,
  importBackup,
  createAndDownloadBackup,
  validateBackupFile,
  useBackup,
  BackupMetadata,
} from './storageBackup';

// ==================== 使用示例 ====================

/**
 * 示例 1: 使用 Hook 管理主题
 * 
 * ```typescript
 * import { useThemePreference } from '@/hooks/useUserPreference';
 * 
 * function ThemeToggle() {
 *   const { theme, setTheme, toggleTheme } = useThemePreference();
 *   
 *   return (
 *     <button onClick={toggleTheme}>
 *       Current: {theme}
 *     </button>
 *   );
 * }
 * ```
 */

/**
 * 示例 2: 管理表格配置
 * 
 * ```typescript
 * import { useTableConfig } from '@/hooks/useUserPreference';
 * 
 * function DataTable({ tableId }) {
 *   const { config, updateConfig } = useTableConfig(tableId);
 *   
 *   const toggleColumn = async (columnKey: string) => {
 *     await updateConfig(prev => ({
 *       ...prev,
 *       columns: {
 *         ...prev.columns,
 *         visible: prev.columns.visible.includes(columnKey)
 *           ? prev.columns.visible.filter(k => k !== columnKey)
 *           : [...prev.columns.visible, columnKey],
 *       },
 *     }));
 *   };
 *   
 *   return <div>{/* Table UI *\/}</div>;
 * }
 * ```
 */

/**
 * 示例 3: 备份和恢复
 * 
 * ```typescript
 * import { useBackup } from '@/utils/storage';
 * 
 * function BackupButton() {
 *   const { createBackup, restoreBackup, loading } = useBackup();
 *   
 *   return (
 *     <div>
 *       <button onClick={() => createBackup('My backup')}>
 *         {loading ? 'Creating...' : 'Create Backup'}
 *       </button>
 *     </div>
 *   );
 * }
 * ```
 */

/**
 * 示例 4: 使用 StorageManager 直接操作
 * 
 * ```typescript
 * import { storageManager } from '@/utils/storage';
 * 
 * // 保存数据
 * await storageManager.set('my-key', { data: 'value' });
 * 
 * // 读取数据
 * const data = await storageManager.get('my-key');
 * 
 * // 订阅变化
 * const unsubscribe = storageManager.subscribe('my-key', (newValue) => {
 *   console.log('Changed:', newValue);
 * });
 * 
 * // 取消订阅
 * unsubscribe();
 * ```
 */

/**
 * 示例 5: 批量操作
 * 
 * ```typescript
 * import { useBulkPreferences } from '@/hooks/useUserPreference';
 * 
 * function SettingsPage() {
 *   const { saveAll, loading } = useBulkPreferences();
 *   
 *   const handleSave = async () => {
 *     await saveAll({
 *       theme: 'dark',
 *       language: 'en',
 *       timezone: 'UTC',
 *       refreshInterval: 30000,
 *     });
 *   };
 *   
 *   return <button onClick={handleSave}>Save</button>;
 * }
 * ```
 */
