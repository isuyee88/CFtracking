/**
 * @fileoverview 错误处理中间件
 * @description 统一处理应用错误
 * @module middleware/error
 */

import type { Context, Next } from 'hono';
import { error } from '@/utils/response';
import { ERROR_CODES, HTTP_STATUS } from '@/config/constants';

export class AppError extends Error {
  constructor(
    public message: string,
    public code: string = ERROR_CODES.UNKNOWN,
    public statusCode: number = HTTP_STATUS.INTERNAL_ERROR,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ERROR_CODES.VALIDATION, HTTP_STATUS.BAD_REQUEST, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(message: string = 'Resource not found') {
    super(message, ERROR_CODES.NOT_FOUND, HTTP_STATUS.NOT_FOUND);
    this.name = 'NotFoundError';
  }
}

export class DuplicateError extends AppError {
  constructor(message: string) {
    super(message, ERROR_CODES.DUPLICATE, HTTP_STATUS.CONFLICT);
    this.name = 'DuplicateError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, ERROR_CODES.DATABASE, HTTP_STATUS.INTERNAL_ERROR, details);
    this.name = 'DatabaseError';
  }
}

export async function errorMiddleware(c: Context, next: Next): Promise<void> {
  try {
    await next();
  } catch (err) {
    console.error('Error:', err);

    if (err instanceof AppError) {
      c.status(err.statusCode as any);
      c.json(error(err.message, err.code, err.details));
      return;
    }

    c.status(HTTP_STATUS.INTERNAL_ERROR);
    c.json(error('Internal Server Error', ERROR_CODES.UNKNOWN));
  }
}
