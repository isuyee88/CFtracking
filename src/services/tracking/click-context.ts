/**
 * @fileoverview Click context persistence for AE-only click mode.
 *
 * Click is an event: it must not write D1. The context lives in KV so that a
 * later conversion can materialize the click row. This keeps the click path
 * at 0 D1 reads/writes while preserving conversion attribution.
 */

import type { Env } from '@/config/env';
import type { ClickData } from '@/types/tracking';

const PREFIX = 'clickctx:v1:';
const TTL_SECONDS = 7 * 24 * 60 * 60;

export function isAeOnlyClickPersistence(env: Env): boolean {
  return String(env.CLICK_AE_ONLY || '').trim().toLowerCase() === 'true';
}

export async function writeClickContext(env: Env, click: ClickData): Promise<void> {
  await env.UNIQUENESS_KV.put(`${PREFIX}${click.clickId}`, JSON.stringify(click), {
    expirationTtl: TTL_SECONDS,
  });
}

export async function readClickContext(env: Env, clickId: string): Promise<ClickData | null> {
  const value = await env.UNIQUENESS_KV.get(`${PREFIX}${clickId}`, 'json');
  return value && typeof value === 'object' ? (value as ClickData) : null;
}
