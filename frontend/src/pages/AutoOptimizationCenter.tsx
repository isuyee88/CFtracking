import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Brain,
  CheckCircle2,
  Clock,
  ListChecks,
  RefreshCw,
  RotateCcw,
  Settings,
  Shield,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Link } from 'react-router-dom';
import {
  formatAiDecisionSourceLabel,
  formatAiEngineRoute,
  formatAiFallbackLabel,
} from '../constants/ai-optimization-ui';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ROIMetrics {
  roi: number;
  revenue: number;
  cost: number;
  profit: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cr: number;
  cpc: number;
  epc: number;
  cpa: number;
}

interface AutoOperationRecord {
  id: string;
  displayId: number;
  campaignId: string;
  zoneId?: string;
  ruleName?: string;
  actionType: string;
  platform: string;
  approvalStatus: string;
  executionStatus: string;
  decisionContext: ROIMetrics & { triggerReason: string; confidence: number };
  createdAt: string;
}

interface ApprovalRequestItem {
  id: string;
  operationId: string;
  requestId: string;
  expiresAt: string;
  operation: AutoOperationRecord;
}

interface PredefinedRule {
  id: string;
  ruleCode: string;
  name: string;
  description?: string;
  ruleType: string;
  priority: number;
  enabled: boolean;
}

interface OperationStats {
  totalOperations: number;
  executedSuccessfully: number;
  executedFailed: number;
  pendingApproval: number;
  rolledBack: number;
}

interface AiDecisionRecord {
  id: string;
  displayId: number;
  campaignId: string;
  scopeType: 'campaign' | 'zone' | 'publisher';
  scopeId: string;
  platform: string;
  actionType: 'ADJUST_BID' | 'BLOCK_ZONE' | 'BLOCK_PUBLISHER' | 'OBSERVE' | 'NO_ACTION';
  confidence: number;
  reason: string;
  evidence: Array<{ label: string; value: string | number; kind?: string }>;
  expectedImpact: {
    roiDelta?: number;
    spendDeltaPercent?: number;
    riskLevel?: 'low' | 'medium' | 'high';
    note?: string;
  };
  status: string;
  executionStatus: string;
  rollbackStatus: string;
  operationId?: string;
  rollbackOperationId?: string;
  provider?: string;
  gatewayId?: string;
  fallbackUsed?: boolean;
  fallbackReason?: string;
  model?: string;
  executionError?: string;
  createdAt: string;
}

interface AiDecisionStats {
  total: number;
  executed: number;
  failed: number;
  blockedBySafety: number;
  noAction: number;
  rollbackAvailable: number;
  rollbackSuccess: number;
  rollbackFailed: number;
}

interface AiEngineConfig {
  enabled: boolean;
  platform: string;
  primaryTrigger: string;
  supplementalTrigger: string;
  defaultTimeWindow: string;
  scheduleCron: string;
  aiEnabled: boolean;
  provider: string;
  gatewayEnabled: boolean;
  gatewayId?: string;
  model: string;
  fallbackProvider: string;
  autoExecute: boolean;
}

function MetricTile({
  title,
  value,
  tone = 'default',
}: {
  title: string;
  value: string | number;
  tone?: 'default' | 'success' | 'danger' | 'warning' | 'brand';
}) {
  const toneClass =
    tone === 'success'
      ? 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300'
      : tone === 'danger'
        ? 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300'
        : tone === 'warning'
          ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300'
          : tone === 'brand'
            ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300'
            : 'bg-gray-50 text-gray-700 dark:bg-gray-900/30 dark:text-gray-200';

  return (
    <div className={cn('rounded-xl border border-gray-100 p-4 dark:border-gray-700', toneClass)}>
      <div className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">{title}</div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
    </div>
  );
}

function Pill({ label, tone }: { label: string; tone: 'default' | 'success' | 'danger' | 'warning' | 'brand' }) {
  const toneClass =
    tone === 'success'
      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
      : tone === 'danger'
        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
        : tone === 'warning'
          ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
          : tone === 'brand'
            ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200';
  return <span className={cn('inline-flex rounded-full px-2 py-1 text-xs font-medium', toneClass)}>{label}</span>;
}

