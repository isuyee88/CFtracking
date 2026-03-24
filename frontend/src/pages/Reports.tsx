/**
 * File: Reports.tsx
 * Purpose: 报表页面主组件，集成列选择器、筛选构建器、数据表格
 * Input: 无
 * Output: 完整的报表页面 UI 和功能
 */

import React, { useState, useMemo } from 'react';
import { Calendar, Download, RefreshCw, Settings2, X } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

import { useReportState } from '../hooks/useReportState';
import { ReportColumnSelector, type ReportColumn } from '../components/ReportColumnSelector';
import { ReportFilterBuilder, type ReportFilter } from '../components/ReportFilterBuilder';
import { VirtualTableEnhanced, type VirtualTableColumn } from '../components/VirtualTableEnhanced';
import { QuickDateRangePicker } from '@/components/DateRangePicker';
import type { DateRangeValue } from '@/components/DateRangePicker';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// 模拟数据生成
const generateMockData = (count: number) => {
  const campaigns = ['Campaign A', 'Campaign B', 'Campaign C', 'Campaign D'];
  const landings = ['Landing Page 1', 'Landing Page 2', 'Landing Page 3'];
  const offers = ['Offer X', 'Offer Y', 'Offer Z'];
  const countries = ['US', 'CN', 'GB', 'DE', 'FR'];
  const devices = ['Desktop', 'Mobile', 'Tablet'];
  const osList = ['Windows', 'macOS', 'iOS', 'Android'];
  const browsers = ['Chrome', 'Firefox', 'Safari', 'Edge'];

  return Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    datetime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
    campaign: campaigns[Math.floor(Math.random() * campaigns.length)],
    landing: landings[Math.floor(Math.random() * landings.length)],
    offer: offers[Math.floor(Math.random() * offers.length)],
    clicks: Math.floor(Math.random() * 1000),
    unique_clicks: Math.floor(Math.random() * 500),
    conversions: Math.floor(Math.random() * 100),
    revenue: (Math.random() * 1000).toFixed(2),
    cost: (Math.random() * 500).toFixed(2),
    profit: (Math.random() * 500 - 100).toFixed(2),
    roi: (Math.random() * 200 - 50).toFixed(2),
    cr: (Math.random() * 10).toFixed(2),
    epc: (Math.random() * 5).toFixed(2),
    country: countries[Math.floor(Math.random() * countries.length)],
    region: ['California', 'New York', 'Beijing', 'London', 'Berlin'][Math.floor(Math.random() * 5)],
    city: ['Los Angeles', 'New York', 'Beijing', 'London', 'Berlin'][Math.floor(Math.random() * 5)],
    device_type: devices[Math.floor(Math.random() * devices.length)],
    os: osList[Math.floor(Math.random() * osList.length)],
    browser: browsers[Math.floor(Math.random() * browsers.length)],
    source: ['Google', 'Facebook', 'Direct', 'Email'][Math.floor(Math.random() * 4)],
    referrer: ['google.com', 'facebook.com', '', 'email'][Math.floor(Math.random() * 4)],
    sub1: `sub1_${Math.floor(Math.random() * 100)}`,
    sub2: `sub2_${Math.floor(Math.random() * 100)}`,
    sub3: `sub3_${Math.floor(Math.random() * 100)}`,
  }));
};

const Reports: React.FC = () => {
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
  const [loading, setLoading] = useState(false);

  // 生成模拟数据
  const allData = useMemo(() => generateMockData(1000), []);

  // 应用筛选和排序
  const filteredData = useMemo(() => {
    let result = [...allData];

    // 应用筛选
    if (filters.length > 0) {
      result = result.filter((item) => {
        return filters.every((filter) => {
          const value = item[filter.field as keyof typeof item];
          
          switch (filter.operator) {
            case 'equals':
              return String(value) === String(filter.value);
            case 'not_equals':
              return String(value) !== String(filter.value);
            case 'contains':
              return String(value).includes(String(filter.value));
            case 'not_contains':
              return !String(value).includes(String(filter.value));
            case 'greater_than':
              return Number(value) > Number(filter.value);
            case 'less_than':
              return Number(value) < Number(filter.value);
            default:
              return true;
          }
        });
      });
    }

    // 应用排序
    if (sortField && sortOrder) {
      result.sort((a, b) => {
        const aValue = a[sortField as keyof typeof a];
        const bValue = b[sortField as keyof typeof b];

        if (sortOrder === 'asc') {
          return aValue > bValue ? 1 : -1;
        } else {
          return aValue < bValue ? 1 : -1;
        }
      });
    }

    return result;
  }, [allData, filters, sortField, sortOrder]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, page, pageSize]);

  // 总页数
  const totalPages = Math.ceil(filteredData.length / pageSize);

  // 刷新数据
  const handleRefresh = () => {
    setLoading(true);
    setTimeout(() => setLoading(false), 1000);
  };

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
        <h1 className="text-2xl font-display font-bold text-on-surface">报表中心</h1>
        <p className="text-sm text-fg-muted mt-1">自定义列和筛选条件，生成您的专属报表</p>
      </div>

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

      {/* 主内容区 */}
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
    </div>
  );
};

export default Reports;
