/**
 * @fileoverview Domain API routes.
 */

import { Hono } from 'hono';
import { DomainService } from './domain.service';
import { success, error } from '@/utils/response';
import { validatePagination, validateRequired, validateStringLength } from '@/utils/validator';
import { HTTP_STATUS, ERROR_CODES } from '@/config/constants';
import type { Env } from '@/config/env';

const HOSTNAME_REGEX = /^(?:\*\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+$/i;

function isValidHostname(hostname: string): boolean {
  return HOSTNAME_REGEX.test(hostname);
}

export function createDomainRouter(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();

  router.get('/', async (c) => {
    const query = {
      page: parseInt(c.req.query('page') || '1'),
      pageSize: parseInt(c.req.query('pageSize') || '20'),
      status: c.req.query('status') || undefined,
      search: c.req.query('search') || undefined,
      withStats: c.req.query('withStats') !== 'false',
    };

    const { page, pageSize } = validatePagination(query.page, query.pageSize);
    const service = new DomainService(c.env);
    const result = query.withStats
      ? await service.getListWithStats(page, pageSize, query.status, query.search)
      : await service.getList(page, pageSize, query.status, query.search);

    return c.json(success(result.list, { page, pageSize, total: result.total }));
  });

  router.get('/:id', async (c) => {
    const service = new DomainService(c.env);

    try {
      const domain = await service.getById(c.req.param('id'));
      return c.json(success(domain));
    } catch (err) {
      if (err instanceof Error && err.message === 'Domain not found') {
        return c.json(error(err.message, ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  router.post('/', async (c) => {
    const body = await c.req.json();
    const hostnameValidation = validateRequired(body.hostname, 'hostname');
    if (!hostnameValidation.valid) {
      return c.json(error(hostnameValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const lengthValidation = validateStringLength(body.hostname, 3, 255, 'hostname');
    if (!lengthValidation.valid) {
      return c.json(error(lengthValidation.message, ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    if (!isValidHostname(body.hostname)) {
      return c.json(error('hostname is invalid', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new DomainService(c.env);
    try {
      const domain = await service.create(body);
      return c.json(success(domain), HTTP_STATUS.CREATED);
    } catch (err) {
      if (err instanceof Error && err.message.includes('already exists')) {
        return c.json(error(err.message, ERROR_CODES.DUPLICATE), HTTP_STATUS.CONFLICT);
      }
      throw err;
    }
  });

  router.put('/:id', async (c) => {
    const id = c.req.param('id');
    const body = await c.req.json();

    if (body.hostname && !isValidHostname(body.hostname)) {
      return c.json(error('hostname is invalid', ERROR_CODES.VALIDATION), HTTP_STATUS.BAD_REQUEST);
    }

    const service = new DomainService(c.env);
    try {
      const domain = await service.update(id, body);
      return c.json(success(domain));
    } catch (err) {
      if (err instanceof Error && err.message === 'Domain not found') {
        return c.json(error(err.message, ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      if (err instanceof Error && err.message.includes('already exists')) {
        return c.json(error(err.message, ERROR_CODES.DUPLICATE), HTTP_STATUS.CONFLICT);
      }
      throw err;
    }
  });

  router.delete('/:id', async (c) => {
    const service = new DomainService(c.env);

    try {
      await service.delete(c.req.param('id'));
      return c.json(success({ deleted: true }));
    } catch (err) {
      if (err instanceof Error && err.message === 'Domain not found') {
        return c.json(error(err.message, ERROR_CODES.NOT_FOUND), HTTP_STATUS.NOT_FOUND);
      }
      throw err;
    }
  });

  return router;
}
