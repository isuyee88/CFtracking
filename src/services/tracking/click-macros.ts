/**
 * @fileoverview Click-out URL macro expansion, shared by every click egress path.
 *
 * Why: the KV `clickcfg:{alias}` fast path and the flow path used to build the
 * outbound URL independently. The fast path only *appended* `clickid`/`visitor`
 * params, so an offer URL carrying `uid={clickid}` (PartnerBoost attribution)
 * left the literal macro in `Location` and the network never saw the click id.
 * Both paths must expand the same macros with the same value precedence.
 *
 * Invariants:
 * - Unknown macros are preserved verbatim: `{foo}` without a value stays
 *   `{foo}` so an upstream template is never silently corrupted.
 * - Known macros expand to `encodeURIComponent(value)`. A known macro with no
 *   value expands to the empty string, matching the production bundle.
 * - Percent-encoded tokens (`%7Bclickid%7D`) expand too: `URLSearchParams`
 *   serialization encodes `{`/`}`, so a snapshot/offer URL that round-tripped
 *   through a URL already carries the encoded form.
 * - Expansion is single-pass. A substituted value is never re-expanded, so a
 *   subid cannot inject another macro into the destination URL.
 * - Precedence: URL query params win over the request-derived context (the
 *   production `replaceUrlParams` applies params last).
 *
 * @see src/services/tracking/flow-action.service.ts
 * @see src/services/tracking/click-fast-path.service.ts
 * @see src/services/cache/config-snapshot.service.ts
 */

export interface ClickMacroContext {
  /** Click id generated for this request; expands `{clickid}`/`{click_id}`. */
  clickId: string;
  /** Visitor id; expands `{visitor}`. */
  visitorId?: string | null;
  /** Campaign id (not alias); expands `{campaign}`/`{campaign_id}`. */
  campaignId?: string | null;
  referer?: string | null;
  ip?: string | null;
  country?: string | null;
  city?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  userAgent?: string | null;
  /** `subIds[0]` is `subid1` … `subIds[29]` is `subid30`. */
  subIds?: ReadonlyArray<string | null | undefined>;
  /** Query params of the click URL; each key also becomes a `{key}` macro. */
  urlParams?: URLSearchParams | null;
}

/** Largest subid index the tracker accepts (matches the click router). */
export const MAX_SUB_ID = 30;

/**
 * Structural subset of `ClickRequest` needed to build a macro context.
 * Declared here (instead of importing ClickRequest) so this module stays a
 * leaf: both the flow path and ClickService's legacy action path depend on it.
 */
export interface ClickMacroSource {
  campaignId: string;
  subId1?: string | null;
  subId2?: string | null;
  subId3?: string | null;
  subId4?: string | null;
  subId5?: string | null;
  /** 1..30; wins over subId1..5 when present. */
  subIds?: ReadonlyArray<string | null | undefined>;
  trackingClickId?: string | null;
  trackingVisitorId?: string | null;
  referer?: string | null;
  ip?: string | null;
  country?: string | null;
  city?: string | null;
  device?: string | null;
  browser?: string | null;
  os?: string | null;
  userAgent?: string | null;
  urlParams?: URLSearchParams | null;
}

/**
 * Project a click request onto the macro context.
 *
 * The explicit `clickId`/`visitorId` arguments win over request fields; the
 * legacy URL-param fallback keeps direct callers working. `subIds` (1..30)
 * wins over the legacy five fields so `{subid7}` does not silently expand to
 * empty when the router captured all 30.
 */
export function clickMacroContext(
  source: ClickMacroSource,
  clickId?: string | null,
  visitorId?: string | null
): ClickMacroContext {
  const subIds = source.subIds && source.subIds.length > 0
    ? source.subIds
    : [source.subId1, source.subId2, source.subId3, source.subId4, source.subId5];
  return {
    clickId: clickId || source.trackingClickId || source.urlParams?.get('clickid') || '',
    visitorId: visitorId || source.trackingVisitorId || source.urlParams?.get('visitor') || '',
    campaignId: source.campaignId,
    referer: source.referer,
    ip: source.ip,
    country: source.country,
    city: source.city,
    device: source.device,
    browser: source.browser,
    os: source.os,
    userAgent: source.userAgent,
    subIds,
    urlParams: source.urlParams,
  };
}

