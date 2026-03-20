/**
 * File: useURLState.ts
 * Purpose: URL状态管理Hook，实现类似Keitaro的URL状态编码功能
 * Input/Output: 接收/返回Dashboard状态对象，自动同步到URL
 * Logic: 使用LZ-String压缩状态，编码到URL参数中
 */

import { useCallback, useEffect, useState } from 'react';
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
  
  // 从URL解码状态
  const getStateFromURL = useCallback((): T => {
    const encoded = searchParams.get(paramName);
    if (encoded) {
      const decoded = decodeState(encoded);
      if (decoded) {
        return { ...defaultState, ...decoded };
      }
    }
    return defaultState;
  }, [searchParams, paramName, defaultState]);

  const [state, setInternalState] = useState<T>(getStateFromURL);

  // 同步URL到状态 - 只在当前路径是根路径时执行（避免影响其他页面导航）
  useEffect(() => {
    // 检查当前路径是否是根路径（Dashboard页面）
    const currentPath = window.location.hash.replace('#', '') || '/';
    if (currentPath === '/' || currentPath === '') {
      const urlState = getStateFromURL();
      setInternalState(urlState);
    }
  }, [getStateFromURL]);

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

// Dashboard专用Hook
export const useDashboardURLState = () => {
  const defaultState: DashboardState = {
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

  return useURLState<DashboardState>('s', defaultState);
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
