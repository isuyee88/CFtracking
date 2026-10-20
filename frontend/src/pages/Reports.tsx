/**
 * File: Reports.tsx
 * Purpose: 报表页面主组件，集成列选择器、筛选构建器、数据表格
 * Input: 无
 * Output: 完整的报表页面 UI 和功能
 */

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { Calendar, Download, RefreshCw, Settings2, X, AlertCircle } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { useReportState } from '../hooks/useReportState';
import { ReportColumnSelector, type ReportColumn } from '../components/ReportColumnSelector';
import { ReportFilterBuilder, type ReportFilter } from '../components/ReportFilterBuilder';
import { VirtualTableEnhanced, type VirtualTableColumn } from '../components/VirtualTableEnhanced';
import { QuickDateRangePicker } from '@/components/DateRangePicker';
import type { DateRangeValue } from '@/components/DateRangePicker';
import { usePageData } from '@/context/DataCacheContext';
import { fetchReports, fetchReportStats, type ReportRecord } from '../services/api';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const Reports: React.FC = () => {
  // The report API is not part of the current Worker contract (it only exposes POST /api/reports/generate).
  // Keep the route navigable, but do not issue a guaranteed 404 on every visit.
  const reportsEnabled = false;
  const {
    columns,
    selectedColumns,
    setSelectedColumns,
    visibleColumns,
    filters,
    setFilters,
    sortField,
    sortOrder,
    handleSort,
    page,
    pageSize,
    setPage,
    setPageSize,
    dateRange,
    setDateRange,
  } = useReportState();

  const [showColumnSelector, setShowColumnSelector] = useState(false);

  // 使用 useCallback 包装 fetch 函数，避免无限循环
  const fetchReportsData = useCallback(() => {
    if (!reportsEnabled) return Promise.resolve({ list: [], meta: { total: 0, totalPages: 0 } } as any);
    return fetchReports({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      page,
      pageSize,
      filters: filters.length > 0 ? filters : undefined,
      sortField,
      sortOrder,
    });
  },
    [dateRange.startDate, dateRange.endDate, page, pageSize, filters, sortField, sortOrder]
  );

  const fetchReportsStats = useCallback(() => {
    if (!reportsEnabled) return Promise.resolve({ totalClicks: 0, totalConversions: 0, totalRevenue: 0, totalCost: 0, totalProfit: 0 } as any);
    return fetchReportStats({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      filters: filters.length > 0 ? filters : undefined,
    });
  },
    [dateRange.startDate, dateRange.endDate, filters]
  );

  // 使用 usePageData hook 获取报表数据
  const { data: reportsData, isLoading, error, refetch } = usePageData(
    'reports',
    fetchReportsData
  );

  // 使用 usePageData hook 获取报表统计
  const { data: statsData } = usePageData(
    'reportsStats',
    fetchReportsStats
  );

  // 从 SSR 数据或 API 获取报表列表
  const [reports, setReports] = useState<ReportRecord[]>([]);

  useEffect(() => {
    if (reportsData) {
      setReports(reportsData.list || reportsData);
    }
  }, [reportsData]);

  // 分页数据（从 SSR/API 数据中切片）
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return reports.slice(start, end);
  }, [reports, page, pageSize]);

  // 总页数（从 meta 或本地计算）
  const totalPages = useMemo(() => {
    if (reportsData?.meta?.totalPages) {
      return reportsData.meta.totalPages;
    }
    return Math.ceil(reports.length / pageSize);
  }, [reportsData, reports, pageSize]);

  // 加载状态
  const loading = isLoading;

  // 过滤后的数据（用于分页显示）
  const filteredData = useMemo(() => {
    return reports;
  }, [reports]);

  // 刷新数据
  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // 导出报表
  const handleExport = () => {
    console.log('Export report', {
      columns: selectedColumns,
      filters,
      sortField,
      sortOrder,
      dateRange,
      totalRecords: filteredData.length,
    });
    // TODO: 实现导出功能
  };

  // 列配置转换为 VirtualTable 格式
  const tableColumns: VirtualTableColumn[] = useMemo(() => {
    return visibleColumns.map((col) => ({
      key: col.key,
      label: col.label,
      width: col.key === 'datetime' ? '180px' : col.key === 'campaign' ? '200px' : '120px',
      align: ['clicks', 'unique_clicks', 'conversions', 'revenue', 'cost', 'profit', 'roi', 'cr', 'epc'].includes(col.key) ? 'right' : 'left',
      sorter: sortOrder ? undefined : (a: any, b: any) => {
        const aValue = a[col.key as keyof typeof a];
        const bValue = b[col.key as keyof typeof b];
        
        if (col.type === 'number') {
          return Number(aValue) - Number(bValue);
        }
        return String(aValue).localeCompare(String(bValue));
      },
      showSorter: true,
      render: (value: any, row: any) => {
        // 格式化数值
        if (['revenue', 'cost', 'profit', 'epc'].includes(col.key)) {
          return <span className="font-mono">${Number(value).toFixed(2)}</span>;
        }
        if (['roi', 'cr'].includes(col.key)) {
          return <span className="font-mono">{Number(value).toFixed(2)}%</span>;
        }
        if (['clicks', 'unique_clicks', 'conversions'].includes(col.key)) {
          return <span className="font-mono">{Number(value).toLocaleString()}</span>;
        }
        if (col.key === 'datetime') {
          return <span className="text-sm">{new Date(value).toLocaleString()}</span>;
        }
        return <span>{value || '-'}</span>;
      },
    }));
  }, [visibleColumns, sortOrder]);

  return (
    <div className="p-6 bg-background min-h-screen">
      {/* 页面标题 */}
      <div className="mb-6">
        <h1 className="text-2xl font-display font-bold text-on-surface">Reports</h1>
        <p className="text-sm text-fg-muted mt-1">Build custom reports with columns and filters</p>
      </div>

      {!reportsEnabled && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-warning/20 bg-warning/10 p-3 text-sm text-fg-default">
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-warning" />
          <div>
            <p className="font-medium">Report builder is not enabled on this deployment</p>
            <p className="mt-0.5 text-xs text-fg-muted">Use Dashboard analytics and exports while the reporting API is being completed.</p>
          </div>
        </div>
      )}

      {/* 顶部工具栏 */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {/* 日期范围选择 */}
          <QuickDateRangePicker
            value={dateRange as DateRangeValue}
            onChange={(range) => setDateRange(range as any)}
          />

          {/* 刷新按钮 */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium',
              'bg-surface-container border border-outline-variant',
              'text-on-surface hover:bg-surface-container-high',
              'transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            刷新
          </button>

          {/* 导出按钮 */}
          <button
            onClick={handleExport}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium',
              'bg-primary text-on-primary hover:bg-primary-dark',
              'transition-colors'
            )}
          >
            <Download className="w-4 h-4" />
            导出
          </button>
        </div>

        <div className="flex items-center gap-2">
          {/* 列选择器开关 */}
          <button
            onClick={() => setShowColumnSelector(!showColumnSelector)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-sm text-sm font-medium',
              showColumnSelector
                ? 'bg-primary/10 text-primary'
                : 'bg-surface-container border border-outline-variant text-on-surface',
              'hover:bg-surface-container-high transition-colors'
            )}
          >
            <Settings2 className="w-4 h-4" />
            列设置
            <span className="text-xs opacity-60">({selectedColumns.length})</span>
            {showColumnSelector && <X className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* 加载状态和错误处理 */}
      {isLoading && reports.length === 0 && <ReportsSkeleton />}

      {error && (
        <div className="flex flex-col items-center justify-center h-96 text-danger">
          <AlertCircle size={48} className="mb-4" />
          <p className="text-lg font-medium">{error?.message || error}</p>
          <button
            onClick={() => refetch()}
            className="mt-4 px-4 py-2 bg-surface border border-border-default rounded-md text-fg-default hover:bg-surface-container transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* 主内容区 */}
      {!isLoading && !error && (
        <div className="flex gap-4">
        {/* 左侧面板：列选择器 */}
        {showColumnSelector && (
          <div
            className="w-80 flex-shrink-0 animate-in slide-in-from-left-4 duration-200"
            style={{ height: 'calc(100vh - 280px)' }}
          >
            <ReportColumnSelector
              columns={columns}
              selectedColumns={selectedColumns}
              onColumnsChange={setSelectedColumns}
            />
          </div>
        )}

        {/* 右侧：筛选器和表格 */}
        <div className="flex-1 min-w-0">
          {/* 筛选构建器 */}
          <div className="mb-4">
            <ReportFilterBuilder
              columns={columns}
              filters={filters}
              onFiltersChange={setFilters}
            />
          </div>

          {/* 数据表格 */}
          <div className="bg-surface rounded-sm border border-outline-variant overflow-hidden">
            <VirtualTableEnhanced
              tableId="reports"
              columns={tableColumns}
              data={paginatedData}
              rowHeight={48}
              height={500}
              overscan={5}
              emptyMessage="暂无数据"
            />

            {/* 分页 */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
              <div className="flex items-center gap-4">
                <span className="text-sm text-fg-muted">
                  显示 {(page - 1) * pageSize + 1} - {Math.min(page * pageSize, filteredData.length)} 条，
                  共 {filteredData.length} 条
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="px-2 py-1 text-sm bg-surface border border-outline-variant rounded-sm text-on-surface"
                >
                  <option value={25}>25 条/页</option>
                  <option value={50}>50 条/页</option>
                  <option value={100}>100 条/页</option>
                  <option value={500}>500 条/页</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm bg-surface-container border border-outline-variant rounded-sm text-on-surface disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                >
                  上一页
                </button>
                <span className="text-sm text-on-surface">
                  第 {page} 页 / 共 {totalPages} 页
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1.5 text-sm bg-surface-container border border-outline-variant rounded-sm text-on-surface disabled:opacity-50 disabled:cursor-not-allowed hover:bg-surface-container-high transition-colors"
                >
                  下一页
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      )}
    </div>
  );
};

// ============================================
// 骨架屏组件
// ============================================

const ReportsSkeleton: React.FC = () => {
  return (
    <div className="p-6 bg-background min-h-screen space-y-6 animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <div className="h-8 bg-surface-hover rounded w-48 mb-2"></div>
        <div className="h-4 bg-surface-hover rounded w-72"></div>
      </div>

      {/* Toolbar */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="h-10 w-64 bg-surface-hover rounded"></div>
          <div className="h-10 w-24 bg-surface-hover rounded"></div>
          <div className="h-10 w-24 bg-surface-hover rounded"></div>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-10 w-32 bg-surface-hover rounded"></div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-surface rounded-sm border border-outline-variant overflow-hidden">
        <div className="h-12 bg-surface-hover border-b border-outline-variant"></div>
        {[1,2,3,4,5].map((row) => (
          <div key={row} className="h-12 border-b border-outline-variant flex items-center px-4 gap-4">
            {[1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17].map((col) => (
              <div key={col} className="h-4 bg-surface-hover rounded flex-1"></div>
            ))}
          </div>
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
        <div className="h-4 bg-surface-hover rounded w-64"></div>
        <div className="flex items-center gap-2">
          <div className="h-8 w-20 bg-surface-hover rounded"></div>
          <div className="h-4 bg-surface-hover rounded w-16"></div>
          <div className="h-8 w-20 bg-surface-hover rounded"></div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
