// Campaign Clone Dialog Component
// 克隆 Campaign 的对话框组件

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, Copy, CheckCircle2, AlertCircle } from 'lucide-react';

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
        // Reset state
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

  const handleOptionChange = (key: keyof CloneOptions, checked: boolean) => {
    setOptions((prev) => ({ ...prev, [key]: checked }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Copy className="h-5 w-5" />
            Clone Campaign
          </DialogTitle>
          <DialogDescription>
            Create a copy of "{campaignName}" with all its settings and related data.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Campaign Name Input */}
          <div className="space-y-2">
            <Label htmlFor="newName">New Campaign Name</Label>
            <Input
              id="newName"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter campaign name"
              disabled={loading || success}
            />
          </div>

          {/* Clone Options */}
          <div className="space-y-3">
            <Label>Clone Options</Label>
            
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cloneStatus"
                  checked={options.cloneStatus}
                  onCheckedChange={(checked) =>
                    handleOptionChange('cloneStatus', checked as boolean)
                  }
                  disabled={loading || success}
                />
                <Label
                  htmlFor="cloneStatus"
                  className="text-sm font-normal cursor-pointer"
                >
                  Preserve campaign status (default: paused)
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cloneFlows"
                  checked={options.cloneFlows}
                  onCheckedChange={(checked) =>
                    handleOptionChange('cloneFlows', checked as boolean)
                  }
                  disabled={loading || success}
                />
                <Label
                  htmlFor="cloneFlows"
                  className="text-sm font-normal cursor-pointer"
                >
                  Clone Flows
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cloneOffers"
                  checked={options.cloneOffers}
                  onCheckedChange={(checked) =>
                    handleOptionChange('cloneOffers', checked as boolean)
                  }
                  disabled={loading || success}
                />
                <Label
                  htmlFor="cloneOffers"
                  className="text-sm font-normal cursor-pointer"
                >
                  Clone Offers
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cloneLandings"
                  checked={options.cloneLandings}
                  onCheckedChange={(checked) =>
                    handleOptionChange('cloneLandings', checked as boolean)
                  }
                  disabled={loading || success}
                />
                <Label
                  htmlFor="cloneLandings"
                  className="text-sm font-normal cursor-pointer"
                >
                  Clone Landing Pages
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cloneAutorules"
                  checked={options.cloneAutorules}
                  onCheckedChange={(checked) =>
                    handleOptionChange('cloneAutorules', checked as boolean)
                  }
                  disabled={loading || success}
                />
                <Label
                  htmlFor="cloneAutorules"
                  className="text-sm font-normal cursor-pointer"
                >
                  Clone Auto-rules
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="cloneCostSettings"
                  checked={options.cloneCostSettings}
                  onCheckedChange={(checked) =>
                    handleOptionChange('cloneCostSettings', checked as boolean)
                  }
                  disabled={loading || success}
                />
                <Label
                  htmlFor="cloneCostSettings"
                  className="text-sm font-normal cursor-pointer"
                >
                  Clone Cost Settings
                </Label>
              </div>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 rounded-md">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="flex items-center gap-2 p-3 text-sm text-green-600 bg-green-50 rounded-md">
              <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
              <p>Campaign cloned successfully!</p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading || success}
          >
            Cancel
          </Button>
          <Button onClick={handleClone} disabled={loading || success}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {success ? 'Cloned!' : 'Clone Campaign'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
