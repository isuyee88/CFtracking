const ELLIPSIS = '...';

export function clampInput(value: unknown, maxLength?: number): string {
  const normalized = typeof value === 'string' ? value : String(value ?? '');
  if (!maxLength || maxLength <= 0) {
    return normalized;
  }

  const chars = Array.from(normalized);
  if (chars.length <= maxLength) {
    return normalized;
  }

  return chars.slice(0, maxLength).join('');
}

export function truncateLabel(value: unknown, maxLength?: number): string {
  const normalized = typeof value === 'string' ? value : String(value ?? '');
  if (!maxLength || maxLength <= 0) {
    return normalized;
  }

  const chars = Array.from(normalized);
  if (chars.length <= maxLength) {
    return normalized;
  }

  if (maxLength <= ELLIPSIS.length) {
    return chars.slice(0, maxLength).join('');
  }

  return `${chars.slice(0, maxLength - ELLIPSIS.length).join('')}${ELLIPSIS}`;
}
