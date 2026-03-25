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
    total?: number;
    totalPages?: number;
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
