/**
 * File: useURLState.ts
 * Purpose: URL状态管理Hook，实现类似Keitaro的URL状态编码功能
 * Input/Output: 接收/返回Dashboard状态对象，自动同步到URL
 * Logic: 使用LZ-String压缩状态，编码到URL参数中
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

// 压缩库使用简单的Base64编码，避免引入额外依赖
const encodeState = (state: Record<string, any>): string => {
  try {
    const json = JSON.stringify(state);
    // 使用URL安全的Base64编码
    return btoa(json)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '.');
  } catch {
    return '';
  }
};

const decodeState = (encoded: string): Record<string, any> | null => {
  try {
    // 还原Base64编码
    const base64 = encoded
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .replace(/\./g, '=');
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
};

// Dashboard状态接口
export interface DashboardState {
  // 时间范围
  range?: {
    from: string;
    to: string;
    interval: 'today' | 'yesterday' | 'week' | 'month' | 'custom';
    timezone: string;
  };
  // 启用的指标
  enabledMetrics?: string[];
  // 启用的实体
  enabledEntities?: ('campaign' | 'landing' | 'offer' | 'ts')[];
  // 最近点击表格列
  lastClicksColumns?: string[];
  // 顶部指标
  topMetrics?: string[];
  // 选中的Campaign
  selectedCampaign?: string | null;
  // 其他筛选条件
  filters?: Record<string, any>;
}

interface DashboardSearchState {
  range?: string;
  from?: string;
  to?: string;
  timezone?: string;
  enabledMetrics?: string[];
  enabledEntities?: string[];
  lastClicksColumns?: string[];
  selectedCampaign?: string | null;
}

// Campaigns页面状态接口
export interface CampaignsState {
  // 排序
  sort?: {
    field: string;
    order: 'asc' | 'desc';
  };
  // 筛选
  filters?: Record<string, any>;
  // 显示的列
  columns?: string[];
  // 分页
  pagination?: {
    page: number;
    pageSize: number;
  };
  // 时间范围
  range?: {
    interval: string;
    timezone: string;
  };
}

// 通用URL状态Hook
export function useURLState<T extends Record<string, any>>(
  paramName: string = 's',
  defaultState: T
): {
  state: T;
  setState: (newState: Partial<T> | ((prev: T) => Partial<T>)) => void;
  resetState: () => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // 从URL解码状态 - 使用 useMemo 避免重复计算
  const urlState = useMemo(() => {
    const encoded = searchParams.get(paramName);
    if (encoded) {
      const decoded = decodeState(encoded);
      if (decoded) {
        return { ...defaultState, ...decoded };
      }
    }
    return defaultState;
  }, [searchParams, paramName, defaultState]);

  const [state, setInternalState] = useState<T>(urlState);

  // 同步URL到状态 - 只在URL参数变化时执行
  const prevUrlStateRef = useRef<string>('');
  useEffect(() => {
    const encoded = searchParams.get(paramName) || '';
    if (encoded !== prevUrlStateRef.current) {
      prevUrlStateRef.current = encoded;
      setInternalState(urlState);
    }
  }, [urlState, paramName, searchParams]);

  // 设置新状态并更新URL
  const setState = useCallback((
    newState: Partial<T> | ((prev: T) => Partial<T>)
  ) => {
    setInternalState(prev => {
      const partialState = typeof newState === 'function' 
        ? (newState as Function)(prev) 
        : newState;
      const mergedState = { ...prev, ...partialState };
      
      // 更新URL
      const encoded = encodeState(mergedState);
      setSearchParams({ [paramName]: encoded }, { replace: true });
      
      return mergedState;
    });
  }, [paramName, setSearchParams]);

  // 重置状态
  const resetState = useCallback(() => {
    setInternalState(defaultState);
    setSearchParams({}, { replace: true });
  }, [defaultState, setSearchParams]);

  return { state, setState, resetState };
}

// Dashboard默认状态 - 移到组件外部避免每次渲染创建新对象
const DASHBOARD_DEFAULT_STATE: DashboardState = {
  range: {
    from: new Date().toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
    interval: 'today',
    timezone: 'UTC'
  },
  enabledMetrics: [
    'clicks',
    'unique_clicks_campaign',
    'conversions',
    'cost',
    'revenue_confirmed',
    'profit_confirmed',
    'roi_confirmed'
  ],
  enabledEntities: ['campaigns', 'landings', 'offers', 'sources'],
  lastClicksColumns: [
    'event_id',
    'datetime',
    'campaign',
    'os_icon',
    'browser_icon',
    'ip',
    'destination'
  ],
  topMetrics: ['clicks', 'campaign_unique_clicks', 'conversions'],
  selectedCampaign: null,
  filters: {}
};

function splitCsvParam(value: string | null): string[] | undefined {
  if (!value) {
    return undefined;
  }

  const items = value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  return items.length > 0 ? items : undefined;
}

function parseDashboardSearchState(searchParams: URLSearchParams): DashboardSearchState | null {
  const range = searchParams.get('range') || undefined;
  const from = searchParams.get('from') || undefined;
  const to = searchParams.get('to') || undefined;
  const timezone = searchParams.get('tz') || undefined;
  const selectedCampaign = searchParams.get('campaign');
  const enabledMetrics = splitCsvParam(searchParams.get('metrics'));
  const enabledEntities = splitCsvParam(searchParams.get('entities'));
  const lastClicksColumns = splitCsvParam(searchParams.get('recent'));

  if (
    !range &&
    !from &&
    !to &&
    !timezone &&
    !selectedCampaign &&
    !enabledMetrics &&
    !enabledEntities &&
    !lastClicksColumns
  ) {
    return null;
  }

  return {
    range,
    from,
    to,
    timezone,
    enabledMetrics,
    enabledEntities,
    lastClicksColumns,
    selectedCampaign: selectedCampaign || null,
  };
}

function mergeDashboardState(searchState: DashboardSearchState | null): DashboardState {
  const mergedRange = {
    ...DASHBOARD_DEFAULT_STATE.range!,
    ...(searchState?.range ? { interval: searchState.range as DashboardState['range']['interval'] } : {}),
    ...(searchState?.from ? { from: searchState.from } : {}),
    ...(searchState?.to ? { to: searchState.to } : {}),
    ...(searchState?.timezone ? { timezone: searchState.timezone } : {}),
  };

  return {
    ...DASHBOARD_DEFAULT_STATE,
    ...(searchState?.enabledMetrics ? { enabledMetrics: searchState.enabledMetrics } : {}),
    ...(searchState?.enabledEntities ? { enabledEntities: searchState.enabledEntities as DashboardState['enabledEntities'] } : {}),
    ...(searchState?.lastClicksColumns ? { lastClicksColumns: searchState.lastClicksColumns } : {}),
    ...(searchState?.selectedCampaign !== undefined ? { selectedCampaign: searchState.selectedCampaign } : {}),
    range: mergedRange,
  };
}

function buildDashboardSearchParams(state: DashboardState, currentSearchParams: URLSearchParams): URLSearchParams {
  const nextSearchParams = new URLSearchParams(currentSearchParams);
  nextSearchParams.delete('s');

  const range = state.range?.interval || DASHBOARD_DEFAULT_STATE.range?.interval;
  const from = state.range?.from || DASHBOARD_DEFAULT_STATE.range?.from;
  const to = state.range?.to || DASHBOARD_DEFAULT_STATE.range?.to;
  const timezone = state.range?.timezone || DASHBOARD_DEFAULT_STATE.range?.timezone;

  if (range) {
    nextSearchParams.set('range', range);
  } else {
    nextSearchParams.delete('range');
  }

  if (from) {
    nextSearchParams.set('from', from);
  } else {
    nextSearchParams.delete('from');
  }

  if (to) {
    nextSearchParams.set('to', to);
  } else {
    nextSearchParams.delete('to');
  }

  if (timezone) {
    nextSearchParams.set('tz', timezone);
  } else {
    nextSearchParams.delete('tz');
  }

  if (state.enabledMetrics?.length) {
    nextSearchParams.set('metrics', state.enabledMetrics.join(','));
  } else {
    nextSearchParams.delete('metrics');
  }

  if (state.enabledEntities?.length) {
    nextSearchParams.set('entities', state.enabledEntities.join(','));
  } else {
    nextSearchParams.delete('entities');
  }

  if (state.lastClicksColumns?.length) {
    nextSearchParams.set('recent', state.lastClicksColumns.join(','));
  } else {
    nextSearchParams.delete('recent');
  }

  if (state.selectedCampaign) {
    nextSearchParams.set('campaign', state.selectedCampaign);
  } else {
    nextSearchParams.delete('campaign');
  }

  return nextSearchParams;
}

// Dashboard专用Hook
export const useDashboardURLState = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const dashboardState = useMemo(() => {
    const readableState = parseDashboardSearchState(searchParams);
    if (readableState) {
      return mergeDashboardState(readableState);
    }

    const legacyState = searchParams.get('s');
    if (legacyState) {
      const decoded = decodeState(legacyState);
      if (decoded) {
        return { ...DASHBOARD_DEFAULT_STATE, ...decoded };
      }
    }

    return DASHBOARD_DEFAULT_STATE;
  }, [searchParams]);

  const [state, setInternalState] = useState<DashboardState>(dashboardState);
  const previousStateRef = useRef('');

  useEffect(() => {
    const serializedState = JSON.stringify(dashboardState);
    if (serializedState !== previousStateRef.current) {
      previousStateRef.current = serializedState;
      setInternalState(dashboardState);
    }
  }, [dashboardState]);

  const setState = useCallback(
    (newState: Partial<DashboardState> | ((prev: DashboardState) => Partial<DashboardState>)) => {
      setInternalState((prev) => {
        const partialState =
          typeof newState === 'function'
            ? (newState as (previous: DashboardState) => Partial<DashboardState>)(prev)
            : newState;

        const mergedState: DashboardState = {
          ...prev,
          ...partialState,
          range: {
            ...prev.range,
            ...(partialState.range || {}),
          },
        };

        const nextSearchParams = buildDashboardSearchParams(mergedState, searchParams);
        const nextQuery = nextSearchParams.toString();
        const currentQuery = searchParams.toString();

        if (nextQuery !== currentQuery) {
          setSearchParams(nextSearchParams, { replace: false });
        }

        return mergedState;
      });
    },
    [searchParams, setSearchParams]
  );

  const resetState = useCallback(() => {
    setInternalState(DASHBOARD_DEFAULT_STATE);
    setSearchParams(buildDashboardSearchParams(DASHBOARD_DEFAULT_STATE, new URLSearchParams()), {
      replace: true,
    });
  }, [setSearchParams]);

  return { state, setState, resetState };
};

// Campaigns页面专用Hook
export const useCampaignsURLState = () => {
  const defaultState: CampaignsState = {
    sort: {
      field: 'id',
      order: 'desc'
    },
    filters: {},
    columns: [
      'checkbox',
      'state',
      'id',
      'name',
      'ts',
      'streams_count',
      'clicks',
      'conversions',
      'crs',
      'sale_revenue',
      'cost',
      'profit_confirmed',
      'roi_confirmed',
      'group'
    ],
    pagination: {
      page: 1,
      pageSize: 25
    },
    range: {
      interval: 'today',
      timezone: 'UTC'
    }
  };

  return useURLState<CampaignsState>('s', defaultState);
};

export default useURLState;
