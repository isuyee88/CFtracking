import { Hono } from 'hono';
import { HostedAssetService } from './hostedAsset.service';
import type { Env } from '@/config/env';

export function createHostedAssetPublicRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.get('/:id/content', async (c) => {
    const id = c.req.param('id');
    const service = new HostedAssetService(c.env);
    const url = new URL(c.req.url);
    const origin = `${url.protocol}//${url.host}`;
    return service.renderPublicContent(id, origin);
  });

  router.get('/:id/archive', async (c) => {
    const id = c.req.param('id');
    const service = new HostedAssetService(c.env);
    return service.renderArchive(id);
  });

  return router;
}
