/**
 * @fileoverview Dashboard 页面主组件
 * @description 数据仪表板页面，展示指标卡片、图表、实体表格和最近点击
 * @module pages/Dashboard
 */
import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { RefreshCw, Settings, Clock, Database } from 'lucide-react';
import { cn } from '@/utils/cn';
import dayjs from 'dayjs';
import {
  MetricCardsSection,
  ChartSection,
  EntityTablesSection,
  RecentClicksSection
} from './components';
import {
  ALL_METRICS,
  ENTITY_CONFIGS,
  DEFAULT_CONFIG,
  TIME_RANGES,
  type MetricConfig
} from './config';
import { TimeRangePicker, type DateRangeValue } from '@/components/TimeRangePicker';
import { useDashboardData } from './hooks/useDashboardData';
import { useDashboardDataSSR } from './hooks/useDashboardDataSSR';
import { fetchDashboardData } from '@/services/dashboard.server';

const TIME_RANGE_MAP: Record<string, DateRangeValue> = {
  today: { startDate: dayjs().startOf('day').toISOString(), endDate: dayjs().endOf('day').toISOString() },
  yesterday: { startDate: dayjs().subtract(1, 'day').startOf('day').toISOString(), endDate: dayjs().subtract(1, 'day').endOf('day').toISOString() },
  last7days: { startDate: dayjs().subtract(6, 'day').startOf('day').toISOString(), endDate: dayjs().endOf('day').toISOString() },
  last30days: { startDate: dayjs().subtract(29, 'day').startOf('day').toISOString(), endDate: dayjs().endOf('day').toISOString() },
  thismonth: { startDate: dayjs().startOf('month').toISOString(), endDate: dayjs().endOf('day').toISOString() },
  lastmonth: { startDate: dayjs().subtract(1, 'month').startOf('month').toISOString(), endDate: dayjs().subtract(1, 'month').endOf('month').toISOString() },
};

