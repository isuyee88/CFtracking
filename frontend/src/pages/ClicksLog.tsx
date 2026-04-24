/**
 * File: ClicksLog.tsx
 * Purpose: 点击日志页面，展示所有点击记录
 * Input/Output: 显示点击数据列表，支持搜索、筛选、分页
 * Logic: 从边缘 bootstrap 快照读取点击数据，展示点击流的详细信息
 * 前后端交互: 首屏读取 bootstrap，对数据写入仍保留现有写接口
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  Globe,
  Monitor,
  Smartphone,
  RefreshCw,
  Download,
  MousePointer2,
  ChevronDown,
  ChevronRight,
  Eye,
  ChevronLeft,
  ChevronRight as ChevronRightIcon,
  X,
} from 'lucide-react';
import { QuickDateRangePicker, type DateRangeValue, getDateRange } from '@/components/DateRangePicker';
import { GroupByFilter, filterByGroupBy } from '@/components/GroupByFilter';
import type { GroupByState, GroupByOption } from '@/types/filter';
import { createExportTask, fetchClicks, fetchClickStats, type ClickLogParams, type ClickStats } from '../services/api';
import { loadBootstrapForLocation, readBootstrapPage } from '../services/bootstrap';

// ============================================
// 类型定义
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
// 辅助函数
// ============================================

function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

// ============================================
// 主组件
// ============================================

const CLICKS_LOG_GROUP_BY_OPTIONS: GroupByOption[] = [
  { value: 'campaignId', label: 'Campaign', category: 'Campaign & Traffic' },
  { value: 'country', label: 'Country', category: 'Geo' },
  { value: 'device', label: 'Device', category: 'Device & System' },
  { value: 'browser', label: 'Browser', category: 'Device & System' },
  { value: 'os', label: 'Operating System', category: 'Device & System' },
];

const CLICK_LOG_FILTER_STORAGE_KEY = 'cftracking.clicks-log.filters.v1';

export const ClicksLog = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentQuery = searchParams.toString();
  const bootstrap = readBootstrapPage<{
    clicks?: ClickLog[];
    stats?: ClickStats;
    pagination?: { page?: number; pageSize?: number; total?: number; totalPages?: number };
  }>('audit');
  const initialSearchFromUrl = searchParams.get('search') || '';
  const initialStatusFromUrl = searchParams.get('status') || '';
  const initialPageFromUrl = Number(searchParams.get('page') || 0);
  const initialPageSizeFromUrl = Number(searchParams.get('pageSize') || 0);
  const initialStartDateFromUrl = searchParams.get('startDate') || '';
  const initialEndDateFromUrl = searchParams.get('endDate') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearchFromUrl);
  const [dateRange, setDateRange] = useState<DateRangeValue>(
    initialStartDateFromUrl && initialEndDateFromUrl
      ? { startDate: initialStartDateFromUrl, endDate: initialEndDateFromUrl }
      : typeof bootstrap?.scope?.startDate === 'string' && typeof bootstrap?.scope?.endDate === 'string'
        ? { startDate: bootstrap.scope.startDate, endDate: bootstrap.scope.endDate }
      : getDateRange(7)
  );
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>(
    initialStatusFromUrl || (typeof bootstrap?.scope?.status === 'string' ? bootstrap.scope.status : 'all')
  );
  
  const [groupByStates, setGroupByStates] = useState<GroupByState[]>([]);
  
  const [clicks, setClicks] = useState<ClickLog[]>(
    Array.isArray(bootstrap?.data?.clicks) ? bootstrap.data.clicks : []
  );
  const [stats, setStats] = useState<ClickStats>(
    (bootstrap?.data?.stats as ClickStats) || {
      totalClicks: 0,
      uniqueClicks: 0,
      countries: 0,
      deviceTypes: 0,
    }
  );
  const [loading, setLoading] = useState(false);
  const [queueingFormat, setQueueingFormat] = useState<'csv' | 'excel' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const skipInitialBootstrapLoadRef = useRef(Boolean(bootstrap?.data?.clicks));
  
  const [pagination, setPagination] = useState({
    page: initialPageFromUrl > 0 ? initialPageFromUrl : Number(bootstrap?.data?.pagination?.page || 1),
    pageSize: initialPageSizeFromUrl > 0 ? initialPageSizeFromUrl : Number(bootstrap?.data?.pagination?.pageSize || 20),
    total: Number(bootstrap?.data?.pagination?.total || 0),
    totalPages: Number(bootstrap?.data?.pagination?.totalPages || 0),
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const raw = window.localStorage.getItem(CLICK_LOG_FILTER_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const persisted = JSON.parse(raw) as {
        searchQuery?: string;
        statusFilter?: string;
        groupByStates?: GroupByState[];
        pageSize?: number;
        dateRange?: DateRangeValue;
      };

      if (!initialSearchFromUrl && typeof persisted.searchQuery === 'string') {
        setSearchQuery(persisted.searchQuery);
      }
      if (!initialStatusFromUrl && typeof persisted.statusFilter === 'string') {
        setStatusFilter(persisted.statusFilter);
      }
      if (!initialPageSizeFromUrl && typeof persisted.pageSize === 'number' && persisted.pageSize > 0) {
        setPagination((current) => ({ ...current, pageSize: persisted.pageSize }));
      }
      if (Array.isArray(persisted.groupByStates)) {
        setGroupByStates(persisted.groupByStates);
      }
      if (!initialStartDateFromUrl && !initialEndDateFromUrl && persisted.dateRange?.startDate && persisted.dateRange?.endDate) {
        setDateRange(persisted.dateRange);
      }
    } catch {
      // Ignore localStorage failures in restricted contexts.
    }
  }, [initialEndDateFromUrl, initialPageSizeFromUrl, initialSearchFromUrl, initialStartDateFromUrl, initialStatusFromUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      window.localStorage.setItem(
        CLICK_LOG_FILTER_STORAGE_KEY,
        JSON.stringify({
          searchQuery,
          statusFilter,
          groupByStates,
          pageSize: pagination.pageSize,
          dateRange,
        })
      );
    } catch {
      // Ignore localStorage failures in restricted contexts.
    }
  }, [dateRange, groupByStates, pagination.pageSize, searchQuery, statusFilter]);

  const loadClicks = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params: ClickLogParams = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: searchQuery || undefined,
        startDate: dateRange.startDate.split('T')[0],
        endDate: dateRange.endDate.split('T')[0],
      };

      if (statusFilter === 'unique') {
        params.isUnique = true;
      } else if (statusFilter === 'nonunique') {
        params.isUnique = false;
      }

      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('page', String(params.page || 1));
      nextUrl.searchParams.set('pageSize', String(params.pageSize || 20));
      nextUrl.searchParams.set('startDate', params.startDate || '');
      nextUrl.searchParams.set('endDate', params.endDate || '');
      if (params.search) {
        nextUrl.searchParams.set('search', params.search);
      } else {
        nextUrl.searchParams.delete('search');
      }
      nextUrl.searchParams.set('status', statusFilter);

      const nextQuery = nextUrl.searchParams.toString();
      if (nextQuery !== currentQuery) {
        setSearchParams(nextUrl.searchParams, { replace: true });
        return;
      }

      const bundle = await loadBootstrapForLocation({ url: nextUrl, force: true }).catch(() => null);
      if (bundle?.page === 'audit') {
        setClicks(Array.isArray(bundle.data?.clicks) ? bundle.data.clicks as ClickLog[] : []);
        setPagination((prev) => ({
          ...prev,
          page: Number(bundle.data?.pagination?.page || params.page || 1),
          pageSize: Number(bundle.data?.pagination?.pageSize || params.pageSize || 20),
          total: Number(bundle.data?.pagination?.total || 0),
          totalPages: Number(bundle.data?.pagination?.totalPages || 0),
        }));
        setStats((bundle.data?.stats as ClickStats) || {
          totalClicks: 0,
          uniqueClicks: 0,
          countries: 0,
          deviceTypes: 0,
        });
        return;
      }

      const [clicksResult, statsResult] = await Promise.all([
        fetchClicks(params),
        fetchClickStats(params.startDate!, params.endDate!),
      ]);

      setClicks(clicksResult.list);
      setPagination(prev => ({
        ...prev,
        total: clicksResult.total,
        totalPages: clicksResult.totalPages,
      }));
      setStats(statsResult);
    } catch (err) {
      console.error('Failed to load clicks:', err);
      setError(err instanceof Error ? err.message : 'Failed to load clicks');
    } finally {
      setLoading(false);
    }
  }, [currentQuery, dateRange, pagination.page, pagination.pageSize, searchQuery, setSearchParams, statusFilter]);

  useEffect(() => {
    if (skipInitialBootstrapLoadRef.current) {
      skipInitialBootstrapLoadRef.current = false;
      return;
    }

    loadClicks();
  }, [loadClicks]);

  const toggleRow = (id: string) => {
    setExpandedRows(prev =>
      prev.includes(id) ? prev.filter(rowId => rowId !== id) : [...prev, id]
    );
  };

  const handlePageChange = (newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const handleRefresh = () => {
    loadClicks();
  };

  const displayedClicks = useMemo(() => filterByGroupBy(clicks, groupByStates), [clicks, groupByStates]);

  const handleExport = () => {
    const csvContent = [
      ['Click ID', 'Timestamp', 'Campaign', 'IP', 'Country', 'Device', 'Browser', 'OS', 'Visitor ID'].join(','),
      ...displayedClicks.map(click => [
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

  const handleQueueExport = useCallback(
    async (format: 'csv' | 'excel') => {
      setQueueingFormat(format);
      setError(null);
      setNotice(null);

      const dateOnlyStart = String(dateRange.startDate).split('T')[0] || '';
      const dateOnlyEnd = String(dateRange.endDate).split('T')[0] || '';

      try {
        await createExportTask({
          name: `clicks-log-${dateOnlyStart}-${dateOnlyEnd}-${format}`,
          entityType: 'clicks',
          format,
          dateRange: {
            startDate: dateOnlyStart,
            endDate: dateOnlyEnd,
          },
          filters: {
            search: searchQuery || undefined,
            status: statusFilter,
            isUnique: statusFilter === 'unique' ? true : statusFilter === 'nonunique' ? false : undefined,
            groupBy: groupByStates,
          },
          fields: ['clickId', 'timestamp', 'campaignId', 'ip', 'country', 'device', 'browser', 'os', 'visitorId'],
        });
        setNotice(`Queued ${format.toUpperCase()} export. Open Export Queue to monitor progress.`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to queue export task');
      } finally {
        setQueueingFormat(null);
      }
    },
    [dateRange.endDate, dateRange.startDate, groupByStates, searchQuery, statusFilter]
  );

  const activeFilters = useMemo(() => {
    const items: Array<{ key: string; label: string; value: string }> = [];

    if (searchQuery.trim()) {
      items.push({ key: 'search', label: 'Search', value: searchQuery.trim() });
    }
    if (statusFilter !== 'all') {
      items.push({
        key: 'status',
        label: 'Status',
        value: statusFilter === 'unique' ? 'Unique' : 'Non-unique',
      });
    }
    if (dateRange.startDate && dateRange.endDate) {
      items.push({
        key: 'date',
        label: 'Date',
        value: `${String(dateRange.startDate).split('T')[0]} → ${String(dateRange.endDate).split('T')[0]}`,
      });
    }
    groupByStates.forEach((group, index) => {
      if (group.field && group.value) {
        items.push({
          key: `group-${index}`,
          label: `Group ${index + 1}`,
          value: `${group.field} = ${group.value}`,
        });
      }
    });

    return items;
  }, [dateRange.endDate, dateRange.startDate, groupByStates, searchQuery, statusFilter]);

  const removeActiveFilter = useCallback((key: string) => {
    if (key === 'search') {
      setSearchQuery('');
      setPagination((prev) => ({ ...prev, page: 1 }));
      return;
    }
    if (key === 'status') {
      setStatusFilter('all');
      setPagination((prev) => ({ ...prev, page: 1 }));
      return;
    }
    if (key === 'date') {
      setDateRange(getDateRange(7));
      setPagination((prev) => ({ ...prev, page: 1 }));
      return;
    }
    if (key.startsWith('group-')) {
      const index = Number(key.replace('group-', ''));
      setGroupByStates((current) => current.filter((_, currentIndex) => currentIndex !== index));
    }
  }, []);

  const clearAllFilters = useCallback(() => {
    setSearchQuery('');
    setStatusFilter('all');
    setGroupByStates([]);
    setDateRange(getDateRange(7));
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-fg-default">Clicks Log</h1>
          <p className="text-sm text-fg-muted mt-1">Real-time stream of all incoming traffic</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 text-fg-muted hover:text-fg-default hover:bg-surface-container rounded transition-all disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExport}
            disabled={displayedClicks.length === 0 || queueingFormat !== null}
            className="flex items-center gap-2 px-4 py-2 bg-accent-fg text-white text-sm font-medium hover:bg-accent-fg/90 transition-all rounded disabled:opacity-50"
          >
            <Download size={16} /> Export
          </button>
          <button
            onClick={() => void handleQueueExport('csv')}
            disabled={queueingFormat !== null || displayedClicks.length === 0}
            className="flex items-center gap-2 px-4 py-2 border border-border-default text-sm font-medium transition-all rounded disabled:opacity-50"
          >
            <Download size={16} /> {queueingFormat === 'csv' ? 'Queueing CSV...' : 'Queue CSV'}
          </button>
          <button
            onClick={() => navigate('/exported-reports')}
            className="flex items-center gap-2 px-4 py-2 border border-border-default text-sm font-medium transition-all rounded"
          >
            Export Queue
          </button>
        </div>
      </div>

      {notice ? (
        <div className="rounded-sm border border-success/20 bg-success/10 p-3 text-sm text-success">{notice}</div>
      ) : null}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-lg border border-border-default">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-accent-fg rounded">
              <MousePointer2 size={20} />
            </div>
            <div>
              <p className="text-xs font-medium uppercase text-fg-muted">Total Clicks</p>
              <p className="text-xl font-bold text-fg-default">{stats.totalClicks.toLocaleString()}</p>
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
              <p className="text-xl font-bold text-fg-default">{stats.uniqueClicks.toLocaleString()}</p>
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
            <QuickDateRangePicker
              value={dateRange}
              onChange={(nextRange) => {
                setDateRange(nextRange);
                setPagination((current) => ({ ...current, page: 1 }));
              }}
            />
          </div>
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              type="text"
              placeholder="Search by click ID, IP, visitor ID..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPagination((current) => ({ ...current, page: 1 }));
              }}
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
              onClick={() => {
                setStatusFilter(status);
                setPagination((current) => ({ ...current, page: 1 }));
              }}
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
        
        {/* Group By 筛选 */}
        <div className="pt-2 border-t border-border-default">
          <GroupByFilter
            data={clicks}
            groupByOptions={CLICKS_LOG_GROUP_BY_OPTIONS}
            value={groupByStates}
            onChange={setGroupByStates}
            maxLevels={3}
          />
        </div>

        {activeFilters.length > 0 ? (
          <div className="pt-2 border-t border-border-default space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-widest text-fg-muted">Active Filters</span>
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-xs text-error hover:underline"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <button
                  type="button"
                  key={filter.key}
                  onClick={() => removeActiveFilter(filter.key)}
                  className="inline-flex items-center gap-1 rounded-sm bg-surface-container px-2 py-1 text-xs text-fg-default hover:bg-surface-container-hover"
                  title="Remove filter"
                >
                  <span className="font-medium">{filter.label}:</span>
                  <span>{filter.value}</span>
                  <X size={12} />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-danger/10 text-danger p-4 rounded-lg border border-danger/20">
          <p className="font-medium">Error loading clicks</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {/* Table */}
      <div className="bg-surface rounded-lg border border-border-default overflow-hidden">
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">Time</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">Campaign</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">Visitor ID</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">IP</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">Country</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">Device</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">Browser</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">OS</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-fg-muted uppercase tracking-wider">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-default">
                {displayedClicks.length > 0 ? (
                  displayedClicks.map((click) => (
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
                        <td className="px-4 py-3 text-sm text-fg-default">{formatTimestamp(click.timestamp)}</td>
                        <td className="px-4 py-3 text-sm text-fg-default">{click.campaignId}</td>
                        <td className="px-4 py-3 text-sm font-mono text-fg-default" title={click.visitorId}>
                          {click.visitorId ? `${click.visitorId.substring(0, 12)}...` : '-'}
                        </td>
                        <td className="px-4 py-3 text-sm font-mono text-fg-default">{click.ip}</td>
                        <td className="px-4 py-3 text-sm text-fg-default">{click.country || '-'}</td>
                        <td className="px-4 py-3 text-sm text-fg-default">
                          <div className="flex items-center gap-1">
                            {getDeviceIcon(click.device)}
                            <span>{click.device || '-'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-fg-default">{click.browser || '-'}</td>
                        <td className="px-4 py-3 text-sm text-fg-default">{click.os || '-'}</td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "px-2 py-1 text-xs font-medium rounded",
                            click.isUnique ? "bg-accent-fg/10 text-accent-fg" : "bg-fg-muted/10 text-fg-muted"
                          )}>
                            {click.isUnique ? 'Unique' : 'Non-unique'}
                          </span>
                        </td>
                      </tr>
                      {expandedRows.includes(click.clickId) && (
                        <tr className="bg-surface-container">
                          <td colSpan={10} className="px-4 py-4">
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
                    <td colSpan={10} className="text-center py-12">
                      <History size={48} className="mx-auto text-fg-muted mb-4" />
                      <p className="text-fg-muted">No clicks found matching your criteria</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 px-4 py-3 border-t border-border-default">
            <div className="text-sm text-fg-muted">
              Showing {((pagination.page - 1) * pagination.pageSize) + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total} results
            </div>
            <div className="flex items-center gap-2">
              <select
                value={pagination.pageSize}
                onChange={(event) =>
                  setPagination((current) => ({ ...current, page: 1, pageSize: Number(event.target.value) }))
                }
                className="rounded border border-border-default bg-surface px-2 py-1 text-xs"
                aria-label="Select clicks page size"
              >
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-2 text-fg-muted hover:text-fg-default hover:bg-surface-container rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-fg-default">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-2 text-fg-muted hover:text-fg-default hover:bg-surface-container rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClicksLog;
