# CF Tracking Production Test Report

## 1. Scope and environment

- Test target: `https://t.isuyee.com`
- Execution date: `2026-04-05`
- Network path: local proxy `127.0.0.1:12334`
- Browser automation: Playwright headless Chromium
- Performance audit: Lighthouse
- Artifact directory:
  - `D:\suyee\github\CFtracking\output\playwright\prod-audit-2026-04-04T17-58-25-641Z`

## 2. Coverage

### Page coverage

Desktop route audit:

- `/`
- `/#/dashboard`
- `/#/campaigns`
- `/#/rules`
- `/#/platforms`
- `/#/landings`
- `/#/offers`
- `/#/traffic-sources`
- `/#/affiliate-networks`
- `/#/trends`
- `/#/reports`
- `/#/audit`
- `/#/conversions`
- `/#/blacklist`
- `/#/whitelist`
- `/#/target`
- `/#/settings`
- `/#/help`

Mobile route audit:

- `/#/dashboard`
- `/#/campaigns`
- `/#/landings`
- `/#/offers`
- `/#/traffic-sources`
- `/#/trends`
- `/#/audit`
- `/#/rules`
- `/#/settings`
- `/#/blacklist`
- `/#/whitelist`
- `/#/help`

### Interaction coverage

- Dashboard: dark mode toggle, page-level settings entry discovery
- Settings: `General`, `Account`, `Notifications`, `Security` tabs
- Trends:
  - Desktop filter panel
  - Date preset dropdown
  - Custom date popup
  - Mobile chart tabs `Clicks / Revenue / ROI / EPC`
- Blacklist: `Add Entry` modal open/close
- Whitelist: `Add Entry` modal open/close
- Rules: `Create Rule` modal open/close
- Platforms: `Configure` modal open/close
- Campaign Detail:
  - Main tabs `Overview / Flow / Reports / Filters / Tracking Code / Settings`
  - Edit modal open
  - Edit section tabs partial exercise

### API coverage

Read-only API verification:

- `/health`
- `/api/deployment/info`
- `/api/analytics/dashboard?range=today`
- `/api/analytics/recent-clicks?limit=10`
- `/api/analytics/entity-stats?type=campaigns&range=today`
- `/api/trends/report?...`
- `/api/campaigns`
- `/api/offers?withStats=true`
- `/api/landing-pages?withStats=true`
- `/api/traffic-sources?withStats=true`
- `/api/affiliate-networks?withStats=true`
- `/api/rules`
- `/api/clicks?limit=10`
- `/api/conversions?limit=10`
- `/api/blacklist`
- `/api/whitelist`
- `/api/user-preferences/preferences/default-user`
- `/api/migration/status`

Low-risk production CRUD probe:

- `/api/blacklist`
- `/api/whitelist`

## 3. Summary

### Overall result

- Desktop page audit: `18/18` pass
- Mobile page audit: `12/12` pass
- Read-only API audit: `18/18` pass
- Safe CRUD audit: `0/2` passed end-to-end for create step
- Deployment metadata leak regression check: pass

### Key conclusions

- The production site is broadly available on desktop and mobile, and the core pages render successfully.
- The previously reported deployment metadata leak is fixed on the public API surface.
- A real production write-path issue exists in blacklist/whitelist creation.
- Mobile performance is usable but not strong enough for a polished production baseline.
- Desktop Lighthouse could not produce a valid sample because the run hit a Chrome interstitial / challenge path.

## 4. Detailed findings

### Finding A [High]

Blacklist and whitelist create APIs failed in production safe CRUD probing with HTTP `400`.

Evidence:

- Playwright safe CRUD probe on production:
  - `POST /api/blacklist` -> `400`
  - `POST /api/whitelist` -> `400`
- Read-only dependency call succeeded:
  - `GET /api/traffic-sources?withStats=true` -> `200`

Most likely root cause from code:

- Frontend blacklist/whitelist pages load traffic source options from `/api/traffic-sources` and submit `trafficSourceId` using the returned `id` field:
  - `frontend/src/pages/Blacklist.tsx`
  - `frontend/src/pages/Whitelist.tsx`
- `TrafficSourceRepository.transform()` rewrites the exposed `id` to `displayId || id`:
  - `src/handlers/d1/trafficSource.repo.ts`
- Blacklist/whitelist create services validate by `findById(trafficSourceId)` instead of also accepting `displayId`:
  - `src/services/blacklist/blacklist.service.ts`
  - `src/services/whitelist/whitelist.service.ts`

Impact:

- The add-entry modal can appear healthy in UI, but actual create submission is likely broken for real production use.
- This blocks an important admin control path and makes UI-level modal success misleading.

Recommended fix:

1. Accept both canonical `id` and `displayId` in blacklist/whitelist service validation.
2. Or return canonical `id` separately from display ID in `/api/traffic-sources`.
3. Add an automated regression test that performs `GET traffic sources -> POST blacklist -> PUT -> DELETE`.

### Finding B [Medium]

Dashboard page-level settings entry is not discoverable by accessible name.

Evidence:

- Dashboard uses an icon-only settings button to open preferences:
  - `frontend/src/pages/Dashboard.tsx`
