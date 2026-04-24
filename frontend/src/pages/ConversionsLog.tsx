import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Search,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { getDateRange, QuickDateRangePicker, type DateRangeValue } from '@/components/DateRangePicker';
import { GroupByFilter, filterByGroupBy } from '@/components/GroupByFilter';
import type { GroupByOption, GroupByState } from '@/types/filter';
import {
  fetchConversions,
  fetchConversionStats,
  createExportTask,
  updateConversionStatus,
  type ConversionLogItem,
  type ConversionLogParams,
  type ConversionStats,
} from '../services/api';
import { loadBootstrapForLocation, readBootstrapPage } from '../services/bootstrap';

type ConversionStatus = 'approved' | 'pending' | 'rejected';

const GROUP_BY_OPTIONS: GroupByOption[] = [
  { value: 'campaignId', label: 'Campaign', category: 'Campaign & Traffic' },
  { value: 'offerName', label: 'Offer', category: 'Campaign & Traffic' },
  { value: 'source', label: 'Source', category: 'Campaign & Traffic' },
  { value: 'status', label: 'Status', category: 'Conversion' },
  { value: 'conversionType', label: 'Conversion Type', category: 'Conversion' },
  { value: 'country', label: 'Country', category: 'Geo' },
  { value: 'device', label: 'Device', category: 'Device' },
  { value: 'browser', label: 'Browser', category: 'Device' },
];

const EMPTY_STATS: ConversionStats = {
  totalConversions: 0,
  approvedConversions: 0,
  pendingConversions: 0,
  rejectedConversions: 0,
  totalRevenue: 0,
  totalPayout: 0,
};

const CONVERSIONS_LOG_FILTER_STORAGE_KEY = 'cftracking.conversions-log.filters.v1';

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(' ');
}

