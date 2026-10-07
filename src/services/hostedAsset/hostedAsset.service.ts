import type { D1Database } from '@/handlers/d1';
import type { Env } from '@/config/env';

const MAX_LOCAL_HTML_BYTES = 1 * 1024 * 1024;
const MAX_ZIP_BYTES = 8 * 1024 * 1024;
const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const HOSTED_HTML_CSP = "sandbox allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation; default-src https: data: blob:; img-src https: data: blob:; style-src https: 'unsafe-inline'; script-src https: 'unsafe-inline'; connect-src https:; font-src https: data:; frame-src https:";

// 图片扩展名与 MIME 白名单：画布直传图片只允许常见光栅格式，阻断 svg（内嵌脚本向量）等
const IMAGE_MIME_BY_EXT: Record<string, string> = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
};

export type HostedAssetMode = 'local' | 'zip' | 'image';
export type HostedAssetEntityType = 'landing' | 'offer';
export type HostedAssetStorage = 'd1' | 'r2';

export function resolveHostedAssetStorage(env: Pick<Env, 'HOSTED_ASSETS_BUCKET'>): HostedAssetStorage {
  return env.HOSTED_ASSETS_BUCKET ? 'r2' : 'd1';
}

export interface HostedAssetUploadPayload {
  entityType: HostedAssetEntityType;
  mode: HostedAssetMode;
  name?: string;
  fileName?: string;
  mimeType?: string;
  contentBase64: string;
}

