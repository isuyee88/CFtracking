# Production Comprehensive Audit 2026-04-05

## Scope

- Target: `https://t.isuyee.com`
- Date: `2026-04-05`
- Method: Playwright browser automation against production
- Focus:
  - console errors and page runtime errors
  - SSE response correctness
  - frontend `GET /api/*` behavior across routes and date ranges
  - cache headers on HTML and control endpoints
  - key tabs, modals, and workflow interactions
  - comparison against existing Keitaro analysis documents

Artifacts:

- `output/playwright/prod-comprehensive-2026-04-05T14-04-01-130Z/summary.json`
- `output/playwright/prod-comprehensive-2026-04-05T14-04-01-130Z/dashboard-today.png`
- `output/playwright/prod-comprehensive-2026-04-05T14-04-01-130Z/dashboard-mobile.png`
- `output/playwright/prod-comprehensive-2026-04-05T14-04-01-130Z/campaigns-today.png`
- `output/playwright/prod-comprehensive-2026-04-05T14-04-01-130Z/offers.png`
- `output/playwright/prod-comprehensive-2026-04-05T14-04-01-130Z/trends.png`
- `output/playwright/prod-comprehensive-2026-04-05T14-04-01-130Z/conversions.png`
- `output/playwright/prod-comprehensive-2026-04-05T14-04-01-130Z/settings.png`

## Effective References

Primary documents used for comparison and coverage framing:

- `docs/TEST_PLAN_AND_REPORT_2026-04-05.md`
- `PRODUCTION_TEST_REPORT_2026-04-05.md`
- `docs/CLOUDFLARE_CACHE_AND_REALTIME_PLAN_2026-04-05.md`
- `.trae/specs/keitaro-documentation-analysis/keitaro-cftracking-comparison.md`
- `.trae/specs/keitaro-documentation-analysis/cftracking-status.md`
- `.trae/specs/keitaro-documentation-crawl/final-report.md`
- `keitaro-deep-report.md`

## Coverage Executed

### Desktop route matrix

- `/`
- `/?range=today`
- `/?range=yesterday`
- `/?range=last30days&from=2026-03-06&to=2026-04-05&tz=UTC&metrics=...&entities=campaigns,landings,offers,sources&recent=...`
- `/campaigns?range=today`
- `/campaigns?range=last30days&from=2026-03-06&to=2026-04-05`
- `/campaigns/c18?startDate=2026-03-06&endDate=2026-04-05&interval=day`
- `/offers`
- `/landings`
- `/traffic-sources`
- `/affiliate-networks`
- `/domains`
- `/rules`
- `/platforms`
- `/trends?startDate=2026-03-06&endDate=2026-04-05&interval=day`
- `/audit?startDate=2026-03-06&endDate=2026-04-05`
- `/conversions?startDate=2026-03-06&endDate=2026-04-05`
- `/blacklist`
- `/whitelist`
- `/settings`
- `/help`

### Mobile route matrix

- `/?range=today`
- `/campaigns?range=today`
- `/offers`
- `/trends?startDate=2026-03-06&endDate=2026-04-05&interval=day`
- `/conversions?startDate=2026-03-06&endDate=2026-04-05`
- `/settings`

### Interaction matrix

- Settings tabs:
  - `General`
  - `Account`
  - `Notifications`
  - `Security`
- Campaign detail tabs:
  - `General`
  - `Routing`
  - `Tracking`
  - `Parameters`
  - `Postback`
  - `Notes`
- Rules:
  - `Create Rule` modal trigger
- Blacklist:
  - `Add Entry` modal trigger
- Whitelist:
  - `Add Entry` modal trigger
- Platforms:
  - action entry check for `Configure / Test / Execute`

### Cache and control endpoints

- `GET /?range=today`
- `GET /campaigns?range=today`
- `GET /sw.js`
- browser-observed `/events/cache`

## Summary

### Pass

- Dashboard SSE is fixed on production:
  - browser receives `/events/cache`
  - content type is `text/event-stream`
  - dashboard desktop and mobile showed no SSE MIME error
- Dashboard and core list pages no longer issue frontend `GET /api/*` reads on initial route render across tested date ranges.
- No console errors were observed on the tested dashboard, campaigns, offers, trends, conversions, blacklist, whitelist, and settings route loads.
- HTML responses are being served from edge cache:
  - dashboard route returned `CF-Cache-Status: HIT`
  - campaigns route returned `CF-Cache-Status: HIT`
