# Autorule Governance Remediation Checklist

Date: 2026-04-28

## Goal

Close the four review findings around realtime autorule compatibility, governance reporting accuracy, 7d repeat-window context hydration, and frontend configuration coverage.

## Checklist

- [x] Restore legacy direct-list compatibility in realtime evaluation
  - Scope: ensure historical whitelist and blacklist types such as `zone`, `sub_id`, `device`, `country`, `asn`, `isp`, and `user_agent` still affect live traffic.
  - Code:
    - `src/services/autorule/realtime-rule-engine.service.ts`
    - `src/services/autorule/realtime-rule-engine.service.test.ts`

- [x] Update blacklist reporting to include new governance layers
  - Scope: count `block_exact` and `block_category_aggressive` alongside legacy `blacklist` hits in report metrics and fallback governance tags.
  - Code:
    - `src/handlers/d1/traffic.repo.ts`
    - `src/handlers/d1/traffic.repo.test.ts`

- [x] Hydrate 7d repeat-window metrics into autorule runtime context
  - Scope: populate `campaignCount7d`, `visitorRepeat7d`, and `ipRepeat7d` from click history so ordinary conditions and repeat-window functions share the same source of truth.
  - Code:
    - `src/services/tracking/click.service.ts`
    - `src/services/tracking/click.service.test.ts`

- [x] Expand frontend condition editors to expose all supported governance fields
  - Scope: align blacklist/whitelist condition editing with backend-supported fields, placeholders, and help text.
  - Code:
    - `frontend/src/components/ListConditionsEditor.tsx`
    - `frontend/src/constants/governance-ui.ts`
    - `src/frontend/list-conditions-editor.test.js`
    - `src/frontend/governance-ui.test.js`

- [x] Align rule-builder and click-log governance UX with the same shared metadata
  - Scope: expose the same runtime fields in visual rule building and render readable governance labels in click inspection.
  - Code:
    - `frontend/src/pages/RuleManagement.tsx`
    - `frontend/src/pages/ClicksLog.tsx`
    - `frontend/src/constants/governance-ui.ts`

- [x] Format governance reasons into readable operator-facing explanations
  - Scope: translate raw `matchedRuleReason` keys such as `blocked_user_agent:playwright` and `whitelist_gate_unmatched:trusted_bypass` into human-readable explanations.
  - Code:
    - `frontend/src/constants/governance-ui.ts`
    - `frontend/src/pages/ClicksLog.tsx`
    - `src/frontend/governance-ui.test.js`

- [x] Strengthen frontend verification to include an actual Vite production build
  - Scope: catch JSX/parser/build-time failures that TypeScript-only linting would miss.
  - Code:
    - `frontend/package.json`
    - `package.json`

- [x] Run browser-based local verification on governance surfaces
  - Scope: confirm `/rules` renders, the create-rule modal exposes the expanded governance fields, the repeat-window UI works, and `/blacklist` exposes the expanded list types in the add-entry modal.
  - Notes:
    - `/audit` rendered successfully but the local dataset had no click rows, so `matchedRuleReason` visual formatting was validated via automated tests rather than seeded browser data.

## Regression Validation

- [x] `npm run verify`
- [x] `npx vitest run src/services/autorule/realtime-rule-engine.service.test.ts src/services/autorule/list-resolver.service.test.ts src/handlers/d1/traffic.repo.test.ts src/handlers/d1/click.repo.test.ts src/services/tracking/click.service.test.ts src/frontend/list-conditions-editor.test.js src/frontend/governance-ui.test.js`

## Notes

- Frontend governance copy, placeholders, and readable labels now share a single metadata source to reduce drift across pages.
- `npm run verify` passes. It still surfaces existing `npm audit` vulnerability notices from installed dependencies, but those do not fail the verification pipeline.
