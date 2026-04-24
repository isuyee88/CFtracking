import { Hono } from 'hono';
import { success, error } from '@/utils/response';
import { ERROR_CODES, HTTP_STATUS } from '@/config/constants';
import { HostedAssetService } from './hostedAsset.service';
import type { Env } from '@/config/env';

export function createHostedAssetApiRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.post('/upload', async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const service = new HostedAssetService(c.env);

    try {
      const url = new URL(c.req.url);
      const origin = `${url.protocol}//${url.host}`;
      const result = await service.upload(
        {
          entityType: body.entityType,
          mode: body.mode,
          name: body.name,
          fileName: body.fileName,
          mimeType: body.mimeType,
          contentBase64: body.contentBase64,
        },
        origin
      );
      return c.json(success(result), HTTP_STATUS.CREATED);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to upload hosted asset';
      return c.json(error(message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
  });

  router.get('/:id', async (c) => {
    const id = c.req.param('id');
    const service = new HostedAssetService(c.env);
    const record = await service.getById(id);
    if (!record) {
      return c.json(error('Hosted asset not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }

    const url = new URL(c.req.url);
    const origin = `${url.protocol}//${url.host}`;
    return c.json(
      success({
        id: record.id,
        entityType: record.entityType,
        mode: record.mode,
        name: record.name,
        fileName: record.fileName,
        mimeType: record.mimeType,
        byteSize: record.byteSize,
        createdAt: record.createdAt,
        updatedAt: record.updatedAt,
        publicUrl: `${origin}/hosted-assets/${record.id}/content?mode=${record.mode}`,
        archiveUrl: record.mode === 'zip' ? `${origin}/hosted-assets/${record.id}/archive` : undefined,
      })
    );
  });

  router.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const service = new HostedAssetService(c.env);
    const deleted = await service.remove(id);
    if (!deleted) {
      return c.json(error('Hosted asset not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
    }
    return c.json(success({ deleted: true }));
  });

  return router;
}