- The control has no clear accessible label in the rendered UI.
- Browser automation could not discover a text or ARIA-named control for `Preferences`, while the modal component exists in code.

Impact:

- Keyboard and assistive-tech usability are reduced.
- Automation stability is lower because the control lacks a semantic hook.

Recommended fix:

1. Add `aria-label="Open preferences"` or visible text.
2. Add a stable `data-testid` for key icon-only controls.

### Finding C [Medium]

Mobile Lighthouse baseline is below an acceptable production target.

Evidence from `output/playwright/lighthouse-smoke.json`:

- Performance: `0.55`
- Accessibility: `0.85`
- Best Practices: `0.81`
- SEO: `1.00`
- FCP: `3.9s`
- LCP: `4.5s`
- Speed Index: `4.2s`
- TBT: `350ms`
- CLS: `0.23`
- Interactive: `5.2s`
- Total byte weight: `589 KiB`
- Unused JavaScript savings estimate: `56 KiB`

Impact:

- Mobile first paint and largest paint are slow.
- CLS `0.23` is near the poor threshold and likely visible to users.

Recommended fix:

1. Reduce dashboard initial JS on the landing route.
2. Reserve fixed layout space for late-loading widgets/cards/charts.
3. Split non-critical dashboard sections more aggressively.
4. Reduce third-party/challenge overhead where Cloudflare policy allows.

### Finding D [Low]

Desktop Lighthouse result is invalid due challenge/interstitial interference.

Evidence from `output/playwright/lighthouse-desktop.json`:

- Final URL became `chrome-error://chromewebdata/`
- `runWarnings` reports Chrome interstitial / unexpected redirect
- All category scores are `null`

Impact:

- No trustworthy desktop Lighthouse score was collected in this run.
- Automated synthetic monitoring may be noisy if challenge behavior is inconsistent.

Recommended fix:

1. Create a challenge-bypassed monitoring route or allowlist synthetic probes.
2. Run desktop Lighthouse from a stable monitoring origin or authenticated probe network.

### Finding E [Low]

Production management data contains obvious test records and payload-like campaign names.

Evidence from production UI route sweep:

- Campaign list included multiple test artifacts such as:
  - `Playwright Test Campaign ...`
  - `Browser Test Campaign ...`
  - `Updated Test API Campaign`
  - a visible literal `<script>alert("XSS")</script>` string rendered as text

Impact:

- Production admin screens are noisy.
- Operators may have difficulty distinguishing real business objects from test artifacts.

Recommended fix:

1. Clean test records from production.
2. Separate staging data from production data.
3. Keep a dedicated sandbox tenant/workspace for automated write testing.

## 5. Functional result notes

### Positive results

- All audited desktop routes rendered without navigation failure.
- All audited mobile routes rendered without navigation failure.
- Trends desktop and mobile interactions responded as expected.
- Blacklist, whitelist, rules, and platform modals all opened successfully.
- Campaign detail tabs rendered and switched successfully.
- Public deployment info endpoint no longer exposes commit hash, branch, message, author, or author email.

### Caution notes

- Campaign detail edit-section automation only partially clicked all internal sections; `Filters` and `Tracking` were not consistently reachable inside the modal in this run.
- This is not enough evidence alone to mark a product bug, but it is a good candidate for a focused manual UX pass.
- This production audit is primarily a route, interaction, and read-surface validation artifact. It does not by itself prove cache correctness, write-path invalidation correctness, or cross-instance SSE correctness.
- The authoritative cache/realtime architecture review for the current branch is documented separately in:
  - `docs/CLOUDFLARE_CACHE_AND_REALTIME_PLAN_2026-04-05.md`

## 6. Improvement plan

### P0

- Fix blacklist/whitelist create path so traffic source lookup works with the IDs actually returned by the traffic source API.
- Add a production-safe end-to-end regression for blacklist/whitelist CRUD.

### P1

- Improve dashboard accessibility for icon-only controls, starting with the preferences trigger.
- Reduce dashboard initial rendering cost on mobile.
- Lower CLS by reserving chart/card/table skeleton space more consistently.

### P2

- Clean production test data and seed a separate QA/staging dataset.
- Add stable selectors or ARIA labels to major admin actions:
  - create buttons
  - icon-only settings/refresh actions
  - modal close buttons
  - major tabs
- Add a challenge-compatible desktop performance monitoring strategy.

## 7. Artifacts

- Main Playwright report:
  - `D:\suyee\github\CFtracking\output\playwright\prod-audit-2026-04-04T17-58-25-641Z\prod-audit.json`
- Screenshots:
  - `D:\suyee\github\CFtracking\output\playwright\prod-audit-2026-04-04T17-58-25-641Z\screenshots\`
- Mobile Lighthouse:
  - `D:\suyee\github\CFtracking\output\playwright\lighthouse-smoke.json`
- Desktop Lighthouse invalid sample:
  - `D:\suyee\github\CFtracking\output\playwright\lighthouse-desktop.json`

## 8. Recommended next execution

1. Fix the blacklist/whitelist identifier mismatch.
2. Re-run the same Playwright audit script after the fix.
3. Re-run Lighthouse with a challenge-safe desktop monitoring path.
4. Add a dedicated non-production environment for full CRUD coverage on campaigns, offers, landing pages, rules, and platform configuration.