function formatCurrency(value: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export default function ConversionsLog() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentQuery = searchParams.toString();
  const bootstrap = readBootstrapPage<{
    conversions?: ConversionLogItem[];
    stats?: ConversionStats;
    pagination?: { page?: number; pageSize?: number; total?: number; totalPages?: number };
  }>('conversions');
  const initialSearchFromUrl = searchParams.get('search') || '';
  const initialStatusFromUrl = searchParams.get('status') as 'all' | ConversionStatus | null;
  const initialPageFromUrl = Number(searchParams.get('page') || 0);
  const initialPageSizeFromUrl = Number(searchParams.get('pageSize') || 0);
  const initialStartDateFromUrl = searchParams.get('startDate') || '';
  const initialEndDateFromUrl = searchParams.get('endDate') || '';
  const [searchQuery, setSearchQuery] = useState(initialSearchFromUrl);
  const [statusFilter, setStatusFilter] = useState<'all' | ConversionStatus>(
    initialStatusFromUrl || (bootstrap?.scope?.status as 'all' | ConversionStatus) || 'all'
  );
  const [datePreset, setDatePreset] = useState('last7days');
  const [dateRange, setDateRange] = useState<DateRangeValue>(
    initialStartDateFromUrl && initialEndDateFromUrl
      ? { startDate: initialStartDateFromUrl, endDate: initialEndDateFromUrl }
      : typeof bootstrap?.scope?.startDate === 'string' && typeof bootstrap?.scope?.endDate === 'string'
        ? { startDate: bootstrap.scope.startDate, endDate: bootstrap.scope.endDate }
      : getDateRange('last7days')
  );
  const [groupByStates, setGroupByStates] = useState<GroupByState[]>([]);
  const [conversions, setConversions] = useState<ConversionLogItem[]>(
    Array.isArray(bootstrap?.data?.conversions) ? bootstrap.data.conversions : []
  );
  const [expandedRows, setExpandedRows] = useState<string[]>([]);
  const [stats, setStats] = useState<ConversionStats>((bootstrap?.data?.stats as ConversionStats) || EMPTY_STATS);
  const [loading, setLoading] = useState(false);
  const [queueingFormat, setQueueingFormat] = useState<'csv' | 'excel' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const skipInitialBootstrapLoadRef = useRef(Boolean(bootstrap?.data?.conversions));
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
      const raw = window.localStorage.getItem(CONVERSIONS_LOG_FILTER_STORAGE_KEY);
      if (!raw) {
        return;
      }

      const persisted = JSON.parse(raw) as {
        searchQuery?: string;
        statusFilter?: 'all' | ConversionStatus;
        groupByStates?: GroupByState[];
        pageSize?: number;
        dateRange?: DateRangeValue;
      };

      if (!initialSearchFromUrl && typeof persisted.searchQuery === 'string') {
        setSearchQuery(persisted.searchQuery);
      }
      if (!initialStatusFromUrl && persisted.statusFilter) {
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
        CONVERSIONS_LOG_FILTER_STORAGE_KEY,
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

  const loadConversions = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params: ConversionLogParams = {
        page: pagination.page,
        pageSize: pagination.pageSize,
        search: searchQuery || undefined,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        status: statusFilter === 'all' ? undefined : statusFilter,
      };

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
      if (params.status) {
        nextUrl.searchParams.set('status', params.status);
      } else {
        nextUrl.searchParams.delete('status');
      }

      const nextQuery = nextUrl.searchParams.toString();
      if (nextQuery !== currentQuery) {
        setSearchParams(nextUrl.searchParams, { replace: true });
        return;
      }

      const bundle = await loadBootstrapForLocation({ url: nextUrl, force: true }).catch(() => null);
      if (bundle?.page === 'conversions') {
        setConversions(Array.isArray(bundle.data?.conversions) ? bundle.data.conversions as ConversionLogItem[] : []);
        setStats((bundle.data?.stats as ConversionStats) || EMPTY_STATS);
        setPagination((current) => ({
          ...current,
          page: Number(bundle.data?.pagination?.page || params.page || 1),
          pageSize: Number(bundle.data?.pagination?.pageSize || params.pageSize || 20),
          total: Number(bundle.data?.pagination?.total || 0),
          totalPages: Number(bundle.data?.pagination?.totalPages || 0),
        }));
        return;
      }

      const [listResult, statsResult] = await Promise.all([
        fetchConversions(params),
        fetchConversionStats(dateRange.startDate, dateRange.endDate),
      ]);

      setConversions(listResult.list);
      setStats(statsResult);
      setPagination((current) => ({
        ...current,
        total: listResult.total,
        totalPages: listResult.totalPages,
      }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load conversions');
    } finally {
      setLoading(false);
    }
  }, [currentQuery, dateRange.endDate, dateRange.startDate, pagination.page, pagination.pageSize, searchQuery, setSearchParams, statusFilter]);

  useEffect(() => {
    if (skipInitialBootstrapLoadRef.current) {
      skipInitialBootstrapLoadRef.current = false;
      return;
    }

    void loadConversions();
  }, [loadConversions]);

  const displayedRows = useMemo(() => filterByGroupBy(conversions, groupByStates), [conversions, groupByStates]);
  const visibleRevenue = useMemo(
    () => displayedRows.filter((row) => row.status === 'approved').reduce((sum, row) => sum + Number(row.revenue || 0), 0),
    [displayedRows]
  );
  const visiblePayout = useMemo(
    () => displayedRows.filter((row) => row.status === 'approved').reduce((sum, row) => sum + Number(row.payout || 0), 0),
    [displayedRows]
  );

  const toggleRow = useCallback((conversionId: string) => {
    setExpandedRows((current) =>
      current.includes(conversionId) ? current.filter((rowId) => rowId !== conversionId) : [...current, conversionId]
    );
  }, []);

  const handleStatusUpdate = useCallback(
    async (conversionId: string, status: ConversionStatus) => {
      setUpdatingId(conversionId);
      setError(null);
      try {
        await updateConversionStatus(conversionId, status);
        await loadConversions();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to update conversion status');
      } finally {
        setUpdatingId(null);
      }
    },
    [loadConversions]
  );

  const handleExport = useCallback(() => {
    const rows = [
      ['Conversion ID', 'Click ID', 'Campaign', 'Offer', 'Timestamp', 'Status', 'Revenue', 'Payout'].join(','),
      ...displayedRows.map((row) =>
        [row.conversionId, row.clickId, row.campaignId, row.offerName, row.timestamp, row.status, row.revenue, row.payout]
          .map((value) => `"${String(value ?? '').replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `conversions-${new Date().toISOString().split('T')[0]}.csv`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  }, [displayedRows]);

  const handleQueueExport = useCallback(
    async (format: 'csv' | 'excel') => {
      setQueueingFormat(format);
      setError(null);
      setNotice(null);

      const dateOnlyStart = String(dateRange.startDate).split('T')[0] || '';
      const dateOnlyEnd = String(dateRange.endDate).split('T')[0] || '';

      try {
        await createExportTask({
          name: `conversions-log-${dateOnlyStart}-${dateOnlyEnd}-${format}`,
          entityType: 'conversions',
          format,
          dateRange: {
            startDate: dateOnlyStart,
            endDate: dateOnlyEnd,
          },
          filters: {
            search: searchQuery || undefined,
            status: statusFilter === 'all' ? undefined : statusFilter,
            groupBy: groupByStates,
          },
          fields: ['conversionId', 'clickId', 'campaignId', 'offerName', 'timestamp', 'status', 'revenue', 'payout'],
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
      items.push({ key: 'status', label: 'Status', value: statusFilter });
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
      setPagination((current) => ({ ...current, page: 1 }));
      return;
    }
    if (key === 'status') {
      setStatusFilter('all');
      setPagination((current) => ({ ...current, page: 1 }));
      return;
    }
    if (key === 'date') {
      setDatePreset('last7days');
      setDateRange(getDateRange('last7days'));
      setPagination((current) => ({ ...current, page: 1 }));
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
    setDatePreset('last7days');
    setDateRange(getDateRange('last7days'));
    setPagination((current) => ({ ...current, page: 1 }));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold text-primary">Conversions Log</h1>
          <p className="text-sm text-on-surface-variant">Real conversion data streamed from the current edge bootstrap snapshot.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => void loadConversions()} disabled={loading} aria-label="Refresh conversions log" className="rounded-sm p-2 hover:bg-surface-container">
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={handleExport}
            disabled={displayedRows.length === 0 || queueingFormat !== null}
            aria-label="Export conversions log"
            className="flex items-center gap-2 rounded-sm bg-secondary px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-primary disabled:opacity-50"
          >
            <Download size={16} />
            Export
          </button>
          <button
            onClick={() => void handleQueueExport('csv')}
            disabled={displayedRows.length === 0 || queueingFormat !== null}
            className="flex items-center gap-2 rounded-sm border border-outline-variant px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-surface disabled:opacity-50"
          >
            <Download size={16} />
            {queueingFormat === 'csv' ? 'Queueing CSV...' : 'Queue CSV'}
          </button>
          <button
            onClick={() => navigate('/exported-reports')}
            className="flex items-center gap-2 rounded-sm border border-outline-variant px-4 py-2 text-xs font-bold uppercase tracking-widest text-on-surface"
          >
            Export Queue
          </button>
        </div>
      </div>

      {notice ? (
        <div className="rounded-sm border border-success/20 bg-success/10 p-3 text-sm text-success">{notice}</div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard icon={<CheckCircle2 size={20} />} label="Total Conversions" value={stats.totalConversions.toString()} tone="secondary" />
        <StatCard icon={<TrendingUp size={20} />} label="Approved" value={stats.approvedConversions.toString()} tone="success" />
        <StatCard icon={<Wallet size={20} />} label="Revenue (visible rows)" value={formatCurrency(visibleRevenue)} tone="primary" />
        <StatCard icon={<Wallet size={20} />} label="Payout (visible rows)" value={formatCurrency(visiblePayout)} tone="warning" />
      </div>

      <div className="space-y-4 border border-outline-variant/10 bg-surface-container-lowest p-4 whisper-shadow">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative min-w-[240px] flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setPagination((current) => ({ ...current, page: 1 }));
              }}
              placeholder="Search conversion ID, click ID, campaign..."
              aria-label="Search conversions"
              className="w-full border-none bg-surface-container py-2 pl-10 pr-4 text-xs focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="w-[320px]">
            <QuickDateRangePicker
              value={datePreset}
              onChange={(preset, nextDateRange) => {
                setDatePreset(preset);
                if (nextDateRange) {
                  setDateRange(nextDateRange);
                }
                setPagination((current) => ({ ...current, page: 1 }));
              }}
              showTime={true}
              maxRangeDays={90}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value as 'all' | ConversionStatus);
              setPagination((current) => ({ ...current, page: 1 }));
            }}
            aria-label="Filter conversions by status"
            className="border border-outline-variant/30 bg-surface-container px-3 py-2 text-xs font-bold uppercase tracking-widest"
          >
            <option value="all">All Status</option>
            <option value="approved">Approved</option>
            <option value="pending">Pending</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <GroupByFilter
          data={conversions}
          groupByOptions={GROUP_BY_OPTIONS}
          value={groupByStates}
          onChange={setGroupByStates}
          maxLevels={3}
        />

        {activeFilters.length > 0 ? (
          <div className="space-y-2 border-t border-outline-variant/10 pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Active Filters</span>
              <button type="button" onClick={clearAllFilters} className="text-xs text-error hover:underline">
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeFilters.map((filter) => (
                <button
                  type="button"
                  key={filter.key}
                  onClick={() => removeActiveFilter(filter.key)}
                  className="inline-flex items-center gap-1 rounded-sm bg-surface-container px-2 py-1 text-xs text-on-surface hover:bg-surface"
                >
                  <span className="font-semibold">{filter.label}:</span>
                  <span>{filter.value}</span>
                  <X size={12} />
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {error && <div className="rounded-sm border border-error/20 bg-error/10 p-4 text-sm text-error">{error}</div>}

      <div
        className="overflow-hidden border border-outline-variant/10 bg-surface-container-lowest whisper-shadow"
        style={{ contentVisibility: 'auto', containIntrinsicSize: '1280px' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant/10 bg-surface-container-low">
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant" />
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Time</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Conversion</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Campaign</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Offer</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Revenue</th>
                <th className="px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/5">
              {loading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-on-surface-variant">Loading conversions...</td></tr>
              ) : displayedRows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-sm text-on-surface-variant">No conversions found.</td></tr>
              ) : (
                displayedRows.map((row) => (
                  <React.Fragment key={row.conversionId}>
                    <tr className="hover:bg-surface-container-low">
                      <td className="px-4 py-3">
                        <button onClick={() => toggleRow(row.conversionId)} aria-label={expandedRows.includes(row.conversionId) ? `Collapse conversion ${row.conversionId}` : `Expand conversion ${row.conversionId}`} className="p-1 text-on-surface-variant">
                          <ChevronDown size={16} className={cn('transition-transform', !expandedRows.includes(row.conversionId) && '-rotate-90')} />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-on-surface-variant">{formatTime(row.timestamp)}</td>
                      <td className="px-4 py-3 text-xs font-mono text-on-surface-variant">{row.conversionId}</td>
                      <td className="px-4 py-3 text-xs font-bold text-primary">{row.campaignId}</td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant">{row.offerName}</td>
                      <td className="px-4 py-3 text-xs font-mono font-bold text-primary">{formatCurrency(Number(row.revenue || 0), row.currency || 'USD')}</td>
                      <td className="px-4 py-3">
                        <select
                          value={row.status}
                          onClick={(event) => event.stopPropagation()}
                          onChange={(event) => void handleStatusUpdate(row.conversionId, event.target.value as ConversionStatus)}
                          disabled={updatingId === row.conversionId}
                          aria-label={`Update status for conversion ${row.conversionId}`}
                          className={cn(
                            'rounded-sm border px-2 py-1 text-[10px] font-bold uppercase tracking-widest',
                            row.status === 'approved'
                              ? 'border-emerald-300 bg-emerald-100 text-emerald-900'
                              : row.status === 'pending'
                                ? 'border-amber-300 bg-amber-100 text-amber-900'
                                : 'border-error/30 bg-error/10 text-error'
                          )}
                        >
                          <option value="approved">Approved</option>
                          <option value="pending">Pending</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                    </tr>
                    {expandedRows.includes(row.conversionId) && (
                      <tr className="bg-surface-container-low/50">
                        <td colSpan={7} className="px-4 py-4">
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Detail label="Click ID" value={row.clickId} mono />
                            <Detail label="Visitor ID" value={row.visitorId || '-'} mono />
                            <Detail label="Offer ID" value={row.offerId} mono />
                            <Detail label="Country" value={row.country || '-'} />
                            <Detail label="Device" value={row.device || '-'} />
                            <Detail label="Browser" value={row.browser || '-'} />
                            <Detail label="Source" value={row.source || '-'} />
                            <Detail label="Sub ID 1" value={row.subId1 || '-'} mono />
                            <Detail label="Sub ID 2" value={row.subId2 || '-'} mono />
                            <Detail label="Sub ID 3" value={row.subId3 || '-'} mono />
                          </div>
                          <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="text-sm text-on-surface-variant">
                              Payout: <span className="font-mono font-bold text-secondary">{formatCurrency(Number(row.payout || 0), row.currency || 'USD')}</span>
                            </div>
                            {updatingId === row.conversionId ? (
                              <span className="text-sm text-on-surface-variant">Updating status...</span>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-outline-variant/10 px-4 py-3 md:flex-row md:items-center md:justify-between">
            <div className="text-sm text-on-surface-variant">
              Showing {(pagination.page - 1) * pagination.pageSize + 1} to {Math.min(pagination.page * pagination.pageSize, pagination.total)} of {pagination.total}
            </div>
            <div className="flex items-center gap-3">
              <select
                value={pagination.pageSize}
                onChange={(event) => setPagination((current) => ({ ...current, page: 1, pageSize: Number(event.target.value) }))}
                aria-label="Select conversions page size"
                className="border border-outline-variant bg-surface px-2 py-1 text-sm"
              >
                <option value={20}>20 / page</option>
                <option value={50}>50 / page</option>
                <option value={100}>100 / page</option>
              </select>
              <button onClick={() => setPagination((current) => ({ ...current, page: Math.max(1, current.page - 1) }))} disabled={pagination.page === 1} aria-label="Go to previous conversions page" className="rounded-sm p-2 hover:bg-surface-container disabled:opacity-50">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-on-surface">Page {pagination.page} of {pagination.totalPages}</span>
              <button onClick={() => setPagination((current) => ({ ...current, page: Math.min(current.totalPages, current.page + 1) }))} disabled={pagination.page === pagination.totalPages} aria-label="Go to next conversions page" className="rounded-sm p-2 hover:bg-surface-container disabled:opacity-50">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: string; tone: 'primary' | 'secondary' | 'success' | 'warning' }) {
  const toneClass =
    tone === 'primary'
      ? 'bg-primary/10 text-primary'
      : tone === 'secondary'
        ? 'bg-secondary/10 text-secondary'
        : tone === 'success'
          ? 'bg-emerald-200 text-emerald-900'
          : 'bg-amber-200 text-amber-900';

  return (
    <div className="bg-surface-container-lowest p-4 whisper-shadow">
      <div className="flex items-center gap-3">
        <div className={cn('rounded-sm p-2', toneClass)}>{icon}</div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</p>
          <p className="text-xl font-display font-bold text-primary">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-sm bg-surface p-3">
      <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</div>
      <div className={cn('mt-1 text-sm text-on-surface', mono && 'font-mono')}>{value}</div>
    </div>
  );
}
