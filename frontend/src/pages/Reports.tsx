import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, RefreshCw, Search, Settings2 } from 'lucide-react';
import { DateRangePickerComponent, getDateRange, type DateRangeValue } from '@/components/DateRangePicker';
import {
  downloadReport,
  exportReport,
  fetchReport,
  type ExportFormat,
  type ReportType,
} from '../services/api';

type ReportColumnKey =
  | 'dimension'
  | 'clicks'
  | 'impressions'
  | 'unique_visitors'
  | 'conversions'
  | 'revenue'
  | 'cost'
  | 'spend'
  | 'profit'
  | 'roi'
  | 'cr'
  | 'margin'
  | 'epc'
  | 'cpc';

interface ReportColumn {
  key: ReportColumnKey;
  label: string;
  align?: 'left' | 'right';
}

interface ReportRow {
  dimension: string;
  clicks?: number;
  impressions?: number;
  unique_visitors?: number;
  conversions?: number;
  revenue?: number;
  cost?: number;
  spend?: number;
  profit?: number;
  roi?: string;
  cr?: string;
  margin?: string;
  epc?: string;
  cpc?: string;
}

const REPORT_CONFIG: Record<
  ReportType,
  {
    label: string;
    groupBy: string[];
    columns: ReportColumn[];
    defaultColumns: ReportColumnKey[];
  }
> = {
  traffic: {
    label: 'Traffic Report',
    groupBy: ['campaign'],
    columns: [
      { key: 'dimension', label: 'Campaign / Dimension' },
      { key: 'clicks', label: 'Clicks', align: 'right' },
      { key: 'impressions', label: 'Impressions', align: 'right' },
      { key: 'unique_visitors', label: 'Unique Visitors', align: 'right' },
      { key: 'conversions', label: 'Conversions', align: 'right' },
      { key: 'cr', label: 'CR', align: 'right' },
    ],
    defaultColumns: ['dimension', 'clicks', 'impressions', 'conversions', 'cr'],
  },
  conversion: {
    label: 'Conversion Report',
    groupBy: ['campaign'],
    columns: [
      { key: 'dimension', label: 'Campaign / Dimension' },
      { key: 'conversions', label: 'Conversions', align: 'right' },
      { key: 'revenue', label: 'Revenue', align: 'right' },
      { key: 'cost', label: 'Cost', align: 'right' },
      { key: 'profit', label: 'Profit', align: 'right' },
      { key: 'roi', label: 'ROI', align: 'right' },
    ],
    defaultColumns: ['dimension', 'conversions', 'revenue', 'cost', 'profit', 'roi'],
  },
  financial: {
    label: 'Financial Report',
    groupBy: ['campaign'],
    columns: [
      { key: 'dimension', label: 'Campaign / Dimension' },
      { key: 'spend', label: 'Spend', align: 'right' },
      { key: 'revenue', label: 'Revenue', align: 'right' },
      { key: 'profit', label: 'Profit', align: 'right' },
      { key: 'margin', label: 'Margin', align: 'right' },
    ],
    defaultColumns: ['dimension', 'spend', 'revenue', 'profit', 'margin'],
  },
  roi: {
    label: 'ROI Report',
    groupBy: ['campaign'],
    columns: [
      { key: 'dimension', label: 'Campaign / Dimension' },
      { key: 'spend', label: 'Spend', align: 'right' },
      { key: 'revenue', label: 'Revenue', align: 'right' },
      { key: 'profit', label: 'Profit', align: 'right' },
      { key: 'roi', label: 'ROI', align: 'right' },
      { key: 'epc', label: 'EPC', align: 'right' },
      { key: 'cpc', label: 'CPC', align: 'right' },
    ],
    defaultColumns: ['dimension', 'spend', 'revenue', 'profit', 'roi', 'epc', 'cpc'],
  },
};

function cn(...inputs: Array<string | false | null | undefined>) {
  return inputs.filter(Boolean).join(' ');
}

function normalizeReportRow(row: Record<string, unknown>): ReportRow {
  return {
    dimension: String(row.date ?? row.dimension ?? row.name ?? 'N/A'),
    clicks: Number(row.clicks ?? 0),
    impressions: Number(row.impressions ?? 0),
    unique_visitors: Number(row.unique_visitors ?? 0),
    conversions: Number(row.conversions ?? 0),
    revenue: Number(row.revenue ?? 0),
    cost: Number(row.cost ?? 0),
    spend: Number(row.spend ?? 0),
    profit: Number(row.profit ?? 0),
    roi: typeof row.roi === 'string' ? row.roi : undefined,
    cr: typeof row.cr === 'string' ? row.cr : undefined,
    margin: typeof row.margin === 'string' ? row.margin : undefined,
    epc: typeof row.epc === 'string' ? row.epc : undefined,
    cpc: typeof row.cpc === 'string' ? row.cpc : undefined,
  };
}

