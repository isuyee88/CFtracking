# Cloudflare Cache, Revalidation, and Realtime Plan

Generated: 2026-04-05
Workspace: `D:\suyee\github\CFtracking`
Scope exclusions:
- Login/auth remediation is excluded.
- Cloudflare One will handle authentication later.

## 1. Purpose

This document audits the current cache and realtime implementation against current Cloudflare guidance and defines a production target architecture for:

- low edge/origin request volume
- stable browser and edge revalidation
- predictable cache invalidation
- realtime updates without breaking cache efficiency
- data consistency between write paths, read models, and UI

## 2. Official Cloudflare constraints that matter here

The current repository design conflicts with several Cloudflare platform rules:

1. Workers Cache API is per-data-center, not globally replicated.
   - Cloudflare states that `caches.default` content "do[es] not replicate outside of the originating data center".
   - Source: https://developers.cloudflare.com/workers/runtime-apis/cache/

2. `cache.put()` is not compatible with Tiered Cache.
   - Cloudflare explicitly says: use `fetch()` if you want tiered caching.
   - Source: https://developers.cloudflare.com/workers/runtime-apis/cache/
   - Source: https://developers.cloudflare.com/cache/how-to/tiered-cache/

3. `cache.put()` and `cache.match()` do not support `stale-while-revalidate` or `stale-if-error`.
   - The current repository models SWR inside the custom cache manager, but Cloudflare only honors those directives at CDN cache/revalidation level, not in `cache.put()` semantics.
   - Source: https://developers.cloudflare.com/workers/runtime-apis/cache/
   - Source: https://developers.cloudflare.com/cache/concepts/revalidation/

4. Cloudflare lets us separate browser cache from Cloudflare edge cache.
   - `Cloudflare-CDN-Cache-Control` can control Cloudflare edge behavior separately from browser `Cache-Control`.
   - This is the correct tool for API/browser split instead of a single merged `Cache-Control`.
   - Source: https://developers.cloudflare.com/cache/concepts/cdn-cache-control/

5. Cloudflare supports revalidation via `ETag` and `If-None-Match`, and Smart Edge Revalidation improves browser revalidation when validators are absent.
   - Stable validators are therefore worth investing in, especially for configuration and report reads.
   - Source: https://developers.cloudflare.com/cache/concepts/revalidation/
   - Source: https://developers.cloudflare.com/cache/reference/etag-headers/

6. Cloudflare supports `Cache-Tag` based purge and Worker fetch-side `cf.cacheTags`.
   - This is the right selective invalidation primitive for grouped API resources.
   - Source: https://developers.cloudflare.com/cache/how-to/purge-cache/purge-by-tags/
   - Source: https://developers.cloudflare.com/workers/examples/cache-tags/

7. Workers are stateless; Durable Objects are the Cloudflare primitive for coordinated, strongly consistent, per-entity realtime state.
   - This matters because the repository currently keeps SSE connections only in Worker memory.
   - Source: https://developers.cloudflare.com/durable-objects/best-practices/rules-of-durable-objects/
   - Source: https://developers.cloudflare.com/durable-objects/examples/readable-stream/

## 2.1 Tactical fixes already landed after the audit

Two low-risk corrective changes were applied after this audit was drafted:

1. Dashboard ETag generation is no longer time-based by default.
   - `ETagGenerator.generate()` now falls back to a stable content version marker instead of `Date.now()`.
   - Dashboard responses also stopped appending a volatile top-level `timestamp`.

2. SSE service instances are now shared per Worker isolate and marked `no-store`.
   - This fixes the immediate bug where `/api/cache/events` connections and invalidation sends could miss each other even within the same isolate.
   - It does not solve cross-instance or cross-colo fanout. Durable Objects are still required for production-correct global realtime delivery.

## 3. Current implementation: text architecture

Current effective flow in the repository:

1. Browser
   - small 5-second in-memory cache in `frontend/src/services/api.ts`
   - optional SSE/EventSource hook in `frontend/src/hooks/useSSECacheUpdate.tsx`

2. Worker HTTP layer
   - analytics dashboard route uses `ETagCacheManager`
   - generic cache middleware exists but is not wired into `src/index.ts`
   - cache update routes and SSE route are mounted directly in `src/index.ts`

3. Worker cache layer
   - `UnifiedCacheManager` writes to:
     - `caches.default`
     - process-local `Map` memory cache

