# Runtime Baseline — 2026-10-07

> Status: **PLANNED / NOT MEASURED**
>
> No live Cloudflare development or production endpoint was available for this baseline. Do not treat local unit tests, Wrangler dry-runs, or build output as latency or capacity evidence.

## Scope

| Surface | k6 script | Required evidence |
|---|---|---|
| Tracking click / redirect | `k6/scripts/tracking-load.js` | p50/p95/p99, error rate, accepted status distribution |
| API read paths | `k6/scripts/api-benchmark.js` | p50/p95/p99 by endpoint, error rate |
| Inbound/outbound postback | future bounded scenario | p50/p95/p99, retry/error classification |
| Hosted Asset HTML/ZIP | future bounded scenario | R2 response latency, status distribution, cache headers |
| D1/DO/Queue | provider metrics/read-back | failure count and retry count; k6 alone cannot attribute internal failures |

## Safety profile

- Default k6 execution is `smoke`, not load or stress.
- `stress` requires explicit `K6_PROFILE=stress` and explicit operator approval.
- Never run the stress profile against production without a documented budget, quota check, rollback/stop rule, and owner.
- Keep US/Canada traffic and any production affiliate traffic out of performance tests unless the endpoint is an isolated test fixture.

## Planned commands

```bash
# Safe local smoke, only after a local Worker is reachable
K6_PROFILE=smoke BASE_URL=http://127.0.0.1:8787 k6 run k6/scripts/api-benchmark.js
K6_PROFILE=smoke BASE_URL=http://127.0.0.1:8787 CAMPAIGN_ID=test-campaign k6 run k6/scripts/tracking-load.js

# Explicitly gated; do not run by default
K6_PROFILE=stress BASE_URL=<approved-qa-url> k6 run k6/scripts/api-benchmark.js
K6_PROFILE=stress BASE_URL=<approved-qa-url> CAMPAIGN_ID=<qa-campaign> k6 run k6/scripts/tracking-load.js
```

## Acceptance gates to set after real QA measurements

| Metric | Threshold | Status |
|---|---:|---|
| Tracking p95 | TBD from QA baseline | pending measurement |
| Tracking p99 | TBD from QA baseline | pending measurement |
| API p95 | TBD per endpoint | pending measurement |
| Postback error rate | TBD from QA baseline | pending measurement |
| Hosted Asset response p95 | TBD from QA baseline | pending measurement |
| D1/DO/Queue failures | 0 unexplained failures | pending provider evidence |

## Current blockers

1. A no-AI local QA Worker was used successfully for the Chromium Hosted Asset smoke (`3 passed`, `3 fixture-gated skips`). The default dev config still cannot start here because its AI binding attempts a remote connection and times out; Mobile Safari is not installed locally.
2. No approved QA/production endpoint and fixture IDs were provided for real k6 measurement.
3. Cloudflare resource quota and internal provider metrics are not verified in this run.
