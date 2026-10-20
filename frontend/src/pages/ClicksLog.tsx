/**
 * File: ClicksLog.tsx
 * Purpose: 鐐瑰嚮鏃ュ織椤甸潰锛屽睍绀烘墍鏈夌偣鍑昏褰?
 * Input/Output: 鏄剧ず鐐瑰嚮鏁版嵁鍒楄〃锛屾敮鎸佹悳绱€佺瓫閫夈€佸垎椤?
 * Logic: 浠庡悗绔疉PI鑾峰彇鐪熷疄鐐瑰嚮鏁版嵁锛屽睍绀虹偣鍑绘祦鐨勮缁嗕俊鎭?
 * 鍓嶅悗绔氦浜? 璋冪敤 /api/clicks 鍜?/api/clicks/stats 鎺ュ彛
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  History,
  Search,
  Filter,
  Globe,
  Clock,
  Monitor,
  Smartphone,
  RefreshCw,
  Download,
  MousePointer2,
  ChevronDown,
  ChevronRight,
  MapPin,
  Wifi,
  Bot,
  Shield,
  Eye,
  Calendar,
  Layers,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  AlertCircle,
} from 'lucide-react';
import { QuickDateRangePicker, type DateRangeValue, getDateRange } from '@/components/DateRangePicker';
import { GroupByFilter, DEFAULT_GROUP_BY_OPTIONS, filterByGroupBy } from '@/components/GroupByFilter';
import { ActiveFilterBar } from '@/components/ActiveFilterBar';
import { TableColumnSettings, useTableColumnLayout, type TableColumnItem } from '@/components/TableColumnSettings';
import { TablePagination } from '@/components/TablePagination';
import type { GroupByState, GroupByOption } from '@/types/filter';
import { fetchClicks, fetchClickStats, type ClickLogParams, type ClickStats } from '../services/api';
import { useDataCache } from '@/context/DataCacheContext';

// ============================================
// 绫诲瀷瀹氫箟
// ============================================

interface ClickLog {
  clickId: string;
  campaignId: string;
  flowId?: string;
  landingPageId?: string;
  offerId?: string;
  timestamp: string;
  ip: string;
  userAgent: string;
  referer?: string;
  country?: string;
  city?: string;
  device?: string;
  browser?: string;
  os?: string;
  isp?: string;
  connectionType?: string;
  visitorId: string;
  subId1?: string;
  subId2?: string;
  subId3?: string;
  cost?: number;
  isUnique?: number;
  redirectUrl?: string;
}

// ============================================
// 杈呭姪鍑芥暟
// ============================================

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

// ============================================
// 涓荤粍浠?
// ============================================

const CLICKS_LOG_GROUP_BY_OPTIONS: GroupByOption[] = [
  { value: 'campaignId', label: 'Campaign', category: 'Campaign & Traffic' },
  { value: 'country', label: 'Country', category: 'Geo' },
  { value: 'device', label: 'Device', category: 'Device & System' },
  { value: 'browser', label: 'Browser', category: 'Device & System' },
  { value: 'os', label: 'Operating System', category: 'Device & System' },
];

export const ClicksLog = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDateRange('last7days'));
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [groupByStates, setGroupByStates] = useState<GroupByState[]>([]);

  // 鍒嗛〉鐘舵€?
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0,
    totalPages: 1,
  });

  // 浣跨敤 useRef 瀛樺偍鏌ヨ鍙傛暟锛岄伩鍏嶄緷璧栧彉鍖栧鑷寸殑鏃犻檺寰幆
  const paramsRef = useRef({
    searchQuery,
    dateRange,
    statusFilter,
  });

  // 鏇存柊 ref 鍊?
  paramsRef.current = {
    searchQuery,
    dateRange,
    statusFilter,
  };

  // 浣跨敤绋冲畾鐨?fetcher 鍑芥暟锛屼笉渚濊禆澶栭儴鐘舵€?
  const fetchClicksData = useCallback(async () => {
    const { searchQuery: sq, dateRange: dr, statusFilter: sf } = paramsRef.current;
    return fetchClicks({
      page: 1,
      pageSize: 100,
      search: sq || undefined,
      startDate: dr.startDate.split('T')[0],
      endDate: dr.endDate.split('T')[0],
      isUnique: sf === 'unique' ? true : sf === 'nonunique' ? false : undefined,
    });
  }, []);

  // SSR鏁版嵁缂撳瓨
  const { cache: ssrCache, isHydrated } = useDataCache();

  // 鏈湴鐘舵€?
  const [clicksList, setClicksList] = useState<ClickLog[]>([]);
  const [stats, setStats] = useState<ClickStats>({
    totalClicks: 0,
    uniqueClicks: 0,
    countries: 0,
    deviceTypes: 0,
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
      const { dateRange: dr, searchQuery: sq, statusFilter: sf } = paramsRef.current;
      const startDate = dr?.startDate?.split('T')[0] || '';
      const endDate = dr?.endDate?.split('T')[0] || '';

      const [clicksResult, statsResult] = await Promise.all([
        fetchClicks({
          startDate,
          endDate,
          search: sq || undefined,
        }),
        fetchClickStats(startDate, endDate),
      ]);

      setClicksList(clicksResult.list || []);
      setStats(statsResult || {
        totalClicks: 0,
        uniqueClicks: 0,
        countries: 0,
        deviceTypes: 0,
      });
    } catch (err) {
      console.error('[ClicksLog] Fetch error:', err);
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
      const ssrClicks = (ssrCache as any).clicks;
      const ssrStats = (ssrCache as any).clicksStats;

      if (ssrClicks) {
        console.log('[ClicksLog] Using SSR preloaded data');
        const data = ssrClicks;
        let list: ClickLog[] = [];
        let meta = {};

        if (data.list && Array.isArray(data.list)) {
          list = data.list;
          meta = data.meta || {};
        } else if (Array.isArray(data)) {
          list = data;
        }

        setClicksList(list);
        setPagination(prev => ({
          ...prev,
          total: meta?.total || list.length,
          totalPages: meta?.totalPages || 1,
        }));

        if (ssrStats) {
          setStats(ssrStats);
        }
        return;
      }

      // 娌℃湁 SSR 鏁版嵁锛屼粠 API 鑾峰彇
      console.log('[ClicksLog] No SSR data, fetching from API');
      fetchData();
    }
  }, [isHydrated, ssrCache, fetchData]);

  // 鍙傛暟鍙樺寲鏃跺埛鏂版暟鎹?
  const prevParamsRef = useRef({ searchQuery: '', dateRange: '', statusFilter: 'all' });
  useEffect(() => {
    if (isInitialMount.current) return;

    const currentParams = {
      searchQuery,
      dateRange: `${dateRange.startDate}-${dateRange.endDate}`,
      statusFilter,
    };

    if (prevParamsRef.current.searchQuery !== currentParams.searchQuery ||
        prevParamsRef.current.dateRange !== currentParams.dateRange ||
        prevParamsRef.current.statusFilter !== currentParams.statusFilter) {
      prevParamsRef.current = currentParams;
      fetchData(true);
    }
  }, [searchQuery, dateRange.startDate, dateRange.endDate, statusFilter, fetchData]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleRefresh = () => {
    fetchData(true);
  };

  const handleExport = () => {
    const csvContent = [
      ['Click ID', 'Timestamp', 'Campaign', 'IP', 'Country', 'Device', 'Browser', 'OS', 'Visitor ID'].join(','),
      ...clicksList.map(click => [
        click.clickId,
        click.timestamp,
        click.campaignId,
        click.ip,
        click.country || '',
        click.device || '',
        click.browser || '',
        click.os || '',
        click.visitorId,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clicks-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getDeviceIcon = (device?: string) => {
    if (!device) return <Monitor size={14} />;
    const deviceLower = device.toLowerCase();
    if (deviceLower.includes('mobile') || deviceLower.includes('phone')) {
      return <Smartphone size={14} />;
    }
    return <Monitor size={14} />;
  };

  const clickColumnDefs: Array<{ key: string; label: string; render: (click: ClickLog) => React.ReactNode }> = [
    { key: 'time', label: 'Time', render: (click) => formatTimestamp(click.timestamp) },
    { key: 'campaign', label: 'Campaign', render: (click) => click.campaignId },
    { key: 'ip', label: 'IP', render: (click) => <span className="font-mono">{click.ip}</span> },
    { key: 'country', label: 'Country', render: (click) => click.country || '-' },
    { key: 'device', label: 'Device', render: (click) => <div className="flex items-center gap-1">{getDeviceIcon(click.device)}<span>{click.device || '-'}</span></div> },
    { key: 'browser', label: 'Browser', render: (click) => click.browser || '-' },
    { key: 'os', label: 'OS', render: (click) => click.os || '-' },
    {
      key: 'type',
      label: 'Type',
      render: (click) => (
        <span className={cn(
          'px-2 py-1 text-xs font-medium rounded',
          click.isUnique ? 'bg-accent-fg/10 text-accent-fg' : 'bg-fg-muted/10 text-fg-muted',
        )}>
          {click.isUnique ? 'Unique' : 'Non-unique'}
        </span>
      ),
    },
  ];
  const clickColumnItems: TableColumnItem[] = clickColumnDefs.map((column) => ({ key: column.key, label: column.label }));
  const { visible: visibleClickColumns, toggle: toggleClickColumn, move: moveClickColumn, reset: resetClickColumns } = useTableColumnLayout('clicks-log', clickColumnItems);
  const displayClickColumns = visibleClickColumns
    .map((key) => clickColumnDefs.find((column) => column.key === key))
    .filter((column): column is (typeof clickColumnDefs)[number] => Boolean(column));

  // 楠ㄦ灦灞忔樉绀洪€昏緫锛氶娆″姞杞戒笖鏃犳暟鎹椂鏄剧ず
  const showSkeleton = loading && clicksList.length === 0;

  if (showSkeleton) {
    return <ClicksLogSkeleton />;
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
              <p className="font-medium text-error">Failed to load clicks</p>
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
          <h1 className="text-2xl font-bold text-fg-default">Clicks Log</h1>
          <p className="text-sm text-fg-muted mt-1">Real-time stream of all incoming traffic</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="p-2 text-fg-muted hover:text-fg-default hover:bg-surface-container rounded transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExport}
            disabled={clicksList.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-accent-fg text-white text-sm font-medium hover:bg-accent-fg/90 transition-all rounded disabled:opacity-50"
          >
            <Download size={16} /> Export
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-lg border border-border-default">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-accent-fg rounded">
              <MousePointer2 size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-fg-muted">Total Clicks</p>
              <p className="text-xl font-bold text-fg-default">{(stats.totalClicks ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border-default">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-success/10 text-success rounded">
              <Eye size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-fg-muted">Unique Clicks</p>
              <p className="text-xl font-bold text-fg-default">{(stats.uniqueClicks ?? 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border-default">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-warning/10 text-warning rounded">
              <Globe size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-fg-muted">Countries</p>
              <p className="text-xl font-bold text-fg-default">{stats.countries}</p>
            </div>
          </div>
        </div>
        <div className="bg-surface p-4 rounded-lg border border-border-default">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-info/10 text-info rounded">
              <Monitor size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-fg-muted">Device Types</p>
              <p className="text-xl font-bold text-fg-default">{stats.deviceTypes}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-surface p-4 rounded-lg border border-border-default space-y-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <QuickDateRangePicker value={dateRange} onChange={setDateRange} />
          </div>
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              placeholder="Search by click ID, IP, visitor ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface-container border border-border-default rounded text-sm text-fg-default focus:outline-none focus:border-accent-fg"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2 border-t border-border-default flex-wrap">
          <Filter size={16} className="text-fg-muted" />
          <span className="text-sm text-fg-muted">Status:</span>
          {['all', 'unique', 'nonunique'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded transition-all",
                statusFilter === status
                  ? "bg-accent-fg text-white"
                  : "bg-surface-container text-fg-muted hover:bg-surface-container-hover"
              )}
            >
              {status === 'all' ? 'All' : status === 'unique' ? 'Unique' : 'Non-unique'}
            </button>
          ))}
        </div>

        {/* Group By 绛涢€?*/}
        <div className="pt-2 border-t border-border-default">
          <GroupByFilter
            data={clicksList}
            groupByOptions={CLICKS_LOG_GROUP_BY_OPTIONS}
            value={groupByStates}
            onChange={setGroupByStates}
            maxLevels={3}
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-danger/10 text-danger p-4 rounded-lg border border-danger/20">
          <p className="font-medium">Error loading clicks</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

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
        {clicksList.map((click) => (
          <article key={click.clickId} className="rounded-xl border border-border-default bg-surface p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-fg-default">{click.campaignId || 'Unknown campaign'}</p>
                <p className="mt-0.5 text-xs text-fg-muted">{formatTimestamp(click.timestamp)}</p>
              </div>
              <span className={cn(
                'shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase tracking-wide',
                click.isUnique ? 'bg-accent-fg/10 text-accent-fg' : 'bg-fg-muted/10 text-fg-muted'
              )}>
                {click.isUnique ? 'Unique' : 'Non-unique'}
              </span>
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <div><dt className="text-fg-subtle">Country</dt><dd className="mt-0.5 text-fg-default">{click.country || '-'}</dd></div>
              <div><dt className="text-fg-subtle">Device</dt><dd className="mt-0.5 flex items-center gap-1 text-fg-default">{getDeviceIcon(click.device)}{click.device || '-'}</dd></div>
              <div><dt className="text-fg-subtle">Browser</dt><dd className="mt-0.5 text-fg-default">{click.browser || '-'}</dd></div>
              <div><dt className="text-fg-subtle">OS</dt><dd className="mt-0.5 text-fg-default">{click.os || '-'}</dd></div>
            </dl>
            <div className="mt-3 flex items-center justify-between border-t border-border-default pt-2 text-xs">
              <span className="font-mono text-fg-muted">{click.ip || '-'}</span>
              <span className="font-mono text-fg-subtle">{click.clickId?.slice(0, 10)}…</span>
            </div>
          </article>
        ))}
        {clicksList.length === 0 && (
          <div className="rounded-xl border border-dashed border-border-default p-8 text-center text-sm text-fg-muted">No clicks found</div>
        )}
      </div>

      {/* Table (desktop/tablet) */}
      <div className="hidden md:block">
        <TablePagination
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          totalItems={pagination.total}
          itemsPerPage={pagination.pageSize}
          onPageChange={handlePageChange}
          label="clicks"
        />
      </div>
      <div className="hidden overflow-hidden rounded-lg border border-border-default bg-surface md:block">
        <div className="flex h-9 items-center justify-between border-b border-border-default px-3">
          <span className="text-[11px] font-medium text-fg-subtle">{clicksList.length} rows</span>
          <TableColumnSettings
            items={clickColumnItems}
            visible={visibleClickColumns}
            onToggle={toggleClickColumn}
            onMove={moveClickColumn}
            onReset={resetClickColumns}
          />
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={24} className="animate-spin text-fg-muted" />
              <span className="ml-2 text-fg-muted">Loading clicks...</span>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-surface-container border-b border-border-default">
                  <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider"></th>
                  {displayClickColumns.map((column) => (
                    <th key={column.key} className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">
                      {column.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {clicksList.length > 0 ? (
                  clicksList.map((click) => (
                    <React.Fragment key={click.clickId}>
                      <tr
                        className="hover:bg-surface-container cursor-pointer transition-colors"
                        onClick={() => toggleRow(click.clickId)}
                      >
                        <td className="px-4 py-3">
                          {expandedRows.includes(click.clickId) ? (
                            <ChevronDown size={16} className="text-fg-muted" />
                          ) : (
                            <ChevronRight size={16} className="text-fg-muted" />
                          )}
                        </td>
                        {displayClickColumns.map((column) => (
                          <td key={column.key} className="px-4 py-3 text-sm text-fg-default whitespace-nowrap">
                            {column.render(click)}
                          </td>
                        ))}
                      </tr>
                      {expandedRows.includes(click.clickId) && (
                        <tr className="bg-surface-container">
                          <td colSpan={displayClickColumns.length + 1} className="px-4 py-4">
                            <div className="space-y-4">
                              {/* Basic Info */}
                              <div>
                                <p className="text-fg-muted text-xs uppercase mb-2 font-semibold">Basic Information</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-muted text-xs">Click ID</p>
                                    <p className="text-fg-default font-mono text-xs truncate" title={click.clickId}>{click.clickId}</p>
                                  </div>
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-muted text-xs">Visitor ID</p>
                                    <p className="text-fg-default font-mono text-xs truncate" title={click.visitorId}>{click.visitorId}</p>
                                  </div>
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-muted text-xs">Flow ID</p>
                                    <p className="text-fg-default font-mono text-xs">{click.flowId || '-'}</p>
                                  </div>
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-muted text-xs">Landing Page</p>
                                    <p className="text-fg-default font-mono text-xs">{click.landingPageId || '-'}</p>
                                  </div>
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-muted text-xs">Offer ID</p>
                                    <p className="text-fg-default font-mono text-xs">{click.offerId || '-'}</p>
                                  </div>
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-muted text-xs">Cost</p>
                                    <p className="text-fg-default font-mono text-xs">${(click.cost || 0).toFixed(2)}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Location Info */}
                              <div>
                                <p className="text-fg-muted text-xs uppercase mb-2 font-semibold">Location Details</p>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-muted text-xs">Country</p>
                                    <p className="text-fg-default">{click.country || '-'}</p>
                                  </div>
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-muted text-xs">City</p>
                                    <p className="text-fg-default">{click.city || '-'}</p>
                                  </div>
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-muted text-xs">ISP</p>
                                    <p className="text-fg-default">{click.isp || '-'}</p>
                                  </div>
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-muted text-xs">Connection</p>
                                    <p className="text-fg-default">{click.connectionType || '-'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* Sub IDs */}
                              <div>
                                <p className="text-fg-muted text-xs uppercase mb-2 font-semibold">Sub IDs</p>
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-muted text-xs">Sub ID 1</p>
                                    <p className="text-fg-default font-mono text-xs">{click.subId1 || '-'}</p>
                                  </div>
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-muted text-xs">Sub ID 2</p>
                                    <p className="text-fg-default font-mono text-xs">{click.subId2 || '-'}</p>
                                  </div>
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-muted text-xs">Sub ID 3</p>
                                    <p className="text-fg-default font-mono text-xs">{click.subId3 || '-'}</p>
                                  </div>
                                </div>
                              </div>

                              {/* User Agent */}
                              <div>
                                <p className="text-fg-muted text-xs uppercase mb-2 font-semibold">User Agent</p>
                                <div className="bg-surface p-2 rounded border border-border-default">
                                  <p className="text-fg-default font-mono text-xs break-all">{click.userAgent || '-'}</p>
                                </div>
                              </div>

                              {/* Referer */}
                              {click.referer && (
                                <div>
                                  <p className="text-fg-muted text-xs uppercase mb-2 font-semibold">Referer</p>
                                  <div className="bg-surface p-2 rounded border border-border-default">
                                    <p className="text-fg-default font-mono text-xs break-all">{click.referer}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="text-center py-12">
                      <History size={48} className="mx-auto text-fg-muted mb-4" />
                      <p className="text-fg-muted">No clicks found matching your criteria</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================================
// 楠ㄦ灦灞忕粍浠?
// ============================================

const ClicksLogSkeleton: React.FC = () => {
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
          <div className="h-10 w-10 bg-surface-hover rounded"></div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <div className="h-10 w-48 bg-surface-hover rounded"></div>
          <div className="h-10 w-32 bg-surface-hover rounded"></div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-lg border border-border-default overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-default">
              {[1,2,3,4,5,6,7,8,9].map((i) => (
                <th key={i} className="px-4 py-3">
                  <div className="h-4 bg-surface-hover rounded w-16"></div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[1,2,3,4,5].map((row) => (
              <tr key={row} className="border-b border-border-default">
                {[1,2,3,4,5,6,7,8,9].map((col) => (
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

export default ClicksLog;