4. Data/read model layer
   - dashboard reads choose DO for recent windows and D1 for older windows
   - reports and recent-click APIs mostly read D1

5. Write layer
   - clicks write D1 and then increment Durable Object counters
   - conversions increment Durable Object counters
   - write paths do not broadly invoke cache invalidation service

6. Realtime layer
   - `/api/cache/events` creates a new `SSECacheNotificationService` per request
   - service stores connections in process-local memory
   - invalidation broadcasting is therefore instance-local, not global

## 4. Code audit findings

### P0. The custom edge cache design uses the wrong Cloudflare cache primitive for shared API caching

Evidence:
- `caches.default` is the primary edge cache in [unified-cache-manager.ts](D:/suyee/github/CFtracking/src/services/cache/unified-cache-manager.ts#L200)
- custom keys are written to synthetic URLs such as `https://cache.example.com/${key}` in [unified-cache-manager.ts](D:/suyee/github/CFtracking/src/services/cache/unified-cache-manager.ts#L405) and [unified-cache-manager.ts](D:/suyee/github/CFtracking/src/services/cache/unified-cache-manager.ts#L424)
- SWR is modeled as a first-class strategy in [unified-cache-manager.ts](D:/suyee/github/CFtracking/src/services/cache/unified-cache-manager.ts#L309)

Why this is a problem:
- `cache.put()` is per-data-center only.
- `cache.put()` cannot use Tiered Cache.
- `cache.put()` does not support `stale-while-revalidate`.

Impact:
- cache hit ratios will fragment by colo
- origin/DO/D1 request savings will be lower than expected
- current "edge cache" is not a true zone-wide shared cache strategy

Decision:
- Keep Worker memory cache only as a tiny per-instance micro-cache.
- Stop using `caches.default` as the main shared API cache for dashboard/report/config reads.
- Move shared GET caching to `fetch(..., { cf: ... })` plus response headers and Cache Rules.

### P0. SSE connection management is instance-local and cannot provide global realtime correctness

Evidence:
- connection registry is an in-memory `Map<string, Set<ReadableStreamDefaultController>>` in [sse-cache-notification.ts](D:/suyee/github/CFtracking/src/services/cache/sse-cache-notification.ts#L42)
- `/api/cache/events` instantiates a fresh service in [src/index.ts](D:/suyee/github/CFtracking/src/index.ts#L136)

Why this is a problem:
- Workers are stateless and requests may land on different instances.
- An update event emitted on one instance cannot reliably reach clients connected to another instance.

Impact:
- clients will observe inconsistent refresh timing
- "realtime" invalidation becomes best-effort only
- cross-colo and cross-instance behavior is incorrect by design

Decision:
- Replace global-broadcast-via-Worker-memory with a coordinator backed by Durable Objects.
- Use one or more DOs as the authoritative connection hub or shard hubs.

### P0. Write paths are not wired into a mandatory invalidation pipeline

Evidence:
- cache update service exposes `onDataChanged()` in [cache-update-service.ts](D:/suyee/github/CFtracking/src/services/cache/cache-update-service.ts#L125)
- repository search shows no business write path invoking it outside the cache service itself
- clicks write in [click.service.ts](D:/suyee/github/CFtracking/src/services/tracking/click.service.ts#L348) through [click.service.ts](D:/suyee/github/CFtracking/src/services/tracking/click.service.ts#L381)
- conversions write in [conversion.service.ts](D:/suyee/github/CFtracking/src/services/tracking/conversion.service.ts#L39) through [conversion.service.ts](D:/suyee/github/CFtracking/src/services/tracking/conversion.service.ts#L47)

Impact:
- dashboards, reports, conversions, and entity lists can diverge after writes
- front-end 5-second cache and server cache may both remain stale after mutations

Decision:
- All successful create/update/delete handlers must emit a normalized invalidation event.
- Cache invalidation must be part of the write transaction boundary, not an optional service.

### P1. ETag generation is unstable and undermines 304 value

Evidence:
- `ETagGenerator.generate()` defaults version to `Date.now().toString()` in [etag-cache-manager.ts](D:/suyee/github/CFtracking/src/services/cache/etag-cache-manager.ts#L66)
- dashboard route appends a fresh `timestamp` field in [analytics.routes.ts](D:/suyee/github/CFtracking/src/services/analytics/analytics.routes.ts#L60)

Impact:
- validators can churn even when business data is unchanged
- browser revalidation loses most of its benefit
- edge and browser caches cannot cheaply converge via 304

Decision:
- ETag must be derived from a deterministic version source:
  - dataset watermark
  - last write version
  - query signature + max(updated_at)
  - or a monotonic report snapshot version
- Remove volatile response fields from ETag-bearing payloads, or move them into response headers.

### P1. Cache warming APIs are mostly placeholders

Evidence:
- `warmupEntityCache()` is placeholder in [cache-update-service.ts](D:/suyee/github/CFtracking/src/services/cache/cache-update-service.ts#L420)
- `warmupDashboardData()` is placeholder in [cache-update-service.ts](D:/suyee/github/CFtracking/src/services/cache/cache-update-service.ts#L430)
- `warmupEntityList()` is placeholder in [cache-update-service.ts](D:/suyee/github/CFtracking/src/services/cache/cache-update-service.ts#L439)

Impact:
- manual warm/purge flows provide weak operational value
- scheduled refresh does not rebuild authoritative hot paths

Decision:
- Do not advertise warmup as complete until it actually rebuilds hot cache keys through the real read path.

### P1. Generic cache middleware exists but is not part of the actual request pipeline

Evidence:
- middleware is defined in [cache-middleware.ts](D:/suyee/github/CFtracking/src/middleware/cache-middleware.ts#L46)
- repository search shows no use of `createCacheMiddleware` or `createCacheStatsMiddleware`

Impact:
- there are two parallel cache designs in the repository
- expected cache behavior is harder to reason about and test

Decision:
- remove dead middleware or reintroduce it only after the target cache architecture is finalized

### P1. Reports/read APIs do not always honor request parameters as a true analytical system should

Evidence:
- report builders ignore requested date range and grouping and default to `campaigns + last30days` in [dashboard-query.service.ts](D:/suyee/github/CFtracking/src/services/analytics/dashboard-query.service.ts#L376), [dashboard-query.service.ts](D:/suyee/github/CFtracking/src/services/analytics/dashboard-query.service.ts#L395), [dashboard-query.service.ts](D:/suyee/github/CFtracking/src/services/analytics/dashboard-query.service.ts#L414), and [dashboard-query.service.ts](D:/suyee/github/CFtracking/src/services/analytics/dashboard-query.service.ts#L432)
- `getRecentClicks()` ignores most filters and only uses `limit` in [dashboard-query.service.ts](D:/suyee/github/CFtracking/src/services/analytics/dashboard-query.service.ts#L214)

Impact:
- front-end, exported data, and dashboard metrics can disagree on scope
- cache keys built from query params may not reflect actual data semantics
- Keitaro-style analytical fidelity is not met yet

Decision:
- fix analytical correctness before aggressive caching of these routes

### P2. Frontend cache and SSE invalidation are only loosely coupled

Evidence:
- front-end analytics reads are cached for 5 seconds in [api.ts](D:/suyee/github/CFtracking/frontend/src/services/api.ts#L10) and [api.ts](D:/suyee/github/CFtracking/frontend/src/services/api.ts#L11)
- only selected analytics helpers use that cache in [api.ts](D:/suyee/github/CFtracking/frontend/src/services/api.ts#L397), [api.ts](D:/suyee/github/CFtracking/frontend/src/services/api.ts#L409), and [api.ts](D:/suyee/github/CFtracking/frontend/src/services/api.ts#L421)
- SSE invalidation targets React Query keys in [useSSECacheUpdate.tsx](D:/suyee/github/CFtracking/frontend/src/hooks/useSSECacheUpdate.tsx#L155), but the plain fetch helpers are not React Query-backed

Impact:
- SSE may invalidate some queries while plain service cache continues to serve stale results

Decision:
- either move hot read paths fully onto React Query, or expose a unified client cache invalidator that clears both React Query and `apiCache`

## 5. What can be kept, what must change

### Keep

- D1 as durable analytical source of truth for historical queries
- Durable Objects for recent/high-churn counters and coordinated state
- browser-side short cache for non-critical list views, after invalidation is unified
- ETag as a core browser revalidation tool, but only with deterministic validators
- SSE as the transport for lightweight invalidation or refresh notices

### Downgrade to micro-cache only

- Worker in-memory `Map` cache in `UnifiedCacheManager`
  - keep only for 1 to 5 second micro-burst collapse
  - never treat as authoritative state

### Replace or retire

- `caches.default` as the main API shared cache
- time-based default ETag versioning
- Worker-memory-only SSE connection registry
- placeholder warmup/refresh methods presented as production features

## 6. Target cache architecture

### 6.1 Layering

1. Browser cache
   - configuration/list/detail GETs
   - `Cache-Control: private, max-age=0, must-revalidate`
   - stable `ETag`
   - goal: cheap browser 304, not long browser staleness for admin APIs

2. Cloudflare edge shared cache
   - use origin/Worker response headers plus `fetch(..., { cf: ... })` or Cache Rules
   - use `Cloudflare-CDN-Cache-Control`
   - enable Tiered Cache for eligible GET reads
   - use `Cache-Tag` for grouped purge

3. Worker micro-cache
   - 1-5 second per-instance burst absorption only
   - only for hottest repeated GETs inside the same instance
   - never relied on for cross-request correctness

4. Realtime coordination layer
   - Durable Object(s) hold active SSE connection state or fanout state
   - DO also stores per-channel version/watermark if needed

5. Truth layer
   - D1 for persisted reports, lists, settings, clicks, conversions
   - Durable Objects for serialized hot counters and event fanout coordination

### 6.2 Data class policy

#### Static assets

- Cache at edge aggressively.
- Browser:
  - `Cache-Control: public, max-age=31536000, immutable`
- Edge:
  - long `Cloudflare-CDN-Cache-Control`
- purge:
  - hash-based deploy assets, purge not usually needed

#### Admin configuration lists and details

Examples:
- campaigns
- offers
- landings
- traffic sources
- affiliate networks
- rules
- platform settings

Policy:
- Browser:
  - `Cache-Control: private, max-age=0, must-revalidate`
- Cloudflare edge:
  - `Cloudflare-CDN-Cache-Control: public, max-age=30, stale-while-revalidate=120`
- ETag:
  - deterministic, based on row version / `updated_at` watermark
- Purge:
  - `Cache-Tag: entity:campaigns`, `entity:campaign:{id}` style

#### Dashboard recent summary

Examples:
- `/api/analytics/dashboard?range=today`
- `/api/analytics/recent-clicks`
- `/api/conversions/stats` recent windows

Policy:
- Browser:
  - `Cache-Control: private, no-store`
  - do not rely on browser cache for live summary surfaces
- Edge:
  - `Cloudflare-CDN-Cache-Control: public, max-age=5, stale-while-revalidate=25`
- Worker micro-cache:
  - optional 1-2 second burst collapse
- Realtime:
  - SSE invalidation event includes channel version so UI can decide to refetch

#### Reports and historical analytics

Examples:
- last 7 days
- last 30 days
- explicit past date ranges
- exports

Policy:
- Browser:
  - `Cache-Control: private, max-age=0, must-revalidate`
- Edge:
  - `Cloudflare-CDN-Cache-Control: public, max-age=60-300, stale-while-revalidate=600-3600`
- ETag:
  - deterministic query signature + data watermark
- Purge:
  - tags by report family and affected entity

#### SSE endpoint

Policy:
- `Cache-Control: no-store`
- no edge caching
- no browser persistence
- streamed `ReadableStream`
- fanout state anchored in Durable Objects, not Worker memory

## 7. Recommended SSE design

### 7.1 Transport choice

Use SSE for:
- dashboard refresh notices
- recent click / conversion invalidation
- settings or preferences update notice

Do not use SSE to stream every individual click/conversion payload to every admin client.
Use it to send:
- channel name
- entity IDs
- affected tags
- monotonic version / watermark

### 7.2 Connection topology

Recommended:

1. Browser opens SSE to Worker route.
2. Worker resolves a deterministic DO shard:
   - per tenant
   - or per workspace
   - or per admin channel family
3. DO owns active stream controllers for that shard.
4. Write path emits an event to the same DO shard after commit.
5. DO fans out a compact invalidation event.

This gives:
- shared state across requests
- serialized fanout updates
- a single coordination point per shard

### 7.3 Event contract

Each SSE event should contain:
- `channel`
- `entity`
- `entityId`
- `version`
- `tags`
- `reason`
- `occurredAt`

Example event types:
- `dashboard.invalidate`
- `report.invalidate`
- `entity.updated`
- `entity.deleted`
- `preferences.updated`

### 7.4 Client behavior

On SSE event:
- if the visible screen is directly affected, refetch now
- if the screen is backgrounded, mark data stale and refetch on focus
- if the event version is older than local version, ignore it
- clear both:
  - React Query cache keys
  - plain `apiCache` entries

## 8. Write path and invalidation model

The invalidation pipeline should be mandatory:

1. perform write
2. commit durable state
3. compute affected cache tags and query families
4. purge edge cache by tag where appropriate
5. bump channel version/watermark
6. emit SSE invalidation event
7. optionally warm the hottest read key through the real read path

### Example mappings

#### Campaign updated

- purge tags:
  - `entity:campaigns`
  - `entity:campaign:{id}`
  - `analytics:dashboard`
  - `analytics:reports`
- emit:
  - `entity.updated`
  - `dashboard.invalidate`

#### Conversion created

- do not purge all reports
- bump:
  - `analytics:dashboard:today`
  - `analytics:recent-clicks`
  - `analytics:conversions:recent`
- emit:
  - `dashboard.invalidate`
  - `conversions.invalidate`

#### Rule changed

- purge:
  - `entity:rules`
  - `entity:rule:{id}`
- if rule affects traffic routing, also bump campaign/flow config version so future clicks and admin views converge

## 9. Cross-validation and consistency test plan

### 9.1 Cache correctness

- Verify first GET is `MISS`, second GET is `HIT` or `304`, according to policy.
- Verify ETag stays stable when business data is unchanged.
- Verify ETag changes when a relevant write commits.
- Verify browser and edge headers differ as intended:
  - `Cache-Control`
  - `Cloudflare-CDN-Cache-Control`
- Verify cache tags are attached to intended responses.

### 9.2 Write-to-read convergence

For each core entity CRUD flow:
- create record -> list shows it
- update record -> detail and list agree
- delete record -> detail 404 / list absent
- dashboard/report counters reflect change within SLA
- SSE event arrives and triggers only targeted refresh

### 9.3 Realtime validation

- connect two clients in different browser contexts
- mutate from client A
- assert client B receives event
- assert refetched data version >= event version
- assert no duplicate stale re-render from 5-second front-end cache

### 9.4 Negative cache tests

- stale event arrives after newer version exists
- duplicate invalidation events
- DO restart / reconnect
- edge purge failure
- SSE disconnect and reconnect
- event loss followed by focus-based recovery refetch

## 10. Keitaro comparison

Compared with a Keitaro-class tracking admin, the current repository is still behind in areas that directly affect cache design:

- report parameter fidelity is incomplete
- recent/live views and historical reports are not yet on a single explicit version model
- write-driven invalidation is not first-class
- live coordination is not yet backed by a Cloudflare-native stateful channel

A correct cache strategy depends on fixing those semantics first. Aggressive caching on semantically incomplete report routes would only freeze the wrong answer faster.

## 11. Priority roadmap

### Phase 0

- Stop expanding `UnifiedCacheManager` as the main shared cache abstraction.
- Document Worker memory cache as micro-cache only.
- Remove time-based ETag defaults.

### Phase 1

- Introduce deterministic response versioning for:
  - dashboard
  - entity detail/list
  - reports
- unify front-end cache invalidation so SSE clears both React Query and `apiCache`

### Phase 2

- Route all successful writes through a single invalidation publisher
- add tag maps and affected-query maps
- implement real warmup through actual read services

### Phase 3

- move SSE coordination to Durable Objects
- keep SSE payloads compact and versioned
- add reconnect and replay-safe semantics

### Phase 4

- move shared GET caching to Cloudflare edge caching via `fetch(..., { cf: ... })`, `Cloudflare-CDN-Cache-Control`, and Cache Rules
- enable Tiered Cache for eligible GET resources
- add cache-tag purge integration

## 12. Acceptance criteria

The cache/realtime design should only be considered production-ready when all of the following are true:

- no critical read surface depends on Worker-memory-only state
- no shared API cache depends primarily on `cache.put()`
- every write path emits deterministic invalidation
- ETags are stable across identical data
- dashboard and reports converge after writes within defined SLA
- SSE fanout works across multiple Worker instances
- browser cache, edge cache, and source-of-truth versions can be cross-verified in tests

## 13. Recommended next implementation batch

1. Refactor dashboard and entity GET routes to emit deterministic `ETag` and split browser vs edge cache headers.
2. Add a central invalidation publisher called by campaign/offer/landing/rule/conversion write handlers.
3. Replace Worker-memory SSE connection state with a Durable Object-based channel hub.
4. Add automated cache consistency tests:
   - GET -> write -> GET
   - ETag 304
   - SSE event -> UI refresh
   - edge header assertions
