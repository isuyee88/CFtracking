import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Bookmark,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Download,
  Filter,
  Play,
  Plus,
  RefreshCw,
  Save,
  Search,
  Trash2,
} from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DateRangePickerComponent, getDateRange, type DateRangeValue } from '@/components/DateRangePicker';
import {
  createExportTask,
  downloadReport,
  exportReport,
  fetchReportMetadata,
  queryReport,
  listReportPresets,
  createReportPreset,
  deleteReportPreset,
  type ClickLogParams,
  type ExportFormat,
  type ReportDimension,
  type ReportDimensionOption,
  type ReportFilterCondition,
  type ReportFilterOperator,
  type ReportMetric,
  type ReportMetricOption,
  type ReportPresetRecord,
  type ReportType,
} from '../services/api';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from 'recharts';
import { VirtualTableEnhanced } from '../components/VirtualTableEnhanced';
import type { VirtualTableColumn } from '../components/VirtualTable';
import { FIELD_MAX_LENGTH, DISPLAY_MAX_LENGTH } from '../constants/fieldConstraints';
import { clampInput, truncateLabel } from '../utils/text';

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
  remote?: boolean;
}

type ReportRow = Record<string, string | number | null | undefined>;

const SAVED_VIEWS_STORAGE_KEY = 'cftracking.report-builder.saved-views.v1';
const SAVED_VIEW_NAME_MAX_LENGTH = FIELD_MAX_LENGTH.NAME;

const DEFAULT_DIMENSION_OPTIONS: ReportDimensionOption[] = [
  { value: 'campaign', label: 'Campaign', hint: 'Campaign performance leaderboard' },
  { value: 'offer', label: 'Offer', hint: 'Offer payout and conversion split' },
  { value: 'landing', label: 'Landing', hint: 'Landing page funnel breakdown' },
  { value: 'flow', label: 'Flow', hint: 'Routing path performance' },
  { value: 'country', label: 'Country', hint: 'Geo segmentation' },
  { value: 'device', label: 'Device', hint: 'Desktop / mobile split' },
  { value: 'browser', label: 'Browser', hint: 'Browser quality and compatibility' },
  { value: 'source', label: 'Traffic Source', hint: 'Campaign-bound traffic source name or identifier' },
  { value: 'zoneid', label: 'Zone ID', hint: 'Zone signature from subId1 -> subId2 -> subId3 fallback' },
  { value: 'utm_source', label: 'UTM Source', hint: 'Raw utm_source captured from the tracking URL' },
  { value: 'utm_campaign', label: 'UTM Campaign', hint: 'UTM campaign token' },
  { value: 'subid1', label: 'SubID1', hint: 'Primary sub identifier' },
  { value: 'subid2', label: 'SubID2', hint: 'Secondary sub identifier' },
  { value: 'subid3', label: 'SubID3', hint: 'Third-level sub identifier' },
  { value: 'date', label: 'Date', hint: 'Day-by-day trend table' },
];

