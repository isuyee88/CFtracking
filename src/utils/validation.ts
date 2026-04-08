/**
 * @fileoverview 输入验证工具
 * @description 提供输入验证和 XSS 防护功能
 * @module utils/validation
 */

/**
 * XSS 危险字符模式
 */
const XSS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<img[^>]+onerror/gi,
  /<svg[^>]+onload/gi,
  /<body[^>]+onload/gi,
];

/**
 * SQL 注入危险字符模式
 */
const SQL_INJECTION_PATTERNS = [
  /('|")\s*;\s*(drop|delete|truncate|update|insert|alter)\s/gi,
  /union\s+select/gi,
  /--\s*$/gm,
  /\/\*.*\*\//g,
];

/**
 * 清理 XSS 攻击载荷
 * @param input - 输入字符串
 * @returns 清理后的字符串
 */
export function sanitizeXSS(input: string): string {
  if (typeof input !== 'string') {
    return input;
  }

  let sanitized = input;

  // 移除 XSS 危险标签
  XSS_PATTERNS.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '');
  });

  // HTML 实体编码
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  // 只对危险字符进行编码
  sanitized = sanitized.replace(/[&<>"'/]/g, char => htmlEntities[char] || char);

  return sanitized;
}

/**
 * 检测是否包含 XSS 攻击载荷
 * @param input - 输入字符串
 * @returns 是否包含 XSS 攻击载荷
 */
export function containsXSS(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  return XSS_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * 检测是否包含 SQL 注入攻击载荷
 * @param input - 输入字符串
 * @returns 是否包含 SQL 注入攻击载荷
 */
export function containsSQLInjection(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

/**
 * 验证字符串字段
 * @param value - 字段值
 * @param fieldName - 字段名称
 * @param options - 验证选项
 * @returns 验证结果
 */
export function validateStringField(
  value: unknown,
  fieldName: string,
  options: {
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    pattern?: RegExp;
    sanitize?: boolean;
  } = {}
): { valid: boolean; value?: string; error?: string } {
  const {
    required = true,
    minLength = 1,
    maxLength = 500,
    pattern,
    sanitize = true,
  } = options;

  // 检查必填
  if (value === undefined || value === null || value === '') {
    if (required) {
      return { valid: false, error: `${fieldName}不能为空` };
    }
    return { valid: true, value: '' };
  }

  // 类型检查
  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName}必须是字符串` };
  }

  let processedValue = value.trim();

  // XSS 检测
  if (containsXSS(processedValue)) {
    if (sanitize) {
      processedValue = sanitizeXSS(processedValue);
    } else {
      return { valid: false, error: `${fieldName}包含不允许的内容` };
    }
  }

  // SQL 注入检测
  if (containsSQLInjection(processedValue)) {
    return { valid: false, error: `${fieldName}包含非法字符` };
  }

  // 长度检查
  if (processedValue.length < minLength) {
    return { valid: false, error: `${fieldName}长度不能少于${minLength}个字符` };
  }

  if (processedValue.length > maxLength) {
    return { valid: false, error: `${fieldName}长度不能超过${maxLength}个字符` };
  }

  // 正则检查
  if (pattern && !pattern.test(processedValue)) {
    return { valid: false, error: `${fieldName}格式不正确` };
  }

  return { valid: true, value: processedValue };
}

/**
 * 验证颜色字段
 * @param value - 颜色值
 * @returns 验证结果
 */
export function validateColor(value: unknown): { valid: boolean; value?: string; error?: string } {
  if (value === undefined || value === null || value === '') {
    return { valid: true, value: undefined };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: '颜色必须是字符串' };
  }

  // 验证颜色格式 (#RRGGBB 或 #RGB 或颜色名称)
  const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
  const namedColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'grey'];

  if (!hexPattern.test(value) && !namedColors.includes(value.toLowerCase())) {
    return { valid: false, error: '颜色格式不正确' };
  }

  return { valid: true, value };
}

/**
 * 验证请求体
 * @param body - 请求体
 * @param schema - 验证模式
 * @returns 验证结果
 */
export function validateRequestBody<T extends Record<string, unknown>>(
  body: unknown,
  schema: Record<keyof T, {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required?: boolean;
    validate?: (value: unknown) => { valid: boolean; value?: unknown; error?: string };
  }>
): { valid: boolean; data?: T; errors?: string[] } {
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['请求体格式错误'] };
  }

  const errors: string[] = [];
  const data: Record<string, unknown> = {};

  for (const [key, field] of Object.entries(schema)) {
    const value = (body as Record<string, unknown>)[key];

    // 检查必填
    if (value === undefined || value === null) {
      if (field.required) {
        errors.push(`${key}是必填字段`);
      }
      continue;
    }

    // 类型检查
    if (field.type === 'string' && typeof value !== 'string') {
      errors.push(`${key}必须是字符串`);
      continue;
    }

    if (field.type === 'number' && typeof value !== 'number') {
      errors.push(`${key}必须是数字`);
      continue;
    }

    if (field.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`${key}必须是布尔值`);
      continue;
    }

    if (field.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
      errors.push(`${key}必须是对象`);
      continue;
    }

    if (field.type === 'array' && !Array.isArray(value)) {
      errors.push(`${key}必须是数组`);
      continue;
    }

    // 自定义验证
    if (field.validate) {
      const result = field.validate(value);
      if (!result.valid) {
        errors.push(result.error || `${key}验证失败`);
        continue;
      }
      data[key] = result.value;
    } else {
      data[key] = value;
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, data: data as T };
}

/**
 * 生成安全的错误消息
 * @param error - 原始错误
 * @returns 安全的错误消息
 */
export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // 不暴露内部错误详情
    if (error.message.includes('SQL') || error.message.includes('database')) {
      return '数据库操作失败，请稍后重试';
    }
    if (error.message.includes('D1_ERROR')) {
      return '数据操作失败，请检查输入';
    }
    return '操作失败，请稍后重试';
  }
  return '未知错误';
}
