# Cache, SSE, and URL Optimization Plan

## Objectives

- Keep today's operational views fresh without forcing every request to hit origin.
- Push closed-period data into longer-lived browser and CDN caches.
- Reduce Cloudflare Worker and D1 load by increasing cache-hit quality instead of just increasing TTL.
- Make cache keys more predictable by normalizing query strings and converging on a smaller URL vocabulary.

## Cloudflare-aligned principles

- Use browser cache, CDN cache, and Worker-local hot cache for different jobs.
- Treat the Workers Cache API as a per-colo hot cache, not a globally consistent source of truth.
- Use `ETag` for cheap browser revalidation on API responses.
- Use `CDN-Cache-Control` and `Cloudflare-CDN-Cache-Control` to give Cloudflare longer TTLs than the browser.
- Use Durable Object backed SSE for live invalidation of today's data.

## Recommended cache matrix

| Scope | Examples | Browser cache | Cloudflare CDN cache | Invalidation strategy |
| --- | --- | --- | --- | --- |
| Realtime | `today` dashboard, today's clicks, today's conversions | `max-age=30` | `s-maxage=300`, `stale-while-revalidate=600` | SSE invalidate on write + scheduled refresh |
| Recent but still queried often | `last7days`, `last30days`, `thismonth` | `max-age=300` | `s-maxage=21600`, `stale-while-revalidate=43200` | Purge on important writes, refresh hourly |
| Closed historical windows | `yesterday`, `lastmonth`, older custom periods | `max-age=3600` | `s-maxage=86400`, `stale-while-revalidate=172800` | Purge only on data repair or backfill |
| Static assets | hashed JS/CSS/fonts/images | `max-age=2592000, immutable` | same | New deploy hash |

## API grouping

### Realtime endpoints

- `/api/analytics/dashboard?range=today`
- `/api/analytics/recent-clicks?range=today`
- `/api/analytics/entity-stats?...&range=today`
- Any "today" slice on clicks, conversions, traffic sources, campaigns, offers, and landings

### Recent endpoints

- `/api/analytics/dashboard?range=last7days`
- `/api/analytics/dashboard?range=last30days`
- `/api/analytics/entity-stats?...&range=last7days`
- `/api/analytics/entity-stats?...&range=last30days`
- List pages with low mutation frequency

### Historical endpoints

- `/api/analytics/dashboard?range=yesterday`
- `/api/analytics/dashboard?range=lastmonth`
- Report exports for fixed closed ranges
- Month-end and archived reporting

## URL normalization rules

- Sort query parameters before building the cache key.
- Avoid alias ranges that mean the same thing.
- Prefer a single canonical vocabulary:
  - `today`
  - `yesterday`
  - `last7days`
  - `last30days`
  - `thismonth`
  - `lastmonth`
- Prefer one entity naming style:
  - `campaign`
  - `offer`
  - `landing`
  - `traffic-source`
  - `conversion`
  - `click`
- Drop empty query parameters from frontend requests.

## Route structure recommendation

Current hash routes limit Cloudflare path-based cache policy because everything after `#` is invisible to the edge.

Recommended migration target:

- `/#/dashboard` -> `/dashboard`
- `/#/campaigns/123` -> `/campaigns/123`
- `/#/reports?range=last30days` -> `/reports?range=last30days`

This migration should be done in a dedicated step because it changes deep-link behavior and server-side routing expectations.

## SSE architecture

- One Durable Object acts as the cache event broker.
- Worker routes proxy `/api/cache/events` to the broker.
- Cache invalidation sends batched events to the broker instead of per-isolate in-memory broadcasts.
- Today's pages subscribe once and refresh only the affected slices.

## Frontend performance actions

- Do not mount unused global providers on every page load.
- Keep route-level chunks isolated; avoid giant shared `components`, `hooks`, or `services` bundles.
- Lazy-load heavy data views and chart/table widgets by route and section.
- Keep PWA precache focused on shell assets and avoid precaching heavy route bundles by default.

## Rollout order

1. Keep the current hash router and finish cache/SSE hardening.
2. Normalize API query keys and frontend request builders around canonical ranges.
3. Measure Lighthouse again on desktop and mobile.
4. Plan a controlled migration from `HashRouter` to path-based routes.