function formatValue(key: ReportColumnKey, value: ReportRow[ReportColumnKey]) {
  if (key === 'dimension') {
    return String(value ?? '-');
  }

  if (['roi', 'cr', 'margin', 'epc', 'cpc'].includes(key)) {
    return String(value ?? '-');
  }

  const numberValue = Number(value ?? 0);
  if (['revenue', 'cost', 'spend', 'profit'].includes(key)) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(numberValue);
  }

  return numberValue.toLocaleString();
}

export default function Reports() {
  const [reportType, setReportType] = useState<ReportType>('traffic');
  const [dateRange, setDateRange] = useState<DateRangeValue>(getDateRange('last7days'));
  const [searchQuery, setSearchQuery] = useState('');
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showColumns, setShowColumns] = useState(false);
  const [sortKey, setSortKey] = useState<ReportColumnKey>('dimension');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [visibleColumns, setVisibleColumns] = useState<ReportColumnKey[]>(REPORT_CONFIG.traffic.defaultColumns);

  useEffect(() => {
    setVisibleColumns(REPORT_CONFIG[reportType].defaultColumns);
    setSortKey('dimension');
    setSortOrder('asc');
  }, [reportType]);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const report = await fetchReport(reportType, {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
        groupBy: REPORT_CONFIG[reportType].groupBy,
        limit: 500,
      });

      const normalizedRows = Array.isArray(report?.data)
        ? report.data.map((row: Record<string, unknown>) => normalizeReportRow(row))
        : [];

      setRows(normalizedRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setLoading(false);
    }
  }, [dateRange.endDate, dateRange.startDate, reportType]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const columns = REPORT_CONFIG[reportType].columns;

  const filteredRows = useMemo(() => {
    const loweredSearch = searchQuery.trim().toLowerCase();
    const searchedRows = loweredSearch
      ? rows.filter((row) =>
          Object.values(row).some((value) => String(value ?? '').toLowerCase().includes(loweredSearch))
        )
      : rows;

    return [...searchedRows].sort((left, right) => {
      const leftValue = left[sortKey] ?? '';
      const rightValue = right[sortKey] ?? '';

      if (typeof leftValue === 'number' && typeof rightValue === 'number') {
        return sortOrder === 'asc' ? leftValue - rightValue : rightValue - leftValue;
      }

      return sortOrder === 'asc'
        ? String(leftValue).localeCompare(String(rightValue))
        : String(rightValue).localeCompare(String(leftValue));
    });
  }, [rows, searchQuery, sortKey, sortOrder]);

  const summary = useMemo(() => {
    return filteredRows.reduce(
      (accumulator, row) => ({
        clicks: accumulator.clicks + Number(row.clicks || 0),
        conversions: accumulator.conversions + Number(row.conversions || 0),
        revenue: accumulator.revenue + Number(row.revenue || 0),
        profit: accumulator.profit + Number(row.profit || 0),
      }),
      { clicks: 0, conversions: 0, revenue: 0, profit: 0 }
    );
  }, [filteredRows]);

  const handleExport = useCallback(
    async (format: ExportFormat) => {
      setExporting(true);
      setError(null);

      try {
        const blob = await exportReport({
          type: reportType,
          format,
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          groupBy: REPORT_CONFIG[reportType].groupBy,
          columns: visibleColumns.map((key) => (key === 'dimension' ? 'date' : key)),
        });

        downloadReport(blob, `${reportType}-report.${format === 'excel' ? 'xlsx' : 'csv'}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to export report');
      } finally {
        setExporting(false);
      }
    },
    [dateRange.endDate, dateRange.startDate, reportType, visibleColumns]
  );

  return (
    <div className="min-h-full bg-background p-6">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-on-surface">Reports Center</h1>
          <p className="mt-1 text-sm text-on-surface-variant">Live analytics reports backed by `/api/analytics/reports/*`.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-[180px_minmax(320px,1fr)_minmax(220px,320px)]">
          <select
            value={reportType}
            onChange={(event) => setReportType(event.target.value as ReportType)}
            aria-label="Select report type"
            className="border border-outline-variant bg-surface px-3 py-2 text-sm"
          >
            {Object.entries(REPORT_CONFIG).map(([key, config]) => (
              <option key={key} value={key}>
                {config.label}
              </option>
            ))}
          </select>
          <DateRangePickerComponent value={dateRange} onChange={(value) => value && setDateRange(value)} showTime={true} />
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search current report..."
              aria-label="Search current report"
              className="w-full border border-outline-variant bg-surface py-2 pl-10 pr-4 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
        <SummaryCard label="Rows" value={filteredRows.length.toLocaleString()} />
        <SummaryCard label="Clicks" value={summary.clicks.toLocaleString()} />
        <SummaryCard label="Conversions" value={summary.conversions.toLocaleString()} />
        <SummaryCard label="Revenue" value={formatValue('revenue', summary.revenue)} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <button onClick={() => void loadReport()} disabled={loading} aria-label="Refresh report data" className="flex items-center gap-2 rounded-sm border border-outline-variant px-4 py-2 text-sm">
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
        <button onClick={() => void handleExport('csv')} disabled={exporting} aria-label="Export report as CSV" className="flex items-center gap-2 rounded-sm bg-primary px-4 py-2 text-sm text-on-primary">
          <Download size={16} />
          Export CSV
        </button>
        <button onClick={() => void handleExport('excel')} disabled={exporting} aria-label="Export report as Excel" className="flex items-center gap-2 rounded-sm border border-outline-variant px-4 py-2 text-sm">
          <Download size={16} />
          Export Excel
        </button>
        <button onClick={() => setShowColumns((current) => !current)} aria-label="Toggle report columns panel" className="flex items-center gap-2 rounded-sm border border-outline-variant px-4 py-2 text-sm">
          <Settings2 size={16} />
          Columns
        </button>
      </div>

      {showColumns && (
        <div className="mb-4 flex flex-wrap gap-2 rounded-sm border border-outline-variant/20 bg-surface-container p-4">
          {columns.map((column) => {
            const active = visibleColumns.includes(column.key);
            return (
              <button
                key={column.key}
                onClick={() =>
                  setVisibleColumns((current) =>
                    active ? current.filter((key) => key !== column.key) : [...current, column.key]
                  )
                }
                className={cn(
                  'rounded-sm border px-3 py-1.5 text-xs font-medium',
                  active ? 'border-primary bg-primary/10 text-primary' : 'border-outline-variant bg-surface text-on-surface'
                )}
              >
                {column.label}
              </button>
            );
          })}
        </div>
      )}

      {error && <div className="mb-4 rounded-sm border border-error/20 bg-error/10 p-4 text-sm text-error">{error}</div>}

      <div
        className="overflow-hidden rounded-sm border border-outline-variant bg-surface"
        style={{ contentVisibility: 'auto', containIntrinsicSize: '960px' }}
      >
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container">
                {columns
                  .filter((column) => visibleColumns.includes(column.key))
                  .map((column) => (
                    <th
                      key={column.key}
                      className={cn(
                        'cursor-pointer px-4 py-3 text-xs font-bold uppercase tracking-widest text-on-surface-variant',
                        column.align === 'right' && 'text-right'
                      )}
                      onClick={() => {
                        if (sortKey === column.key) {
                          setSortOrder((current) => (current === 'asc' ? 'desc' : 'asc'));
                        } else {
                          setSortKey(column.key);
                          setSortOrder(column.key === 'dimension' ? 'asc' : 'desc');
                        }
                      }}
                    >
                      {column.label}
                    </th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-4 py-10 text-center text-sm text-on-surface-variant">
                    Loading report...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="px-4 py-10 text-center text-sm text-on-surface-variant">
                    No rows returned for this report.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, index) => (
                  <tr key={`${row.dimension}-${index}`} className="border-b border-outline-variant/10 hover:bg-surface-container/40">
                    {columns
                      .filter((column) => visibleColumns.includes(column.key))
                      .map((column) => (
                        <td
                          key={column.key}
                          className={cn(
                            'px-4 py-3 text-sm text-on-surface',
                            column.align === 'right' && 'text-right font-mono'
                          )}
                        >
                          {formatValue(column.key, row[column.key])}
                        </td>
                      ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div
        className="mt-4 rounded-sm border border-outline-variant/20 bg-surface-container p-4 text-sm text-on-surface-variant"
        style={{ contentVisibility: 'auto', containIntrinsicSize: '160px' }}
      >
        <div className="flex items-center gap-2 font-medium text-on-surface">
          <BarChart3 size={16} />
          Implementation note
        </div>
        <p className="mt-2">
          The backend currently groups report rows into a generic `date` field that often represents campaign or
          entity names. This page normalizes that into a shared dimension column so the reports are usable now.
        </p>
      </div>
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