const DEFAULT_METRIC_OPTIONS: ReportMetricOption[] = [
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
  { value: 'unique_clicks', label: 'Unique Clicks', format: 'number' },
  { value: 'unique_visitors', label: 'Unique Visitors', format: 'number' },
  { value: 'fraud_clicks', label: 'Fraud Clicks', format: 'number' },
  { value: 'bot_clicks', label: 'Bot Clicks', format: 'number' },
  { value: 'avg_fraud_score', label: 'Avg Fraud Score', format: 'number' },
  { value: 'blacklist_hits', label: 'Blacklist Hits', format: 'number' },
  { value: 'blacklist_rate', label: 'Blacklist Rate', format: 'percent' },
  { value: 'rule_hits', label: 'Rule Hits', format: 'number' },
  { value: 'blocked', label: 'Blocked', format: 'number' },
];

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
  {
    id: 'fraud-source-scan',
    title: 'Fraud Source Scan',
    description: 'Source / zone / subID fraud exposure with blacklist ratio',
    reportType: 'traffic',
    groupBy: ['campaign', 'source', 'zoneid'],
    metrics: ['clicks', 'fraud_clicks', 'avg_fraud_score', 'blacklist_rate', 'rule_hits', 'blocked'],
    sortBy: 'fraud_clicks',
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

const REPORT_TO_CLICK_LOG_PARAM_MAP: Partial<Record<ReportDimension, keyof ClickLogParams>> = {
  campaign: 'campaignId',
  offer: 'offerId',
  flow: 'flowId',
  country: 'country',
  device: 'device',
  browser: 'browser',
  source: 'source',
  zoneid: 'zoneId',
  utm_source: 'utmSource',
  utm_campaign: 'utmCampaign',
  subid1: 'subId1',
  subid2: 'subId2',
  subid3: 'subId3',
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

function formatMetricValue(metric: ReportMetric, value: unknown, metricOptions: ReportMetricOption[]) {
  const numericValue = Number(value ?? 0);
  const option = metricOptions.find((item) => item.value === metric);

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

function formatCellValue(key: string, value: unknown, metricOptions: ReportMetricOption[]) {
  if (metricOptions.some((option) => option.value === key)) {
    return formatMetricValue(key as ReportMetric, value, metricOptions);
  }

  return String(value ?? '-');
}

function getColumnLabel(
  key: string,
  dimensionOptions: ReportDimensionOption[],
  metricOptions: ReportMetricOption[]
) {
  const dimension = dimensionOptions.find((option) => option.value === key);
  if (dimension) {
    return dimension.label;
  }

  const metric = metricOptions.find((option) => option.value === key);
  if (metric) {
    return metric.label;
  }

  if (key === 'summary') {
    return 'Summary';
  }

  return key;
}

function isMetricColumn(key: string, metricOptions: ReportMetricOption[]) {
  return metricOptions.some((option) => option.value === key);
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

// 服务端预设的 config 仅做 JSON 透传，前端必须校验结构后才能安全喂给 Builder
function normalizePresetConfig(raw: unknown): BuilderConfig | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }

  const candidate = raw as Partial<BuilderConfig>;
  if (typeof candidate.startDate !== 'string' || typeof candidate.endDate !== 'string') {
    return null;
  }

  return {
    reportType: (candidate.reportType || 'traffic') as BuilderConfig['reportType'],
    startDate: normalizeDateValue(candidate.startDate),
    endDate: normalizeDateValue(candidate.endDate),
    groupBy: Array.isArray(candidate.groupBy) ? (candidate.groupBy as ReportDimension[]) : [],
    metrics:
      Array.isArray(candidate.metrics) && candidate.metrics.length > 0
        ? (candidate.metrics as ReportMetric[])
        : [...DEFAULT_CONFIG.metrics],
    filters: Array.isArray(candidate.filters)
      ? candidate.filters.filter((item) => Boolean(item?.field && item?.operator))
      : [],
    limit: Number(candidate.limit) > 0 ? Number(candidate.limit) : DEFAULT_CONFIG.limit,
    sortBy: (candidate.sortBy || 'clicks') as BuilderConfig['sortBy'],
    sortOrder: candidate.sortOrder === 'asc' ? 'asc' : 'desc',
  };
}

function mapPresetsToViews(presets: ReportPresetRecord[]): SavedView[] {
  return presets
    .map((preset) => {
      const config = normalizePresetConfig(preset.config);
      if (!config) {
        return null;
      }

      return {
        id: preset.id,
        name: preset.name,
        createdAt: preset.createdAt || '',
        config,
        remote: true,
      } satisfies SavedView;
    })
    .filter((item): item is SavedView => item !== null);
}

function mergeDimensionOptions(remote: ReportDimensionOption[]) {
  const merged = new Map<string, ReportDimensionOption>();

  for (const item of DEFAULT_DIMENSION_OPTIONS) {
    merged.set(item.value, item);
  }

  for (const item of remote) {
    if (!item?.value) {
      continue;
    }
    merged.set(item.value, {
      value: item.value,
      label: item.label || item.value,
      hint: item.hint || '',
    });
  }

  return Array.from(merged.values());
}

function mergeMetricOptions(remote: ReportMetricOption[]) {
  const merged = new Map<string, ReportMetricOption>();

  for (const item of DEFAULT_METRIC_OPTIONS) {
    merged.set(item.value, item);
  }

  for (const item of remote) {
    if (!item?.value) {
      continue;
    }

    merged.set(item.value, {
      value: item.value,
      label: item.label || item.value,
      format: item.format || 'number',
      isCustom: Boolean(item.isCustom),
    });
  }

  return Array.from(merged.values());
}

function createFilterDraft(): ReportFilterCondition {
  return {
    field: 'campaign',
    operator: 'eq',
    value: '',
  };
}

function parseFiltersParam(raw: string | null): ReportFilterCondition[] {
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is ReportFilterCondition => Boolean(item?.field && item?.operator))
      : [];
  } catch {
    return [];
  }
}

