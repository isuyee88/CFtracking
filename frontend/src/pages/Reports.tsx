/**
 * @fileoverview 统计报表页面
 * @description 生成和导出各类统计分析报表
 * @module pages/Reports
 *
 * 功能:
 *   - 支持4种报表类型: 流量、转化、财务、ROI
 *   - 支持多维度数据聚合
 *   - 支持CSV/Excel导出
 *   - 数据源自动切换 (AE < 3个月, D1 > 3个月)
 *
 * 输入: 用户选择报表类型、日期范围、维度
 * 输出: 报表数据展示和导出
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  FileText,
  Download,
  TrendingUp,
  DollarSign,
  PieChart,
  BarChart3,
  RefreshCw,
  Loader2,
  Calendar,
  Filter,
  Table,
  ChevronDown,
} from 'lucide-react';
import { QuickDateRangePicker, getDateRange } from '../components/DateRangePicker';
import { fetchReport, exportReport, downloadReport, type ReportType, type ReportParams } from '../services/api';

const REPORT_TYPES = [
  { id: 'traffic', label: '流量报表', icon: BarChart3, color: 'text-blue-500' },
  { id: 'conversion', label: '转化报表', icon: TrendingUp, color: 'text-green-500' },
  { id: 'financial', label: '财务报表', icon: DollarSign, color: 'text-amber-500' },
  { id: 'roi', label: 'ROI报表', icon: PieChart, color: 'text-purple-500' },
] as const;

const TRAFFIC_COLUMNS = [
  { key: 'date', label: '日期/维度' },
  { key: 'clicks', label: '点击数' },
  { key: 'impressions', label: '展示数' },
  { key: 'unique_visitors', label: '独立访客' },
  { key: 'conversions', label: '转化数' },
  { key: 'cr', label: '转化率' },
];

const CONVERSION_COLUMNS = [
  { key: 'date', label: '日期/维度' },
  { key: 'conversions', label: '转化数' },
  { key: 'revenue', label: '收入' },
  { key: 'cost', label: '成本' },
  { key: 'profit', label: '利润' },
  { key: 'roi', label: 'ROI' },
];

const FINANCIAL_COLUMNS = [
  { key: 'date', label: '日期/维度' },
  { key: 'spend', label: '支出' },
  { key: 'revenue', label: '收入' },
  { key: 'profit', label: '利润' },
  { key: 'margin', label: '利润率' },
];

const ROI_COLUMNS = [
  { key: 'date', label: '日期/维度' },
  { key: 'spend', label: '支出' },
  { key: 'revenue', label: '收入' },
  { key: 'profit', label: '利润' },
  { key: 'roi', label: 'ROI' },
  { key: 'epc', label: 'EPC' },
  { key: 'cpc', label: 'CPC' },
];

const COLUMN_MAP: Record<ReportType, typeof TRAFFIC_COLUMNS> = {
  traffic: TRAFFIC_COLUMNS,
  conversion: CONVERSION_COLUMNS,
  financial: FINANCIAL_COLUMNS,
  roi: ROI_COLUMNS,
};

const REPORT_DESCRIPTIONS: Record<ReportType, string> = {
  traffic: '分析流量来源、设备分布、地理位置等维度数据',
  conversion: '追踪转化漏斗、计算转化率和用户行为路径',
  financial: '汇总收支明细、计算利润和利润率',
  roi: '评估投资回报率、分析广告投放效果',
};

export const Reports: React.FC = () => {
  const [selectedType, setSelectedType] = useState<ReportType>('traffic');
  const [dateRange, setDateRange] = useState('last30days');
  const [reportData, setReportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const currentTypeInfo = REPORT_TYPES.find(t => t.id === selectedType)!;
  const columns = COLUMN_MAP[selectedType];

  const loadReport = useCallback(async () => {
    setLoading(true);
    try {
      const range = getDateRange(dateRange);
      const params: ReportParams = {
        startDate: range.startDate,
        endDate: range.endDate,
        groupBy: ['date'],
        limit: 100,
        sortBy: 'date',
        sortOrder: 'desc',
      };

      const data = await fetchReport(selectedType, params);
      setReportData(data?.data || []);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('[Reports] Failed to load report:', err);
      setReportData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedType, dateRange]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const handleExport = async (format: 'csv' | 'excel') => {
    setExporting(true);
    try {
      const range = getDateRange(dateRange);
      const blob = await exportReport({
        type: selectedType,
        format,
        startDate: range.startDate,
        endDate: range.endDate,
        groupBy: ['date'],
        columns: columns.map(c => c.key),
      });

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `${selectedType}-report-${timestamp}.${format}`;
      downloadReport(blob, filename);
    } catch (err) {
      console.error('[Reports] Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-variant/30">
      {/* Header */}
      <div className="bg-surface border-b border-outline-variant/20">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText size={24} className="text-primary" />
              <div>
                <h1 className="text-xl font-bold text-on-surface">统计报表</h1>
                <p className="text-sm text-on-surface-variant">生成和导出详细的统计分析报表</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => loadReport()}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-md transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                刷新
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-6 space-y-6">
        {/* Report Type Selector */}
        <div className="bg-surface rounded-lg border border-outline-variant/20 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter size={18} className="text-on-surface-variant" />
            <h2 className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">报表类型</h2>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {REPORT_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = selectedType === type.id;
              return (
                <button
                  key={type.id}
                  onClick={() => setSelectedType(type.id)}
                  className={`relative flex flex-col items-center gap-3 p-4 rounded-lg border-2 transition-all ${
                    isSelected
                      ? 'border-primary bg-primary-container/10'
                      : 'border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container'
                  }`}
                >
                  <Icon size={28} className={isSelected ? 'text-primary' : 'text-on-surface-variant'} />
                  <span className={`text-sm font-medium ${isSelected ? 'text-primary' : 'text-on-surface'}`}>
                    {type.label}
                  </span>
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="mt-4 text-sm text-on-surface-variant">
            <span className="font-medium">说明:</span> {REPORT_DESCRIPTIONS[selectedType]}
          </p>
        </div>

        {/* Filters */}
        <div className="bg-surface rounded-lg border border-outline-variant/20 p-6">
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-3">
              <Calendar size={18} className="text-on-surface-variant" />
              <span className="text-sm font-medium text-on-surface">日期范围</span>
              <div className="w-[280px]">
                <QuickDateRangePicker
                  value={dateRange}
                  onChange={(preset) => setDateRange(preset)}
                />
              </div>
            </div>

            <div className="flex-1" />

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting || loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-on-surface-variant hover:bg-surface-container rounded-md transition-colors disabled:opacity-50"
              >
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                导出 CSV
              </button>
              <button
                onClick={() => handleExport('excel')}
                disabled={exporting || loading}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-primary text-on-primary hover:bg-primary/90 rounded-md transition-colors disabled:opacity-50"
              >
                {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                导出 Excel
              </button>
            </div>
          </div>
        </div>

        {/* Report Table */}
        <div className="bg-surface rounded-lg border border-outline-variant/20 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20">
            <div className="flex items-center gap-3">
              <Table size={18} className="text-on-surface-variant" />
              <span className="text-sm font-bold uppercase tracking-wider text-on-surface-variant">
                {currentTypeInfo.label}数据
              </span>
              <span className="text-xs text-on-surface-variant/60">
                {reportData.length} 条记录
              </span>
            </div>
            {lastUpdated && (
              <span className="text-xs text-on-surface-variant/60">
                最后更新: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={32} className="animate-spin text-primary" />
              <span className="ml-3 text-on-surface-variant">加载中...</span>
            </div>
          ) : reportData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-on-surface-variant">
              <FileText size={48} className="opacity-30 mb-4" />
              <p>暂无数据</p>
              <p className="text-sm">请选择日期范围后重试</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-surface-container">
                    {columns.map((col) => (
                      <th
                        key={col.key}
                        className="px-4 py-3 text-left text-xs font-bold uppercase tracking-wider text-on-surface-variant"
                      >
                        {col.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/10">
                  {reportData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-surface-container/50 transition-colors">
                      {columns.map((col) => (
                        <td key={col.key} className="px-4 py-3 text-sm text-on-surface">
                          {row[col.key] ?? '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
