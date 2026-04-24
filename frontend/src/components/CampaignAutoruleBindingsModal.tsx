import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Plus, Trash2, X, Zap } from 'lucide-react';
import {
  clearCampaignAutoruleBindings,
  fetchCampaignAutoruleBindings,
  fetchRules,
  replaceCampaignAutoruleBindings,
  type AutoruleBindingRecord,
  type Rule,
} from '../services/api';

interface BindingDraft {
  id: string;
  ruleId: string;
  priority: number;
}

interface CampaignAutoruleBindingsModalProps {
  isOpen: boolean;
  campaignId: string | null;
  campaignName?: string;
  onClose: () => void;
  onSaved?: (bindings: AutoruleBindingRecord[]) => void;
}

function createDraft(index = 0): BindingDraft {
  return {
    id: crypto.randomUUID(),
    ruleId: '',
    priority: index,
  };
}

export function CampaignAutoruleBindingsModal({
  isOpen,
  campaignId,
  campaignName,
  onClose,
  onSaved,
}: CampaignAutoruleBindingsModalProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [bindings, setBindings] = useState<BindingDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !campaignId) {
      return;
    }

    let mounted = true;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [rulesResult, bindingResult] = await Promise.all([
          fetchRules({ page: 1, pageSize: 200, status: 'active' }),
          fetchCampaignAutoruleBindings(campaignId),
        ]);

        if (!mounted) {
          return;
        }

        setRules(Array.isArray(rulesResult.list) ? rulesResult.list : []);
        setBindings(
          bindingResult.length > 0
            ? bindingResult
                .slice()
                .sort((left, right) => left.priority - right.priority)
                .map((binding, index) => ({
                  id: `${binding.ruleId}-${index}`,
                  ruleId: binding.ruleId,
                  priority: Number(binding.priority || 0),
                }))
            : [createDraft(0)]
        );
      } catch (err) {
        if (!mounted) {
          return;
        }
        setError(err instanceof Error ? err.message : 'Failed to load autorule bindings');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void load();
    return () => {
      mounted = false;
    };
  }, [campaignId, isOpen]);

  const selectedRuleIds = useMemo(
    () => bindings.map((binding) => binding.ruleId).filter(Boolean),
    [bindings]
  );

  const duplicateRuleIds = useMemo(() => {
    const counts = new Map<string, number>();
    selectedRuleIds.forEach((ruleId) => {
      counts.set(ruleId, (counts.get(ruleId) || 0) + 1);
    });
    return new Set(Array.from(counts.entries()).filter(([, count]) => count > 1).map(([ruleId]) => ruleId));
  }, [selectedRuleIds]);

  const normalizedBindings = useMemo(
    () =>
      bindings
        .map((binding) => ({
          ruleId: binding.ruleId.trim(),
          priority: Number(binding.priority || 0),
        }))
        .filter((binding) => binding.ruleId)
        .sort((left, right) => left.priority - right.priority),
    [bindings]
  );

  const canSave = normalizedBindings.length > 0 && duplicateRuleIds.size === 0;

  const handleSave = async () => {
    if (!campaignId || !canSave) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const nextBindings = await replaceCampaignAutoruleBindings(campaignId, normalizedBindings);
      onSaved?.(nextBindings);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save autorule bindings');
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!campaignId) {
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await clearCampaignAutoruleBindings(campaignId);
      onSaved?.([]);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to clear autorule bindings');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-lg border border-border-default bg-surface shadow-2xl">
        <div className="flex items-center justify-between border-b border-border-default px-6 py-4">
          <div>
            <h2 className="text-xl font-display font-bold text-fg-default">Campaign Autorules</h2>
            <p className="text-sm text-fg-muted">
              {campaignName || campaignId} - lower priority number runs first after whitelist/blacklist checks.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-2 text-fg-muted transition-colors hover:bg-surface-container hover:text-fg-default"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-6 py-5">
          <div className="rounded border border-border-default bg-surface-container-low px-4 py-3 text-sm text-fg-muted">
            Runtime order: whitelist match -&gt; allow, blacklist match -&gt; block, otherwise evaluate campaign-bound
            autorules by
            ascending priority.
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-fg-muted">
              <Loader2 size={24} className="animate-spin" />
            </div>
          ) : (
            <>
              <div className="space-y-3">
                {bindings.map((binding, index) => {
                  const duplicate = binding.ruleId && duplicateRuleIds.has(binding.ruleId);
                  return (
                    <div
                      key={binding.id}
                      className="grid gap-3 rounded border border-border-default bg-surface-container p-4 md:grid-cols-[1fr_120px_48px]"
                    >
                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-fg-muted">Rule</label>
                        <select
                          value={binding.ruleId}
                          onChange={(event) => {
                            const nextRuleId = event.target.value;
                            setBindings((current) =>
                              current.map((item) => (item.id === binding.id ? { ...item, ruleId: nextRuleId } : item))
                            );
                          }}
                          className="w-full rounded border border-border-default bg-surface px-3 py-2 text-sm text-fg-default outline-none focus:border-primary"
                        >
                          <option value="">Select an autorule</option>
                          {rules.map((rule) => (
                            <option key={rule.id} value={rule.id}>
                              {rule.name} [{rule.type}] P{rule.priority}
                            </option>
                          ))}
                        </select>
                        {duplicate ? (
                          <p className="text-xs text-danger">Each autorule can only be bound once per campaign.</p>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <label className="text-xs font-medium uppercase tracking-wide text-fg-muted">Binding Priority</label>
                        <input
                          type="number"
                          value={binding.priority}
                          onChange={(event) => {
                            const nextPriority = Number(event.target.value || 0);
                            setBindings((current) =>
                              current.map((item) => (item.id === binding.id ? { ...item, priority: nextPriority } : item))
                            );
                          }}
                          className="w-full rounded border border-border-default bg-surface px-3 py-2 text-sm text-fg-default outline-none focus:border-primary"
                        />
                        <p className="text-xs text-fg-muted">Smaller number = evaluated earlier</p>
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() =>
                            setBindings((current) => (current.length > 1 ? current.filter((item) => item.id !== binding.id) : current))
                          }
                          disabled={bindings.length === 1}
                          className="inline-flex h-10 w-10 items-center justify-center rounded border border-border-default text-fg-muted transition-colors hover:bg-surface hover:text-danger disabled:cursor-not-allowed disabled:opacity-40"
                          title="Remove binding"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {binding.ruleId ? (
                        <div className="md:col-span-3 rounded border border-border-default/60 bg-surface px-3 py-2 text-xs text-fg-muted">
                          {(() => {
                            const rule = rules.find((item) => item.id === binding.ruleId);
                            return rule ? (
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1 text-primary">
                                  <Zap size={14} />
                                  {rule.name}
                                </span>
                                <span>[{rule.type}]</span>
                                <span>Rule priority: P{rule.priority}</span>
                                <span>Status: {rule.status}</span>
                              </div>
                            ) : (
                              'Selected rule is not available in the active rule list.'
                            );
                          })()}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={() => setBindings((current) => [...current, createDraft(current.length)])}
                className="inline-flex items-center gap-2 rounded border border-dashed border-border-default px-3 py-2 text-sm text-fg-default transition-colors hover:bg-surface-container"
              >
                <Plus size={16} />
                Add Autorule Binding
              </button>
            </>
          )}

          {error ? <div className="rounded border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
        </div>

        <div className="flex items-center justify-between border-t border-border-default px-6 py-4">
          <button
            type="button"
            onClick={() => void handleClear()}
            disabled={saving || loading}
            className="rounded border border-border-default px-4 py-2 text-sm text-fg-muted transition-colors hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
          >
            Clear Bindings
          </button>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded border border-border-default px-4 py-2 text-sm text-fg-default transition-colors hover:bg-surface-container"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={!canSave || saving || loading}
              className="rounded bg-primary px-4 py-2 text-sm font-medium text-on-primary transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Bindings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
