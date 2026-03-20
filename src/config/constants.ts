/**
 * @fileoverview 系统常量定义
 * @description 定义系统级别的常量
 * @module config/constants
 */

export const API_VERSION = 'v1';
export const API_PREFIX = '/api';

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_ERROR: 500,
} as const;

export const ERROR_CODES = {
  UNKNOWN: 'UNKNOWN_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  DUPLICATE: 'DUPLICATE_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  DATABASE: 'DATABASE_ERROR',
  EXTERNAL_API: 'EXTERNAL_API_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
} as const;

export const CACHE_TTL = {
  SHORT: 60,
  MEDIUM: 300,
  LONG: 3600,
} as const;

export const TRACKING = {
  CLICK_ID_PREFIX: 'clk_',
  CONVERSION_ID_PREFIX: 'cnv_',
  VISITOR_ID_PREFIX: 'vst_',
  UNIQUENESS_DEFAULT_TTL: 86400,
} as const;

export const RULE_ENGINE = {
  DEFAULT_PRIORITY: 0,
  MAX_RETRY: 3,
  RETRY_DELAY: 1000,
  EVALUATION_INTERVAL: 60000,
} as const;
