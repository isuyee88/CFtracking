import { ValidationError } from '@/middleware/error';

interface StringFieldOptions {
  field: string;
  maxLength: number;
  trim?: boolean;
}

function assertString(value: unknown, field: string): asserts value is string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string`);
  }
}

function applyLengthCheck(value: string, field: string, maxLength: number): string {
  if (value.length > maxLength) {
    throw new ValidationError(`${field} exceeds max length ${maxLength}`);
  }

  return value;
}

export function normalizeRequiredString(value: unknown, options: StringFieldOptions): string {
  const { field, maxLength, trim = true } = options;
  assertString(value, field);

  const nextValue = trim ? value.trim() : value;
  if (nextValue.length === 0) {
    throw new ValidationError(`${field} is required`);
  }

  return applyLengthCheck(nextValue, field, maxLength);
}

export function normalizeOptionalString(
  value: unknown,
  options: StringFieldOptions
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  const { field, maxLength, trim = true } = options;
  assertString(value, field);
  const nextValue = trim ? value.trim() : value;
  return applyLengthCheck(nextValue, field, maxLength);
}

export function normalizeNullableString(
  value: unknown,
  options: StringFieldOptions
): string | null | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return null;
  }

  const { field, maxLength, trim = true } = options;
  assertString(value, field);
  const nextValue = trim ? value.trim() : value;
  return applyLengthCheck(nextValue, field, maxLength);
}

