/**
 * @fileoverview 数据验证工具
 * @description 提供通用的数据验证函数
 * @module utils/validator
 */

import { ERROR_CODES } from '@/config/constants';

export interface ValidationResult {
  valid: boolean;
  message: string;
  code?: string;
}

export function isValidId(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

export function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function isValidAlias(alias: string): boolean {
  const aliasRegex = /^[a-z0-9-_]+$/i;
  return alias.length >= 2 && alias.length <= 50 && aliasRegex.test(alias);
}

export function validateRequired(value: unknown, fieldName: string): ValidationResult {
  if (value === undefined || value === null || value === '') {
    return {
      valid: false,
      message: `${fieldName} is required`,
      code: ERROR_CODES.VALIDATION,
    };
  }
  return { valid: true, message: '' };
}

export function validateStringLength(
  value: string,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  if (value.length < min || value.length > max) {
    return {
      valid: false,
      message: `${fieldName} must be between ${min} and ${max} characters`,
      code: ERROR_CODES.VALIDATION,
    };
  }
  return { valid: true, message: '' };
}

export function validateNumberRange(
  value: number,
  min: number,
  max: number,
  fieldName: string
): ValidationResult {
  if (value < min || value > max) {
    return {
      valid: false,
      message: `${fieldName} must be between ${min} and ${max}`,
      code: ERROR_CODES.VALIDATION,
    };
  }
  return { valid: true, message: '' };
}

export function validatePagination(
  page?: number,
  pageSize?: number
): { page: number; pageSize: number } {
  return {
    page: Math.max(1, page || 1),
    pageSize: Math.min(100, Math.max(1, pageSize || 20)),
  };
}

export function combineValidations(...results: ValidationResult[]): ValidationResult {
  const invalid = results.find((r) => !r.valid);
  return invalid || { valid: true, message: '' };
}