const MACRO_PATTERN = /\{([A-Za-z0-9_]+)\}|%7[bB]([A-Za-z0-9_]+)%7[dD]/g;

/**
 * Build the placeholder -> value table for one click.
 *
 * Values are raw (not encoded); {@link expandClickMacros} encodes on replace.
 * Keys are lowercase because production matched placeholders case-insensitively.
 */
function buildMacroValues(context: ClickMacroContext): Map<string, string> {
  const values = new Map<string, string>();
  const set = (name: string, value: string | null | undefined): void => {
    values.set(name.toLowerCase(), value ?? '');
  };

  set('clickid', context.clickId);
  set('click_id', context.clickId);
  set('visitor', context.visitorId);
  set('campaign', context.campaignId);
  set('campaign_id', context.campaignId);
  set('referer', context.referer);
  set('ip', context.ip);
  set('country', context.country);
  set('city', context.city);
  set('device', context.device);
  set('browser', context.browser);
  set('os', context.os);
  set('useragent', context.userAgent);

  for (let index = 1; index <= MAX_SUB_ID; index += 1) {
    const value = context.subIds?.[index - 1];
    set(`subid${index}`, value);
    set(`sub_id_${index}`, value);
  }

  // Query params are applied last: they override request-derived values, which
  // is how the production bundle resolves `{subid1}` from `?sub1=`.
  context.urlParams?.forEach((value, key) => {
    set(key, value);
    set(key.toLowerCase(), value);
  });

  return values;
}

/**
 * Expand click macros in a URL or URL fragment.
 *
 * @param url raw URL or fragment; empty input returns the empty string
 * @param context click identity plus request-derived values
 * @returns the expanded string; unchanged when it contains no known macro
 */
export function expandClickMacros(url: string, context: ClickMacroContext): string {
  if (!url) return '';
  const values = buildMacroValues(context);

  return url.replace(MACRO_PATTERN, (match, literal: string | undefined, encoded: string | undefined) => {
    const name = (literal ?? encoded ?? '').toLowerCase();
    const value = values.get(name);
    // `undefined` means "not a known macro" -> keep the literal text.
    return value === undefined ? match : encodeURIComponent(value);
  });
}

/**
 * Build the tracking params appended to every outbound click URL.
 *
 * Sets `clickid`/`visitor` when present and `subid1..30` when non-empty. The
 * caller writes them with `URLSearchParams.set`, so an existing placeholder
 * parameter is overwritten instead of duplicated.
 */
export function buildTrackingParams(context: ClickMacroContext): URLSearchParams {
  const params = new URLSearchParams();
  if (context.clickId) {
    params.set('clickid', context.clickId);
  }
  if (context.visitorId) {
    params.set('visitor', context.visitorId);
  }
  for (let index = 1; index <= MAX_SUB_ID; index += 1) {
    const value = context.subIds?.[index - 1];
    if (value) {
      params.set(`subid${index}`, value);
    }
  }
  return params;
}

/**
 * Merge tracking params into a URL, overwriting same-named query params.
 *
 * Uses `URL` so an existing query string is parsed correctly; a URL that
 * `URL` rejects falls back to string concatenation so a click never 500s on a
 * malformed template.
 */
export function appendTrackingParams(url: string, params: URLSearchParams): string {
  if (!url) return '';
  if (params.size === 0) return url;
  try {
    const target = new URL(url);
    params.forEach((value, key) => {
      target.searchParams.set(key, value);
    });
    return target.toString();
  } catch {
    const separator = url.includes('?') ? '&' : '?';
    return `${url}${separator}${params.toString()}`;
  }
}
