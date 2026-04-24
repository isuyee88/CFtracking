import type { D1Database } from '@/handlers/d1';
import type { Env } from '@/config/env';

const MAX_LOCAL_HTML_BYTES = 1 * 1024 * 1024;
const MAX_ZIP_BYTES = 8 * 1024 * 1024;

export type HostedAssetMode = 'local' | 'zip';
export type HostedAssetEntityType = 'landing' | 'offer';

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
  private schemaReady = false;

  constructor(env: Env) {
    this.db = env.DB;
  }

  async upload(payload: HostedAssetUploadPayload, origin: string): Promise<HostedAssetUploadResult> {
    await this.ensureSchema();

    if (!['landing', 'offer'].includes(payload.entityType)) {
      throw new Error('entityType must be landing or offer');
    }
    if (!['local', 'zip'].includes(payload.mode)) {
      throw new Error('mode must be local or zip');
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

    const now = new Date().toISOString();
    const id = createHostedAssetId();
    const name = sanitizeFileName(payload.name || `${payload.entityType}-${payload.mode}-${id}`, `${payload.entityType}-${id}`);
    const defaultFileName = payload.mode === 'zip' ? `${name}.zip` : `${name}.html`;
    const fileName = sanitizeFileName(payload.fileName || defaultFileName, defaultFileName);
    const normalizedMimeType = guessMimeTypeByFileName(
      fileName,
      payload.mode === 'zip' ? 'application/zip' : 'text/html; charset=utf-8'
    );

    if (payload.mode === 'local') {
      const html = bytesToUtf8(bytes).trim();
      if (!html) {
        throw new Error('Local HTML content is empty');
      }
    }

    if (payload.mode === 'zip' && !fileName.toLowerCase().endsWith('.zip')) {
      throw new Error('ZIP mode requires a .zip file');
    }

    await this.db
      .prepare(
        `INSERT INTO hostedAssets (
           id, entityType, mode, name, fileName, mimeType, byteSize, contentBase64, createdAt, updatedAt
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .bind(
        id,
        payload.entityType,
        payload.mode,
        name,
        fileName,
        normalizedMimeType,
        bytes.length,
        normalizeBase64Input(payload.contentBase64),
        now,
        now
      )
      .run();

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
        'SELECT id, entityType, mode, name, fileName, mimeType, byteSize, contentBase64, createdAt, updatedAt FROM hostedAssets WHERE id = ? LIMIT 1'
      )
      .bind(id)
      .first<HostedAssetRecord>();

    return row || null;
  }

  async remove(id: string): Promise<boolean> {
    await this.ensureSchema();
    const existing = await this.getById(id);
    if (!existing) {
      return false;
    }

    await this.db.prepare('DELETE FROM hostedAssets WHERE id = ?').bind(id).run();
    return true;
  }

  async renderPublicContent(id: string, origin: string): Promise<Response> {
    const record = await this.getById(id);
    if (!record) {
      return new Response('Hosted asset not found', { status: 404 });
    }

    const bytes = base64ToBytes(record.contentBase64);
    if (record.mode === 'local') {
      return new Response(bytesToUtf8(bytes), {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'public, max-age=300',
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

    const bytes = base64ToBytes(record.contentBase64);
    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `inline; filename="${record.fileName}"`,
        'Cache-Control': 'public, max-age=300',
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
          createdAt TEXT NOT NULL,
          updatedAt TEXT NOT NULL
        )`
      )
      .run();

    await this.db
      .prepare('CREATE INDEX IF NOT EXISTS idx_hosted_assets_entity_mode ON hostedAssets(entityType, mode)')
      .run();

    this.schemaReady = true;
  }
}