export interface HostedAssetRecord {
  id: string;
  entityType: HostedAssetEntityType;
  mode: HostedAssetMode;
  name: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  contentBase64: string;
  storageBackend: HostedAssetStorage;
  r2Key: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HostedAssetUploadResult {
  assetId: string;
  entityType: HostedAssetEntityType;
  mode: HostedAssetMode;
  name: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  publicUrl: string;
  archiveUrl?: string;
  createdAt: string;
}

function sanitizeFileName(input: string, fallback: string): string {
  const normalized = (input || '').trim().replace(/[\\/:*?"<>|]+/g, '-').slice(0, 120);
  return normalized || fallback;
}

export function buildHostedAssetR2Key(
  assetId: string,
  entityType: HostedAssetEntityType,
  fileName: string,
): string {
  const baseName = fileName.split(/[\\/]/).pop() || 'asset.bin';
  return `${entityType}/${sanitizeFileName(assetId, 'asset')}/${sanitizeFileName(baseName, 'asset.bin')}`;
}

function normalizeBase64Input(input: string): string {
  const raw = (input || '').trim();
  if (!raw) {
    return '';
  }
  if (raw.startsWith('data:')) {
    const commaIndex = raw.indexOf(',');
    return commaIndex >= 0 ? raw.slice(commaIndex + 1) : '';
  }
  return raw;
}

function base64ToBytes(input: string): Uint8Array {
  const normalized = normalizeBase64Input(input);
  if (!normalized) {
    return new Uint8Array(0);
  }

  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function bytesToUtf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

function guessMimeTypeByFileName(fileName: string, fallback: string): string {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.zip')) return 'application/zip';
  if (lower.endsWith('.html') || lower.endsWith('.htm')) return 'text/html; charset=utf-8';
  return fallback;
}

function createHostedAssetId(): string {
  return `ha_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
}

function hasImageSignature(bytes: Uint8Array, extension: string): boolean {
  if (extension === '.png') {
    return [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value);
  }
  if (extension === '.jpg' || extension === '.jpeg') {
    return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (extension === '.gif') {
    const header = bytesToUtf8(bytes.slice(0, 6));
    return header === 'GIF87a' || header === 'GIF89a';
  }
  if (extension === '.webp') {
    return bytes.length >= 12 && bytesToUtf8(bytes.slice(0, 4)) === 'RIFF' && bytesToUtf8(bytes.slice(8, 12)) === 'WEBP';
  }
  return false;
}

function unavailableAssetResponse(): Response {
  return new Response('Hosted asset content is temporarily unavailable', {
    status: 503,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export class HostedAssetService {
  private readonly db: D1Database;
  private readonly assetsBucket?: R2Bucket;
  private schemaReady = false;

  constructor(env: Env) {
    this.db = env.DB;
    this.assetsBucket = env.HOSTED_ASSETS_BUCKET;
  }

  async upload(payload: HostedAssetUploadPayload, origin: string): Promise<HostedAssetUploadResult> {
    await this.ensureSchema();

    if (!['landing', 'offer'].includes(payload.entityType)) {
      throw new Error('entityType must be landing or offer');
    }
    if (!['local', 'zip', 'image'].includes(payload.mode)) {
      throw new Error('mode must be local, zip or image');
    }

    const bytes = base64ToBytes(payload.contentBase64);
    if (bytes.length === 0) {
      throw new Error('Uploaded content is empty');
    }

    if (payload.mode === 'local' && bytes.length > MAX_LOCAL_HTML_BYTES) {
      throw new Error(`Local HTML exceeds max size ${MAX_LOCAL_HTML_BYTES} bytes`);
    }
    if (payload.mode === 'zip' && bytes.length > MAX_ZIP_BYTES) {
      throw new Error(`ZIP exceeds max size ${MAX_ZIP_BYTES} bytes`);
    }
    if (payload.mode === 'image' && bytes.length > MAX_IMAGE_BYTES) {
      throw new Error(`Image exceeds max size ${MAX_IMAGE_BYTES} bytes`);
    }

    const now = new Date().toISOString();
    const id = createHostedAssetId();
    const name = sanitizeFileName(payload.name || `${payload.entityType}-${payload.mode}-${id}`, `${payload.entityType}-${id}`);
    const defaultFileName = payload.mode === 'zip'
      ? `${name}.zip`
      : payload.mode === 'image'
        ? `${name}.png`
        : `${name}.html`;
    const fileName = sanitizeFileName(payload.fileName || defaultFileName, defaultFileName);
    let normalizedMimeType = guessMimeTypeByFileName(
      fileName,
      payload.mode === 'zip' ? 'application/zip' : 'text/html; charset=utf-8'
    );

    if (payload.mode === 'image') {
      const ext = fileName.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || '';
      const imageMime = IMAGE_MIME_BY_EXT[ext];
      if (!imageMime) {
        throw new Error('Image mode requires a png/jpg/jpeg/webp/gif file');
      }
      if (!hasImageSignature(bytes, ext)) {
        throw new Error('Image content signature does not match file extension');
      }
      normalizedMimeType = imageMime;
    }

    if (payload.mode === 'local') {
      const html = bytesToUtf8(bytes).trim();
      if (!html) {
        throw new Error('Local HTML content is empty');
      }
    }

    if (payload.mode === 'zip' && !fileName.toLowerCase().endsWith('.zip')) {
      throw new Error('ZIP mode requires a .zip file');
    }

    const storageBackend = resolveHostedAssetStorage({ HOSTED_ASSETS_BUCKET: this.assetsBucket });
    const r2Key = storageBackend === 'r2'
      ? buildHostedAssetR2Key(id, payload.entityType, fileName)
      : null;
    try {
      if (this.assetsBucket && r2Key) {
        await this.assetsBucket.put(r2Key, bytes, {
          httpMetadata: {
            contentType: normalizedMimeType,
            cacheControl: payload.mode === 'image' ? 'public, max-age=31536000, immutable' : 'public, max-age=300',
          },
          customMetadata: { assetId: id, entityType: payload.entityType, mode: payload.mode },
        });
      }

      await this.db
        .prepare(
          `INSERT INTO hostedAssets (
             id, entityType, mode, name, fileName, mimeType, byteSize, contentBase64,
             storageBackend, r2Key, createdAt, updatedAt
           ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          id,
          payload.entityType,
          payload.mode,
          name,
          fileName,
          normalizedMimeType,
          bytes.length,
          storageBackend === 'd1' ? normalizeBase64Input(payload.contentBase64) : '',
          storageBackend,
          r2Key,
          now,
          now
        )
        .run();
    } catch (error) {
      if (this.assetsBucket && r2Key) {
        try {
          await this.assetsBucket.delete(r2Key);
        } catch {
          // Preserve the original failure; an orphan can be reconciled separately.
        }
      }
      throw error;
    }

    const publicUrl = `${origin.replace(/\/+$/, '')}/hosted-assets/${id}/content?mode=${payload.mode}`;
    const archiveUrl = payload.mode === 'zip' ? `${origin.replace(/\/+$/, '')}/hosted-assets/${id}/archive` : undefined;

    return {
      assetId: id,
      entityType: payload.entityType,
      mode: payload.mode,
      name,
      fileName,
      mimeType: normalizedMimeType,
      byteSize: bytes.length,
      publicUrl,
      archiveUrl,
      createdAt: now,
    };
  }

  async getById(id: string): Promise<HostedAssetRecord | null> {
    await this.ensureSchema();
    const row = await this.db
      .prepare(
        'SELECT id, entityType, mode, name, fileName, mimeType, byteSize, contentBase64, storageBackend, r2Key, createdAt, updatedAt FROM hostedAssets WHERE id = ? LIMIT 1'
      )
      .bind(id)
      .first<HostedAssetRecord>();

    if (!row) return null;
    const storageBackend: HostedAssetStorage = row.storageBackend === 'r2' ? 'r2' : 'd1';
    return { ...row, storageBackend, r2Key: row.r2Key || null };
  }

  async remove(id: string): Promise<boolean> {
    await this.ensureSchema();
    const existing = await this.getById(id);
    if (!existing) {
      return false;
    }

    // Remove metadata first so a D1 failure never leaves a public record pointing at a
    // deleted object. If the R2 delete fails, the object is an orphan and can be
    // retried/reconciled without serving stale metadata.
    await this.db.prepare('DELETE FROM hostedAssets WHERE id = ?').bind(id).run();
    if (this.assetsBucket && existing.storageBackend === 'r2' && existing.r2Key) {
      try {
        await this.assetsBucket.delete(existing.r2Key);
      } catch {
        // Metadata is already gone; leave an orphan for a later reconciliation job.
      }
    }
    return true;
  }

  async renderPublicContent(id: string, origin: string): Promise<Response> {
    const record = await this.getById(id);
    if (!record) {
      return new Response('Hosted asset not found', { status: 404 });
    }

    const object = await this.getR2Object(record);
    if (!object && record.storageBackend === 'r2' && !normalizeBase64Input(record.contentBase64)) {
      return unavailableAssetResponse();
    }
    const bytes = object ? null : base64ToBytes(record.contentBase64);
    if (record.mode === 'local') {
      if (object) return this.responseFromR2Object(object, record, 'public, max-age=300');
      return new Response(bytesToUtf8(bytes || new Uint8Array(0)), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
          'Content-Security-Policy': HOSTED_HTML_CSP,
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    // 图片资产按 id 不可变（内容不更新只新增），长缓存安全
    if (record.mode === 'image') {
      if (object) return this.responseFromR2Object(object, record, 'public, max-age=31536000, immutable');
      return new Response(bytes || new Uint8Array(0), {
        status: 200,
        headers: {
          'Content-Type': record.mimeType,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Content-Type-Options': 'nosniff',
        },
      });
    }

    const escapedName = escapeHtml(record.name);
    const escapedArchiveUrl = escapeHtml(`${origin.replace(/\/+$/, '')}/hosted-assets/${record.id}/archive`);
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapedName} Archive</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 0; padding: 32px; background: #f7fafc; color: #1a202c; }
    .card { max-width: 780px; margin: 0 auto; background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; }
    .title { margin: 0 0 8px; font-size: 24px; }
    .desc { margin: 0 0 16px; color: #4a5568; }
    .meta { font-size: 14px; color: #718096; margin-bottom: 18px; }
    .btn { display: inline-block; padding: 10px 14px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; }
  </style>
</head>
<body>
  <div class="card">
    <h1 class="title">${escapedName}</h1>
    <p class="desc">ZIP archive was uploaded successfully. This hosted endpoint currently serves archive access and metadata.</p>
    <p class="meta">File: ${escapeHtml(record.fileName)} · Size: ${record.byteSize} bytes</p>
    <a class="btn" href="${escapedArchiveUrl}" target="_blank" rel="noopener noreferrer">Download ZIP Archive</a>
  </div>
</body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=120',
      },
    });
  }

  async renderArchive(id: string): Promise<Response> {
    const record = await this.getById(id);
    if (!record) {
      return new Response('Hosted asset not found', { status: 404 });
    }
    if (record.mode !== 'zip') {
      return new Response('Archive only available for zip assets', { status: 400 });
    }

    const object = await this.getR2Object(record);
    if (!object && record.storageBackend === 'r2' && !normalizeBase64Input(record.contentBase64)) {
      return unavailableAssetResponse();
    }
    if (object) return this.responseFromR2Object(object, record, 'public, max-age=300', true);
    const bytes = base64ToBytes(record.contentBase64);
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `inline; filename="${record.fileName}"`,
        'Cache-Control': 'public, max-age=300',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  private async ensureSchema(): Promise<void> {
    if (this.schemaReady) {
      return;
    }

    await this.db
      .prepare(
        `CREATE TABLE IF NOT EXISTS hostedAssets (
          id TEXT PRIMARY KEY,
          entityType TEXT NOT NULL,
          mode TEXT NOT NULL,
          name TEXT NOT NULL,
          fileName TEXT NOT NULL,
          mimeType TEXT NOT NULL,
          byteSize INTEGER NOT NULL,
          contentBase64 TEXT NOT NULL,
          storageBackend TEXT NOT NULL DEFAULT 'd1',
          r2Key TEXT,
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        )`
      )
      .run();

    // Existing installations created before R2 support need additive columns.
    await this.addColumnIfMissing('storageBackend TEXT NOT NULL DEFAULT \'d1\'');
    await this.addColumnIfMissing('r2Key TEXT');

    await this.db
      .prepare('CREATE INDEX IF NOT EXISTS idx_hosted_assets_entity_mode ON hostedAssets(entityType, mode)')
      .run();

    this.schemaReady = true;
  }

  private async addColumnIfMissing(definition: string): Promise<void> {
    try {
      await this.db.prepare(`ALTER TABLE hostedAssets ADD COLUMN ${definition}`).run();
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/duplicate column name|already exists/i.test(message)) {
        throw error;
      }
    }
  }

  private async getR2Object(record: HostedAssetRecord): Promise<R2ObjectBody | null> {
    if (!this.assetsBucket || record.storageBackend !== 'r2' || !record.r2Key) {
      return null;
    }
    return this.assetsBucket.get(record.r2Key);
  }

  private responseFromR2Object(
    object: R2ObjectBody,
    record: HostedAssetRecord,
    cacheControl: string,
    download = false,
  ): Response {
    const headers = new Headers();
    headers.set('Content-Type', object.httpMetadata?.contentType || record.mimeType);
    headers.set('Cache-Control', cacheControl);
    headers.set('X-Content-Type-Options', 'nosniff');
    if (record.mode === 'local') headers.set('Content-Security-Policy', HOSTED_HTML_CSP);
    if (object.httpEtag) headers.set('ETag', object.httpEtag);
    if (download) headers.set('Content-Disposition', `inline; filename="${record.fileName}"`);
    return new Response(object.body, { status: 200, headers });
  }
}
