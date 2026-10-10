// Bulk Edit Dialog Component
// 批量编辑对话框

import React from 'react';

export interface BulkUpdateOptions {
  costModel?: 'cpc' | 'cpm' | 'cpa' | 'flat';
  costValue?: number;
  trafficSource?: string;
  group?: string;
  status?: 'active' | 'paused';
}

export interface BulkEditDialogProps {
  open: boolean;
  selectedCount: number;
  onSubmit: (updates: BulkUpdateOptions) => Promise<void>;
  onCancel: () => void;
}

export function BulkEditDialog({
  open,
  selectedCount,
  onSubmit,
  onCancel,
}: BulkEditDialogProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [updates, setUpdates] = React.useState<BulkUpdateOptions>({});

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (Object.keys(updates).length === 0) {
      alert('Please select at least one field to update');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(updates);
      setUpdates({});
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setUpdates({});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full mx-4 p-6">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
            Bulk Edit {selectedCount} Campaign{selectedCount > 1 ? 's' : ''}
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Select the fields you want to update for all selected campaigns.
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Cost Model */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <input
                type="checkbox"
                checked={updates.costModel !== undefined}
                onChange={(e) => {
                  if (e.target.checked) {
                    setUpdates({ ...updates, costModel: 'cpc' });
                  } else {
                    const { costModel, ...rest } = updates;
                    setUpdates(rest);
                  }
                }}
                className="mr-2"
              />
              Cost Model
            </label>
            {updates.costModel !== undefined && (
              <select
                value={updates.costModel}
                onChange={(e) =>
                  setUpdates({
                    ...updates,
                    costModel: e.target.value as BulkUpdateOptions['costModel'],
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="cpc">CPC (Cost Per Click)</option>
                <option value="cpm">CPM (Cost Per Mille)</option>
                <option value="cpa">CPA (Cost Per Action)</option>
                <option value="flat">Flat Fee</option>
              </select>
            )}
          </div>

          {/* Cost Value */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <input
                type="checkbox"
                checked={updates.costValue !== undefined}
                onChange={(e) => {
                  if (e.target.checked) {
                    setUpdates({ ...updates, costValue: 0 });
                  } else {
                    const { costValue, ...rest } = updates;
                    setUpdates(rest);
                  }
                }}
                className="mr-2"
              />
              Cost Value
            </label>
            {updates.costValue !== undefined && (
              <input
                type="number"
                step="0.01"
                min="0"
                value={updates.costValue}
                onChange={(e) =>
                  setUpdates({ ...updates, costValue: parseFloat(e.target.value) })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.00"
              />
            )}
          </div>

          {/* Traffic Source */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <input
                type="checkbox"
                checked={updates.trafficSource !== undefined}
                onChange={(e) => {
                  if (e.target.checked) {
                    setUpdates({ ...updates, trafficSource: '' });
                  } else {
                    const { trafficSource, ...rest } = updates;
                    setUpdates(rest);
                  }
                }}
                className="mr-2"
              />
              Traffic Source
            </label>
            {updates.trafficSource !== undefined && (
              <input
                type="text"
                value={updates.trafficSource}
                onChange={(e) =>
                  setUpdates({ ...updates, trafficSource: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., PropellerAds"
              />
            )}
          </div>

          {/* Group */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <input
                type="checkbox"
                checked={updates.group !== undefined}
                onChange={(e) => {
                  if (e.target.checked) {
                    setUpdates({ ...updates, group: '' });
                  } else {
                    const { group, ...rest } = updates;
                    setUpdates(rest);
                  }
                }}
                className="mr-2"
              />
              Group
            </label>
            {updates.group !== undefined && (
              <input
                type="text"
                value={updates.group}
                onChange={(e) =>
                  setUpdates({ ...updates, group: e.target.value })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="e.g., Test Group"
              />
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              <input
                type="checkbox"
                checked={updates.status !== undefined}
                onChange={(e) => {
                  if (e.target.checked) {
                    setUpdates({ ...updates, status: 'active' });
                  } else {
                    const { status, ...rest } = updates;
                    setUpdates(rest);
                  }
                }}
                className="mr-2"
              />
              Status
            </label>
            {updates.status !== undefined && (
              <select
                value={updates.status}
                onChange={(e) =>
                  setUpdates({
                    ...updates,
                    status: e.target.value as BulkUpdateOptions['status'],
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
              </select>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={handleReset}
              disabled={isSubmitting || Object.keys(updates).length === 0}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Object.keys(updates).length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? 'Updating...' : 'Update Campaigns'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
