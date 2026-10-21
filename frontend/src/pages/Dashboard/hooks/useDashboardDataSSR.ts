/**
 * @fileoverview Dashboard 服务端数据获取 Hook（SSR 专用）
 * @description 专为 SSR 渲染场景设计的 Hook，用于在服务端预取 Dashboard 所需数据。
 * 此 Hook 只会在服务端执行，因为它直接调用 `fetchDashboardData`。
 * @module pages/Dashboard/hooks/useDashboardDataSSR
 */

import { useState, useEffect, useRef } from 'react';
import { fetchDashboardData } from '@/services/dashboard.server';
import { ServerDashboardData } from '@/services/dashboard.server';

/**
 * SSR 专用的 Dashboard 数据 Hook
 *
 * 该 Hook 会在服务端渲染期间自动调用一次 `fetchDashboardData` 并
 * 将返回的完整数据注入组件状态。在客户端会保持挂载但不再重新请求，
 * 从而实现“一次渲染完成后不再发起网络请求”的行为。
 *
 * 使用方式：
 * ```tsx
 * const { data: dashboardData, isLoading } = useDashboardDataSSR({
 *   timeRange: 'last7days',
 * });
 * ```
 *
 * @param options 配置对象，目前只支持 `timeRange`。
 * @returns 包含数据、加载状态和错误信息的对象。
 */
export function useDashboardDataSSR(options: { timeRange: string }) {
  const { timeRange } = options;
  const [data, setData] = useState<ServerDashboardData | null>(null);
  const [isLoading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const mountedRef = useRef(false); // 用于防止组件在异步请求完成后已卸载

  useEffect(() => {
    // 仅在服务端执行一次
    if (typeof window === 'undefined') {
      fetchDashboardData(timeRange)
        .then((result) => {
          if (mountedRef.current) {
            setData(result);
            setLoading(false);
          }
        })
        .catch((err) => {
          if (mountedRef.current) {
            setError(err instanceof Error ? err.message : String(err));
            setLoading(false);
          }
        });
    }
    // 客户端不做任何操作，保持挂载
    return () => {
      mountedRef.current = false;
    };
  }, [timeRange]);

  return {
    data,
    isLoading,
    error,
  };
}