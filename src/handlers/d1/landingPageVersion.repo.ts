import type { D1Database } from './index';
import type {
  CreateLandingPageVersionInput,
  LandingPageVersion,
  LandingPageVersionStatus,
} from '@/types/landingPageVersion';

const VERSION_STATUSES = new Set<LandingPageVersionStatus>([
  'draft',
  'preview',
  'published',
  'paused',
  'archived',
]);

function versionId(): string {
  return `lpv_${crypto.randomUUID()}`;
}

function parseManifest(value: unknown): Record<string, unknown> | null {
  if (typeof value !== 'string' || value.length === 0) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

export class LandingPageVersionRepository {
  constructor(private readonly db: D1Database) {}

  private transform(row: Record<string, unknown>): LandingPageVersion {
    return {
      id: String(row.id),
      landingPageId: String(row.landingPageId),
      versionNumber: Number(row.versionNumber),
      assetId: (row.assetId as string | null) ?? null,
      manifestSnapshot: parseManifest(row.manifestSnapshotJson),
      status: String(row.status) as LandingPageVersionStatus,
      publishedAt: (row.publishedAt as string | null) ?? null,
      publishedBy: (row.publishedBy as string | null) ?? null,
      rollbackFromVersion: row.rollbackFromVersion == null ? null : Number(row.rollbackFromVersion),
      contentHash: (row.contentHash as string | null) ?? null,
      etag: (row.etag as string | null) ?? null,
      createdAt: String(row.createdAt),
      updatedAt: String(row.updatedAt),
    };
  }

  async findById(id: string): Promise<LandingPageVersion | null> {
    const row = await this.db.prepare(
      'SELECT * FROM landingPageVersions WHERE id = ? LIMIT 1',
    ).bind(id).first<Record<string, unknown>>();
    return row ? this.transform(row) : null;
  }

  async findByLandingPage(landingPageId: string): Promise<LandingPageVersion[]> {
    const result = await this.db.prepare(
      'SELECT * FROM landingPageVersions WHERE landingPageId = ? ORDER BY versionNumber ASC',
    ).bind(landingPageId).all<Record<string, unknown>>();
    return (result.results ?? []).map((row) => this.transform(row));
  }

  async findByVersionNumber(landingPageId: string, versionNumber: number): Promise<LandingPageVersion | null> {
    const row = await this.db.prepare(
      'SELECT * FROM landingPageVersions WHERE landingPageId = ? AND versionNumber = ? LIMIT 1',
    ).bind(landingPageId, versionNumber).first<Record<string, unknown>>();
    return row ? this.transform(row) : null;
  }

  async findPublished(landingPageId: string): Promise<LandingPageVersion | null> {
    const row = await this.db.prepare(
      "SELECT * FROM landingPageVersions WHERE landingPageId = ? AND status = 'published' ORDER BY versionNumber DESC LIMIT 1",
    ).bind(landingPageId).first<Record<string, unknown>>();
    return row ? this.transform(row) : null;
  }

  async create(input: CreateLandingPageVersionInput): Promise<LandingPageVersion> {
    const status = input.status ?? 'draft';
    if (!VERSION_STATUSES.has(status)) {
      throw new Error('Landing Page version status is invalid');
    }

    const next = await this.db.prepare(
      'SELECT COALESCE(MAX(versionNumber), 0) + 1 AS nextVersion FROM landingPageVersions WHERE landingPageId = ?',
    ).bind(input.landingPageId).first<{ nextVersion: number }>();
    const versionNumber = Number(next?.nextVersion ?? 1);
    const now = new Date().toISOString();
    const publishedAt = status === 'published' ? (input.publishedAt ?? now) : null;
    const id = versionId();

    await this.db.prepare(`
      INSERT INTO landingPageVersions (
        id, landingPageId, versionNumber, assetId, manifestSnapshotJson, status,
        publishedAt, publishedBy, rollbackFromVersion, contentHash, etag, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      id,
      input.landingPageId,
      versionNumber,
      input.assetId ?? null,
      input.manifestSnapshot == null ? null : JSON.stringify(input.manifestSnapshot),
      status,
      publishedAt,
      status === 'published' ? (input.publishedBy ?? null) : null,
      input.rollbackFromVersion ?? null,
      input.contentHash ?? null,
      input.etag ?? null,
      now,
      now,
    ).run();

    const created = await this.findById(id);
    if (!created) throw new Error('Landing Page version was not created');
    return created;
  }

  async updateStatus(id: string, status: LandingPageVersionStatus): Promise<LandingPageVersion> {
    if (!VERSION_STATUSES.has(status)) throw new Error(`Unsupported Landing Page version status: ${status}`);
    const existing = await this.findById(id);
    if (!existing) throw new Error('Landing Page version not found');
    const now = new Date().toISOString();
    await this.db.prepare(
      'UPDATE landingPageVersions SET status = ?, updatedAt = ? WHERE id = ?',
    ).bind(status, now, id).run();
    const updated = await this.findById(id);
    if (!updated) throw new Error('Landing Page version not found after status update');
    return updated;
  }

  async publish(
    landingPageId: string,
    versionIdToPublish: string,
    publishedBy?: string,
    rollbackFromVersion?: number | null,
  ): Promise<LandingPageVersion> {
    const target = await this.findById(versionIdToPublish);
    if (!target || target.landingPageId !== landingPageId) {
      throw new Error('Landing Page version not found');
    }
    const now = new Date().toISOString();
    const archivePrevious = this.db.prepare(
      "UPDATE landingPageVersions SET status = 'archived', updatedAt = ? WHERE landingPageId = ? AND status = 'published' AND id != ?",
    ).bind(now, landingPageId, versionIdToPublish);
    const publishTarget = this.db.prepare(
      "UPDATE landingPageVersions SET status = 'published', publishedAt = ?, publishedBy = ?, rollbackFromVersion = ?, updatedAt = ? WHERE id = ? AND landingPageId = ?",
    ).bind(now, publishedBy ?? null, rollbackFromVersion ?? null, now, versionIdToPublish, landingPageId);
    await this.db.batch([archivePrevious, publishTarget]);

    const published = await this.findById(versionIdToPublish);
    if (!published) throw new Error('Landing Page version not found after publish');
    return published;
  }
}
