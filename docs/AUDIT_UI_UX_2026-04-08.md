# UI/UX Audit Report – 2026-04-08

## Scope & setup
- **Target:** https://t.isuyee.com (production) via local proxy `http://127.0.0.1:12334`.
- **Automation:** `scripts/production-audit.mjs` (desktop/mobile route matrix) produced `output/playwright/prod-audit/production-audit-report.json` along with paired screenshots under `output/playwright/prod-audit/`.
- **Baseline:** Production site enforces `AUTH_MODE=on` with JWT-protected session, so automated runs are limited to the login screen unless test credentials or a service token are injected.

## Findings
| Severity | Area | Description | Evidence & artifacts | Recommendation |
| --- | --- | --- | --- | --- |
| Medium | Coverage Limitation | All audited routes (home, dashboard, campaigns, etc.) redirect back to the login surface because unauthenticated requests fail with `401` when the worker gate is `AUTH_MODE=on`. As a result we cannot verify downstream dashboards, tables, or modals for layout stability. | Login heading in every route snapshot (`output/playwright/prod-audit/desktop-*.png` and `mobile-*.png`), and the JSON `routeAudit` entries show the same login form (`heading` = “登录 CFTracking”, `formCount` = 1) across all routes despite requesting deeper pages. | Provide a reusable test account or inject a temporary service token/`Authorization` header into the audit script so the automation can pass the login gate and cover the true dashboards. Re-run the audit once this gating is satisfied. |
| Low | Layout & console stability | Desktop and mobile snapshots show the login form without horizontal overflow, overlapping elements, or modal depth issues. All routes report `hasHorizontalOverflow: false`, `modalResult.opened: false`, and empty `consoleMessages`/`pageErrors`. | See `routeAudit.desktop`/`mobile` nodes in `production-audit-report.json` and the accompanying screenshots (e.g., `output/playwright/prod-audit/desktop-home.png`). | Continue periodic automation runs; keep the current script/viewport matrix so regressions (overflow, unexpected modals, console errors) surface quickly once auth coverage is restored. |

## Next steps
1. Coordinate with the security/dev team to supply a non-production credential or signed token that lets the automation proceed past the login screen. 2. Once unlocked, re-run `scripts/production-audit.mjs` (or a derivative under `scripts/audit-ui-*.mjs`) so the future report includes real dashboard/campaign UI states. 3. Keep the artifacts (JSON + screenshots) versioned for trend analysis and add any new findings to this document.
