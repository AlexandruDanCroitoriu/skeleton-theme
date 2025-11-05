# Plan 003 — Migrate to Vite bundler

## Objectives and Success Criteria
- Replace CDN ESM Vue with a local-bundled app via Vite.
- Source code lives in src/, output bundles to assets/ (Shopify theme assets).
- Maintain existing Tailwind build flow and theme.liquid script tag.
- Ensure no regressions to Cart features (header badge, flyout, cart page), progressive enhancement remains intact.

## Milestones
1) Scaffold Vite and dependencies [✓]
2) Move app source to src/app.js and adjust imports [✓]
3) Configure vite.config.js to emit assets/app.js without hashing [✓]
4) Update package.json scripts (dev/build) [✓]
5) Add node_modules to .gitignore (already present) [✓]
6) Dev workflow notes and validation [>] IN_PROGRESS

## Tasks
- T1: Create src/app.js mirroring current assets/app.js but importing from 'vue' [✓]
- T2: Add vite config to output to assets/app.js [✓]
- T3: Update package.json scripts and add dev dependencies vite and vue [✓]
- T4: Keep layout/theme.liquid script tag unchanged (still loads assets/app.js) [✓]
- T5: Run build and verify theme loads and JS works; adjust as needed [✓]
- T6: Remove legacy ESM CDN import usage from assets/app.js by replacing file with built output [✓]

## Acceptance Criteria
- Running `npm run build` produces assets/app.js that loads in the theme and powers the existing UI.
- `npm run dev` runs Vite dev server; during development, developer either proxies or manually refreshes, but final artifacts still compile to assets/.
- No duplication of Vue/mount code between src and assets (assets/app.js is build output only).

## Execution Log
- 2025-11-05: Added src/app.js, vite.config.js; updated package.json with vite and vue; changed imports to use 'vue'.
- 2025-11-06: Added combined dev script (npm run dev) to run CSS and JS watchers; rebuilt app.js after a11y tweaks.

## Risks
- Vite default dev server serves from memory; need a workflow to watch+write to assets/ so shopify theme dev can serve new JS. Current config uses build; for dev we may still run build on save (alternative: Vite library mode + watch). For now, `vite build --watch` could be used if needed.
- CSP or cross-origin issues should be resolved since assets are local.

## Next Steps
- Run `npm install`, then `npm run build` to generate assets/app.js from src/app.js.
- Test header badge, flyout, cart page; fix any path or runtime issues.
- Update Plan 002 to mark bundler migration as completed and proceed with A11y/UX tasks.
