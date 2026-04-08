/**
 * @fileoverview 自动化优化监控中心
 * @description Phase 1 核心前端页面 - ROI监控、规则状态、审批工作流、操作审计
 * @module pages/AutoOptimizationCenter
 *
 * 功能模块:
 * 1. ROI实时监控 - 多Campaign ROI趋势、异常检测告警
 * 2. 规则状态仪表板 - 6条预定义规则的启用/触发统计
 * 3. 审批工作流 - Block/Pause操作的待审批列表和操作界面
 * 4. 操作审计日志 - 最近自动化操作的历史记录
 * 5. 系统健康度 - 安全阀状态、信任评分、成本追踪
 */

import { useState, useCallback, useEffect, useMemo } from 'react';
import {
  Shield, Brain, AlertTriangle, CheckCircle2, XCircle,
  Clock, TrendingUp, TrendingDown, Activity, Eye,
  Check, X, RefreshCw, Settings, BarChart3, ListChecks,
  Zap, Pause, Play, ArrowRight, Info, ChevronDown, ChevronUp
} from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Link } from 'react-router-dom';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ============================================
// 类型定义
// ============================================

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
  rejectionReason?: string;
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
  isSystemRule: boolean;
}

interface OperationStats {
  totalOperations: number;
  executedSuccessfully: number;
  executedFailed: number;
  pendingApproval: number;
  rolledBack: number;
}

// ============================================
// 子组件: ROI卡片
// ============================================

