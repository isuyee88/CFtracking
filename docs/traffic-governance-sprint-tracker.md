# Traffic Governance Sprint Tracker

## Scope

Converge overlapping traffic-governance surfaces into:

- `Blacklist`
- `Whitelist`
- `Autorules`
- `Campaign -> select one or more autorule bindings with priority`

Decision precedence confirmed for implementation:

1. `Whitelist`
2. `Blacklist`
3. `Autorules`

## Sprint 1

Goal: complete the first usable convergence slice without introducing a new antifraud report page.

### Tasks

- [x] Remove `Traffic Filter` from primary navigation and redirect legacy route to `Blacklist`
- [x] Extend `Blacklist` categories with `ASN`, `ISP`, `Fingerprint`, `Rule Group`
- [x] Extend `Whitelist` categories with `ASN`, `ISP`, `Fingerprint`, `Rule Group`
- [x] Add `Country` as an explicit `Blacklist` category
- [x] Add `Country` as an explicit `Whitelist` category
- [x] Allow rule-group list conditions on blacklist/whitelist entries
- [x] Support general traffic source resolution for shared list entries
- [x] Keep legacy `geo` entries compatible with new `country` rule resolution
- [x] Fold legacy `geo` display into `Country` in blacklist/whitelist UI while keeping storage compatibility
- [x] Remove legacy `BlacklistWhitelist.tsx` dead page from frontend source
- [x] Audit bootstrap/mobile navigation for stale cached menu data
- [x] Add campaign UI entry for multi-autorule binding with priority
- [x] Expand backend from single campaign autorule binding to ordered multi-binding persistence
- [x] Enforce runtime precedence `Whitelist > Blacklist > Autorules` in click ingress evaluation

### Acceptance Criteria

- Creating a blacklist entry with type `country` accepts ISO alpha-2 codes such as `US`
- Creating a whitelist entry with type `country` accepts ISO alpha-2 codes such as `DE`
- Lowercase country input is normalized to uppercase before persistence
- `country` entries can be resolved by autorule runtime checks
- Legacy `geo` entries still match autorule country checks during transition
- `/traffic-filter` does not expose a standalone tool page anymore
- Desktop and mobile navigation expose `Blacklist`, `Whitelist`, `Autorules`, but not `Traffic Filter`
- Campaign management allows selecting multiple autorules with explicit priority order
- Runtime click decision evaluates whitelist first, blacklist second, and only then campaign-bound autorules

### Verification

- [x] Root TypeScript check: `npm run typecheck`
- [x] Frontend TypeScript check: `npm --prefix frontend run lint`
- [x] Targeted Vitest for list governance changes
- [x] Targeted Vitest for runtime precedence and multi-binding
- [x] Manual browser regression on blacklist/whitelist create flows
- [x] Manual campaign binding regression
- [x] Run local migrations `058`-`061` for browser regression; remote production migration still pending before deploy

## Sprint 2

Goal: finish IA convergence and remove redundant list-management entrypoints.

### Tasks

- [ ] Remove legacy `geo` storage writes after data migration is prepared
- [x] Remove deprecated `BlacklistWhitelist.tsx` route and unused page source
- [ ] Review remaining `trafficFilter.routes.ts` backend responsibilities and migrate reusable logic
- [x] Align mobile nav, sidebar nav, bootstrap payload, and cached bundles
- [x] Add campaign rule-binding management UI with multiple bindings and explicit priority order

## Sprint 3

Goal: complete flexible user-defined report capability with antifraud metrics inside custom reports.

### Tasks

- [x] Finish custom-metrics configuration model so arbitrary stored metrics can be exposed in reports
- [x] Support multi-dimension grouping such as `campaign + traffic source + UTM + subId`
- [x] Expose fraud metrics such as `fraud_clicks`, `avg_fraud_score`, `blacklist_rate`, `rule_hits`
- [x] Allow saved custom report templates instead of dedicated antifraud pages
- [ ] Validate report performance and bootstrap payload size for high-cardinality combinations

## Latest Verification Notes

- `2026-04-24`: production deploy `7d37be96-a56e-442d-b9b8-ca297d7fc758` is live on `https://cf-tracking.suyee88.workers.dev`
- Verified public campaign alias `https://t.isuyee.com/test-campaign-final?...` now returns `302` instead of SPA HTML
- Verified direct tracking endpoint `https://t.isuyee.com/api/tracking/click/test-campaign-final?...` now returns `302` instead of `Traffic loss - no matching flow`
- Verified redirect target now appends tracking attribution parameters:
  - `clickid`
  - `visitor`
  - `subid1`
