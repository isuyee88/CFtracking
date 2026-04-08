import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bookmark,
  Download,
  Filter,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import { DateRangePickerComponent, getDateRange, type DateRangeValue } from '@/components/DateRangePicker';
import {
  downloadReport,
  exportReport,
  queryReport,
  type ExportFormat,
  type ReportDimension,
  type ReportFilterCondition,
  type ReportFilterOperator,
  type ReportMetric,
  type ReportType,
} from '../services/api';
import { VirtualTableEnhanced } from '../components/VirtualTableEnhanced';
import type { VirtualTableColumn } from '../components/VirtualTable';

interface BuilderConfig {
  reportType: ReportType;
  startDate: string;
  endDate: string;
  groupBy: ReportDimension[];
  metrics: ReportMetric[];
  filters: ReportFilterCondition[];
  limit: number;
  sortBy: ReportDimension | ReportMetric;
  sortOrder: 'asc' | 'desc';
}

interface SavedView {
  id: string;
  name: string;
  createdAt: string;
  config: BuilderConfig;
}

type ReportRow = Record<string, string | number | null | undefined>;

const SAVED_VIEWS_STORAGE_KEY = 'cftracking.report-builder.saved-views.v1';

const DIMENSION_OPTIONS: Array<{ value: ReportDimension; label: string; hint: string }> = [
  { value: 'campaign', label: 'Campaign', hint: 'Campaign performance leaderboard' },
  { value: 'offer', label: 'Offer', hint: 'Offer payout and conversion split' },
  { value: 'landing', label: 'Landing', hint: 'Landing page funnel breakdown' },
  { value: 'flow', label: 'Flow', hint: 'Routing path performance' },
  { value: 'country', label: 'Country', hint: 'Geo segmentation' },
  { value: 'device', label: 'Device', hint: 'Desktop / mobile split' },
  { value: 'browser', label: 'Browser', hint: 'Browser quality and compatibility' },
  { value: 'date', label: 'Date', hint: 'Day-by-day trend table' },
];

const METRIC_OPTIONS: Array<{ value: ReportMetric; label: string; format: 'number' | 'currency' | 'percent' }> = [
  { value: 'clicks', label: 'Clicks', format: 'number' },
  { value: 'impressions', label: 'Impressions', format: 'number' },
  { value: 'conversions', label: 'Conversions', format: 'number' },
  { value: 'revenue', label: 'Revenue', format: 'currency' },
  { value: 'spend', label: 'Spend', format: 'currency' },
  { value: 'cost', label: 'Cost', format: 'currency' },
  { value: 'profit', label: 'Profit', format: 'currency' },
  { value: 'roi', label: 'ROI', format: 'percent' },
  { value: 'cr', label: 'CR', format: 'percent' },
  { value: 'margin', label: 'Margin', format: 'percent' },
  { value: 'epc', label: 'EPC', format: 'currency' },
  { value: 'cpc', label: 'CPC', format: 'currency' },
  { value: 'unique_visitors', label: 'Unique Visitors', format: 'number' },
];

const FILTER_FIELD_OPTIONS = [
  ...DIMENSION_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
  ...METRIC_OPTIONS.map((option) => ({ value: option.value, label: option.label })),
] as Array<{ value: ReportDimension | ReportMetric; label: string }>;

const FILTER_OPERATORS: Array<{ value: ReportFilterOperator; label: string }> = [
  { value: 'eq', label: 'Equals' },
  { value: 'neq', label: 'Not equal' },
  { value: 'contains', label: 'Contains' },
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater or equal' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less or equal' },
];