function ROICard({
  title,
  value,
  change,
  icon: Icon,
  format = 'percent',
  positiveIsGood = true,
}: {
  title: string;
  value: number;
  change?: number;
  icon: React.ElementType;
  format?: 'percent' | 'currency' | 'number' | 'decimal';
  positiveIsGood?: boolean;
}) {
  const isPositive = (change ?? 0) >= 0;
  const isGood = positiveIsGood ? isPositive : !isPositive;

  const formatValue = (v: number) => {
    switch (format) {
      case 'percent': return `${(v * 100).toFixed(1)}%`;
      case 'currency': return `$${v.toFixed(2)}`;
      case 'decimal': return v.toFixed(2);
      default: return v.toLocaleString();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{title}</span>
        <div className={cn(
          "p-2 rounded-lg",
          isGood ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"
        )}>
          <Icon className={cn(
            "w-5 h-5",
            isGood ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
          )} />
        </div>
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
        {formatValue(value)}
      </div>
      {change !== undefined && (
        <div className={cn(
          "flex items-center gap-1 text-sm",
          isGood ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
        )}>
          {isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          <span>{Math.abs(change).toFixed(1)}%</span>
          <span className="text-gray-400">vs 上周期</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// 子组件: 审批操作卡片
// ============================================

function ApprovalCard({
  item,
  onApprove,
  onReject,
}: {
  item: ApprovalRequestItem;
  onApprove: (requestId: string) => void;
  onReject: (requestId: string, reason: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionForm, setShowRejectionForm] = useState(false);

  const ctx = item.operation.decisionContext;
  const timeUntilExpiry = useMemo(() => {
    const expiry = new Date(item.expiresAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    if (diff <= 0) return '已过期';
    const minutes = Math.floor(diff / 60000);
    if (minutes < 60) return `${minutes}分钟后过期`;
    const hours = Math.floor(minutes / 60);
    return `${hours}小时${minutes % 60}分后过期`;
  }, [item.expiresAt]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-amber-200 dark:border-amber-900/30 overflow-hidden">
      {/* 头部 */}
      <div className="p-4 bg-amber-50 dark:bg-amber-900/10 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <div className="font-semibold text-gray-900 dark:text-white">
              {item.operation.actionType} 操作待审批
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              Campaign ID: {item.operation.campaignId?.slice(0, 8)}...
              {item.operation.zoneId && ` | Zone: ${item.operation.zoneId.slice(0, 8)}...`}
              {item.operation.ruleName && ` | 规则: ${item.operation.ruleName}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            "text-xs px-2 py-1 rounded-full font-medium",
            timeUntilExpiry === '已过期'
              ? "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300"
              : "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300"
          )}>
            <Clock className="w-3 h-3 inline mr-1" />
            {timeUntilExpiry}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 展开详情 */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4">
          {/* 决策上下文 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <MetricBadge label="ROI" value={`${(ctx.roi * 100).toFixed(1)}%`} negative={ctx.roi < 0} />
            <MetricBadge label="点击量" value={ctx.clicks.toLocaleString()} />
            <MetricBadge label="转化数" value={ctx.conversions.toLocaleString()} />
            <MetricBadge label="置信度" value={`${(ctx.confidence * 100).toFixed(0)}%`} />
            <MetricBadge label="花费" value={`$${ctx.cost.toFixed(2)}`} />
            <MetricBadge label="收入" value={`$${ctx.revenue.toFixed(2)}`} />
            <MetricBadge label="EPC" value={`$${ctx.epc.toFixed(3)}`} />
            <MetricBadge label="CPC" value={`$${ctx.cpc.toFixed(3)}`} />
          </div>

          {/* 触发原因 */}
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">触发原因</div>
            <div className="text-sm text-gray-700 dark:text-gray-300">{ctx.triggerReason}</div>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => onApprove(item.requestId)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
            >
              <Check className="w-4 h-4" /> 批准执行
            </button>

            {!showRejectionForm ? (
              <button
                onClick={() => setShowRejectionForm(true)}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg font-medium transition-colors"
              >
                <X className="w-4 h-4" /> 拒绝
              </button>
            ) : (
              <div className="flex-1 space-y-2">
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="请输入拒绝原因..."
                  className="w-full px-3 py-2 text-sm border border-red-200 dark:border-red-800 rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (rejectionReason.trim()) {
                        onReject(item.requestId, rejectionReason);
                      }
                    }}
                    disabled={!rejectionReason.trim()}
                    className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    确认拒绝
                  </button>
                  <button
                    onClick={() => { setShowRejectionForm(false); setRejectionReason(''); }}
                    className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-lg text-sm transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function MetricBadge({ label, value, negative }: { label: string; value: string; negative?: boolean }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-100 dark:border-gray-700">
      <div className="text-xs text-gray-500 dark:text-gray-400">{label}</div>
      <div className={cn(
        "text-sm font-semibold",
        negative ? "text-red-600 dark:text-red-400" : "text-gray-900 dark:text-white"
      )}>{value}</div>
    </div>
  );
}

// ============================================
// 主页面组件
// ============================================

export function AutoOptimizationCenter() {
  // 状态管理
  const [activeTab, setActiveTab] = useState<'dashboard' | 'approvals' | 'rules' | 'audit'>('dashboard');
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);

  // 数据状态
  const [roiData, setRoiData] = useState<ROIMetrics | null>(null);
  const [campaignInput, setCampaignInput] = useState('');
  const [activeCampaignId, setActiveCampaignId] = useState<string | null>(null);
  const [pendingApprovals, setPendingApprovals] = useState<ApprovalRequestItem[]>([]);
  const [predefinedRules, setPredefinedRules] = useState<PredefinedRule[]>([]);
  const [recentOperations, setRecentOperations] = useState<AutoOperationRecord[]>([]);
  const [operationStats, setOperationStats] = useState<OperationStats | null>(null);

  // API基础路径
  const apiBase = '/api/auto-optimization';
  const apiOrigin = import.meta.env.VITE_API_URL || '';

  const autoOptFetch = useCallback(async (path: string, init: RequestInit = {}) => {
    const token = typeof window !== 'undefined' ? window.localStorage.getItem('token') : null;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((init.headers as Record<string, string>) || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${apiOrigin}${apiBase}${path}`, {
      ...init,
      headers,
    });

    const payload = await response.json().catch(() => ({} as Record<string, unknown>));
    if (!response.ok) {
      throw new Error(
        String(
          payload.error ||
          payload.message ||
          `Request failed: ${response.status}`
        )
      );
    }

    return payload as Record<string, any>;
  }, [apiBase, apiOrigin]);

  // 数据加载函数
  const loadROIData = useCallback(async (campaignId?: string) => {
    const key = 'roi';
    try {
      setLoading(prev => ({ ...prev, [key]: true }));
      const url = campaignId
        ? `/roi/${campaignId}?window=24h`
        : null;

      if (!url) return;

      const json = await autoOptFetch(url);
      if (json.success) {
        setRoiData(json.data.metrics);
      }
    } catch (err) {
      console.error('[AutoOpt] Failed to load ROI:', err);
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  }, [autoOptFetch]);

  const loadPendingApprovals = useCallback(async (): Promise<ApprovalRequestItem[]> => {
    const key = 'approvals';
    try {
      setLoading(prev => ({ ...prev, [key]: true }));
      const json = await autoOptFetch('/approvals/pending');
      if (json.success) {
        const normalized: ApprovalRequestItem[] = (json.data || []).map((item: any) => {
          const operation = item.operation ? item.operation : item;
          return {
            id: item.id || item.requestId || item.operationId || operation.id,
            operationId: item.operationId || operation.id,
            requestId: item.requestId || item.id,
            expiresAt: item.expiresAt || '',
            operation,
          };
        });
        setPendingApprovals(normalized);
        return normalized;
      }
      return [];
    } catch (err) {
      console.error('[AutoOpt] Failed to load approvals:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  }, [autoOptFetch]);

  const loadRules = useCallback(async () => {
    const key = 'rules';
    try {
      setLoading(prev => ({ ...prev, [key]: true }));
      const json = await autoOptFetch('/rules/predefined');
      if (json.success) {
        setPredefinedRules(json.data || []);
      }
    } catch (err) {
      console.error('[AutoOpt] Failed to load rules:', err);
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  }, [autoOptFetch]);

  const loadRecentOps = useCallback(async (): Promise<AutoOperationRecord[]> => {
    const key = 'ops';
    try {
      setLoading(prev => ({ ...prev, [key]: true }));
      const json = await autoOptFetch('/operations/recent?limit=20');
      if (json.success) {
        const operations = json.data || [];
        setRecentOperations(operations);
        return operations;
      }
      return [];
    } catch (err) {
      console.error('[AutoOpt] Failed to load operations:', err);
      return [];
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  }, [autoOptFetch]);

  const loadStats = useCallback(async () => {
    const key = 'stats';
    try {
      setLoading(prev => ({ ...prev, [key]: true }));
      const json = await autoOptFetch('/operations/stats?days=7');
      if (json.success) {
        setOperationStats(json.data);
      }
    } catch (err) {
      console.error('[AutoOpt] Failed to load stats:', err);
    } finally {
      setLoading(prev => ({ ...prev, [key]: false }));
    }
  }, [autoOptFetch]);

  const refreshAllData = useCallback(async () => {
    const [approvals, ops] = await Promise.all([
      loadPendingApprovals(),
      loadRecentOps(),
      loadRules(),
      loadStats(),
    ]);

    const defaultCampaignId =
      approvals[0]?.operation?.campaignId ||
      ops[0]?.campaignId ||
      activeCampaignId ||
      null;

    if (defaultCampaignId) {
      setActiveCampaignId(defaultCampaignId);
      setCampaignInput(defaultCampaignId);
      await loadROIData(defaultCampaignId);
    }
  }, [activeCampaignId, loadPendingApprovals, loadRecentOps, loadROIData, loadRules, loadStats]);

  // 操作处理函数
  const handleApprove = async (requestId: string) => {
    try {
      const json = await autoOptFetch(`/approvals/${requestId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ reviewerId: 'current-user' }),
      });
      if (json.success) {
        setPendingApprovals(prev => prev.filter(p => p.requestId !== requestId));
        loadRecentOps();
        loadStats();
      }
    } catch (err) {
      console.error('[AutoOpt] Approve failed:', err);
      setError('批准操作失败，请重试');
    }
  };

  const handleReject = async (requestId: string, reason: string) => {
    try {
      const json = await autoOptFetch(`/approvals/${requestId}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reviewerId: 'current-user', reason }),
      });
      if (json.success) {
        setPendingApprovals(prev => prev.filter(p => p.requestId !== requestId));
        loadRecentOps();
        loadStats();
      }
    } catch (err) {
      console.error('[AutoOpt] Reject failed:', err);
      setError('拒绝操作失败，请重试');
    }
  };

  // 初始化加载数据
  useEffect(() => {
    void refreshAllData();
  }, [refreshAllData]);

  // Tab配置
  const tabs = [
    { id: 'dashboard', label: '监控中心', icon: BarChart3, count: pendingApprovals.length },
    { id: 'approvals', label: '待审批', icon: Shield, count: pendingApprovals.length },
    { id: 'rules', label: '规则管理', icon: ListChecks },
    { id: 'audit', label: '操作日志', icon: Activity },
  ] as const;

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">自动化优化中心</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Phase 1: 规则引擎 · 安全阀体系 · 审批工作流
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              void refreshAllData();
            }}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <RefreshCw className={cn("w-4 h-4", loading['refresh'] && "animate-spin")} />
            刷新数据
          </button>
          <Link
            to="/settings"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <Settings className="w-4 h-4" />
            配置安全阀
          </Link>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center justify-between">
          <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tab导航 */}
      <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-900 p-1 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all relative",
              activeTab === tab.id
                ? "bg-white dark:bg-gray-800 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.count > 0 && activeTab !== tab.id && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab内容 */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* 统计卡片区 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ROICard title="总操作数" value={operationStats?.totalOperations ?? 0} icon={Activity} format="number" />
            <ROICard
              title="成功执行"
              value={operationStats?.executedSuccessfully ?? 0}
              icon={CheckCircle2}
              format="number"
              positiveIsGood={true}
            />
            <ROICard
              title="失败操作"
              value={operationStats?.executedFailed ?? 0}
              icon={XCircle}
              format="number"
              positiveIsGood={false}
            />
            <ROICard
              title="已回滚"
              value={operationStats?.rolledBack ?? 0}
              icon={Activity}
              format="number"
              positiveIsGood={false}
            />
          </div>

          {/* ROI监控 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">ROI 实时监控</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {activeCampaignId ? `当前 Campaign: ${activeCampaignId}` : '请输入 Campaign ID 加载 ROI 数据'}
                </p>
              </div>
              <div className="flex items-center gap-2 w-full md:w-auto">
                <input
                  value={campaignInput}
                  onChange={(e) => setCampaignInput(e.target.value)}
                  placeholder="输入 Campaign ID"
                  className="w-full md:w-80 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-sm text-gray-700 dark:text-gray-300"
                />
                <button
                  onClick={() => {
                    const campaignId = campaignInput.trim();
                    if (!campaignId) {
                      setError('请输入 Campaign ID 后再加载 ROI');
                      return;
                    }
                    setActiveCampaignId(campaignId);
                    void loadROIData(campaignId);
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors whitespace-nowrap"
                >
                  加载ROI
                </button>
              </div>
            </div>

            {loading['roi'] ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
              </div>
            ) : roiData ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <ROICard title="ROI" value={roiData.roi} icon={TrendingUp} format="percent" />
                <ROICard title="收入" value={roiData.revenue} icon={BarChart3} format="currency" />
                <ROICard title="花费" value={roiData.cost} icon={TrendingDown} format="currency" positiveIsGood={false} />
                <ROICard title="利润" value={roiData.profit} icon={Activity} format="currency" />
              </div>
            ) : (
              <div className="text-sm text-gray-500 dark:text-gray-400 py-4">
                暂无 ROI 数据，请输入 Campaign ID 加载，或等待系统自动识别最近活跃 Campaign。
              </div>
            )}
          </div>

          {/* 规则状态概览 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">预定义规则状态</h2>
              <Link to="/auto-optimization/rules" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1">
                管理规则 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {predefinedRules.map(rule => (
                <div
                  key={rule.id}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                    rule.enabled
                      ? "border-green-200 dark:border-green-800/30 bg-green-50/50 dark:bg-green-900/10"
                      : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/30 opacity-60"
                  )}
                >
                  <div className={cn(
                    "p-1.5 rounded-md",
                    rule.enabled ? "bg-green-100 dark:bg-green-900/30" : "bg-gray-100 dark:bg-gray-800"
                  )}>
                    {rule.ruleType === 'performance' && <Zap className="w-4 h-4 text-green-600 dark:text-green-400" />}
                    {rule.ruleType === 'time' && <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />}
                    {rule.ruleType === 'fraud' && <Shield className="w-4 h-4 text-purple-600 dark:text-purple-400" />}
                    {rule.ruleType === 'budget' && <BarChart3 className="w-4 h-4 text-orange-600 dark:text-orange-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm text-gray-900 dark:text-white truncate">{rule.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{rule.description}</div>
                  </div>
                  <div className={cn(
                    "w-2.5 h-2.5 rounded-full",
                    rule.enabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                  )} />
                </div>
              ))}
            </div>
          </div>

          {/* 最近操作 */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">最近自动化操作</h2>
              <Link to="/auto-optimization/audit" className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1">
                查看全部 <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
              {recentOperations.length === 0 ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300 dark:text-gray-600" />
                  <p>暂无自动化操作记录</p>
                  <p className="text-sm mt-1">启用规则后，系统将自动生成操作</p>
                </div>
              ) : (
                recentOperations.slice(0, 5).map(op => (
                  <OperationRow key={op.id} operation={op} />
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'approvals' && (
        <div className="space-y-4">
          {loading['approvals'] ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : pendingApprovals.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-12 text-center border border-gray-100 dark:border-gray-700">
              <CheckCircle2 className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">没有待审批的操作</h3>
              <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                所有自动化操作都已处理完毕。当规则触发需要审批的操作时，它们会出现在这里。
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  共 {pendingApprovals.length} 个待审批操作
                </span>
              </div>
              {pendingApprovals.map(item => (
                <ApprovalCard
                  key={item.requestId}
                  item={item}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))}
            </>
          )}
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">预定义自动规则</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              这些是系统预置的硬规则，可在具体Campaign中单独启用或禁用
            </p>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-gray-700/50">
            {predefinedRules.map(rule => (
              <div key={rule.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
                <div className={cn(
                  "p-2.5 rounded-lg",
                  rule.ruleType === 'performance' && "bg-blue-50 dark:bg-blue-900/20",
                  rule.ruleType === 'time' && "bg-indigo-50 dark:bg-indigo-900/20",
                  rule.ruleType === 'fraud' && "bg-purple-50 dark:bg-purple-900/20",
                  rule.ruleType === 'budget' && "bg-orange-50 dark:bg-orange-900/20",
                )}>
                  {rule.ruleType === 'performance' && <Zap className="w-5 h-5 text-blue-600 dark:text-blue-400" />}
                  {rule.ruleType === 'time' && <Clock className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
                  {rule.ruleType === 'fraud' && <Shield className="w-5 h-5 text-purple-600 dark:text-purple-400" />}
                  {rule.ruleType === 'budget' && <BarChart3 className="w-5 h-5 text-orange-600 dark:text-orange-400" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 dark:text-white">{rule.name}</span>
                    <code className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-600 dark:text-gray-400">
                      {rule.ruleCode}
                    </code>
                    {rule.isSystemRule && (
                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-gray-500 dark:text-gray-400">
                        系统
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{rule.description}</p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 dark:text-gray-500">
                    <span>优先级: {rule.priority}</span>
                    <span>类型: {rule.ruleType}</span>
                  </div>
                </div>
                <div className={cn(
                  "shrink-0 w-12 h-6 rounded-full p-0.5 cursor-pointer transition-colors",
                  rule.enabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                )}>
                  <div className={cn(
                    "w-5 h-5 bg-white rounded-full shadow transform transition-transform",
                    rule.enabled ? "translate-x-6" : "translate-x-0"
                  )} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
          <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">操作审计日志</h2>
            <select className="text-sm border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300">
              <option>最近7天</option>
              <option>最近30天</option>
              <option>全部</option>
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/50">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">时间</th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">操作</th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">目标</th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">规则</th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">审批</th>
                  <th className="text-left px-4 py-3 text-gray-500 dark:text-gray-400 font-medium">执行</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-700/50">
                {recentOperations.map(op => (
                  <tr key={op.id} className="hover:bg-gray-50 dark:hover:bg-gray-900/30">
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 whitespace-nowrap">
                      {new Date(op.createdAt).toLocaleString('zh-CN')}
                    </td>
                    <td className="px-4 py-3">
                      <ActionBadge type={op.actionType} />
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400 max-w-[120px] truncate">
                      {op.campaignId?.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
                      {op.ruleName || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={op.approvalStatus} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={op.executionStatus} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// 辅助组件
// ============================================

function ActionBadge({ type }: { type: string }) {
  const config: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
    BLOCK: { color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/30', icon: Pause, label: '阻断' },
    PAUSE: { color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30', icon: Pause, label: '暂停' },
    UNBLOCK: { color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/30', icon: Play, label: '恢复' },
    RESUME: { color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/30', icon: Play, label: '恢复' },
    ADJUST_BID: { color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/30', icon: TrendingUp, label: '调价' },
    ALERT: { color: 'text-purple-700 dark:text-purple-300', bg: 'bg-purple-100 dark:bg-purple-900/30', icon: AlertTriangle, label: '告警' },
    BUDGET_REALLOC: { color: 'text-cyan-700 dark:text-cyan-300', bg: 'bg-cyan-100 dark:bg-cyan-900/30', icon: BarChart3, label: '预算调整' },
    PROTECT: { color: 'text-gray-700 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-700', icon: Shield, label: '保护' },
  };

  const cfg = config[type] || config.ALERT;
  const Icon = cfg.icon;

  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium", cfg.bg, cfg.color)}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { color: string; bg: string }> = {
    pending: { color: 'text-amber-700 dark:text-amber-300', bg: 'bg-amber-100 dark:bg-amber-900/30' },
    approved: { color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/30' },
    rejected: { color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/30' },
    auto_approved: { color: 'text-green-700 dark:text-green-300', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
    expired: { color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-100 dark:bg-gray-700' },
    executed: { color: 'text-blue-700 dark:text-blue-300', bg: 'bg-blue-100 dark:bg-blue-900/30' },
    success: { color: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-900/30' },
    failed: { color: 'text-red-700 dark:text-red-300', bg: 'bg-red-100 dark:bg-red-900/30' },
    rolled_back: { color: 'text-orange-700 dark:text-orange-300', bg: 'bg-orange-100 dark:bg-orange-900/30' },
  };

  const cfg = config[status] || { color: 'text-gray-500', bg: 'bg-gray-100 dark:bg-gray-700' };
  const labels: Record<string, string> = {
    pending: '待审批', approved: '已批准', rejected: '已拒绝', auto_approved: '自动批准',
    expired: '已过期', executed: '已执行', success: '成功', failed: '失败', rolled_back: '已回滚',
  };

  return (
    <span className={cn("inline-flex items-center px-2 py-1 rounded-full text-xs font-medium", cfg.bg, cfg.color)}>
      {labels[status] || status}
    </span>
  );
}

function OperationRow({ operation }: { operation: AutoOperationRecord }) {
  const ctx = operation.decisionContext;

  return (
    <div className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-900/30 transition-colors">
      <ActionBadge type={operation.actionType} />
      <div className="flex-1 min-w-0">
        <div className="text-sm text-gray-900 dark:text-white truncate">
          Campaign: {operation.campaignId?.slice(0, 12)}...
          {operation.zoneId && ` | Zone: ${operation.zoneId.slice(0, 8)}...`}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {ctx.triggerReason || operation.ruleName}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <StatusBadge status={operation.approvalStatus} />
        <StatusBadge status={operation.executionStatus} />
      </div>
      <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
        {new Date(operation.createdAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </div>
  );
}

export default AutoOptimizationCenter;