function parseCsvParam(raw: string | null): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseConfigFromSearchParams(searchParams: URLSearchParams): BuilderConfig {
  const defaultClone = cloneConfig(DEFAULT_CONFIG);
  const startDate = searchParams.get('startDate') || defaultClone.startDate;
  const endDate = searchParams.get('endDate') || defaultClone.endDate;
  const groupBy = parseCsvParam(searchParams.get('groupBy')) as ReportDimension[];
  const metrics = parseCsvParam(searchParams.get('metrics')) as ReportMetric[];
  const filters = parseFiltersParam(searchParams.get('filters'));
  const sortBy = (searchParams.get('sortBy') || defaultClone.sortBy) as ReportDimension | ReportMetric;
  const sortOrder = searchParams.get('sortOrder') === 'asc' ? 'asc' : defaultClone.sortOrder;
  const limit = Math.max(Number(searchParams.get('limit') || defaultClone.limit) || defaultClone.limit, 1);
  const reportType = (searchParams.get('reportType') || defaultClone.reportType) as ReportType;

  return {
    reportType,
    startDate: normalizeDateValue(startDate),
    endDate: normalizeDateValue(endDate),
    groupBy: groupBy.length > 0 ? groupBy : defaultClone.groupBy,
    metrics: metrics.length > 0 ? metrics : defaultClone.metrics,
    filters,
    limit,
    sortBy,
    sortOrder,
  };
}

function buildSearchParamsFromConfig(config: BuilderConfig): URLSearchParams {
  const searchParams = new URLSearchParams();
  searchParams.set('reportType', config.reportType);
  searchParams.set('startDate', normalizeDateValue(config.startDate));
  searchParams.set('endDate', normalizeDateValue(config.endDate));
  searchParams.set('groupBy', config.groupBy.join(','));
  searchParams.set('metrics', config.metrics.join(','));
  searchParams.set('sortBy', config.sortBy);
  searchParams.set('sortOrder', config.sortOrder);
  searchParams.set('limit', String(config.limit));

  const filters = config.filters.filter((filter) => String(filter.value).trim().length > 0);
  if (filters.length > 0) {
    searchParams.set('filters', JSON.stringify(filters));
  }

  return searchParams;
}

function normalizeFilterValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value.trim();
  }

  return String(value).trim();
}

