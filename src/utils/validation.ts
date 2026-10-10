/**
 * Lightweight validation helpers used by routes.
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

const SQL_INJECTION_PATTERNS = [
  /('|")\s*;\s*(drop|delete|truncate|update|insert|alter)\s/gi,
  /union\s+select/gi,
  /--\s*$/gm,
  /\/\*.*\*\//g,
];

export function sanitizeXSS(input: string): string {
  if (typeof input !== 'string') {
    return input as unknown as string;
  }

  let sanitized = input;
  for (const pattern of XSS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return sanitized.replace(/[&<>"'/]/g, (char) => htmlEntities[char] || char);
}

export function containsXSS(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  return XSS_PATTERNS.some((pattern) => pattern.test(input));
}

export function containsSQLInjection(input: string): boolean {
  if (typeof input !== 'string') {
    return false;
  }

  return SQL_INJECTION_PATTERNS.some((pattern) => pattern.test(input));
}

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

  if (value === undefined || value === null || value === '') {
    if (required) {
      return { valid: false, error: `${fieldName} cannot be empty` };
    }
    return { valid: true, value: '' };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: `${fieldName} must be a string` };
  }

  let processedValue = value.trim();

  if (containsXSS(processedValue)) {
    if (sanitize) {
      processedValue = sanitizeXSS(processedValue);
    } else {
      return { valid: false, error: `${fieldName} contains disallowed content` };
    }
  }

  if (containsSQLInjection(processedValue)) {
    return { valid: false, error: `${fieldName} contains illegal characters` };
  }

  if (processedValue.length < minLength) {
    return { valid: false, error: `${fieldName} must be at least ${minLength} characters` };
  }

  if (processedValue.length > maxLength) {
    return { valid: false, error: `${fieldName} must be at most ${maxLength} characters` };
  }

  if (pattern && !pattern.test(processedValue)) {
    return { valid: false, error: `${fieldName} format is invalid` };
  }

  return { valid: true, value: processedValue };
}

export function validateColor(value: unknown): { valid: boolean; value?: string; error?: string } {
  if (value === undefined || value === null || value === '') {
    return { valid: true, value: undefined };
  }

  if (typeof value !== 'string') {
    return { valid: false, error: 'Color must be a string' };
  }

  const hexPattern = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/;
  const namedColors = ['red', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'brown', 'black', 'white', 'gray', 'grey'];

  if (!hexPattern.test(value) && !namedColors.includes(value.toLowerCase())) {
    return { valid: false, error: 'Color format is invalid' };
  }

  return { valid: true, value };
}

export function validateRequestBody<T extends Record<string, unknown>>(
  body: unknown,
  schema: Record<keyof T, {
    type: 'string' | 'number' | 'boolean' | 'object' | 'array';
    required?: boolean;
    validate?: (value: unknown) => { valid: boolean; value?: unknown; error?: string };
  }>
): { valid: boolean; data?: T; errors?: string[] } {
  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body is invalid'] };
  }

  const errors: string[] = [];
  const data: Record<string, unknown> = {};

  for (const [key, field] of Object.entries(schema)) {
    const value = (body as Record<string, unknown>)[key];

    if (value === undefined || value === null) {
      if (field.required) {
        errors.push(`${key} is required`);
      }
      continue;
    }

    if (field.type === 'string' && typeof value !== 'string') {
      errors.push(`${key} must be a string`);
      continue;
    }

    if (field.type === 'number' && typeof value !== 'number') {
      errors.push(`${key} must be a number`);
      continue;
    }

    if (field.type === 'boolean' && typeof value !== 'boolean') {
      errors.push(`${key} must be a boolean`);
      continue;
    }

    if (field.type === 'object' && (typeof value !== 'object' || Array.isArray(value))) {
      errors.push(`${key} must be an object`);
      continue;
    }

    if (field.type === 'array' && !Array.isArray(value)) {
      errors.push(`${key} must be an array`);
      continue;
    }

    if (field.validate) {
      const result = field.validate(value);
      if (!result.valid) {
        errors.push(result.error || `${key} validation failed`);
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

export function getSafeErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    if (error.name === 'ValidationError' || error.name === 'DuplicateError' || error.name === 'NotFoundError') {
      return error.message;
    }
    if (error.message.includes('SQL') || error.message.includes('database')) {
      return 'Database operation failed. Please try again later.';
    }
    if (error.message.includes('D1_ERROR')) {
      return 'Data operation failed. Please check your input.';
    }
    return error.message || 'Operation failed. Please try again later.';
  }

  return 'Unknown error';
}
