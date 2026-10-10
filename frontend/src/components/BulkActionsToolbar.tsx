// Bulk Actions Toolbar Component
// 批量操作工具栏

import React from 'react';

export interface BulkActionsToolbarProps {
  selectedCount: number;
  onActivate: () => Promise<void>;
  onPause: () => Promise<void>;
  onDelete: () => void;
  onEdit: () => void;
}

export function BulkActionsToolbar({
  selectedCount,
  onActivate,
  onPause,
  onDelete,
  onEdit,
}: BulkActionsToolbarProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleActivate = async () => {
    setIsLoading(true);
    try {
      await onActivate();
    } finally {
      setIsLoading(false);
    }
  };

  const handlePause = async () => {
    setIsLoading(true);
    try {
      await onPause();
    } finally {
      setIsLoading(false);
    }
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center gap-4 z-50">
      {/* 选中计数 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {selectedCount} selected
        </span>
      </div>

      {/* 分隔线 */}
      <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />

      {/* 批量操作按钮 */}
      <div className="flex items-center gap-2">
        {/* 启动按钮 */}
        <button
          onClick={handleActivate}
          disabled={isLoading}
          className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? 'Processing...' : 'Activate'}
        </button>

        {/* 暂停按钮 */}
        <button
          onClick={handlePause}
          disabled={isLoading}
          className="px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Pause
        </button>

        {/* 编辑按钮 */}
        <button
          onClick={onEdit}
          disabled={isLoading}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Edit
        </button>

        {/* 删除按钮 */}
        <button
          onClick={onDelete}
          disabled={isLoading}
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