- Verified production click log records the restored redirect chain for campaign `c3`, flow `f20`, offer `o4`
- Verified production custom report query for `groupBy = [campaign, utm_campaign, subid1]` and metrics `clicks, blocked, rule_hits, fraud_clicks, blacklist_rate` returns live rows for `utm_campaign = livecheck3`
- Fixed legacy flow runtime compatibility by falling back from empty `actionConfig` to persisted `actionType`
- Fixed Worker public-path routing order so single-segment aliases are resolved before SPA shell handling
- Fixed deployment wrapper regression: `deploy:stable` now uses `scripts/deploy-stable.mjs` to inject an absolute DNS bootstrap path without breaking nested `frontend` installs
- Remaining engineering risk:
  - `frontend` production build still depends on a fragile `vite-plugin-pwa/workbox-build` install state on this machine
  - the current deploy succeeded with valid `frontend/dist` assets already generated during the build pipeline, but the PWA tail-step should still be normalized in a later cleanup pass
- `2026-04-24`: local worker regression on `http://127.0.0.1:12343`
- Verified sidebar/mobile surface exposes `Autorules`, `Blacklist`, `Whitelist`, and no standalone `Traffic Filter`
- Verified `Blacklist` category selector includes `Country`, `ASN`, `ISP`, `Fingerprint`, `Rule Group`
- Verified local D1 migrations `058`-`061` are required for list-condition fields and ordered autorule bindings
- Verified blacklist page now refreshes from live APIs instead of relying only on bootstrap state after mutations
- Verified whitelist create flow accepts lowercase country input, persists uppercase value, and remains consistent after reload
- Verified campaign `c4` persists autorule binding `r4` with priority `1` through the Campaign Autorules modal and `/api/campaigns/c4/autorule-bindings`
- Verified realtime list resolution now scopes by `trafficSourceId` in addition to `general`, preventing cross-source list leakage
- Verified effective autorule binding lookup now prefers `Campaign` bindings before fallback `Flow` bindings
- Verified click-ingress autorule actions now cover `challenge` and `redirect` in addition to `block`
- Verified report builder blacklist metrics are aligned to the new governance runtime via click log fields instead of legacy `ipBlacklist`
- Verified local D1 migration `062_add_click_governance_match_columns.sql` restores report-query compatibility for governance match fields
- Verified remote production `clicks` table cannot accept `062` via direct `ALTER TABLE` and now uses schema-aware Worker fallback:
  - omit `matchedRule*` writes when columns are absent
  - encode governance layer/rule hints into `riskReasons`
  - compute `blacklist_hits` / `blacklist_rate` from `riskReasons` tags when `matchedRuleLayer` is unavailable
- Verified production deploy `e7c6c22f-6d90-4d6d-9d49-53badb41ba49` is live on `https://t.isuyee.com`
- Verified authenticated production UI exposes `Autorules`, `Blacklist`, `Whitelist`, `Reports`, and `Custom Metrics` without any standalone `Traffic Filter` navigation entry
- Verified mobile production navigation now labels the rules entry as `Autorules`
- Verified authenticated production API responses:
  - `GET /api/analytics/reports/metadata` -> `200`
  - `GET /api/custom-metrics/active` -> `200`
  - `POST /api/analytics/reports/query` with `groupBy = [campaign, source, utm_campaign, subid1]` and governance metrics -> `200`
- Verified production report query can return rows for wide date ranges, confirming multidimensional grouping + governance metrics execute on live data
- Verified Report Builder exposes:
  - dimensions: `campaign`, `source`, `zoneid`, `utm_source`, `utm_campaign`, `subid1-3`, and `click.*` raw fields
  - fraud metrics: `fraud_clicks`, `avg_fraud_score`, `blacklist_rate`, `rule_hits`, `blocked`
  - saved views and Fraud Source Scan template
- Verified local quality gates:
  - `npm run typecheck`
  - `npx vitest run src/handlers/d1/click.repo.test.ts src/handlers/d1/traffic.repo.test.ts`
  - `npx vitest run src/services/autorule/realtime-rule-engine.service.test.ts src/handlers/d1/autoruleBinding.repo.test.ts src/services/input-length-guard.test.ts`
  - `npm --prefix frontend run lint`