const REPORT_TEMPLATES: Array<{
  id: string;
  title: string;
  description: string;
  reportType: ReportType;
  groupBy: ReportDimension[];
  metrics: ReportMetric[];
  sortBy: ReportDimension | ReportMetric;
}> = [
  {
    id: 'traffic-command',
    title: 'Traffic Command',
    description: 'Campaign volume, reach, and conversion rate',
    reportType: 'traffic',
    groupBy: ['campaign'],
    metrics: ['clicks', 'impressions', 'conversions', 'cr'],
    sortBy: 'clicks',
  },
  {
    id: 'offer-profit',
    title: 'Offer Profit',
    description: 'Offer-level revenue and ROI ranking',
    reportType: 'conversion',
    groupBy: ['offer'],
    metrics: ['conversions', 'revenue', 'profit', 'roi'],
    sortBy: 'revenue',
  },
  {
    id: 'landing-quality',
    title: 'Landing Quality',
    description: 'Landing page conversion efficiency',
    reportType: 'traffic',
    groupBy: ['landing'],
    metrics: ['clicks', 'conversions', 'cr', 'revenue'],
    sortBy: 'cr',
  },
  {
    id: 'geo-margin',
    title: 'Geo Margin',
    description: 'Country-level cost, revenue, and margin',
    reportType: 'financial',
    groupBy: ['country'],
    metrics: ['clicks', 'revenue', 'spend', 'profit', 'margin'],
    sortBy: 'profit',
  },
  {
    id: 'browser-roi',
    title: 'Browser ROI',
    description: 'Browser mix for quality and profit',
    reportType: 'roi',
    groupBy: ['browser'],
    metrics: ['clicks', 'conversions', 'revenue', 'roi', 'epc'],
    sortBy: 'roi',
  },
];

const DEFAULT_CONFIG: BuilderConfig = {
  reportType: 'traffic',
  startDate: normalizeDateValue(getDateRange('last7days').startDate),
  endDate: normalizeDateValue(getDateRange('last7days').endDate),
  groupBy: ['campaign'],
  metrics: ['clicks', 'impressions', 'conversions', 'cr'],
  filters: [],
  limit: 250,
  sortBy: 'clicks',
  sortOrder: 'desc',
};

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(' ');
}

function normalizeDateValue(value: string) {
  return value.split('T')[0] || value;
}

function cloneConfig(config: BuilderConfig): BuilderConfig {
  return {
    ...config,
    groupBy: [...config.groupBy],
    metrics: [...config.metrics],
    filters: config.filters.map((filter) => ({ ...filter })),
  };
}

function formatMetricValue(metric: ReportMetric, value: unknown) {
  const numericValue = Number(value ?? 0);
  const option = METRIC_OPTIONS.find((item) => item.value === metric);

  if (!option) {
    return String(value ?? '-');
  }

  if (option.format === 'currency') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: metric === 'epc' || metric === 'cpc' ? 4 : 2,
    }).format(numericValue);
  }

  if (option.format === 'percent') {
    return `${numericValue.toFixed(2)}%`;
  }

  return numericValue.toLocaleString();
}

function formatCellValue(key: string, value: unknown) {
  if (METRIC_OPTIONS.some((option) => option.value === key)) {
    return formatMetricValue(key as ReportMetric, value);
  }

  return String(value ?? '-');
}

function getColumnLabel(key: string) {
  const dimension = DIMENSION_OPTIONS.find((option) => option.value === key);
  if (dimension) {
    return dimension.label;
  }

  const metric = METRIC_OPTIONS.find((option) => option.value === key);
  if (metric) {
    return metric.label;
  }

  if (key === 'summary') {
    return 'Summary';
  }

  return key;
}

function isMetricColumn(key: string) {
  return METRIC_OPTIONS.some((option) => option.value === key);
}

function compareReportValues(a: unknown, b: unknown) {
  const aNumber = Number(a);
  const bNumber = Number(b);

  if (Number.isFinite(aNumber) && Number.isFinite(bNumber)) {
    return aNumber - bNumber;
  }

  return String(a ?? '').localeCompare(String(b ?? ''), 'en-US', {
    numeric: true,
    sensitivity: 'base',
  });
}

function getReportRowKey(row: ReportRow, index: number, columns: string[]) {
  const signature = columns.map((column) => String(row[column] ?? '')).join('|');
  return `${index}-${signature}`;
}

