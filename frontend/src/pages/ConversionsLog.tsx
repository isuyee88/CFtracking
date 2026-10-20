/**
 * File: ConversionsLog.tsx
 * Purpose: 杞寲鏃ュ織椤甸潰锛屽睍绀烘墍鏈夎浆鍖栬褰曞拰瀹屾暣鐨勮浆鍖栦俊鎭?
 * Input/Output: 鏄剧ず杞寲鏁版嵁鍒楄〃锛屾敮鎸佹悳绱€佺瓫閫夊拰璇︽儏灞曞紑
 * Logic: 灞曠ず杞寲浜嬩欢鐨勮缁嗕俊鎭紝鍖呮嫭鏀剁泭銆佺姸鎬併€佽瀹俊鎭瓑
 */

import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  CheckCircle2,
  Search,
  Filter,
  MoreHorizontal,
  Globe,
  Clock,
  Monitor,
  Smartphone,
  ExternalLink,
  RefreshCw,
  Download,
  DollarSign,
  TrendingUp,
  ChevronDown,
  ChevronRight,
  Eye,
  Hash,
  Cpu,
  Shield,
  Fingerprint,
  Navigation,
  Wallet,
  CreditCard,
  Calendar,
  User,
  Building2,
  Layers,
  Group,
  AlertCircle
} from 'lucide-react';
import { QuickDateRangePicker, type DateRangeValue, getDateRange } from '@/components/DateRangePicker';
import { GroupByFilter, filterByGroupBy } from '@/components/GroupByFilter';
import { ActiveFilterBar } from '@/components/ActiveFilterBar';
import type { GroupByState, GroupByOption } from '@/types/filter';
import { useDataCache } from '@/context/DataCacheContext';
import { fetchConversions, fetchConversionStats, type Conversion } from '../services/api';



// ConversionsLog 涓撶敤鐨?Group By 閫夐」
const CONVERSIONS_LOG_GROUP_BY_OPTIONS: GroupByOption[] = [
  { value: 'campaign', label: 'Campaign', category: 'Campaign & Traffic' },
  { value: 'stream', label: 'Stream', category: 'Campaign & Traffic' },
  { value: 'offer', label: 'Offer', category: 'Campaign & Traffic' },
  { value: 'affiliate_network', label: 'Affiliate Network', category: 'Campaign & Traffic' },
  { value: 'source', label: 'Traffic Source', category: 'Campaign & Traffic' },
  { value: 'status', label: 'Status', category: 'Financial' },
  { value: 'type', label: 'Conversion Type', category: 'Financial' },
  { value: 'currency', label: 'Currency', category: 'Financial' },
  { value: 'country', label: 'Country', category: 'Geo' },
  { value: 'region', label: 'Region/State', category: 'Geo' },
  { value: 'city', label: 'City', category: 'Geo' },
  { value: 'isp', label: 'ISP', category: 'Geo' },
  { value: 'device_type', label: 'Device Type', category: 'Device & System' },
  { value: 'os', label: 'Operating System', category: 'Device & System' },
  { value: 'browser', label: 'Browser', category: 'Device & System' },
];