- `sw.js` now serves a cleanup script with `no-store` headers.
- Core route rendering is broadly stable on tested desktop and mobile matrices.

### Fail / Gap

1. Settings still performs a frontend read `GET /api/user-preferences/preferences/default-user`.
2. Campaign detail tabs still trigger frontend `GET /api/*` reads:
   - `/api/flows/f30/schema`
   - `/api/flows/f30/rules`
   - `/api/flows/campaign/c18/stats`
   - `/api/flows/f30/logs?limit=8`
3. Campaign detail tab workflow currently returns server `500` on:
   - `/api/flows/f30/schema`
   - `/api/flows/f30/rules`
4. Platforms page lacks visible action controls for the operational workflow expected by prior reports:
   - no visible `Configure`
   - no visible `Test`
   - no visible `Execute`

## Findings

### Finding 1 [High]

Campaign detail is still not on the server-bootstrap-only read model and contains broken tab dependencies.

Evidence:

- Tab switching on `/campaigns/c18?...` generated frontend reads to:
  - `/api/flows/f30/schema`
  - `/api/flows/f30/rules`
  - `/api/flows/campaign/c18/stats`
  - `/api/flows/f30/logs?limit=8`
- Two of those requests returned `500`:
  - `/api/flows/f30/schema`
  - `/api/flows/f30/rules`

Impact:

- Campaign detail is still inconsistent with the current architecture goal of page/bootstrap reads instead of client-side `GET /api/*`.
- The `Routing / Tracking / Parameters / Postback / Notes` workflow is not production-safe yet.
- This also blocks a clean Keitaro-style campaign orchestration experience.

Required next step:

1. Extend campaign detail server bundle coverage to include all tab-critical data.
2. Remove client-side GET fallback for campaign detail tabs.
3. Fix the backend `schema` and `rules` endpoints or stop calling them during tab render.

### Finding 2 [High]

Settings still issues a frontend GET read on initial load.

Evidence:

- Desktop and mobile both requested:
  - `/api/user-preferences/preferences/default-user`

Impact:

- This violates the current target of avoiding frontend `GET /api/*` reads for production page hydration.
- It also means the settings screen is not yet aligned with the edge-bootstrap delivery model.

Required next step:

1. Inject user preferences into the settings page bundle.
2. Keep only `POST` for writes from the settings screen.

### Finding 3 [Medium]

Platforms page is present but operationally incomplete compared with the expected platform-management workflow.

Evidence:

- Route rendered successfully and displayed platform rows and metadata.
- No visible `Configure`, `Test`, or `Execute` action controls were found during automation.

Impact:

- Platform list behaves more like a read-only registry than a management surface.
- This falls short of both prior internal test expectations and Keitaro-style operational completeness.

Required next step:

1. Reintroduce visible row-level actions.
2. Add automation coverage for configure/test/execute flows.

### Finding 4 [Medium]

Campaign detail route assertions from older test plans are outdated and no longer reflect the current UI contract.

Evidence:

- The route no longer exposes the older `Campaign Details` heading as the primary visible heading.
- The current surface uses:
  - `GENERAL`
  - `ROUTING`
  - `TRACKING`
  - `PARAMETERS`
  - `POSTBACK`
  - `NOTES`

Impact:

- Existing automation and historical reports understate real coverage and can generate false negatives.

Required next step:

1. Update regression scripts to assert against current route semantics.
2. Keep the new tab set as the canonical acceptance contract for campaign detail.

## Keitaro Comparison

### Aligned or materially improved in this round

- Dashboard realtime transport:
  - now production-valid via SSE on `/events/cache`
- Dashboard readable query parameters:
  - tested `today / yesterday / last30days`
- Edge-cached route rendering:
  - observed `CF-Cache-Status: HIT`
- Dashboard and list pages:
  - no frontend `GET /api/*` on tested initial renders

### Still behind the current Keitaro benchmark documents

Based on:

- `.trae/specs/keitaro-documentation-analysis/dashboard-analysis.md`
- `.trae/specs/keitaro-documentation-analysis/campaign-analysis.md`
- `.trae/specs/keitaro-documentation-analysis/keitaro-cftracking-comparison.md`
- `keitaro-deep-report.md`