export default function Reports() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialConfig = useMemo(() => parseConfigFromSearchParams(searchParams), [searchParams]);
  const [dateRange, setDateRange] = useState<DateRangeValue>({
    startDate: initialConfig.startDate,
    endDate: initialConfig.endDate,
  });
  const [builder, setBuilder] = useState<BuilderConfig>(cloneConfig(initialConfig));
  const [appliedConfig, setAppliedConfig] = useState<BuilderConfig>(cloneConfig(initialConfig));
  const scopedCampaignId = useMemo(
    () =>
      appliedConfig.filters.find(
        (filter) => filter.field === 'campaign' && filter.operator === 'eq' && String(filter.value).trim().length > 0
      )?.value,
    [appliedConfig.filters]
  );
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [queueingFormat, setQueueingFormat] = useState<ExportFormat | null>(null);
  const [showDimensions, setShowDimensions] = useState(false);
  const [showMetrics, setShowMetrics] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [viewName, setViewName] = useState('');
  const [viewMode, setViewMode] = useState<'table' | 'chart'>('table');
  const [chartType, setChartType] = useState<'bar' | 'line' | 'area'>('bar');
  const [chartMetric, setChartMetric] = useState<ReportMetric>('clicks');
  const [chartDim, setChartDim] = useState<ReportDimension | ''>('');
  const [activeTemplateId, setActiveTemplateId] = useState<string>('traffic-command');
  const [dimensionOptions, setDimensionOptions] = useState<ReportDimensionOption[]>(DEFAULT_DIMENSION_OPTIONS);
  const [metricOptions, setMetricOptions] = useState<ReportMetricOption[]>(DEFAULT_METRIC_OPTIONS);
  const deferredSearchQuery = React.useDeferredValue(searchQuery);

  useEffect(() => {
    let active = true;

    // 预设以服务端为准（多端一致）；服务端不可用时降级 localStorage，保证视图可读
    const loadViews = async () => {
      try {
        const presets = await listReportPresets();
        if (!active) {
          return;
        }
        setSavedViews(mapPresetsToViews(presets));
      } catch {
        if (active) {
          setSavedViews(readSavedViews());
        }
      }
    };

    void loadViews();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const loadMetadata = async () => {
      try {
        const metadata = await fetchReportMetadata();
        if (!active) {
          return;
        }

        setDimensionOptions(mergeDimensionOptions(metadata.dimensions || []));
        setMetricOptions(mergeMetricOptions(metadata.metrics || []));
      } catch {
        if (!active) {
          return;
        }

        setDimensionOptions(DEFAULT_DIMENSION_OPTIONS);
        setMetricOptions(DEFAULT_METRIC_OPTIONS);
      }
    };

    void loadMetadata();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setBuilder((current) => ({
      ...current,
      startDate: normalizeDateValue(dateRange.startDate),
      endDate: normalizeDateValue(dateRange.endDate),
    }));
  }, [dateRange.endDate, dateRange.startDate]);

  const filterFieldOptions = useMemo(
    () =>
      [
        ...dimensionOptions.map((option) => ({ value: option.value, label: option.label })),
        ...metricOptions.map((option) => ({ value: option.value, label: option.label })),
      ] as Array<{ value: ReportDimension | ReportMetric; label: string }>,
    [dimensionOptions, metricOptions]
  );

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
        reportType: nextConfig.reportType,
      });

      setRows(Array.isArray(reportData) ? reportData : []);
      setAppliedConfig(nextConfig);
      setSearchParams(buildSearchParamsFromConfig(nextConfig), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run report');
    } finally {
      setLoading(false);
    }
  }, [builder, setSearchParams]);

  useEffect(() => {
    void runReport(initialConfig);
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
      const metricColumn = isMetricColumn(column, metricOptions);

      return {
        key: column,
        label: getColumnLabel(column, dimensionOptions, metricOptions),
        dataIndex: column,
        width: metricColumn ? 156 : 196,
        align: metricColumn ? 'right' : 'left',
        sorter: (left, right) => compareReportValues(left[column], right[column]),
        showFilter: false,
        render: (value) => formatCellValue(column, value, metricOptions),
        className: metricColumn ? 'font-mono' : undefined,
      };
    })
  ), [dimensionOptions, metricOptions, visibleColumns]);

  const reportTableHeight = useMemo(() => (
    Math.min(Math.max(filteredRows.length, 6) * 48 + 48, 640)
  ), [filteredRows.length]);

  const buildClickLogHref = useCallback((row?: ReportRow) => {
    const params = new URLSearchParams();
    params.set('startDate', appliedConfig.startDate);
    params.set('endDate', appliedConfig.endDate);

    appliedConfig.filters.forEach((filter) => {
      if (filter.operator !== 'eq') {
        return;
      }

      const mappedKey = REPORT_TO_CLICK_LOG_PARAM_MAP[filter.field as ReportDimension];
      const normalizedValue = normalizeFilterValue(filter.value);
      if (mappedKey && normalizedValue) {
        params.set(mappedKey, normalizedValue);
      }

      if (filter.field === 'date' && normalizedValue) {
        params.set('startDate', normalizedValue);
        params.set('endDate', normalizedValue);
      }
    });

    if (row) {
      appliedConfig.groupBy.forEach((dimension) => {
        const mappedKey = REPORT_TO_CLICK_LOG_PARAM_MAP[dimension];
        const normalizedValue = normalizeFilterValue(row[dimension]);
        if (mappedKey && normalizedValue) {
          params.set(mappedKey, normalizedValue);
        }
        if (dimension === 'date' && normalizedValue) {
          params.set('startDate', normalizedValue);
          params.set('endDate', normalizedValue);
        }
      });
    }

    return `/audit?${params.toString()}`;
  }, [appliedConfig]);

  const summaryCards = useMemo(() => {
    const candidates = appliedConfig.metrics.slice(0, 4);

    return candidates.map((metric) => {
      const isRatio = ['roi', 'cr', 'margin'].includes(metric);
      const total = filteredRows.reduce((sum, row) => sum + Number(row[metric] ?? 0), 0);
      const value = isRatio && filteredRows.length > 0 ? total / filteredRows.length : total;

      return {
        label: getColumnLabel(metric, dimensionOptions, metricOptions),
        value: formatMetricValue(metric, value, metricOptions),
      };
    });
  }, [appliedConfig.metrics, dimensionOptions, filteredRows, metricOptions]);

  const isDirty = useMemo(() => JSON.stringify(builder) !== JSON.stringify(appliedConfig), [appliedConfig, builder]);

  // 图表维度：默认取第一个分组维度；日期维度做趋势升序并放宽到 60 点，其余维度取前 12 行
  const chartDimension = chartDim || appliedConfig.groupBy[0];

  const chartData = useMemo(() => {
    if (chartDimension === 'date') {
      return [...filteredRows]
        .sort((a, b) => String(a.date ?? '').localeCompare(String(b.date ?? '')))
        .slice(0, 60)
        .map((row) => ({
          label: truncateLabel(String(row.date ?? '-'), 24),
          value: Number(row[chartMetric] ?? 0),
        }));
    }

    return filteredRows.slice(0, 12).map((row, index) => ({
      label: chartDimension ? truncateLabel(String(row[chartDimension] ?? '-'), 24) : `Row ${index + 1}`,
      value: Number(row[chartMetric] ?? 0),
    }));
  }, [chartDimension, chartMetric, filteredRows]);

  useEffect(() => {
    if (!appliedConfig.metrics.includes(chartMetric)) {
      setChartMetric(appliedConfig.metrics[0] || 'clicks');
    }
  }, [appliedConfig.metrics, chartMetric]);

  useEffect(() => {
    if (chartDim && !appliedConfig.groupBy.includes(chartDim)) {
      setChartDim('');
    }
  }, [appliedConfig.groupBy, chartDim]);

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

  const saveCurrentView = useCallback(async () => {
    const nextName = clampInput(viewName.trim(), SAVED_VIEW_NAME_MAX_LENGTH);
    if (!nextName) {
      setError('Enter a view name before saving.');
      return;
    }

    const config = cloneConfig(builder);
    setViewName('');

    try {
      // 服务端保存成功后重拉列表，保证多端一致
      const preset = await createReportPreset({ name: nextName, reportType: config.reportType, config });
      if (!preset) {
        throw new Error('Preset save returned empty payload');
      }
      const presets = await listReportPresets();
      setSavedViews(mapPresetsToViews(presets));
      setNotice(`View "${nextName}" saved to server.`);
    } catch {
      // 服务端不可用时降级本地保存，保证用户配置不丢失
      const nextView: SavedView = {
        id: typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : `view-${Date.now()}`,
        name: nextName,
        createdAt: new Date().toISOString(),
        config,
      };

      const nextViews = [nextView, ...savedViews].slice(0, 12);
      setSavedViews(nextViews);
      writeSavedViews(nextViews);
      setNotice(`View "${nextName}" saved locally (server unavailable).`);
    }
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

  const deleteSavedView = useCallback(async (view: SavedView) => {
    if (view.remote) {
      try {
        await deleteReportPreset(view.id);
        setSavedViews((current) => current.filter((item) => item.id !== view.id));
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to delete saved view');
      }
      return;
    }

    const nextViews = savedViews.filter((item) => item.id !== view.id);
    setSavedViews(nextViews);
    writeSavedViews(nextViews);
  }, [savedViews]);

  const handleExport = useCallback(async (format: ExportFormat) => {
    setExporting(true);
    setError(null);
    setNotice(null);

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

  const handleQueueExport = useCallback(async (format: ExportFormat) => {
    setQueueingFormat(format);
    setError(null);
    setNotice(null);

    const normalizedFilters = appliedConfig.filters.filter((filter) => String(filter.value).trim().length > 0);
    const today = new Date().toISOString().split('T')[0] || '';

    const payload = {
      name: `${appliedConfig.reportType}-report-${today}-${format}`,
      entityType: 'reports' as const,
      format,
      dateRange: {
        startDate: appliedConfig.startDate,
        endDate: appliedConfig.endDate,
      },
      fields: visibleColumns,
      filters: {
        reportType: appliedConfig.reportType,
        groupBy: appliedConfig.groupBy,
        metrics: appliedConfig.metrics,
        filters: normalizedFilters,
        limit: appliedConfig.limit,
        sortBy: appliedConfig.sortBy,
        sortOrder: appliedConfig.sortOrder,
        columns: visibleColumns,
      },
    };

    try {
      await createExportTask(payload);
      setNotice(`Queued ${format.toUpperCase()} export. You can monitor progress in Exported Reports.`);

      if (typeof window !== 'undefined') {
        try {
          window.sessionStorage.setItem('cftracking.export-task-draft.v1', JSON.stringify(payload));
        } catch {
          // Ignore session storage failures in restricted contexts.
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to queue export task');
    } finally {
      setQueueingFormat(null);
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
          {scopedCampaignId && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-sm border border-primary/20 bg-primary/10 px-3 py-2 text-xs font-bold uppercase tracking-widest text-primary">
              <Crosshair size={14} />
              Campaign Scope {String(scopedCampaignId)}
            </div>
          )}
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
                Sort by {getColumnLabel(field, dimensionOptions, metricOptions)}
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
              onChange={(event) => setViewName(clampInput(event.target.value, SAVED_VIEW_NAME_MAX_LENGTH))}
              placeholder="Save current layout as..."
              maxLength={SAVED_VIEW_NAME_MAX_LENGTH}
              className="w-full border border-outline-variant bg-surface-container px-3 py-2 text-sm text-on-surface"
            />
            <button
              onClick={() => void saveCurrentView()}
              className="flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm text-on-primary"
            >
              <Save size={16} />
              Save
            </button>
          </div>
          <div className="mt-1 text-right text-[11px] text-on-surface-variant/70">
            {viewName.length}/{SAVED_VIEW_NAME_MAX_LENGTH}
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
                    <div className="text-sm font-medium text-on-surface" title={view.name}>
                      {truncateLabel(view.name, DISPLAY_MAX_LENGTH.TABLE_PRIMARY_TEXT)}
                    </div>
                    <div
                      className="max-w-[28rem] truncate text-xs text-on-surface-variant"
                      title={`${view.config.groupBy
                        .map((field) => getColumnLabel(field, dimensionOptions, metricOptions))
                        .join(' / ') || 'Summary'} · ${view.config.metrics
                        .map((field) => getColumnLabel(field, dimensionOptions, metricOptions))
                        .join(', ')}`}
                    >
                      {truncateLabel(
                        `${view.config.groupBy
                          .map((field) => getColumnLabel(field, dimensionOptions, metricOptions))
                          .join(' / ') || 'Summary'} · ${view.config.metrics
                          .map((field) => getColumnLabel(field, dimensionOptions, metricOptions))
                          .join(', ')}`,
                        DISPLAY_MAX_LENGTH.TABLE_SECONDARY_TEXT
                      )}
                    </div>
                  </button>
                  <button
                    onClick={() => void deleteSavedView(view)}
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

      <section className="mb-6 rounded-sm border border-outline-variant bg-surface p-5">
        <div className="flex flex-col gap-3 border-b border-outline-variant/60 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-on-surface">Builder Area</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Keep the first screen focused, then expand dimensions, metrics, or filters only when you need to refine the report.
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-sm bg-surface-container px-3 py-2 text-on-surface-variant">
              {builder.groupBy.length} dimensions selected
            </span>
            <span className="rounded-sm bg-surface-container px-3 py-2 text-on-surface-variant">
              {builder.metrics.length} metrics selected
            </span>
            <span className="rounded-sm bg-surface-container px-3 py-2 text-on-surface-variant">
              {builder.filters.length} filters configured
            </span>
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.2fr_1fr_1fr]">
          <BuilderPanel
            title="Dimensions"
            subtitle="Group the report by campaign, geo, device, sub IDs, or daily trend axes."
            countLabel={`${builder.groupBy.length} selected`}
            open={showDimensions}
            onToggle={() => setShowDimensions((current) => !current)}
          >
            <div className="flex flex-wrap gap-2">
              {dimensionOptions.map((option) => {
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
          </BuilderPanel>

          <BuilderPanel
            title="Metrics"
            subtitle="Choose the counters and value columns that should be calculated for each row."
            countLabel={`${builder.metrics.length} selected`}
            open={showMetrics}
            onToggle={() => setShowMetrics((current) => !current)}
          >
            <div className="flex flex-wrap gap-2">
              {metricOptions.map((option) => {
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
          </BuilderPanel>

          <BuilderPanel
            title="Filters"
            subtitle="Add only the rules you need so the report surface stays readable."
            countLabel={`${builder.filters.length} configured`}
            open={showFilters}
            onToggle={() => setShowFilters((current) => !current)}
          >
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
                      {filterFieldOptions.map((option) => (
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
          </BuilderPanel>
        </div>
      </section>

      <div className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <SummaryCard label="Rows" value={filteredRows.length.toLocaleString()} />
        <SummaryCard label="Dimensions" value={(appliedConfig.groupBy.length || 0).toString()} />
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} label={card.label} value={card.value} />
        ))}
      </div>

      <section className="rounded-sm border border-outline-variant bg-surface p-5">
        <div className="mb-4 flex flex-col gap-2 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-on-surface">Results Area</h2>
            <p className="mt-1 text-sm text-on-surface-variant">
              Apply the builder when you are ready, then search, export, or drill into matching click logs.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex overflow-hidden rounded-sm border border-outline-variant">
              {([
                ['table', 'Table', () => setViewMode('table'), viewMode === 'table'],
                ['bar', 'Bar', () => { setViewMode('chart'); setChartType('bar'); }, viewMode === 'chart' && chartType === 'bar'],
                ['line', 'Line', () => { setViewMode('chart'); setChartType('line'); }, viewMode === 'chart' && chartType === 'line'],
                ['area', 'Area', () => { setViewMode('chart'); setChartType('area'); }, viewMode === 'chart' && chartType === 'area'],
              ] as Array<[string, string, () => void, boolean]>).map(([key, label, onClick, active]) => (
                <button
                  key={key}
                  onClick={onClick}
                  className={cn(
                    'px-3 py-2 text-xs font-semibold uppercase tracking-widest',
                    active ? 'bg-primary text-on-primary' : 'bg-surface text-on-surface-variant'
                  )}
                  aria-pressed={active}
                >
                  {label}
                </button>
              ))}
            </div>
            {viewMode === 'chart' && appliedConfig.groupBy.length > 1 && (
              <select
                value={chartDimension || ''}
                onChange={(event) => setChartDim(event.target.value as ReportDimension)}
                className="border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                aria-label="Chart dimension"
              >
                {appliedConfig.groupBy.map((dimension) => (
                  <option key={dimension} value={dimension}>
                    {getColumnLabel(dimension, dimensionOptions, metricOptions)}
                  </option>
                ))}
              </select>
            )}
            {viewMode === 'chart' && (
              <select
                value={chartMetric}
                onChange={(event) => setChartMetric(event.target.value as ReportMetric)}
                className="border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface"
                aria-label="Chart metric"
              >
                {appliedConfig.metrics.map((metric) => (
                  <option key={metric} value={metric}>
                    {getColumnLabel(metric, dimensionOptions, metricOptions)}
                  </option>
                ))}
              </select>
            )}
          </div>
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
          disabled={exporting || queueingFormat !== null}
          className="flex items-center gap-2 rounded-sm border border-outline-variant px-4 py-2 text-sm text-on-surface"
        >
          <Download size={16} />
          Export CSV
        </button>
        <button
          onClick={() => void handleExport('excel')}
          disabled={exporting || queueingFormat !== null}
          className="flex items-center gap-2 rounded-sm border border-outline-variant px-4 py-2 text-sm text-on-surface"
        >
          <Download size={16} />
          Export Excel
        </button>
        <button
          onClick={() => void handleQueueExport('csv')}
          disabled={exporting || queueingFormat !== null}
          className="flex items-center gap-2 rounded-sm border border-outline-variant px-4 py-2 text-sm text-on-surface"
        >
          <Plus size={16} />
          {queueingFormat === 'csv' ? 'Queueing CSV...' : 'Queue CSV'}
        </button>
        <button
          onClick={() => void handleQueueExport('excel')}
          disabled={exporting || queueingFormat !== null}
          className="flex items-center gap-2 rounded-sm border border-outline-variant px-4 py-2 text-sm text-on-surface"
        >
          <Plus size={16} />
          {queueingFormat === 'excel' ? 'Queueing Excel...' : 'Queue Excel'}
        </button>
        {scopedCampaignId && (
          <button
            onClick={() => navigate(buildClickLogHref())}
            className="flex items-center gap-2 rounded-sm border border-outline-variant px-4 py-2 text-sm text-on-surface"
          >
            <Filter size={16} />
            Open Click Log
          </button>
        )}
        <button
          onClick={() => navigate('/exported-reports')}
          className="flex items-center gap-2 rounded-sm border border-outline-variant px-4 py-2 text-sm text-on-surface"
        >
          <BarChart3 size={16} />
          Open Export Queue
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

        {notice && (
          <div className="mb-4 rounded-sm border border-success/20 bg-success/10 p-4 text-sm text-success">{notice}</div>
        )}

        {error && <div className="mb-4 rounded-sm border border-error/20 bg-error/10 p-4 text-sm text-error">{error}</div>}

        {filteredRows.length === 0 && !loading ? (
          <div className="rounded-sm border border-dashed border-outline-variant/50 bg-surface-container px-5 py-10 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-surface text-on-surface-variant">
              <BarChart3 size={20} />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-on-surface">No results on screen yet</h3>
            <p className="mt-2 text-sm text-on-surface-variant">
              Keep the builder compact until you are ready, then run the report to populate the result table.
            </p>
          </div>
        ) : viewMode === 'chart' ? (
          <div className="h-[420px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'line' ? (
                <LineChart data={chartData} margin={{ top: 12, right: 16, left: 8, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={72} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} width={72} />
                  <RechartsTooltip
                    formatter={(value) => formatMetricValue(chartMetric, value, metricOptions)}
                    labelFormatter={(label) => String(label)}
                  />
                  <Line type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} dot={chartData.length <= 20} />
                </LineChart>
              ) : chartType === 'area' ? (
                <AreaChart data={chartData} margin={{ top: 12, right: 16, left: 8, bottom: 28 }}>
                  <defs>
                    <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#2563eb" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#2563eb" stopOpacity={0.04} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={72} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} width={72} />
                  <RechartsTooltip
                    formatter={(value) => formatMetricValue(chartMetric, value, metricOptions)}
                    labelFormatter={(label) => String(label)}
                  />
                  <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={2} fill="url(#areaFill)" />
                </AreaChart>
              ) : (
                <BarChart data={chartData} margin={{ top: 12, right: 16, left: 8, bottom: 28 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(128, 128, 128, 0.2)" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} angle={-35} textAnchor="end" height={72} interval={0} />
                  <YAxis tick={{ fontSize: 11 }} width={72} />
                  <RechartsTooltip
                    formatter={(value) => formatMetricValue(chartMetric, value, metricOptions)}
                    labelFormatter={(label) => String(label)}
                  />
                  <Bar dataKey="value" fill="#2563eb" radius={[3, 3, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
            <p className="mt-2 text-xs text-on-surface-variant">
              {chartDimension === 'date'
                ? `Trend of top ${chartData.length} dates (ascending), metric: ${getColumnLabel(chartMetric, dimensionOptions, metricOptions)}.`
                : `Showing top ${chartData.length} rows grouped by ${getColumnLabel(chartDimension || 'summary', dimensionOptions, metricOptions)}.`}
            </p>
          </div>
        ) : (
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
            onRowClick={(row) => navigate(buildClickLogHref(row))}
            rowClassName={() => 'cursor-pointer hover:bg-surface-container/60'}
            className="overflow-x-auto rounded-sm border border-outline-variant bg-surface"
          />
        )}
      </section>
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

function BuilderPanel({
  title,
  subtitle,
  countLabel,
  open,
  onToggle,
  children,
}: {
  title: string;
  subtitle: string;
  countLabel: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-sm border border-outline-variant bg-surface">
      <div className="flex items-start justify-between gap-3 p-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-on-surface">{title}</h2>
            <span className="rounded-sm bg-surface-container px-2 py-1 text-[11px] text-on-surface-variant">
              {countLabel}
            </span>
          </div>
          <p className="mt-1 text-xs text-on-surface-variant">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center gap-1 rounded-sm border border-outline-variant px-2 py-1 text-xs text-on-surface hover:bg-surface-container"
          aria-expanded={open}
        >
          {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {open ? 'Collapse' : 'Expand'}
        </button>
      </div>
      {open ? <div className="border-t border-outline-variant px-4 pb-4 pt-4">{children}</div> : null}
    </section>
  );
}