export const ConversionsLog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedRows, setExpandedRows] = useState<string[]>([]);

  // 鏃ユ湡绛涢€?- 浣跨敤鏂扮殑鏃ユ湡閫夋嫨鍣?
  const [dateRange, setDateRange] = useState<string>('last7days');
  const [dateRangeValue, setDateRangeValue] = useState<DateRangeValue>(getDateRange('last7days'));

  // Group By 鐘舵€?- 浣跨敤鏂扮殑 GroupByState 鏁扮粍
  const [groupByStates, setGroupByStates] = useState<GroupByState[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // 澶勭悊鏃ユ湡鑼冨洿鍙樻洿
  const handleDateRangeChange = (preset: string, range?: DateRangeValue) => {
    setDateRange(preset);
    if (range) {
      setDateRangeValue(range);
    }
  };

  // 浣跨敤 useRef 瀛樺偍鏌ヨ鍙傛暟锛岄伩鍏嶄緷璧栧彉鍖栧鑷寸殑鏃犻檺寰幆
  const paramsRef = useRef({
    dateRangeValue,
    searchQuery,
    statusFilter,
  });

  // 鏇存柊 ref 鍊?
  paramsRef.current = {
    dateRangeValue,
    searchQuery,
    statusFilter,
  };

  // SSR鏁版嵁缂撳瓨
  const { cache: ssrCache, isHydrated } = useDataCache();

  // 鏈湴鐘舵€?
  const [conversions, setConversions] = useState<Conversion[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalPayout: 0,
    totalConversions: 0,
    approvedConversions: 0,
    pendingConversions: 0,
    rejectedConversions: 0,
  });
  const [loading, setLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 鍒濆鍔犺浇鏍囪
  const isInitialMount = useRef(true);

  // 鏁版嵁鑾峰彇鍑芥暟
  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setIsRefreshing(true);
    } else {
      setLoading(true);
    }
    setError(null);

    try {
      const { dateRangeValue: drv, searchQuery: sq, statusFilter: sf } = paramsRef.current;
      const startDate = drv?.startDate?.split('T')[0] || '';
      const endDate = drv?.endDate?.split('T')[0] || '';

      const [conversionsResult, statsResult] = await Promise.all([
        fetchConversions({
          startDate,
          endDate,
          search: sq || undefined,
          status: sf === 'all' ? undefined : sf,
        }),
        fetchConversionStats(startDate, endDate),
      ]);

      setConversions(conversionsResult.list || []);
      setStats(statsResult || {
        totalRevenue: 0,
        totalPayout: 0,
        totalConversions: 0,
        approvedConversions: 0,
        pendingConversions: 0,
        rejectedConversions: 0,
      });
    } catch (err) {
      console.error('[ConversionsLog] Fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  // 鍒濆鍔犺浇 - 浼樺厛浣跨敤 SSR 鏁版嵁
  useEffect(() => {
    if (!isHydrated) return;

    if (isInitialMount.current) {
      isInitialMount.current = false;

      // 浼樺厛浣跨敤 SSR 棰勫姞杞芥暟鎹?
      const ssrConversions = (ssrCache as any).conversions;
      const ssrStats = (ssrCache as any).conversionsStats;

      if (ssrConversions) {
        console.log('[ConversionsLog] Using SSR preloaded data');
        setConversions(ssrConversions.list || ssrConversions || []);
        setLoading(false);

        if (ssrStats) {
          setStats(ssrStats);
        }
        return;
      }

      // 娌℃湁 SSR 鏁版嵁锛屼粠 API 鑾峰彇
      console.log('[ConversionsLog] No SSR data, fetching from API');
      fetchData();
    }
  }, [isHydrated, ssrCache, fetchData]);

  // 鍙傛暟鍙樺寲鏃跺埛鏂版暟鎹?
  const prevParamsRef = useRef({ searchQuery: '', dateRange: '', statusFilter: 'all' });
  useEffect(() => {
    if (isInitialMount.current) return;

    const currentParams = {
      searchQuery,
      dateRange: `${dateRangeValue.startDate}-${dateRangeValue.endDate}`,
      statusFilter,
    };

    if (prevParamsRef.current.searchQuery !== currentParams.searchQuery ||
        prevParamsRef.current.dateRange !== currentParams.dateRange ||
        prevParamsRef.current.statusFilter !== currentParams.statusFilter) {
      prevParamsRef.current = currentParams;
      fetchData(true);
    }
  }, [searchQuery, dateRangeValue.startDate, dateRangeValue.endDate, statusFilter, fetchData]);

  // 瀹㈡埛绔瓫閫夛紙鎼滅储鍜岀姸鎬佺瓫閫夛級
  const filteredConversions = useMemo(() => {
    return (conversions || []).filter(conv => {
      const matchesSearch = conv.campaign.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           conv.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           conv.ip.includes(searchQuery) ||
                           conv.offer.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || conv.status.toLowerCase() === statusFilter.toLowerCase();
      return matchesSearch && matchesStatus;
    });
  }, [conversions, searchQuery, statusFilter]);

  // 缁熻鏁版嵁
  const totalRevenue = stats.totalRevenue || 0;
  const totalPayout = stats.totalPayout || 0;
  const totalConversions = stats.totalConversions || filteredConversions.length;
  const approvedConversions = stats.approvedConversions || filteredConversions.filter(c => c.status === 'Approved').length;
  const pendingConversions = stats.pendingConversions || filteredConversions.filter(c => c.status === 'Pending').length;
  const rejectedConversions = stats.rejectedConversions || filteredConversions.filter(c => c.status === 'Rejected').length;

  const toggleRow = (id: string) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  // 搴旂敤 Group By 绛涢€?
  const filteredWithGroupBy = useMemo(() => {
    return filterByGroupBy(filteredConversions, groupByStates);
  }, [filteredConversions, groupByStates]);

  // 楠ㄦ灦灞忔樉绀洪€昏緫锛氶娆″姞杞戒笖鏃犳暟鎹椂鏄剧ず
  const showSkeleton = loading && conversions.length === 0;

  if (showSkeleton) {
    return <ConversionsLogSkeleton />;
  }

  // 娓叉煋涓诲唴瀹癸紙鍗充娇鏈夐敊璇篃鏄剧ず锛屽彧鏄暟鎹负绌猴級
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      {/* 鍒锋柊鎸囩ず鍣?- 鍒锋柊鏃舵樉绀?*/}
      {isRefreshing && (
        <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-surface-container-high">
          <div className="h-full bg-primary animate-pulse" style={{ width: '60%' }}></div>
        </div>
      )}
      {/* Error Banner - 鏄剧ず閿欒浣嗕笉闃绘椤甸潰娓叉煋 */}
      {error && (
        <div className="bg-error/10 border border-error/20 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle size={20} className="text-error" />
            <div>
              <p className="font-medium text-error">Failed to load conversions</p>
              <p className="text-sm text-on-surface-variant">{error}</p>
            </div>
          </div>
          <button
            onClick={() => fetchData(true)}
            className="px-4 py-2 bg-surface border border-border-default rounded-md text-fg-default hover:bg-surface-container transition-colors flex items-center gap-2"
          >
            <RefreshCw size={16} /> Retry
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Conversions Log</h1>
          <p className="text-sm text-medium-contrast">Track all your conversion events, revenue, and postback status.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="p-2 text-on-surface-variant hover:text-primary hover:bg-surface-container transition-all rounded-sm"
            title="Refresh"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={() => alert('Export functionality coming soon!')}
            className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-primary text-xs font-bold uppercase tracking-widest hover:bg-secondary/90 transition-all rounded-sm"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-secondary/10 text-secondary rounded-sm">
              <CheckCircle2 size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Total Conversions</p>
              <p className="text-xl font-display font-bold text-primary">{totalConversions}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-sm">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Approved</p>
              <p className="text-xl font-display font-bold text-secondary">{approvedConversions}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-primary rounded-sm">
              <Wallet size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Total Revenue</p>
              <p className="text-xl font-display font-bold text-primary">${totalRevenue.toFixed(2)}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-4 whisper-shadow">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 text-amber-700 rounded-sm">
              <DollarSign size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">Total Payout</p>
              <p className="text-xl font-display font-bold text-secondary">${totalPayout.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="flex gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-on-surface-variant">Approved: {approvedConversions}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          <span className="text-on-surface-variant">Pending: {pendingConversions}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-error"></span>
          <span className="text-on-surface-variant">Rejected: {rejectedConversions}</span>
        </div>
      </div>

      {/* Filters Panel */}
      <div className="bg-surface-container-lowest p-4 whisper-shadow border border-outline-variant/10 space-y-4">
        {/* Row 1: Search, Date Range and Status */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[250px] max-w-md">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/40" />
            <input
              type="text"
              placeholder="Search by ID, Campaign, Offer, or IP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container border-none focus:ring-1 focus:ring-primary text-xs"
            />
          </div>

          {/* Date Range Selector - 浣跨敤鏂扮殑鏃ユ湡閫夋嫨鍣ㄧ粍浠?*/}
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-on-surface-variant" />
            <div className="w-[320px]">
              <QuickDateRangePicker
                value={dateRange}
                onChange={handleDateRangeChange}
                showTime={true}
                maxRangeDays={90}
              />
            </div>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-surface-container border border-outline-variant/30 text-xs font-bold uppercase tracking-widest focus:border-primary outline-none"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>

          {/* Toggle Filters Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border text-[10px] font-bold uppercase tracking-widest transition-all ${
              showFilters
                ? 'bg-primary text-on-primary border-primary'
                : 'border-outline-variant/30 text-on-surface-variant hover:bg-surface-container'
            }`}
          >
            <Filter size={14} />
            {showFilters ? 'Hide Filters' : 'More Filters'}
          </button>
        </div>

        {/* Row 2: Group By Filters */}
        {showFilters && (
          <div className="pt-4 border-t border-outline-variant/10">
            <GroupByFilter
              data={filteredConversions}
              groupByOptions={CONVERSIONS_LOG_GROUP_BY_OPTIONS}
              value={groupByStates}
              onChange={setGroupByStates}
              maxLevels={3}
            />
          </div>
        )}

        {/* Results Count */}
        <div className="flex items-center justify-between pt-2 border-t border-outline-variant/10">
          <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant/60">
            Showing {filteredConversions.length} conversions
          </span>
          <span className="text-[10px] text-on-surface-variant/40">
            Date Range: {dateRange === 'custom' ? 'Custom Range' : dateRange.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
          </span>
        </div>
      </div>

      <ActiveFilterBar
        className="px-1"
        items={[
          ...(searchQuery ? [{ key: 'search', label: `Search: ${searchQuery}`, onClear: () => setSearchQuery('') }] : []),
          ...(statusFilter !== 'all' ? [{ key: 'status', label: `Status: ${statusFilter}`, onClear: () => setStatusFilter('all') }] : []),
        ]}
        onClearAll={() => { setSearchQuery(''); setStatusFilter('all'); }}
      />

      {/* Mobile summary cards */}
      <div className="space-y-3 md:hidden">
        {filteredConversions.map((conv) => (
          <article key={conv.id} className="rounded-xl border border-outline-variant/20 bg-surface-container-lowest p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-primary">{conv.campaign}</p>
                <p className="mt-0.5 text-xs text-on-surface-variant">{conv.time} 路 {conv.type}</p>
              </div>
              <span className="shrink-0 font-mono text-sm font-bold text-secondary">${conv.payout}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className={cn(
                'rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest',
                conv.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : conv.status === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-error/10 text-error'
              )}>{conv.status}</span>
              <span className={cn(
                'rounded-sm px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest',
                conv.postbackStatus === 'Success' ? 'bg-emerald-100 text-emerald-700' : conv.postbackStatus === 'Pending' ? 'bg-amber-100 text-amber-700' : 'bg-error/10 text-error'
              )}>{conv.postbackStatus}</span>
              <span className="text-xs text-on-surface-variant">{conv.offer}</span>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-outline-variant/10 pt-2 text-[11px] text-on-surface-variant/70">
              <span className="truncate font-mono">{conv.id}</span>
              <button type="button" onClick={() => toggleRow(conv.id)} className="shrink-0 text-accent-fg">Details</button>
            </div>
          </article>
        ))}
        {filteredConversions.length === 0 && (
          <div className="rounded-xl border border-dashed border-outline-variant/30 p-8 text-center text-sm text-on-surface-variant">No conversions found</div>
        )}
      </div>

      {/* Conversions Table (desktop/tablet) */}
      <div className="hidden overflow-hidden border border-outline-variant/10 bg-surface-container-lowest whisper-shadow md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container-low border-b border-outline-variant/10">
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest"></th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Time</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">ID</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Campaign</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Offer</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Type</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Payout</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Status</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">Postback</th>
                <th className="px-4 py-3 text-[10px] font-bold text-on-surface-variant uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {filteredConversions.map((conv) => (
                <React.Fragment key={conv.id}>
                  <tr className="hover:bg-surface-container-low transition-colors group">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleRow(conv.id)}
                        className="p-1 text-on-surface-variant hover:text-primary transition-colors"
                      >
                        {expandedRows.includes(conv.id) ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2 text-[10px] font-mono text-on-surface-variant">
                        <Clock size={12} />
                        {conv.time}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[10px] font-mono text-on-surface-variant">{conv.id}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-bold text-primary hover:underline cursor-pointer">{conv.campaign}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-on-surface-variant">{conv.offer}</td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                        {conv.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-mono font-bold text-secondary">${conv.payout}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm",
                        conv.status === 'Approved' ? "bg-emerald-100 text-emerald-700" :
                        conv.status === 'Pending' ? "bg-amber-100 text-amber-700" :
                        "bg-error/10 text-error"
                      )}>
                        {conv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-sm",
                        conv.postbackStatus === 'Success' ? "bg-emerald-100 text-emerald-700" :
                        conv.postbackStatus === 'Pending' ? "bg-amber-100 text-amber-700" :
                        "bg-error/10 text-error"
                      )}>
                        {conv.postbackStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleRow(conv.id)}
                          className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"
                          title="View Details"
                        >
                          <Eye size={14} />
                        </button>
                        <button
                          onClick={() => alert(`More options for conversion ${conv.id}`)}
                          className="p-1.5 text-on-surface-variant hover:text-primary transition-colors"
                        >
                          <MoreHorizontal size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Expanded Details */}
                  {expandedRows.includes(conv.id) && (
                    <tr className="bg-surface-container-low/50">
                      <td colSpan={10} className="px-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                          {/* Financial Info */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                              <Wallet size={12} /> Financial Info
                            </h4>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Payout:</span>
                                <span className="font-mono font-bold text-secondary">${conv.payout}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Revenue:</span>
                                <span className="font-mono font-bold text-primary">${conv.revenue}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Currency:</span>
                                <span>{conv.currency}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Profit:</span>
                                <span className="font-mono font-bold text-emerald-600">
                                  ${(parseFloat(conv.revenue) - parseFloat(conv.payout)).toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Type:</span>
                                <span>{conv.type}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Status:</span>
                                <span className={conv.status === 'Approved' ? "text-emerald-600" : conv.status === 'Pending' ? "text-amber-600" : "text-error"}>
                                  {conv.status}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Campaign & Offer Info */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                              <Hash size={12} /> Campaign & Offer
                            </h4>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Campaign ID:</span>
                                <span className="font-mono">{conv.campaignId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Campaign:</span>
                                <span>{conv.campaign}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Stream:</span>
                                <span>{conv.stream}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Offer ID:</span>
                                <span className="font-mono">{conv.offerId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Offer:</span>
                                <span>{conv.offer}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Network:</span>
                                <span>{conv.affiliateNetwork}</span>
                              </div>
                            </div>
                          </div>

                          {/* Device & Location */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                              <Cpu size={12} /> Device & Location
                            </h4>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Device:</span>
                                <span>{conv.deviceType} - {conv.deviceModel}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Browser:</span>
                                <span>{conv.browser} {conv.browserVersion}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">OS:</span>
                                <span>{conv.os} {conv.osVersion}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Location:</span>
                                <span>{conv.country}, {conv.city}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">IP:</span>
                                <span className="font-mono">{conv.ip}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">ISP:</span>
                                <span>{conv.isp}</span>
                              </div>
                            </div>
                          </div>

                          {/* Postback Info */}
                          <div className="space-y-3">
                            <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                              <CreditCard size={12} /> Postback Info
                            </h4>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Click ID:</span>
                                <span className="font-mono">{conv.clickId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Transaction ID:</span>
                                <span className="font-mono">{conv.transactionId}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Postback Status:</span>
                                <span className={conv.postbackStatus === 'Success' ? "text-emerald-600" : conv.postbackStatus === 'Pending' ? "text-amber-600" : "text-error"}>
                                  {conv.postbackStatus}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-on-surface-variant/60">Postback Time:</span>
                                <span>{conv.postbackTime || 'N/A'}</span>
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className="text-on-surface-variant/60">Postback URL:</span>
                                <span className="font-mono text-[10px] truncate max-w-[200px]" title={conv.postbackUrl}>
                                  {conv.postbackUrl}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Sub IDs & Traffic Info */}
                        <div className="mt-4 pt-4 border-t border-outline-variant/10">
                          <h4 className="text-[10px] font-bold uppercase tracking-widest text-primary flex items-center gap-2 mb-3">
                            <Fingerprint size={12} /> Sub IDs & Traffic Info
                          </h4>
                          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 text-xs">
                            <div>
                              <span className="text-on-surface-variant/60 block">Sub ID 1:</span>
                              <span className="font-mono">{conv.subId || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-on-surface-variant/60 block">Sub ID 2:</span>
                              <span className="font-mono">{conv.subId2 || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-on-surface-variant/60 block">Sub ID 3:</span>
                              <span className="font-mono">{conv.subId3 || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-on-surface-variant/60 block">Sub ID 4:</span>
                              <span className="font-mono">{conv.subId4 || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-on-surface-variant/60 block">Sub ID 5:</span>
                              <span className="font-mono">{conv.subId5 || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-on-surface-variant/60 block">Visitor Code:</span>
                              <span className="font-mono">{conv.visitorCode}</span>
                            </div>
                            <div>
                              <span className="text-on-surface-variant/60 block">Creative ID:</span>
                              <span className="font-mono">{conv.creativeId}</span>
                            </div>
                            <div>
                              <span className="text-on-surface-variant/60 block">External ID:</span>
                              <span className="font-mono">{conv.externalId}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mt-3">
                            <div>
                              <span className="text-on-surface-variant/60">Keyword:</span>
                              <span className="ml-2 font-mono">{conv.keyword || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-on-surface-variant/60">Referrer:</span>
                              <span className="ml-2 font-mono truncate max-w-[300px] inline-block align-bottom" title={conv.referrer}>
                                {conv.referrer}
                              </span>
                            </div>
                            <div>
                              <span className="text-on-surface-variant/60">Source:</span>
                              <span className="ml-2">{conv.source}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============================================
// 楠ㄦ灦灞忕粍浠?
// ============================================

const ConversionsLogSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="h-8 bg-surface-hover rounded w-48 mb-2"></div>
          <div className="h-4 bg-surface-hover rounded w-72"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-10 bg-surface-hover rounded"></div>
          <div className="h-10 w-24 bg-surface-hover rounded"></div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-surface p-4 rounded-lg border border-border-default">
            <div className="h-4 bg-surface-hover rounded w-20 mb-2"></div>
            <div className="h-8 bg-surface-hover rounded w-24"></div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-surface p-4 rounded-lg border border-border-default space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="h-10 bg-surface-hover rounded"></div>
          </div>
          <div className="h-10 w-40 bg-surface-hover rounded"></div>
          <div className="h-10 w-32 bg-surface-hover rounded"></div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-lg border border-border-default overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="bg-surface-hover">
              {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map((i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-4 bg-surface-hover rounded w-16"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1,2,3,4,5].map((row) => (
              <tr key={row} className="border-t border-border-default">
                {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map((col) => (
                  <td key={col} className="px-4 py-3">
                    <div className="h-4 bg-surface-hover rounded w-full"></div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-border-default">
        <div className="h-4 bg-surface-hover rounded w-64"></div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-surface-hover rounded"></div>
          <div className="h-4 bg-surface-hover rounded w-20"></div>
          <div className="h-8 w-8 bg-surface-hover rounded"></div>
        </div>
      </div>
    </div>
  );
};

function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

export default ConversionsLog;
