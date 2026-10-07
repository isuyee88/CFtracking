export const ATTRIBUTION_CONVERSION_STATUSES = [
  'pending',
  'approved',
  'rejected',
  'reversed',
] as const;

export type AttributionConversionStatus = (typeof ATTRIBUTION_CONVERSION_STATUSES)[number];

export interface AttributionIdentity {
  sourcePlatform: string;
  transactionId: string;
}

export interface AttributionEventInput extends AttributionIdentity {
  status: AttributionConversionStatus;
  occurredAt: string;
  clickId?: string;
  conversionId?: string;
  eventId?: string;
  revenue?: number;
  /** Canonical payout amount used by inbound postbacks. */
  payout?: number;
  currency?: string;
  metadata?: Record<string, unknown>;
}

export interface AttributionEvent extends AttributionEventInput {
  identity: AttributionIdentity;
}

function isAttributionConversionStatus(value: string): value is AttributionConversionStatus {
  return (ATTRIBUTION_CONVERSION_STATUSES as readonly string[]).includes(value);
}

/**
 * Build a stable identity key without allowing delimiters in one field to
 * change the boundary of the other field. The source platform is length-coded
 * and the transaction id occupies the remainder of the key.
 */
export function buildAttributionEventKey(event: AttributionEvent | AttributionIdentity): string {
  return `${event.sourcePlatform}:${event.sourcePlatform.length}:${event.transactionId}`;
}

/**
 * Validate and materialize an inbound attribution event at the system edge.
 * Identifiers are preserved exactly; only blank values are rejected.
 */
export function createAttributionEvent(input: AttributionEventInput): AttributionEvent {
  if (!input.sourcePlatform || input.sourcePlatform.trim().length === 0) {
    throw new Error('sourcePlatform is required');
  }
  if (!input.transactionId || input.transactionId.trim().length === 0) {
    throw new Error('transactionId is required');
  }
  if (!isAttributionConversionStatus(input.status)) {
    throw new Error(`Unsupported conversion status: ${String(input.status)}`);
  }
  if (!input.occurredAt || Number.isNaN(Date.parse(input.occurredAt))) {
    throw new Error('occurredAt must be a valid ISO timestamp');
  }

  return {
    ...input,
    identity: {
      sourcePlatform: input.sourcePlatform,
      transactionId: input.transactionId,
    },
  };
}

/**
 * Conversion status is monotonic: retries may repeat a state, but a terminal
 * rejection/reversal cannot be reopened by a late or duplicated event.
 */
export function canTransitionConversionStatus(
  previous: AttributionConversionStatus | null,
  next: AttributionConversionStatus,
): boolean {
  if (previous === null || previous === next) return true;

  switch (previous) {
    case 'pending':
      return next === 'approved' || next === 'rejected';
    case 'approved':
      return next === 'reversed';
    case 'rejected':
    case 'reversed':
      return false;
  }
}