Remaining gaps confirmed or still not disproven by this round:

- Campaign orchestration depth is incomplete in runtime behavior:
  - tab data still depends on live API reads
  - tab backend endpoints are partially broken
- Platform operations are not fully exposed in UI
- Settings hydration still depends on direct API read
- Keitaro-style operational modules not covered in this round remain functionally unverified:
  - users
  - bot lists
  - maintenance
  - privacy
  - branding
  - postback URL global workflows
- Keitaro-style deep workflow checks still need explicit production automation:
  - forced/default flow behavior
  - uniqueness policy behavior
  - flow rule authoring and validation
  - postback token and script correctness
  - platform execution side effects

## Recommended Next Wave

Priority order:

1. Remove remaining settings GET hydration.
2. Fix campaign detail tab runtime:
   - no client GET reads
   - no `500` responses
3. Restore platforms operational actions.
4. Expand production automation to the remaining Keitaro-aligned workflow surfaces:
   - campaign detail deep workflow
   - platform operations
   - reports filters/export
   - clicks and conversions drill-down
   - blacklist/whitelist create-update-delete round trip

## Audit Addendum (2026-04-06)

This addendum supersedes part of the previous findings where production behavior has already changed.

### Confirmed Fixed Since The Previous Audit

1. Settings initial hydration no longer requires frontend `GET /api/*` on the tested production route.
- Re-tested on `https://t.isuyee.com/settings`
- Current read pattern is:
  - `GET /__bootstrap/settings/<scope>.json`
  - `GET /__bootstrap/settings/<scope>.json?...__mode=object...`
- No direct frontend `GET /api/user-preferences/preferences/default-user` was observed in the latest production pass

2. Admin bootstrap redirect storms were fixed for tested pages.
- Re-tested on:
  - `/campaigns?range=yesterday`
  - `/campaigns?range=last30days`
  - `/trends`
  - `/audit`
  - `/conversions`
  - `/settings`
- These routes now stabilize to a two-request bootstrap pattern instead of repeated hash churn and redirect loops

3. Production deployment metadata exposure remains closed.
- `/api/deployment/info` returns only minimal production-safe information
- Production document responses no longer expose worker deployment debug headers

### Current Production State After Re-test

- Dashboard:
  - bootstrap manifest + object loading works
  - SSE endpoint remains valid on `/events/cache`
  - bootstrap current supports `ETag + If-None-Match -> 304`
- Campaigns / Trends / Audit / Conversions / Settings:
  - no frontend `GET /api/*` observed on latest tested initial render
  - bootstrap object delivery is now stable
- HTML shell:
  - `CF-Cache-Status: HIT` confirmed
  - `Server-Timing` confirmed
  - browser-facing `ETag` confirmed
  - `Last-Modified` confirmed

### Remaining High-Priority Gaps

1. Campaign detail still needs a fresh production-grade audit pass.
- It remains the most important Keitaro-aligned workflow surface that may still contain server-bootstrap coverage gaps
- Older audit concern remains directionally valid until explicitly disproven by a new production run

2. Platforms operational workflow is still not re-verified in this addendum.
- Configure / test / execute visibility and action depth still need a dedicated browser automation pass

3. Campaign detail remains the highest-value unresolved production workflow surface.
- Page-level cache architecture is now materially improved on the tested routes
- The next strongest remaining risk is whether campaign-detail deep tabs are fully aligned with the bootstrap-only read model

## Audit Addendum (2026-04-06, Tracking/Redirect/Conversion/Cache/SSE)

Artifacts for this validation round:
- `output/playwright/prod-chain-2026-04-06T10-11-07-248Z/summary.json`
- `output/playwright/prod-chain-2026-04-06T10-11-07-248Z/manifest-recheck.json`
- `output/playwright/prod-chain-2026-04-06T10-11-07-248Z/tracking-chain.json`
- `output/playwright/prod-chain-2026-04-06T10-11-07-248Z/tracking-sse-check.json`
- `output/playwright/prod-chain-2026-04-06T10-11-07-248Z/conversion-manifest-check.json`

### Confirmed Working In Production

