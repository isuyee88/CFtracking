import type {
  AttributionConversionStatus,
  AttributionEvent,
  AttributionIdentity,
} from '@/types/attribution-event';
import { canTransitionConversionStatus } from '@/types/attribution-event';
import type { D1Database } from './index';

export interface AttributionEventRecord {
  id: string;
  sourcePlatform: string;
  transactionId: string;
  clickId: string | null;
  conversionId: string | null;
  eventStatus: AttributionConversionStatus;
  payout: number;
  currency: string;
  occurredAt: string;
  receivedAt: string;
  rawHash: string;
  requestId: string;
  createdAt: string;
}

export interface AttributionEventAppendMetadata {
  rawHash: string;
  requestId: string;
  receivedAt?: string;
}

export interface AttributionEventAppendResult {
  duplicate: boolean;
  record: AttributionEventRecord;
}

export class InvalidAttributionStatusTransitionError extends Error {
  constructor(
    public readonly identity: AttributionIdentity,
    public readonly previous: AttributionConversionStatus,
    public readonly next: AttributionConversionStatus,
  ) {
    super(
      `Invalid attribution status transition for ${identity.sourcePlatform}/${identity.transactionId}: ${previous} -> ${next}`,
    );
    this.name = 'InvalidAttributionStatusTransitionError';
  }
}

/**
 * D1-backed immutable attribution event ledger.
 *
 * The migration owns the table. This repository deliberately does not create
 * schema in a request path; a missing migration must fail release/health checks
 * rather than being hidden by a public webhook request.
 */
export class AttributionEventRepository {
  constructor(private readonly db: D1Database) {}

  async append(
    event: AttributionEvent,
    metadata: AttributionEventAppendMetadata,
  ): Promise<AttributionEventAppendResult> {
    if (!metadata.rawHash || metadata.rawHash.trim().length === 0) {
      throw new Error('rawHash is required');
    }
    if (!metadata.requestId || metadata.requestId.trim().length === 0) {
      throw new Error('requestId is required');
    }

    const previous = await this.latest(event.sourcePlatform, event.transactionId);
    if (previous && !canTransitionConversionStatus(previous.eventStatus, event.status)) {
      throw new InvalidAttributionStatusTransitionError(
        { sourcePlatform: event.sourcePlatform, transactionId: event.transactionId },
        previous.eventStatus,
        event.status,
      );
    }

    if (previous?.eventStatus === event.status) {
      return { duplicate: true, record: previous };
    }

    const id = crypto.randomUUID();
    const receivedAt = metadata.receivedAt ?? new Date().toISOString();
    const result = await this.db.prepare(`
      INSERT INTO attribution_events (
        id, sourcePlatform, transactionId, clickId, conversionId, eventStatus,
        payout, currency, occurredAt, receivedAt, rawHash, requestId
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(sourcePlatform, transactionId, eventStatus) DO NOTHING
    `).bind(
      id,
      event.sourcePlatform,
      event.transactionId,
      event.clickId ?? null,
      event.conversionId ?? null,
      event.status,
      event.revenue ?? event.payout ?? 0,
      event.currency ?? 'USD',
      event.occurredAt,
      receivedAt,
      metadata.rawHash,
      metadata.requestId,
    ).run();

    const changes = Number((result as { meta?: { changes?: number } }).meta?.changes ?? 0);
    if (changes === 0) {
      const duplicate = await this.findByStatus(event.sourcePlatform, event.transactionId, event.status);
      if (duplicate) return { duplicate: true, record: duplicate };
      throw new Error('Attribution event insert was ignored but no existing event was found');
    }

    const inserted = await this.findById(id);
    if (!inserted) throw new Error(`Attribution event ${id} was not readable after insert`);
    return { duplicate: false, record: inserted };
  }

  async attachConversionId(
    sourcePlatform: string,
    transactionId: string,
    eventStatus: AttributionConversionStatus,
    conversionId: string,
  ): Promise<void> {
    const result = await this.db.prepare(`
      UPDATE attribution_events
      SET conversionId = ?
      WHERE sourcePlatform = ? AND transactionId = ? AND eventStatus = ?
    `).bind(conversionId, sourcePlatform, transactionId, eventStatus).run();
    const changes = Number((result as { meta?: { changes?: number } }).meta?.changes ?? 0);
    if (changes === 0) {
      throw new Error(
        `Attribution event not found for conversion attachment: ${sourcePlatform}/${transactionId}/${eventStatus}`,
      );
    }
  }
  async latest(sourcePlatform: string, transactionId: string): Promise<AttributionEventRecord | null> {
    const row = await this.db.prepare(`
      SELECT * FROM attribution_events
      WHERE sourcePlatform = ? AND transactionId = ?
      ORDER BY receivedAt DESC, createdAt DESC, id DESC
      LIMIT 1
    `).bind(sourcePlatform, transactionId).first<Record<string, unknown>>();
    return row ? this.map(row) : null;
  }

  private async findByStatus(
    sourcePlatform: string,
    transactionId: string,
    eventStatus: AttributionConversionStatus,
  ): Promise<AttributionEventRecord | null> {
    const row = await this.db.prepare(`
      SELECT * FROM attribution_events
      WHERE sourcePlatform = ? AND transactionId = ? AND eventStatus = ?
      LIMIT 1
    `).bind(sourcePlatform, transactionId, eventStatus).first<Record<string, unknown>>();
    return row ? this.map(row) : null;
  }

  private async findById(id: string): Promise<AttributionEventRecord | null> {
    const row = await this.db.prepare(
      'SELECT * FROM attribution_events WHERE id = ? LIMIT 1',
    ).bind(id).first<Record<string, unknown>>();
    return row ? this.map(row) : null;
  }

  private map(row: Record<string, unknown>): AttributionEventRecord {
    return {
      id: String(row.id),
      sourcePlatform: String(row.sourcePlatform),
      transactionId: String(row.transactionId),
      clickId: row.clickId == null ? null : String(row.clickId),
      conversionId: row.conversionId == null ? null : String(row.conversionId),
      eventStatus: String(row.eventStatus) as AttributionConversionStatus,
      payout: Number(row.payout ?? 0),
      currency: String(row.currency ?? 'USD'),
      occurredAt: String(row.occurredAt),
      receivedAt: String(row.receivedAt),
      rawHash: String(row.rawHash),
      requestId: String(row.requestId),
      createdAt: String(row.createdAt),
    };
  }
}
