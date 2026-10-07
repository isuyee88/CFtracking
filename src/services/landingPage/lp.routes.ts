/**
 * @fileoverview Landing Page API 路由
 * @description 处理 Landing Page 相关的 HTTP 请求
 * @module services/landingPage/lp.routes
 */

import { Hono } from 'hono';
import type { Context } from 'hono';
import { LandingPageService } from './lp.service';
import { LandingPageVersionService } from './landingPageVersion.service';
import { success, error } from '@/utils/response';
import { validatePagination, validateRequired, isValidUrl } from '@/utils/validator';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';
import type { CreateLandingPageVersionInput } from '@/types/landingPageVersion';

type VersionRouteContext = Context<{ Bindings: Env }>;

type VersionCreateStatus = NonNullable<CreateLandingPageVersionInput['status']>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

async function readOptionalJsonBody(c: VersionRouteContext): Promise<Record<string, unknown>> {
  try {
    const body: unknown = await c.req.json();
    return isRecord(body) ? body : {};
  } catch {
    return {};
  }
}

function handleVersionError(c: VersionRouteContext, err: unknown): Response {
  const message = err instanceof Error ? err.message : String(err);
  if (message.toLowerCase().includes('version not found')) {
    return c.json(error(message, ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
  }
  if (message.toLowerCase().includes('version status')) {
    return c.json(error(message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
  }
  throw err;
}

export function createLandingPageRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.get('/', async (c) => {
    const query = {
      page: parseInt(c.req.query('page') || '1'),
      pageSize: parseInt(c.req.query('pageSize') || '20'),
      withStats: c.req.query('withStats') === 'true',
      startDate: c.req.query('startDate') || undefined,
      endDate: c.req.query('endDate') || undefined,
    };

    const { page, pageSize } = validatePagination(query.page, query.pageSize);
    const service = new LandingPageService(c.env);
    
    // Use getListWithStats if withStats=true
    const result = query.withStats 
      ? await service.getListWithStats(page, pageSize, query.startDate, query.endDate)
      : await service.getList(page, pageSize);

    return c.json(success(result.list, {
      page,
      pageSize,
      total: result.total,
    }));
  });

  router.get('/active', async (c) => {
    const service = new LandingPageService(c.env);
    const lps = await service.getActive();
    return c.json(success(lps));
  });

  router.post('/import-manifest', async (c) => {
    const body = await c.req.json();
    const runtimeUrl = typeof body.runtimeUrl === 'string' ? body.runtimeUrl : '';
    if (!runtimeUrl || !isValidUrl(runtimeUrl)) {
      return c.json(error('runtimeUrl must be a valid URL', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    if (!body.manifest || typeof body.manifest !== 'object' || Array.isArray(body.manifest)) {
      return c.json(error('manifest must be a JSON object', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new LandingPageService(c.env);
    try {
      const result = await service.importManifest(runtimeUrl, body.manifest);
      return c.json(success(result), result.created ? HTTP_STATUS.CREATED : HTTP_STATUS.OK);
    } catch (err) {
      if (err instanceof Error && (err.message.startsWith('landing manifest') || err.message.startsWith('landingPage.'))) {
        return c.json(error(err.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
      }
      throw err;
    }
  });

  router.get('/:id/versions', async (c) => {
    const service = new LandingPageVersionService(c.env);
    return c.json(success(await service.list(c.req.param('id'))));
  });

  router.post('/:id/versions', async (c) => {
    const body = await readOptionalJsonBody(c);
    if (body.status !== undefined && body.status !== 'draft' && body.status !== 'preview') {
      return c.json(
        error('New Landing Page versions must start as draft or preview', ERROR_CODES.VALIDATION),
        HTTP_STATUS.BAD_REQUEST,
      );
    }
    const service = new LandingPageVersionService(c.env);
    try {
      const created = await service.create({
        landingPageId: c.req.param('id'),
        assetId: typeof body.assetId === 'string' ? body.assetId : null,
        manifestSnapshot: isRecord(body.manifestSnapshot) ? body.manifestSnapshot : null,
        status: body.status === undefined ? undefined : body.status as VersionCreateStatus,
        publishedBy: typeof body.publishedBy === 'string' ? body.publishedBy : null,
        rollbackFromVersion: typeof body.rollbackFromVersion === 'number' ? body.rollbackFromVersion : null,
        contentHash: typeof body.contentHash === 'string' ? body.contentHash : null,
        etag: typeof body.etag === 'string' ? body.etag : null,
      });
      return c.json(success(created), HTTP_STATUS.CREATED);
    } catch (err) {
      return handleVersionError(c, err);
    }
  });

  router.post('/:id/versions/:versionId/publish', async (c) => {
    const body = await readOptionalJsonBody(c);
    const service = new LandingPageVersionService(c.env);
    try {
      const published = await service.publish(
        c.req.param('id'),
        c.req.param('versionId'),
        typeof body.publishedBy === 'string' ? body.publishedBy : undefined,
      );
      return c.json(success(published));
    } catch (err) {
      return handleVersionError(c, err);
    }
  });

  router.post('/:id/versions/:versionId/pause', async (c) => {
    const service = new LandingPageVersionService(c.env);
    try {
      const paused = await service.pause(c.req.param('versionId'));
      return c.json(success(paused));
    } catch (err) {
      return handleVersionError(c, err);
    }
  });

  router.post('/:id/versions/:versionNumber/rollback', async (c) => {
    const versionNumber = Number(c.req.param('versionNumber'));
    if (!Number.isSafeInteger(versionNumber) || versionNumber < 1) {
      return c.json(error('versionNumber must be a positive integer', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }
    const body = await readOptionalJsonBody(c);
    const service = new LandingPageVersionService(c.env);
    try {
      const rolledBack = await service.rollback(
        c.req.param('id'),
        versionNumber,
        typeof body.publishedBy === 'string' ? body.publishedBy : undefined,
      );
      return c.json(success(rolledBack));
    } catch (err) {
      return handleVersionError(c, err);
    }
  });

  router.get('/:id', async (c) => {
    const id = c.req.param('id');
    const withStats = c.req.query('withStats') === 'true';
    const startDate = c.req.query('startDate') || undefined;
    const endDate = c.req.query('endDate') || undefined;
    const service = new LandingPageService(c.env);

    try {
      // Use getDetail if withStats=true
      const lp = withStats 
        ? await service.getDetail(id, startDate, endDate)
        : await service.getById(id);
      return c.json(success(lp));
    } catch (err) {
      if (err instanceof Error && err.message === 'Landing Page not found') {
        return c.json(error('Landing Page not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  router.post('/', async (c) => {
    const body = await c.req.json();

    const nameValidation = validateRequired(body.name, 'name');
    if (!nameValidation.valid) {
      return c.json(error(nameValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const urlValidation = validateRequired(body.url, 'url');
    if (!urlValidation.valid) {
      return c.json(error(urlValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    if (!isValidUrl(body.url)) {
      return c.json(error('Invalid URL format', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new LandingPageService(c.env);

    try {
      const lp = await service.create(body);
      return c.json(success(lp), HTTP_STATUS.CREATED);
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        return c.json(error(err.message, ERROR_CODES.DUPLICATE), HTTP_STATUS.CONFLICT);
      }
      if (err instanceof Error && err.message.startsWith('landingPage.')) {
        return c.json(error(err.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
      }
      throw err;
    }
  });

  router.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();
    const service = new LandingPageService(c.env);

    if (body.url && !isValidUrl(body.url)) {
      return c.json(error('Invalid URL format', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    try {
      const lp = await service.update(id, body);
      return c.json(success(lp));
    } catch (err) {
      if (err instanceof Error && err.message === 'Landing Page not found') {
        return c.json(error('Landing Page not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      if (err instanceof Error && err.message.includes('already exists')) {
        return c.json(error(err.message, ERROR_CODES.DUPLICATE), HTTP_STATUS.CONFLICT);
      }
      if (err instanceof Error && err.message.startsWith('landingPage.')) {
        return c.json(error(err.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
      }
      throw err;
    }
  });

  router.delete('/:id', async (c) => {
    const id = c.req.param('id');
    const service = new LandingPageService(c.env);

    try {
      await service.delete(id);
      return c.json(success({ deleted: true }));
    } catch (err) {
      if (err instanceof Error && err.message === 'Landing Page not found') {
        return c.json(error('Landing Page not found', ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  return router;
}
