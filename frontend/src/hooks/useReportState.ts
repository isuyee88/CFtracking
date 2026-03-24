/**
 * File: useReportState.ts
 * Purpose: 报表页面状态管理 Hook
 * Input: 无
 * Output: 报表状态管理（列配置、筛选条件、排序、分页等）
 */

import { useState, useCallback, useMemo } from 'react';
import type { ReportColumn, ReportFilter } from '../components/ReportFilterBuilder';

export interface ReportState {
  columns: ReportColumn[];
  selectedColumns: string[];
  filters: ReportFilter[];
  sortField: string | null;
  sortOrder: 'asc' | 'desc' | null;
  page: number;
  pageSize: number;
  dateRange: {
    from: string;
    to: string;
    preset?: string;
  };
}

export interface UseReportStateReturn {
  // 列相关
  columns: ReportColumn[];
  selectedColumns: string[];
  setSelectedColumns: (columns: string[]) => void;
  visibleColumns: ReportColumn[];
  
  // 筛选相关
  filters: ReportFilter[];
  setFilters: (filters: ReportFilter[]) => void;
  clearFilters: () => void;
  
  // 排序相关
  sortField: string | null;
  sortOrder: 'asc' | 'desc' | null;
  handleSort: (field: string) => void;
  
  // 分页相关
  page: number;
  pageSize: number;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  
  // 日期范围
  dateRange: ReportState['dateRange'];
  setDateRange: (range: ReportState['dateRange']) => void;
  
  // 重置
  resetAll: () => void;
}

const DEFAULT_COLUMNS: ReportColumn[] = [
  // 基础信息
  { key: 'datetime', label: '日期时间', category: 'basic', type: 'date' },
  { key: 'campaign', label: '活动', category: 'basic', type: 'string' },
  { key: 'landing', label: '落地页', category: 'basic', type: 'string' },
  { key: 'offer', label: '广告 offer', category: 'basic', type: 'string' },
  
  // 指标数据
  { key: 'clicks', label: '点击数', category: 'metric', type: 'number' },
  { key: 'unique_clicks', label: '独立点击', category: 'metric', type: 'number' },
  { key: 'conversions', label: '转化数', category: 'metric', type: 'number' },
  { key: 'revenue', label: '收入', category: 'metric', type: 'number' },
  { key: 'cost', label: '成本', category: 'metric', type: 'number' },
  { key: 'profit', label: '利润', category: 'metric', type: 'number' },
  { key: 'roi', label: 'ROI', category: 'metric', type: 'number' },
  { key: 'cr', label: '转化率', category: 'metric', type: 'number' },
  { key: 'epc', label: 'EPC', category: 'metric', type: 'number' },
  
  // 地理信息
  { key: 'country', label: '国家', category: 'geo', type: 'string' },
  { key: 'region', label: '省份', category: 'geo', type: 'string' },
  { key: 'city', label: '城市', category: 'geo', type: 'string' },
  
  // 设备信息
  { key: 'device_type', label: '设备类型', category: 'device', type: 'string' },
  { key: 'os', label: '操作系统', category: 'device', type: 'string' },
  { key: 'browser', label: '浏览器', category: 'device', type: 'string' },
  
  // 流量来源
  { key: 'source', label: '流量源', category: 'traffic', type: 'string' },
  { key: 'referrer', label: '引荐来源', category: 'traffic', type: 'string' },
  
  // 追踪参数
  { key: 'sub1', label: 'Sub ID 1', category: 'tracking', type: 'string' },
  { key: 'sub2', label: 'Sub ID 2', category: 'tracking', type: 'string' },
  { key: 'sub3', label: 'Sub ID 3', category: 'tracking', type: 'string' },
];

const DEFAULT_SELECTED_COLUMNS = [
  'datetime',
  'campaign',
  'clicks',
  'unique_clicks',
  'conversions',
  'revenue',
  'profit',
  'roi',
];

export function useReportState(): UseReportStateReturn {
  // 列配置
  const [columns] = useState<ReportColumn[]>(DEFAULT_COLUMNS);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(DEFAULT_SELECTED_COLUMNS);
  
  // 筛选条件
  const [filters, setFilters] = useState<ReportFilter[]>([]);
  
  // 排序
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  
  // 分页
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  
  // 日期范围
  const [dateRange, setDateRange] = useState<ReportState['dateRange']>({
    from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    preset: 'last7days',
  });
  
  // 可见列
  const visibleColumns = useMemo(() => {
    return columns.filter((col) => selectedColumns.includes(col.key));
  }, [columns, selectedColumns]);
  
  // 处理排序
  const handleSort = useCallback((field: string) => {
    setSortField((currentField) => {
      if (currentField !== field) {
        // 新字段，默认升序
        setSortOrder('asc');
        return field;
      }
      
      // 同一字段，循环切换：asc -> desc -> null
      setSortOrder((currentOrder) => {
        if (currentOrder === 'asc') return 'desc';
        if (currentOrder === 'desc') return null;
        return 'asc';
      });
      
      return currentField;
    });
  }, []);
  
  // 清空筛选
  const clearFilters = useCallback(() => {
    setFilters([]);
  }, []);
  
  // 重置所有
  const resetAll = useCallback(() => {
    setSelectedColumns(DEFAULT_SELECTED_COLUMNS);
    setFilters([]);
    setSortField(null);
    setSortOrder(null);
    setPage(1);
    setPageSize(25);
    setDateRange({
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      to: new Date().toISOString().split('T')[0],
      preset: 'last7days',
    });
  }, []);
  
  return {
    // 列相关
    columns,
    selectedColumns,
    setSelectedColumns,
    visibleColumns,
    
    // 筛选相关
    filters,
    setFilters,
    clearFilters,
    
    // 排序相关
    sortField,
    sortOrder,
    handleSort,
    
    // 分页相关
    page,
    pageSize,
    setPage,
    setPageSize,
    
    // 日期范围
    dateRange,
    setDateRange,
    
    // 重置
    resetAll,
  };
}