function mapDecisionTone(status: string): 'default' | 'success' | 'danger' | 'warning' | 'brand' {
  if (status === 'executed' || status === 'rollback_success') return 'success';
  if (status === 'execution_failed' || status === 'rollback_failed') return 'danger';
  if (status === 'blocked_by_safety') return 'warning';
  if (status === 'suggested') return 'brand';
  return 'default';
}

function mapActionTone(actionType: string): 'default' | 'success' | 'danger' | 'warning' | 'brand' {
  if (actionType.startsWith('BLOCK')) return 'danger';
  if (actionType === 'ADJUST_BID') return 'brand';
  if (actionType === 'OBSERVE') return 'warning';
  return 'default';
}

export function AutoOptimizationCenter() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'ai' | 'operations' | 'rules' | 'approvals'>('dashboard');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [campaignInput, setCampaignInput] = useState('');
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [roiData, setRoiData] = useState<ROIMetrics | null>(null);
  const [operationStats, setOperationStats] = useState<OperationStats | null>(null);
  const [predefinedRules, setPredefinedRules] = useState<PredefinedRule[]>([]);
  const [recentOperations, setRecentOperations] = useState<AutoOperationRecord[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequestItem[]>([]);
  const [aiConfig, setAiConfig] = useState<AiEngineConfig | null>(null);
  const [aiDecisionStats, setAiDecisionStats] = useState<AiDecisionStats | null>(null);
  const [recentAiDecisions, setRecentAiDecisions] = useState<AiDecisionRecord[]>([]);

  const apiBase = '/api/auto-optimization';
  const apiOrigin = import.meta.env.VITE_API_URL || '';

  const autoOptFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((init.headers as Record<string, string>) || {}),
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const response = await fetch(`${apiOrigin}${apiBase}${path}`, {
      ...init,
      headers,
    });
    const payload = await response.json().catch(() => ({} as Record<string, unknown>));
    if (!response.ok) {
      throw new Error(String(payload.error || payload.message || `Request failed: ${response.status}`));
    }
    return payload as Record<string, any>;
  }, [apiBase, apiOrigin]);

  const withLoading = useCallback(async <T,>(key: string, runner: () => Promise<T>) => {
    try {
      setLoading((current) => ({ ...current, [key]: true }));
      return await runner();
    } finally {
      setLoading((current) => ({ ...current, [key]: false }));
    }
  }, []);

  const loadROIData = useCallback(async (campaignId?: string) => {
    if (!campaignId) return;
    return withLoading('roi', async () => {
      const json = await autoOptFetch(`/roi/${campaignId}?window=24h`);
      if (json.success) setRoiData(json.data.metrics);
    });
  }, [autoOptFetch, withLoading]);

  const loadOperationStats = useCallback(async () => {
    return withLoading('op-stats', async () => {
      const json = await autoOptFetch('/operations/stats?days=7');
      if (json.success) setOperationStats(json.data);
    });
  }, [autoOptFetch, withLoading]);

  const loadPredefinedRules = useCallback(async () => {
    return withLoading('rules', async () => {
      const json = await autoOptFetch('/rules/predefined');
      if (json.success) setPredefinedRules(json.data || []);
    });
  }, [autoOptFetch, withLoading]);

  const loadRecentOperations = useCallback(async () => {
    return withLoading('ops', async () => {
      const json = await autoOptFetch('/operations/recent?limit=20');
      if (json.success) setRecentOperations(json.data || []);
    });
  }, [autoOptFetch, withLoading]);

  const loadPendingApprovals = useCallback(async () => {
    return withLoading('approvals', async () => {
      const json = await autoOptFetch('/approvals/pending');
      if (json.success) setPendingApprovals(json.data || []);
    });
  }, [autoOptFetch, withLoading]);

  const loadAiConfig = useCallback(async () => {
    return withLoading('ai-config', async () => {
      const json = await autoOptFetch('/ai-operations/config');
      if (json.success) setAiConfig(json.data);
    });
  }, [autoOptFetch, withLoading]);

  const loadAiDecisionStats = useCallback(async () => {
    return withLoading('ai-stats', async () => {
      const json = await autoOptFetch('/ai-operations/stats?days=7');
      if (json.success) setAiDecisionStats(json.data);
    });
  }, [autoOptFetch, withLoading]);

  const loadRecentAiDecisions = useCallback(async () => {
    return withLoading('ai-decisions', async () => {
      const json = await autoOptFetch('/ai-operations/recent?limit=20');
      if (json.success) setRecentAiDecisions(json.data || []);
    });
  }, [autoOptFetch, withLoading]);

  const refreshAll = useCallback(async () => {
    try {
      setError(null);
      await Promise.all([
        loadOperationStats(),
        loadPredefinedRules(),
        loadRecentOperations(),
        loadPendingApprovals(),
        loadAiConfig(),
        loadAiDecisionStats(),
        loadRecentAiDecisions(),
      ]);

      const defaultCampaignId = activeCampaignId || recentAiDecisions[0]?.campaignId || recentOperations[0]?.campaignId || null;
      if (defaultCampaignId) {
        setActiveCampaignId(defaultCampaignId);
        setCampaignInput(defaultCampaignId);
        await loadROIData(defaultCampaignId);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh auto optimization data');
    }
  }, [activeCampaignId, loadAiConfig, loadAiDecisionStats, loadPredefinedRules, loadPendingApprovals, loadROIData, loadRecentAiDecisions, loadRecentOperations, loadOperationStats, recentAiDecisions, recentOperations]);

  useEffect(() => {
    void refreshAll();
  }, [refreshAll]);

  const handleRunAiNow = useCallback(async () => {
    try {
      setError(null);
      await withLoading('ai-run', async () => {
        await autoOptFetch('/ai-operations/run-now', {
          method: 'POST',
          body: JSON.stringify({
            campaignId: activeCampaignId || undefined,
            window: '24h',
            limit: 20,
          }),
        });
      });
      await Promise.all([loadRecentAiDecisions(), loadAiDecisionStats(), loadRecentOperations(), loadOperationStats()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run AI optimization');
    }
  }, [activeCampaignId, autoOptFetch, loadAiDecisionStats, loadRecentAiDecisions, loadRecentOperations, loadOperationStats, withLoading]);

  const handleRollback = useCallback(async (decisionId: string) => {
    try {
      setError(null);
      await autoOptFetch(`/ai-operations/${decisionId}/rollback`, { method: 'POST' });
      await Promise.all([loadRecentAiDecisions(), loadAiDecisionStats(), loadRecentOperations(), loadOperationStats()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to rollback AI decision');
    }
  }, [autoOptFetch, loadAiDecisionStats, loadRecentAiDecisions, loadRecentOperations, loadOperationStats]);

  const handleLoadCampaign = useCallback(async () => {
    const campaignId = campaignInput.trim();
    if (!campaignId) {
      setError('Please enter a campaign ID');
      return;
    }
    setActiveCampaignId(campaignId);
    await loadROIData(campaignId);
  }, [campaignInput, loadROIData]);

  const tabs = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'ai', label: 'AI Decisions', icon: Brain },
    { id: 'operations', label: 'Operations', icon: Activity },
    { id: 'rules', label: 'Rules', icon: ListChecks },
    { id: 'approvals', label: 'Approvals', icon: Shield },
  ] as const, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">AI Optimization Center</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Automated campaign, zone, and publisher optimization with safety gating, execution logs, and rollback.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => void refreshAll()}
            className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <RefreshCw className={cn('h-4 w-4', loading['ai-run'] && 'animate-spin')} />
            Refresh
          </button>
          <button
            onClick={() => void handleRunAiNow()}
            className="flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-purple-700"
          >
            <Brain className={cn('h-4 w-4', loading['ai-run'] && 'animate-pulse')} />
            Run AI Now
          </button>
          <Link
            to="/settings"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
        </div>
      </div>

      {error ? (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          <span>{error}</span>
          <button onClick={() => setError(null)}><XCircle className="h-4 w-4" /></button>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-900">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              activeTab === tab.id
                ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300',
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricTile title="AI Decisions (7d)" value={aiDecisionStats?.total ?? 0} tone="brand" />
            <MetricTile title="Executed" value={aiDecisionStats?.executed ?? 0} tone="success" />
            <MetricTile title="Safety Blocked" value={aiDecisionStats?.blockedBySafety ?? 0} tone="warning" />
            <MetricTile title="Rollback Available" value={aiDecisionStats?.rollbackAvailable ?? 0} tone="default" />
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <MetricTile title="Total Operations" value={operationStats?.totalOperations ?? 0} />
            <MetricTile title="Execution Success" value={operationStats?.executedSuccessfully ?? 0} tone="success" />
            <MetricTile title="Execution Failed" value={operationStats?.executedFailed ?? 0} tone="danger" />
            <MetricTile title="Rolled Back" value={operationStats?.rolledBack ?? 0} tone="warning" />
          </div>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">ROI Snapshot</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Inspect a campaign window before running or reviewing AI automation.
                  </p>
                </div>
                <div className="flex w-full items-center gap-2 md:w-auto">
                  <input
                    value={campaignInput}
                    onChange={(event) => setCampaignInput(event.target.value)}
                    placeholder="Campaign ID"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 md:w-72"
                  />
                  <button
                    onClick={() => void handleLoadCampaign()}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                  >
                    Load
                  </button>
                </div>
              </div>

              {loading['roi'] ? (
                <div className="flex items-center justify-center py-10">
                  <RefreshCw className="h-6 w-6 animate-spin text-blue-600" />
                </div>
              ) : roiData ? (
                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <MetricTile title="ROI" value={`${(roiData.roi * 100).toFixed(1)}%`} tone={roiData.roi >= 0 ? 'success' : 'danger'} />
                  <MetricTile title="Revenue" value={`$${roiData.revenue.toFixed(2)}`} tone="success" />
                  <MetricTile title="Cost" value={`$${roiData.cost.toFixed(2)}`} tone="warning" />
                  <MetricTile title="Clicks / Conv" value={`${roiData.clicks} / ${roiData.conversions}`} />
                </div>
              ) : (
                <div className="mt-4 rounded-lg border border-dashed border-gray-200 px-4 py-8 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                  No ROI snapshot loaded yet.
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Engine Status</h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Runtime configuration for the AI optimization loop.
                  </p>
                </div>
                <Pill label={aiConfig?.enabled ? 'Enabled' : 'Disabled'} tone={aiConfig?.enabled ? 'success' : 'default'} />
              </div>
              <div className="mt-4 space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <div className="flex items-center justify-between"><span>Platform</span><span>{aiConfig?.platform || 'propellerads'}</span></div>
                <div className="flex items-center justify-between"><span>Primary trigger</span><span>{aiConfig?.primaryTrigger || 'scheduled'}</span></div>
                <div className="flex items-center justify-between"><span>Supplemental trigger</span><span>{aiConfig?.supplementalTrigger || 'conditional'}</span></div>
                <div className="flex items-center justify-between"><span>Default window</span><span>{aiConfig?.defaultTimeWindow || '24h'}</span></div>
                <div className="flex items-center justify-between"><span>Schedule</span><span>{aiConfig?.scheduleCron || '0 * * * *'}</span></div>
                <div className="flex items-center justify-between"><span>Route</span><span>{formatAiEngineRoute(aiConfig)}</span></div>
                <div className="flex items-center justify-between"><span>Model</span><span>{aiConfig?.model || 'heuristic-fallback'}</span></div>
                <div className="flex items-center justify-between"><span>Fallback</span><span>{aiConfig?.fallbackProvider || 'heuristic-fallback'}</span></div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Recent AI Decisions</h2>
              <button onClick={() => setActiveTab('ai')} className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400">
                Open AI history
              </button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {recentAiDecisions.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Brain className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                  <p>No AI decisions yet</p>
                </div>
              ) : recentAiDecisions.slice(0, 5).map((decision) => (
                <AiDecisionRow key={decision.id} decision={decision} onRollback={handleRollback} />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeTab === 'ai' ? (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 dark:border-gray-700">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">AI Decision History</h2>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Decisions, execution outcomes, and rollback readiness.</p>
            </div>
            <button onClick={() => void handleRunAiNow()} className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700">
              Run Now
            </button>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {recentAiDecisions.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Brain className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                <p>No AI decisions yet</p>
              </div>
            ) : recentAiDecisions.map((decision) => (
              <AiDecisionRow key={decision.id} decision={decision} onRollback={handleRollback} />
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === 'operations' ? (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Operation Audit</h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">{recentOperations.length} recent records</span>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {recentOperations.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Activity className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                <p>No auto operations yet</p>
              </div>
            ) : recentOperations.map((operation) => <OperationRow key={operation.id} operation={operation} />)}
          </div>
        </div>
      ) : null}

      {activeTab === 'rules' ? (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Predefined Rules</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Baseline rules that still coexist with AI-driven optimization.</p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {predefinedRules.map((rule) => (
              <div key={rule.id} className="flex items-center gap-4 px-4 py-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">{rule.name}</span>
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-300">{rule.ruleCode}</code>
                    {rule.isSystemRule ? <Pill label="System" tone="default" /> : null}
                  </div>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{rule.description}</p>
                </div>
                <Pill label={rule.enabled ? 'Enabled' : 'Disabled'} tone={rule.enabled ? 'success' : 'default'} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {activeTab === 'approvals' ? (
        <div className="rounded-xl border border-gray-100 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 overflow-hidden">
          <div className="border-b border-gray-100 px-4 py-4 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Approval Queue</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Reserved for optional future human-approval workflows.</p>
          </div>
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {pendingApprovals.length === 0 ? (
              <>
                <Shield className="mx-auto mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
                <p>No pending approvals</p>
              </>
            ) : (
              <p>{pendingApprovals.length} approvals waiting</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OperationRow({ operation }: { operation: AutoOperationRecord }) {
  return (
    <div className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/20">
      <Pill label={operation.actionType} tone={mapActionTone(operation.actionType)} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-gray-900 dark:text-white">
          Campaign {operation.campaignId}
          {operation.zoneId ? ` | Zone ${operation.zoneId}` : ''}
        </div>
        <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {operation.decisionContext.triggerReason || operation.ruleName || 'No trigger reason'}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Pill label={operation.approvalStatus} tone={operation.approvalStatus === 'auto_approved' || operation.approvalStatus === 'executed' ? 'success' : 'default'} />
        <Pill label={operation.executionStatus} tone={operation.executionStatus === 'success' ? 'success' : operation.executionStatus === 'failed' ? 'danger' : 'default'} />
      </div>
      <span className="shrink-0 text-xs text-gray-400 dark:text-gray-500">
        {new Date(operation.createdAt).toLocaleString()}
      </span>
    </div>
  );
}

function AiDecisionRow({
  decision,
  onRollback,
}: {
  decision: AiDecisionRecord;
  onRollback: (decisionId: string) => void;
}) {
  return (
    <div className="space-y-3 px-4 py-4 hover:bg-gray-50 dark:hover:bg-gray-900/20">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Pill label={decision.actionType} tone={mapActionTone(decision.actionType)} />
            <Pill label={decision.status} tone={mapDecisionTone(decision.status)} />
            <Pill label={`confidence ${(decision.confidence * 100).toFixed(0)}%`} tone="brand" />
            <Pill label={formatAiDecisionSourceLabel(decision)} tone={decision.provider === 'heuristic-fallback' ? 'warning' : 'default'} />
          </div>
          <div className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Campaign {decision.campaignId} | {decision.scopeType} {decision.scopeId}
          </div>
          <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">{decision.reason}</div>
          <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {formatAiFallbackLabel(decision)}
            {decision.model ? ` | Model ${decision.model}` : ''}
          </div>
          {decision.executionError ? (
            <div className="mt-2 text-xs text-red-600 dark:text-red-300">Execution error: {decision.executionError}</div>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2">
            {decision.evidence.slice(0, 4).map((item, index) => (
              <span key={`${item.label}-${index}`} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-gray-700 dark:text-gray-200">
                {item.label}: {item.value}
              </span>
            ))}
          </div>
          {decision.expectedImpact?.note ? (
            <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              Expected impact: {decision.expectedImpact.note}
            </div>
          ) : null}
        </div>
        <div className="flex shrink-0 flex-col items-start gap-2 lg:items-end">
          <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(decision.createdAt).toLocaleString()}</span>
          {decision.rollbackStatus === 'available' ? (
            <button
              onClick={() => onRollback(decision.id)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Rollback
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default AutoOptimizationCenter;