const Dashboard: React.FC = () => {
  const [timeRangeKey, setTimeRangeKey] = useState('last7days');
  const [dateRange, setDateRange] = useState<DateRangeValue>(TIME_RANGE_MAP['last7days']);
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(DEFAULT_CONFIG.metrics);
  const [selectedEntities, setSelectedEntities] = useState<string[]>(DEFAULT_CONFIG.entities);
  const [showSettings, setShowSettings] = useState(false);

  // 判断是否在 SSR 环境
  const isSSR = typeof window === 'undefined';

  // SSR 阶段获取预渲染数据
  const { data: ssrData, isLoading: isSSRLoading, error: ssrError } = 
    isSSR ? useDashboardDataSSR({ timeRange: timeRangeKey }) : { data: null, isLoading: false, error: '' };

  // 初始状态：SSR 数据优先，客户端 fallback
  const [initialState, setInitialState] = useState(() => {
    if (isSSR && ssrData) {
      return {
        stats: ssrData.metrics || [],
        chartData: ssrData.chartData || [],
        recentClicks: ssrData.recentClicks || [],
        entityData: ssrData.entityData || {},
        lastUpdated: ssrData.lastUpdated ? new Date(ssrData.lastUpdated) : new Date(),
        dataSource: ssrData.dataSource || 'AE',
        queryTime: ssrData.queryTime || null,
        loading: { stats: false, recentClicks: false, entities: false },
        errors: { stats: '', recentClicks: '', entities: '' },
      };
    }
    // 客户端默认空状态
    return {
      stats: [],
      chartData: [],
      recentClicks: [],
      entityData: {},
      lastUpdated: new Date(),
      dataSource: 'AE',
      queryTime: null,
      loading: { stats: false, recentClicks: false, entities: false },
      errors: { stats: '', recentClicks: '', entities: '' },
    };
  });

  // 客户端交互时使用 useDashboardData 进行数据刷新
  const {
    refreshStatsAndEntities,
    refreshRecentClicks,
    refreshAll,
    loading: clientLoading,
    errors: clientErrors,
  } = useDashboardData({
    metrics: selectedMetrics,
    entities: selectedEntities,
    timeRange: timeRangeKey,
  });

  // 同步初始状态到组件内部状态
  const [state, setState] = useState(initialState);

  // 在 SSR 完成后或客户端挂载后，将初始状态应用到实际状态
  useEffect(() => {
    if (isSSR) {
      // SSR 已经在服务端渲染阶段填充了数据，这里只需要把初始状态保存下来
      return;
    }
    // 客户端挂载后，从初始状态复制到实际状态
    setState(initialState);
  }, [initialState, isSSR]);

  // 处理时间范围变化
  const handleTimeRangeChange = useCallback((range: DateRangeValue) => {
    setDateRange(range);
    // 查找匹配的预设
    const matchedKey = Object.entries(TIME_RANGE_MAP).find(([_, value]) =>
      value.startDate === range.startDate && value.endDate === range.endDate
    )?.[0];
    if (matchedKey) {
      setTimeRangeKey(matchedKey);
    } else {
      setTimeRangeKey('custom');
    }
  }, []);

  const handleRefresh = useCallback(() => {
    refreshAll();
  }, [refreshAll]);

  const toggleMetric = useCallback((metricKey: string) => {
    setSelectedMetrics(prev => 
      prev.includes(metricKey)
        ? prev.filter(k => k !== metricKey)
        : [...prev, metricKey]
    );
  }, []);

  const toggleEntity = useCallback((entityKey: string) => {
    setSelectedEntities(prev =>
      prev.includes(entityKey)
        ? prev.filter(k => k !== entityKey)
        : [...prev, entityKey]
    );
  }, []);

  const metricsByCategory = useMemo(() => {
    const categories: Record<string, MetricConfig[]> = {};
    ALL_METRICS.forEach(metric => {
      if (!categories[metric.category]) {
        categories[metric.category] = [];
      }
      categories[metric.category].push(metric);
    });
    return categories;
  }, []);

  const availableEntities = useMemo(() => {
    return Object.keys(ENTITY_CONFIGS);
  }, []);

  return (
    <div className="dashboard-page">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <h1 className="page-title">Dashboard</h1>
          <div className="header-meta">
            {state.dataSource && (
              <span className="data-source-badge">
                <Database size={14} />
                {state.dataSource}
              </span>
            )}
            {state.queryTime && (
              <span className="query-time">
                <Clock size={14} />
                {new Date(state.queryTime).toLocaleTimeString()}
              </span>
            )}
          </div>
        </div>
        
        <div className="header-right">
          <select
            value={timeRangeKey}
            onChange={(e) => setTimeRangeKey(e.target.value)}
            className="time-range-select"
          >
            {TIME_RANGES.map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
          
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={cn("icon-button", showSettings && "active")}
            aria-label="Settings"
          >
            <Settings size={20} />
          </button>
          
          <button
            onClick={handleRefresh}
            className="icon-button"
            aria-label="Refresh"
            disabled={clientLoading.stats}
          >
            <RefreshCw size={20} className={clientLoading.stats ? 'animate-spin' : ''} />
          </button>
        </div>
      </header>

      {/* Settings Panel */}
      {showSettings && (
        <div className="settings-panel">
          <div className="settings-section">
            <h3 className="settings-title">Metrics</h3>
            <div className="settings-grid">
              {Object.entries(metricsByCategory).map(([category, metrics]) => (
                <div key={category} className="settings-category">
                  <h4 className="category-label">{category}</h4>
                  <div className="settings-options">
                    {metrics.map(metric => (
                      <label key={metric.key} className="settings-checkbox">
                        <input
                          type="checkbox"
                          checked={selectedMetrics.includes(metric.key)}
                          onChange={() => toggleMetric(metric.key)}
                        />
                        <span>{metric.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          
          <div className="settings-section">
            <h3 className="settings-title">Entity Tables</h3>
            <div className="settings-options entity-options">
              {availableEntities.map(entityKey => {
                const config = ENTITY_CONFIGS[entityKey];
                return (
                  <label key={entityKey} className="settings-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedEntities.includes(entityKey)}
                      onChange={() => toggleEntity(entityKey)}
                    />
                    <span>{config?.label || entityKey}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Error Messages */}
      {(clientErrors.stats || clientErrors.entities || clientErrors.recentClicks) && (
        <div className="error-banner">
          {clientErrors.stats && <p>{clientErrors.stats}</p>}
          {clientErrors.entities && <p>{clientErrors.entities}</p>}
          {clientErrors.recentClicks && <p>{clientErrors.recentClicks}</p>}
        </div>
      )}

      {/* Main Content */}
      <main className="dashboard-content">
        {/* Metric Cards */}
        <section className="metrics-section">
          <MetricCardsSection 
            metrics={state.stats}
            loading={clientLoading.stats}
          />
        </section>
        
        {/* Chart */}
        <section className="chart-section">
          <ChartSection 
            chartData={state.chartData}
            loading={clientLoading.stats}
          />
        </section>
        
        {/* Entity Tables */}
        <section className="entities-section">
          <EntityTablesSection
            entityData={state.entityData}
            selectedEntities={selectedEntities}
            loading={clientLoading.entities}
          />
        </section>
        
        {/* Recent Clicks */}
        <section className="recent-clicks-section">
          <RecentClicksSection
            clicks={state.recentClicks}
            loading={clientLoading.recentClicks}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <p className="last-updated">
          Last updated: {state.lastUpdated.toLocaleString()}
        </p>
      </footer>
    </div>
  );
};

export default Dashboard;