# cf-tracking deploy artifact

This branch is **generated**. Do not edit by hand.

- `worker.js` — single bundled Worker; offer-analysis/automation plugins inlined.
- `assets/` — exact frontend assets.
- `wrangler.toml` — deploy config; `main = ./worker.js`.
- `scripts/check-bundle.mjs` — rejects external plugin imports and obvious secret literals.
- `SOURCE_BUNDLE` — source bundle hash/time.

Cloudflare Workers Builds:

```text
Repository:        isuyee88/CFtracking
Production branch: deploy/prod
Root directory:    /
Build command:     npm ci
Deploy command:    node scripts/check-bundle.mjs && npx wrangler deploy
```

Do not deploy from `master`; that is the source branch and builds a different app.
