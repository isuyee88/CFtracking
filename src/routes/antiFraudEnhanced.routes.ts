import { Hono, type Context } from 'hono';
import { createAntiFraudEnhancedService } from '@/services/antiFraudEnhanced/antiFraudEnhanced.service';
import type { Env } from '@/config/env';
import { success, error } from '@/utils/response';
import { ERROR_CODES, HTTP_STATUS } from '@/config/constants';
import { extractCloudflareInfo, getClientIP } from '@/utils/cloudflare';
import type { EnhancedFraudDetectionEventInput } from '@/types/antiFraudEnhanced';

type AntiFraudContext = Context<{ Bindings: Env }>;

export function registerAntiFraudEnhancedRoutes(): Hono<{ Bindings: Env }> {
  const router = new Hono<{ Bindings: Env }>();
  const service = (env: Env) => createAntiFraudEnhancedService(env);

  router.get('/config', async (c) => {
    try {
      return c.json(success(await service(c.env).getConfig()));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get config', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.put('/config', async (c) => {
    try {
      const body = await c.req.json();
      return c.json(success(await service(c.env).updateConfig(body)));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to update config', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.get('/human-verification/config', async (c) => {
    try {
      return c.json(success(await service(c.env).getHumanVerificationConfig()));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get human verification config', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.put('/human-verification/config', async (c) => {
    try {
      const body = await c.req.json();
      return c.json(success(await service(c.env).updateHumanVerificationConfig(body)));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to update human verification config', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  router.post('/human-verification/verify', async (c) => {
    try {
      const body = await c.req.json();
      const result = await service(c.env).verifyHumanToken({
        token: String(body?.token || body?.response || ''),
        provider: body?.provider,
        remoteip: String(body?.remoteip || getClientIP(c) || ''),
      });
      return c.json(success(result));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to verify human challenge token', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  router.get('/stats', async (c) => {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    try {
      return c.json(success(await service(c.env).getStats(startDate, endDate)));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get stats', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.post('/detect', async (c) => {
    try {
      const body = await c.req.json();
      const event = buildFraudEventFromRequest(c, body);
      return c.json(success(await service(c.env).detectFraud(event)));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to detect fraud', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.post('/simulate', async (c) => {
    try {
      const body = await c.req.json();
      const event = buildFraudEventFromRequest(c, body);
      const result = await service(c.env).simulateFraud(event);
      return c.json(success({ ...result, simulated: true }));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to simulate fraud detection', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.get('/check-ip/:ip', async (c) => {
    try {
      return c.json(success(await service(c.env).checkIPBlacklist(c.req.param('ip'))));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to check IP', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.get('/ip-blacklist', async (c) => {
    const page = parseInt(c.req.query('page') || '1', 10);
    const pageSize = parseInt(c.req.query('pageSize') || '20', 10);
    try {
      return c.json(success(await service(c.env).getIPBlacklist({ page, pageSize })));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get IP blacklist', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.post('/ip-blacklist', async (c) => {
    try {
      const body = await c.req.json();
      return c.json(success(await service(c.env).addIPToBlacklist(body)), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to add IP to blacklist', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  router.delete('/ip-blacklist/:id', async (c) => {
    try {
      await service(c.env).removeIPFromBlacklist(c.req.param('id'));
      return c.json(success({ deleted: true }));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to remove IP from blacklist', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  router.get('/bot-rules', async (c) => {
    try {
      return c.json(success(await service(c.env).getBotDetectionRules()));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get bot rules', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.post('/bot-rules', async (c) => {
    try {
      const body = await c.req.json();
      return c.json(success(await service(c.env).addBotDetectionRule(body)), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to add bot rule', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  router.put('/bot-rules/:id', async (c) => {
    try {
      const body = await c.req.json();
      return c.json(success(await service(c.env).updateBotDetectionRule(c.req.param('id'), body)));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to update bot rule', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  router.delete('/bot-rules/:id', async (c) => {
    try {
      await service(c.env).deleteBotDetectionRule(c.req.param('id'));
      return c.json(success({ deleted: true }));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to delete bot rule', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  router.get('/anomaly-patterns', async (c) => {
    try {
      return c.json(success(await service(c.env).getAnomalyPatterns()));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get anomaly patterns', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.post('/anomaly-patterns', async (c) => {
    try {
      const body = await c.req.json();
      return c.json(success(await service(c.env).addAnomalyPattern(body)), HTTP_STATUS.CREATED);
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to add anomaly pattern', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  router.get('/logs', async (c) => {
    const campaignId = c.req.query('campaignId');
    const status = c.req.query('status');
    const ip = c.req.query('ip');
    const page = parseInt(c.req.query('page') || '1', 10);
    const pageSize = parseInt(c.req.query('pageSize') || '20', 10);

    try {
      return c.json(success(await service(c.env).getFraudLogs({ campaignId, status, ip, page, pageSize })));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get fraud logs', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.get('/bot-list', async (c) => {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const limit = parseInt(c.req.query('limit') || '100', 10);
    try {
      return c.json(success(await service(c.env).getBotList({ startDate, endDate, limit })));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get bot list', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.get('/geo-profile', async (c) => {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const top = parseInt(c.req.query('top') || '30', 10);
    const minEvents = parseInt(c.req.query('minEvents') || '5', 10);
    try {
      return c.json(success(await service(c.env).getGeoProfile({ startDate, endDate, top, minEvents })));
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to get geo profile', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.INTERNAL_ERROR
      );
    }
  });

  router.post('/archive-import', async (c) => {
    try {
      const body = await c.req.json();
      return c.json(
        success(
          await service(c.env).importArchive({
            type: body?.type,
            format: body?.format,
            payload: body?.payload,
            items: body?.items,
            createdBy: body?.createdBy,
          })
        )
      );
    } catch (err) {
      return c.json(
        error(err instanceof Error ? err.message : 'Failed to import archive data', ERROR_CODES.INTERNAL_ERROR),
        HTTP_STATUS.BAD_REQUEST
      );
    }
  });

  return router;
}

function buildFraudEventFromRequest(c: AntiFraudContext, body: Record<string, unknown>): EnhancedFraudDetectionEventInput {
  const cfInfo = extractCloudflareInfo(c);
  const ip = String(body?.ip || getClientIP(c) || 'unknown');
  const userAgent = String(body?.userAgent || c.req.header('User-Agent') || 'unknown');
  const eventTypeValue = String(body?.eventType || 'click');
  const eventType: EnhancedFraudDetectionEventInput['eventType'] =
    eventTypeValue === 'impression' || eventTypeValue === 'conversion' ? eventTypeValue : 'click';

  const cfBotManagement = cfInfo.botManagement
    ? {
        score: cfInfo.botManagement.score,
        verifiedBot: cfInfo.botManagement.verifiedBot,
        staticResource: cfInfo.botManagement.staticResource,
        jsDetectionPassed: cfInfo.botManagement.jsDetectionPassed,
      }
    : undefined;

  return {
    id: typeof body?.id === 'string' ? body.id : undefined,
    campaignId: String(body?.campaignId || body?.campaign_id || 'unknown'),
    ip,
    userAgent,
    eventType,
    url: String(body?.url || c.req.url),
    timestamp: String(body?.timestamp || new Date().toISOString()),
    country: String(body?.country || cfInfo.country || cfInfo.ipCountry || ''),
    city: String(body?.city || cfInfo.city || ''),
    deviceType: typeof body?.deviceType === 'string' ? body.deviceType : undefined,
    screenResolution: typeof body?.screenResolution === 'string' ? body.screenResolution : undefined,
    referrer: typeof body?.referrer === 'string' ? body.referrer : undefined,
    cfBotManagement:
      body?.cfBotManagement && typeof body.cfBotManagement === 'object'
        ? (body.cfBotManagement as EnhancedFraudDetectionEventInput['cfBotManagement'])
        : cfBotManagement,
    cloudflare: {
      rayId: cfInfo.rayId,
      asn: cfInfo.asn,
      asOrganization: cfInfo.asOrganization,
      colo: cfInfo.colo,
      country: cfInfo.country,
      city: cfInfo.city,
      region: cfInfo.region,
      timezone: cfInfo.timezone,
      httpProtocol: cfInfo.httpProtocol,
      tlsVersion: cfInfo.tlsVersion,
      tlsCipher: cfInfo.tlsCipher,
      tlsClientCiphersSha1: cfInfo.tlsClientCiphersSha1,
      tlsClientExtensionsSha1: cfInfo.tlsClientExtensionsSha1,
      isEUCountry: cfInfo.isEUCountry,
      requestPriority: cfInfo.requestPriority,
    },
  };
}
