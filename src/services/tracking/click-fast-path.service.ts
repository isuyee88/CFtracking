/**
 * @fileoverview KV `clickcfg:{alias}` fast path for the src worker.
 *
 * Why: `ConfigSnapshotPublisher` wrote `clickcfg:{alias}` but the src build had
 * no reader, so a snapshot was only useful to the legacy production bundle.
 * This module makes the src click path consume the same KV key before touching
 * D1, and applies the shared macro expansion so `uid={clickid}` leaves with a
 * real click id on this path too.
 *
 * Invariants:
 * - A fast-path hit performs zero D1 reads. `tryKvClick` never throws: any KV,
 *   parse, shape, status or URL problem returns null and the caller falls back
 *   to `ClickService` (D1 is authoritative).
 * - Only http(s) destinations are redirected; anything else falls back to D1.
 * - The redirect URL is built exactly once from the snapshot: expand macros on
 *   the raw template, expand again on decoded query values (URLSearchParams
 *   encodes `{`/`}`), then merge clickid/visitor/subid params.
 * - Click persistence is best-effort and never blocks or fails the redirect.
 *
 * @see src/services/cache/config-snapshot.service.ts
 * @see src/services/tracking/click-macros.ts
 */

import type { Env } from '@/config/env';
import type { ClickData } from '@/types/tracking';
import { getD1Connection } from '@/handlers/d1';
import { ClickRepository } from '@/handlers/d1/click.repo';
import { ConfigSnapshotReader, type ClickConfigSnapshot } from '@/services/cache/config-snapshot.service';
import { isAeOnlyClickPersistence, writeClickContext } from './click-context';
import {
  appendTrackingParams,
  buildTrackingParams,
  expandClickMacros,
  type ClickMacroContext,
} from './click-macros';

export interface FastPathClickContext {
  clickId: string;
  visitorId: string;
  /** `subIds[0]` is subid1 … `subIds[29]` is subid30. */
  subIds?: ReadonlyArray<string | null | undefined>;
  urlParams?: URLSearchParams | null;
  referer?: string | null;
  ip?: string | null;
  country?: string | null;
  city?: string | null;
  region?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  userAgent?: string | null;
}

export interface FastPathClickResult {
  redirectUrl: string;
  snapshot: ClickConfigSnapshot;
}

function toMacroContext(
  snapshot: ClickConfigSnapshot,
  context: FastPathClickContext
): ClickMacroContext {
  return {
    clickId: context.clickId,
    visitorId: context.visitorId,
    campaignId: snapshot.campaignId,
    referer: context.referer,
    ip: context.ip,
    country: context.country,
    city: context.city,
    device: context.device,
    browser: context.browser,
    os: context.os,
    userAgent: context.userAgent,
    subIds: context.subIds,
    urlParams: context.urlParams,
  };
}

/**
 * Resolve a click from KV before D1.
 *
 * @param env worker bindings; `UNIQUENESS_KV` absent means "no fast path"
 * @param alias campaign alias from the click URL
 * @param context click identity + request-derived macro values
 * @returns a ready 302 target, or null when the caller must use ClickService
 */
export async function tryKvClick(
  env: Env,
  alias: string,
  context: FastPathClickContext
): Promise<FastPathClickResult | null> {
  const snapshot = await new ConfigSnapshotReader(env).readClickConfig(alias);
  if (!snapshot) return null;

  const macroContext = toMacroContext(snapshot, context);

  // Expand before parsing: a literal `{clickid}` in the offer template would
  // otherwise be percent-encoded by URL serialization and never match.
  let target: URL;
  try {
    target = new URL(expandClickMacros(snapshot.offerUrl, macroContext));
  } catch {
    console.warn('[ClickFastPath] snapshot offerUrl is not a valid absolute URL:', snapshot.offerUrl);
    return null;
  }

  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    console.warn('[ClickFastPath] refusing non-http(s) snapshot offerUrl:', target.protocol);
    return null;
  }

  // The parsed query string is decoded, so `uid=%7Bclickid%7D` becomes
  // `{clickid}` here and is expanded on this second pass.
  for (const [key, value] of Array.from(target.searchParams.entries())) {
    const expanded = expandClickMacros(value, macroContext);
    if (expanded !== value) {
      target.searchParams.set(key, expanded);
    }
  }

  // Tracking params are merged last, matching the production fast path: the
  // clickid/visitor/subid params overwrite placeholders of the same name.
  const redirectUrl = appendTrackingParams(target.toString(), buildTrackingParams(macroContext));

  return { redirectUrl, snapshot };
}

/**
 * Persist a fast-path click without blocking the redirect.
 *
 * Mirrors the production bundle: AE-only mode writes KV click context,
 * otherwise the click row goes to D1. Failures are logged, never thrown, so a
 * D1 outage degrades analytics instead of breaking the 302.
 *
 * Reads the snapshot only; writes `clicks` (D1) or `clickctx:v1:*` (KV).
 */
export async function persistFastPathClick(
  env: Env,
  snapshot: ClickConfigSnapshot,
  context: FastPathClickContext,
  redirectUrl: string
): Promise<void> {
  try {
    const subIds = context.subIds || [];
    const click: ClickData = {
      clickId: context.clickId,
      campaignId: snapshot.campaignId,
      flowId: snapshot.flowId,
      landingPageId: snapshot.landingPageId,
      offerId: snapshot.offerId,
      timestamp: new Date().toISOString(),
      ip: context.ip || 'unknown',
      userAgent: context.userAgent || 'unknown',
      referer: context.referer || null,
      country: context.country || null,
      city: context.city || null,
      region: context.region || null,
      device: context.device || null,
      browser: context.browser || null,
      os: context.os || null,
      isp: null,
      connectionType: null,
      visitorId: context.visitorId,
      subId1: subIds[0] || null,
      subId2: subIds[1] || null,
      subId3: subIds[2] || null,
      subId4: subIds[3] || null,
      subId5: subIds[4] || null,
      cost: 0,
      redirectUrl,
      // The fast path has no uniqueness lookup; a KV-served click is treated as
      // unique, matching the compatibility reader in the production bundle.
      isUnique: true,
    };

    if (isAeOnlyClickPersistence(env)) {
      await writeClickContext(env, click);
      return;
    }

    await new ClickRepository(getD1Connection(env)).saveClick(click);
  } catch (error) {
    console.error('[ClickFastPath] failed to persist click:', error);
  }
}