1. Settings write path updates cache and emits SSE.
- `POST /api/user-preferences/preferences/default-user` succeeded.
- Browser automation on `/settings` observed `cache-invalidated`, `data-changed`, and `cache-updated`.
- The settings bootstrap manifest changed from:
  - ETag `page-bootstrap-current-settings-...-6yyqxn`
  - contentVersion `settings-bootstrap-...-m6upqz`
  to:
  - ETag `page-bootstrap-current-settings-...-yuwfg5`
  - contentVersion `settings-bootstrap-...-2ukw59`
- Current tested manifest TTL for settings remains `s-maxage=300`.

2. Campaign admin write path updates cache and emits SSE.
- `PUT /api/campaigns/c16` succeeded and was reverted successfully.
- Browser automation on `/campaigns?range=today` observed broad invalidation/update events covering:
  - campaign lists
  - campaign detail
  - dashboard aggregate caches
  - bootstrap keys for dashboard/campaigns/trends/audit/conversions
- The campaigns bootstrap manifest changed from:
  - ETag `page-bootstrap-current-campaigns-...-r7wtnh`
  - contentVersion `campaigns-bootstrap-...-soy9uf`
  to:
  - ETag `page-bootstrap-current-campaigns-...-pfwrza`
  - contentVersion `campaigns-bootstrap-...-9vlnvg`

3. Browser validation for the tested cache/SSE flows completed with no console errors.

### Confirmed Production Gaps

1. Primary-domain campaign alias entry still resolves to SPA HTML instead of tracking redirect.
- `GET /pw-test-1775182453486`
- observed: `200 text/html`
- expected for a tracker entry: redirect or tracking dispatch, not the SPA shell

2. Tracking redirect target is still wrong even after a flow exists.
- `GET /api/tracking/click/pw-test-1775182453486?...`
- observed: `302 Found`
- observed `Location: about:blank`
- this is a production redirect correctness defect

3. POST click tracking records the click, but returns the wrong redirect destination.
- `POST /api/tracking/click`
- observed:
  - success
  - `flowId=f32`
  - `offerId=o5`
  - `isTrafficLoss=false`
  - `redirectUrl=https://example.test/source`
- the returned redirect URL matched the submitted referer rather than the configured offer destination

4. Click persistence is working, but the conversion reporting plane is still broken.
- Verified working:
  - click detail persisted for `clk_1775470462322252`
  - click stats increased for campaign `c16`
- Verified broken:
  - postback returned success with `conversionId`
  - `GET /api/conversions/click/<clickId>` returned `[]`
  - `GET /api/conversions/stats?...campaignId=c16` remained all zero
- This means the tracking success response is not currently materializing into conversion logs/stats used by the reports plane.

5. Tracking writes do not currently trigger frontend refresh behavior.
- Browser automation on `/conversions` kept a live SSE connection open.
- After a successful tracking click and a successful conversion postback:
  - SSE event count remained unchanged (`open` only)
  - no `cache-invalidated`
  - no `cache-updated`
  - no `data-changed`
- Re-checking `/__bootstrap/conversions/y8sliy.json?__pathname=%2Fconversions` with `If-None-Match` after a successful conversion still returned `304`.
- This confirms the reporting/bootstrap refresh chain is not wired to `/api/tracking/*` writes.

6. Settings mutation SSE currently reports the wrong logical entity id.
- The observed `data-changed` payload for settings used:
  - `entity = user-preferences`
  - `entityId = preferences`
- For per-user preference writes, the logical target should likely be the user id (`default-user`) rather than the literal path segment `preferences`.

7. Campaign update invalidation is broader than the actual data delta.
- A name-only campaign update invalidated dashboard bootstrap keys and aggregate caches.
- The dashboard manifest itself still returned `304` after the update.
- This suggests the invalidation fan-out is broader than necessary, even though the campaign list page refreshed correctly.

### Current Priority Order After This Validation

1. Fix tracking redirect resolution.
- direct alias entry must not return SPA HTML
- tracking redirect must not point to `about:blank`
- click redirect response must resolve to the actual landing/offer target

2. Persist conversions into the reporting plane.
- successful postbacks must write records consumed by:
  - conversion logs
  - conversion stats
  - conversions bootstrap/report pages

3. Wire tracking writes into cache invalidation and SSE.
- `/api/tracking/click`
- `/api/tracking/conversion/postback`
- any other report-affecting tracking mutation

4. Tighten invalidation scope.
- keep campaign/settings refresh behavior
- reduce unnecessary dashboard/trends/audit/conversions invalidation for metadata-only edits when the rendered payload does not change