function readSavedViews(): SavedView[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(SAVED_VIEWS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSavedViews(views: SavedView[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SAVED_VIEWS_STORAGE_KEY, JSON.stringify(views));
}

function createFilterDraft(): ReportFilterCondition {
  return {
    field: 'campaign',
    operator: 'eq',
    value: '',
  };
}

export default function Reports() {
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: DEFAULT_CONFIG.startDate,
    endDate: DEFAULT_CONFIG.endDate,
  });
  const [builder, setBuilder] = useState<BuilderConfig>(cloneConfig(DEFAULT_CONFIG));
  const [appliedConfig, setAppliedConfig] = useState<BuilderConfig>(cloneConfig(DEFAULT_CONFIG));
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [viewName, setViewName] = useState('');
  const [activeTemplateId, setActiveTemplateId] = useState<string>('traffic-command');
  const deferredSearchQuery = React.useDeferredValue(searchQuery);

  useEffect(() => {
    setSavedViews(readSavedViews());
  }, []);

  useEffect(() => {
    setBuilder((current) => ({
      ...current,
      startDate: normalizeDateValue(dateRange.startDate),
      endDate: normalizeDateValue(dateRange.endDate),
    }));
  }, [dateRange.endDate, dateRange.startDate]);

  const runReport = useCallback(async (config?: BuilderConfig) => {
    const nextConfig = cloneConfig(config || builder);

    if (nextConfig.metrics.length === 0) {
      setError('Select at least one metric before running the report.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const reportData = await queryReport({
        startDate: nextConfig.startDate,
        endDate: nextConfig.endDate,
        groupBy: nextConfig.groupBy,
        metrics: nextConfig.metrics,
        filters: nextConfig.filters.filter((filter) => String(filter.value).trim().length > 0),
        limit: nextConfig.limit,
        sortBy: nextConfig.sortBy,
        sortOrder: nextConfig.sortOrder,
      });

      setRows(Array.isArray(reportData) ? reportData : []);
      setAppliedConfig(nextConfig);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run report');
    } finally {
      setLoading(false);
    }
  }, [builder]);

  useEffect(() => {
    void runReport(DEFAULT_CONFIG);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => {
    const lowered = deferredSearchQuery.trim().toLowerCase();
    if (!lowered) {
      return rows;
    }

    return rows.filter((row) =>
      Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(lowered))
    );
  }, [deferredSearchQuery, rows]);

  const visibleColumns = useMemo(() => {
    if (appliedConfig.groupBy.length === 0) {
      return ['summary', ...appliedConfig.metrics];
    }

    return [...appliedConfig.groupBy, ...appliedConfig.metrics];
  }, [appliedConfig.groupBy, appliedConfig.metrics]);

  const resultColumns = useMemo<VirtualTableColumn<ReportRow>[]>(() => (
    visibleColumns.map((column) => {
      const metricColumn = isMetricColumn(column);

      return {
        key: column,
        label: getColumnLabel(column),
        dataIndex: column,
        width: metricColumn ? 156 : 196,
        align: metricColumn ? 'right' : 'left',
        sorter: (left, right) => compareReportValues(left[column], right[column]),
        showFilter: false,
        render: (value) => formatCellValue(column, value),
        className: metricColumn ? 'font-mono' : undefined,
      };
    })
  ), [visibleColumns]);

  const reportTableHeight = useMemo(() => (
    Math.min(Math.max(filteredRows.length, 6) * 48 + 48, 640)
  ), [filteredRows.length]);

  const summaryCards = useMemo(() => {
    const candidates = appliedConfig.metrics.slice(0, 4);

    return candidates.map((metric) => {
      const isRatio = ['roi', 'cr', 'margin'].includes(metric);
      const total = filteredRows.reduce((sum, row) => sum + Number(row[metric] ?? 0), 0);
      const value = isRatio && filteredRows.length > 0 ? total / filteredRows.length : total;

      return {
        label: getColumnLabel(metric),
        value: formatMetricValue(metric, value),
      };
    });
  }, [appliedConfig.metrics, filteredRows]);

  const isDirty = useMemo(() => JSON.stringify(builder) !== JSON.stringify(appliedConfig), [appliedConfig, builder]);

  const applyTemplate = useCallback((templateId: string) => {
    const template = REPORT_TEMPLATES.find((item) => item.id === templateId);
    if (!template) {
      return;
    }

    const nextConfig: BuilderConfig = {
      ...cloneConfig(builder),
      reportType: template.reportType,
      groupBy: [...template.groupBy],
      metrics: [...template.metrics],
      sortBy: template.sortBy,
      sortOrder: 'desc',
    };

    setBuilder(nextConfig);
    setActiveTemplateId(templateId);
    void runReport(nextConfig);
  }, [builder, runReport]);

  const toggleDimension = useCallback((dimension: ReportDimension) => {
    setBuilder((current) => {
      const active = current.groupBy.includes(dimension);
      const nextGroupBy = active
        ? current.groupBy.filter((item) => item !== dimension)
        : [...current.groupBy, dimension];

      const fallbackSort = nextGroupBy.includes(current.sortBy as ReportDimension)
        || current.metrics.includes(current.sortBy as ReportMetric)
        ? current.sortBy
        : nextGroupBy[0] || current.metrics[0];

      return {
        ...current,
        groupBy: nextGroupBy,
        sortBy: fallbackSort,
      };
    });
  }, []);

  const toggleMetric = useCallback((metric: ReportMetric) => {
    setBuilder((current) => {
      const active = current.metrics.includes(metric);
      const nextMetrics = active
        ? current.metrics.filter((item) => item !== metric)
        : [...current.metrics, metric];

      if (nextMetrics.length === 0) {
        return current;
      }

      const fallbackSort = current.groupBy.includes(current.sortBy as ReportDimension)
        || nextMetrics.includes(current.sortBy as ReportMetric)
        ? current.sortBy
        : nextMetrics[0];

      return {
        ...current,
        metrics: nextMetrics,
        sortBy: fallbackSort,
      };
    });
  }, []);

  const updateFilter = useCallback((index: number, patch: Partial<ReportFilterCondition>) => {
    setBuilder((current) => ({
      ...current,
      filters: current.filters.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    }));
  }, []);

  const saveCurrentView = useCallback(() => {
    const nextName = viewName.trim();
    if (!nextName) {
      setError('Enter a view name before saving.');
      return;
    }

    const nextView: SavedView = {
      id: typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `view-${Date.now()}`,
      name: nextName,
      createdAt: new Date().toISOString(),
      config: cloneConfig(builder),
    };

    const nextViews = [nextView, ...savedViews].slice(0, 12);
    setSavedViews(nextViews);
    writeSavedViews(nextViews);
    setViewName('');
  }, [builder, savedViews, viewName]);

  const loadSavedView = useCallback((view: SavedView) => {
    const nextConfig = cloneConfig(view.config);
    setBuilder(nextConfig);
    setAppliedConfig(nextConfig);
    setDateRange({
      startDate: nextConfig.startDate,
      endDate: nextConfig.endDate,
    });
    void runReport(nextConfig);
  }, [runReport]);

  const deleteSavedView = useCallback((id: string) => {
    const nextViews = savedViews.filter((view) => view.id !== id);
    setSavedViews(nextViews);
    writeSavedViews(nextViews);
  }, [savedViews]);

  const handleExport = useCallback(async (format: ExportFormat) => {
    setExporting(true);
    setError(null);

    try {
      const blob = await exportReport({
        type: appliedConfig.reportType,
        format,
        startDate: appliedConfig.startDate,
        endDate: appliedConfig.endDate,
        groupBy: appliedConfig.groupBy,
        metrics: appliedConfig.metrics,
        filters: appliedConfig.filters.filter((filter) => String(filter.value).trim().length > 0),
        limit: appliedConfig.limit,
        sortBy: appliedConfig.sortBy,
        sortOrder: appliedConfig.sortOrder,
        columns: visibleColumns,
      });

      const safeName = `${appliedConfig.reportType}-builder.${format === 'excel' ? 'xlsx' : 'csv'}`;
      downloadReport(blob, safeName);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
    } finally {
      setExporting(false);
    }
  }, [appliedConfig, visibleColumns]);

  return (
    <div className="min-h-full bg-background p-6">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-on-surface">Report Builder</h1>
          <p className="mt-1 max-w-3xl text-sm text-on-surface-variant">
            Build Keitaro-style analytical views with flexible dimensions, metrics, filters, saved views, and exports.
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-[minmax(280px,340px)_160px_160px]">
          <DateRangePickerComponent
            value={dateRange}
            onChange={(value) => value && setDateRange(value)}
            showTime={false}
          />
          <select
            value={builder.sortBy}
            onChange={(event) =>
              setBuilder((current) => ({
                ...current,
                sortBy: event.target.value as ReportDimension | ReportMetric,
              }))
            }
            className="border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
          >
            {[...builder.groupBy, ...builder.metrics].map((field) => (
              <option key={field} value={field}>
                Sort by {getColumnLabel(field)}
              </option>
            ))}
            {builder.groupBy.length === 0 && builder.metrics.length === 0 && <option value="clicks">Sort by Clicks</option>}
          </select>
          <select
            value={builder.sortOrder}
            onChange={(event) =>
              setBuilder((current) => ({
                ...current,
                sortOrder: event.target.value as 'asc' | 'desc',
              }))
            }
            className="border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <div className="rounded-sm border border-outline-variant bg-surface p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-on-surface">
            <BarChart3 size={16} />
            Quick Templates
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {REPORT_TEMPLATES.map((template) => {
              const active = template.id === activeTemplateId;
              return (
                <button
                  key={template.id}
                  onClick={() => applyTemplate(template.id)}
                  className={cn(
                    'rounded-sm border p-4 text-left transition-colors',
                    active
                      ? 'border-primary bg-primary/10'
                      : 'border-outline-variant/30 bg-surface-container hover:border-primary/40'
                  )}
                >
                  <div className="text-sm font-semibold text-on-surface">{template.title}</div>
                  <div className="mt-1 text-xs text-on-surface-variant">{template.description}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="rounded-sm border border-outline-variant bg-surface p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-on-surface">
            <Bookmark size={16} />
            Saved Views
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={viewName}
              onChange={(event) => setViewName(event.target.value)}
              placeholder="Save current layout as..."
              className="w-full border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface"
            />
            <button
              onClick={saveCurrentView}
              className="flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm text-on-primary"
            >
              <Save size={16} />
              Save
            </button>
          </div>
          <div className="mt-4 space-y-2">
            {savedViews.length === 0 ? (
              <div className="rounded-sm border border-dashed border-outline-variant/40 px-3 py-4 text-sm text-on-surface-variant">
                No saved views yet.
              </div>
            ) : (
              savedViews.map((view) => (
                <div key={view.id} className="flex items-center justify-between rounded-sm border border-outline-variant/20 bg-surface-container px-3 py-3">
                  <button onClick={() => loadSavedView(view)} className="text-left">
                    <div className="text-sm font-medium text-on-surface">{view.name}</div>
                    <div className="text-xs text-on-surface-variant">
                      {view.config.groupBy.map(getColumnLabel).join(' / ') || 'Summary'} · {view.config.metrics.map(getColumnLabel).join(', ')}
                    </div>
                  </button>
                  <button
                    onClick={() => deleteSavedView(view.id)}
                    className="rounded-sm border border-outline-variant px-2 py-2 text-on-surface-variant hover:text-error"
                    aria-label={`Delete saved view ${view.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
        <section className="rounded-sm border border-outline-variant bg-surface p-5">
          <div className="mb-3 text-sm font-semibold text-on-surface">Dimensions</div>
          <div className="flex flex-wrap gap-2">
            {DIMENSION_OPTIONS.map((option) => {
              const active = builder.groupBy.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => toggleDimension(option.value)}
                  className={cn(
                    'rounded-sm border px-3 py-2 text-left text-sm transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant bg-surface-container text-on-surface'
                  )}
                >
                  <div>{option.label}</div>
                  <div className="mt-1 text-[11px] text-on-surface-variant">{option.hint}</div>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-sm border border-outline-variant bg-surface p-5">
          <div className="mb-3 text-sm font-semibold text-on-surface">Metrics</div>
          <div className="flex flex-wrap gap-2">
            {METRIC_OPTIONS.map((option) => {
              const active = builder.metrics.includes(option.value);
              return (
                <button
                  key={option.value}
                  onClick={() => toggleMetric(option.value)}
                  className={cn(
                    'rounded-sm border px-3 py-2 text-sm transition-colors',
                    active
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-outline-variant bg-surface-container text-on-surface'
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-sm border border-outline-variant bg-surface p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-on-surface">
            <Filter size={16} />
            Filters
          </div>
          <div className="space-y-3">
            {builder.filters.length === 0 ? (
              <div className="rounded-sm border border-dashed border-outline-variant/40 px-3 py-4 text-sm text-on-surface-variant">
                No filters. Add rules for country, device, campaign, or even metric thresholds like ROI greater than 20.
              </div>
            ) : (
              builder.filters.map((filter, index) => (
                <div key={`${filter.field}-${index}`} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
                  <select
                    value={filter.field}
                    onChange={(event) =>
                      updateFilter(index, { field: event.target.value as ReportDimension | ReportMetric })
                    }
                    className="border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface"
                  >
                    {FILTER_FIELD_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <select
                    value={filter.operator}
                    onChange={(event) => updateFilter(index, { operator: event.target.value as ReportFilterOperator })}
                    className="border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface"
                  >
                    {FILTER_OPERATORS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={String(filter.value)}
                    onChange={(event) => updateFilter(index, { value: event.target.value })}
                    placeholder="Filter value"
                    className="border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface"
                  />
                  <button
                    onClick={() =>
                      setBuilder((current) => ({
                        ...current,
                        filters: current.filters.filter((_, itemIndex) => itemIndex !== index),
                      }))
                    }
                    className="rounded-sm border border-outline-variant px-3 py-2 text-on-surface-variant hover:text-error"
                    aria-label="Remove filter"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            )}
            <button
              onClick={() =>
                setBuilder((current) => ({
                  ...current,
                  filters: [...current.filters, createFilterDraft()],
                }))
              }
              className="flex items-center gap-2 rounded-sm border border-outline-variant px-3 py-2 text-sm text-on-surface"
            >
              <Plus size={14} />
              Add filter
            </button>
          </div>
        </section>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Rows" value={filteredRows.length.toLocaleString()} />
        <SummaryCard label="Dimensions" value={(appliedConfig.groupBy.length || 0).toString()} />
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button
          onClick={() => void runReport()}
          disabled={loading}
          className="flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm text-on-primary"
        >
          <Play size={16} />
          Run Report
        </button>
        <button
          onClick={() => {
            setBuilder(cloneConfig(DEFAULT_CONFIG));
            setDateRange({ startDate: DEFAULT_CONFIG.startDate, endDate: DEFAULT_CONFIG.endDate });
            setActiveTemplateId('traffic-command');
          }}
          className="flex items-center gap-2 rounded-sm border border-outline-variant px-4 py-2 text-sm text-on-surface"
        >
          <RefreshCw size={16} />
          Reset Builder
        </button>
        <button
          onClick={() => void handleExport('csv')}
          disabled={exporting}
          className="flex items-center gap-2 rounded-sm border border-outline-variant px-4 py-2 text-sm text-on-surface"
        >
          <Download size={16} />
          Export CSV
        </button>
        <button
          onClick={() => void handleExport('excel')}
          disabled={exporting}
          className="flex items-center gap-2 rounded-sm border border-outline-variant px-4 py-2 text-sm text-on-surface"
        >
          <Download size={16} />
          Export Excel
        </button>
        <div className="ml-auto flex items-center gap-2 rounded-sm border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface-variant">
          <Search size={14} />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search visible rows"
            className="bg-transparent outline-none placeholder:text-on-surface-variant"
          />
        </div>
      </div>

      {isDirty && (
        <div className="mb-4 rounded-sm border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-on-surface">
          Builder settings changed but not yet applied. Click <strong>Run Report</strong> to refresh the dataset.
        </div>
      )}

      {error && <div className="mb-4 rounded-sm border border-error/20 bg-error/10 p-4 text-sm text-error">{error}</div>}

      <VirtualTableEnhanced
        tableId="report-builder-results"
        columns={resultColumns}
        data={filteredRows}
        loading={loading}
        rowHeight={48}
        height={reportTableHeight}
        overscan={10}
        emptyMessage={searchQuery.trim() ? 'No rows matched the current query.' : 'Run a report to see results.'}
        getRowId={(row, index) => getReportRowKey(row, index, visibleColumns)}
        className="overflow-x-auto rounded-sm border border-outline-variant bg-surface"
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-sm border border-outline-variant/20 bg-surface-container-lowest p-4">
      <div className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">{label}</div>
      <div className="mt-2 text-2xl font-display font-bold text-on-surface">{value}</div>
    </div>
  );
}
