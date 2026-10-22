/**
 * @fileoverview 响应处理工具
 * @description 统一的 API 响应格式处理
 * @module utils/response
 */

import { ERROR_CODES } from '@/config/constants';

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  } | null;
  meta?: {
    page?: number;
    pageSize?: number;
    /** 精确值；截断时是下界，页码越界时为 null（字段始终存在）。 */
    total?: number | null;
    /** total 为 null 时为 null，避免派生 NaN。 */
    totalPages?: number | null;
    /** 当前页之后是否还有行（limit+1 探测）。 */
    hasMore?: boolean;
    /** total 是否被 LIST_COUNT_CAP 截断（下界）。 */
    totalCapped?: boolean;
    /** totalCapped 的别名。 */
    totalIsApproximate?: boolean;
    /** 请求页码窗口超出可服务范围，未执行 D1 查询。 */
    pageOutOfRange?: boolean;
    dataSource?: 'd1_database';
  };
}

export function success<T>(data: T, meta?: ApiResponse<T>['meta']): ApiResponse<T> {
  return {
    success: true,
    data,
    error: null,
    meta,
  };
}

export function error(
  message: string,
  code: string = ERROR_CODES.UNKNOWN,
  details?: Record<string, unknown>
): ApiResponse<null> {
  return {
    success: false,
    data: null,
    error: {
      code,
      message,
      details,
    },
  };
}

export function paginated<T>(
  list: T[],
  total: number,
  page: number,
  pageSize: number
): ApiResponse<T[]> {
  return {
    success: true,
    data: list,
    error: null,
    meta: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
}
