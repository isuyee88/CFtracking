// Campaign Clone Dialog Component
// 克隆 Campaign 的对话框组件 - 使用项目原生样式

import React, { useState } from 'react';
import { Copy, X, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface CloneOptions {
  cloneStatus: boolean;
  cloneFlows: boolean;
  cloneOffers: boolean;
  cloneLandings: boolean;
  cloneAutorules: boolean;
  cloneCostSettings: boolean;
}

interface CampaignCloneDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  campaignName: string;
  onSuccess?: () => void;
}

export function CampaignCloneDialog({
  open,
  onOpenChange,
  campaignId,
  campaignName,
  onSuccess,
}: CampaignCloneDialogProps) {
  const [newName, setNewName] = useState(`${campaignName} - Copy`);
  const [options, setOptions] = useState<CloneOptions>({
    cloneStatus: false,
    cloneFlows: true,
    cloneOffers: true,
    cloneLandings: true,
    cloneAutorules: true,
    cloneCostSettings: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const handleClone = async () => {
    if (!newName.trim()) {
      setError('Please enter a name for the cloned campaign');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/campaigns/${campaignId}/clone`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          newName: newName.trim(),
          options,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to clone campaign');
      }

      setSuccess(true);
      setTimeout(() => {
        onOpenChange(false);
        onSuccess?.();
        setNewName(`${campaignName} - Copy`);
        setSuccess(false);
        setError(null);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Clone Campaign</h2>
          </div>
          <button onClick={() => onOpenChange(false)} disabled={loading || success}>
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-600">
            Create a copy of "{campaignName}" with all its settings.
          </p>

          <div>
            <label className="block text-sm font-medium mb-2">New Campaign Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              disabled={loading || success}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Options</label>
            {[
              { key: 'cloneStatus' as const, label: 'Preserve status' },
              { key: 'cloneFlows' as const, label: 'Clone Flows' },
              { key: 'cloneOffers' as const, label: 'Clone Offers' },
              { key: 'cloneLandings' as const, label: 'Clone Landings' },
              { key: 'cloneAutorules' as const, label: 'Clone Auto-rules' },
              { key: 'cloneCostSettings' as const, label: 'Clone Cost Settings' },
            ].map(({ key, label }) => (
              <label key={key} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={options[key]}
                  onChange={(e) => setOptions(prev => ({ ...prev, [key]: e.target.checked }))}
                  disabled={loading || success}
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded">
              <AlertCircle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 rounded">
              <CheckCircle2 className="h-4 w-4" />
              <p>Campaign cloned successfully!</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={() => onOpenChange(false)}
            disabled={loading || success}
            className="px-4 py-2 text-sm border rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleClone}
            disabled={loading || success}
            className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-blue-600 rounded-md"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            {success ? 'Cloned!' : 'Clone'}
          </button>
        </div>
      </div>
    </div>
  );
}
