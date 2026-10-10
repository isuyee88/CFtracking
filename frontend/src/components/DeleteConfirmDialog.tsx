// Delete Confirm Dialog Component
// 删除确认对话框

import React from 'react';

export interface Campaign {
  id: string;
  name: string;
  status: string;
}

export interface DeleteConfirmDialogProps {
  open: boolean;
  campaigns: Campaign[];
  onConfirm: () => Promise<void>;
  onCancel: () => void;
}

export function DeleteConfirmDialog({
  open,
  campaigns,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  const [isDeleting, setIsDeleting] = React.useState(false);

  if (!open) return null;

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onCancel}
      />

      {/* Dialog */}
      <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-start gap-4 mb-4">
          {/* Warning Icon */}
          <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center">
            <svg
              className="w-6 h-6 text-red-600 dark:text-red-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>

          {/* Title and Description */}
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              Delete {campaigns.length} Campaign{campaigns.length > 1 ? 's' : ''}?
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              This action cannot be undone. All associated data (flows, offers, landings) will be permanently deleted.
            </p>
          </div>
        </div>

        {/* Campaign List */}
        <div className="mb-6 max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-900 rounded-md p-3">
          <ul className="space-y-2">
            {campaigns.map((campaign) => (
              <li
                key={campaign.id}
                className="text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"
              >
                <span className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0" />
                <span className="truncate">{campaign.name}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isDeleting}
            className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isDeleting ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}
