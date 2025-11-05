# Plan 002 — Vue Cart Component Implementation

## Objectives and Success Criteria
- Implement a Vue 3 "cart" component with two UI representations:
  - Header cart button: shows item count; opens a small preview/flyout of items; links to cart page.
  - Cart page UI: lists items, updates quantities, removes items, handles inventory errors returned by Shopify, and provides a checkout action.
- Use Shopify AJAX cart endpoints for client-side operations; maintain progressive enhancement (forms still work without JS).
- Styling with Tailwind already present; keep dependencies minimal (prioritize no-build CDN-based Vue). Headless UI/Heroicons are optional enhancements.
- Accessibility: proper labels, focus handling on popover, and keyboard operability.
- Localization-ready: static text behind translation keys when used in Liquid; dynamic strings minimal or derived from Liquid-translated content.

## Assumptions and Open Questions
- Assumption: Vue 3 is acceptable, loaded via ESM CDN (no bundler). Confirm if a bundler (Vite) is desired instead.
- Assumption: Headless UI and Heroicons usage from examples can be approximated or deferred; confirm if exact parity is required.
- Assumption: Inventory management in cart means respecting available quantity and showing errors from Shopify when updates exceed stock. Deep inventory checks beyond cart API are out of scope for v1.
- Question: Should the header cart flyout show thumbnails and links (like example) or just a count + link in v1?
- Question: Any requirements for multi-currency, selling plans, gift wrap, or line item properties in v1?

## Milestones and Deliverables
1) Foundation — Cart Data Layer [ ]
- Deliverable: cartStore module with methods: fetchCart, addLine, updateLine, removeLine, getCount; emits events for updates.
- Definition of Done: Can read cart count and items; update quantity; remove item; recover from errors; unit smoke via manual testing.

2) Header Cart Button (MVP) [>] IN_PROGRESS
- Deliverable: Vue header widget showing count; click opens simple popover with up to N items and a "View cart" + "Checkout".
- DoD: Count updates instantly after cart changes on any page; popover accessible; no 3rd-party deps.

3) Cart Page UI (MVP) [>] IN_PROGRESS
- Deliverable: Vue-driven list on /cart with quantity selectors (1..10), remove, subtotal recompute, checkout button. Progressive enhancement: form posts still functional without JS.
- DoD: Quantity updates persist via Shopify AJAX; error messages surfaced if inventory constraint fails; subtotal consistent with Shopify response.

4) Enhancements (Optional) [ ]
- Headless UI + Heroicons parity with provided examples; animations; empty state; loading skeletons.
- DoD: Visual/interaction parity signed off; no regressions.

5) QA and Docs [ ]
- Cross-browser smoke; mobile; accessibility checks; README snippet for how to mount/use; code comments.

## High-level Design
- Load Vue 3 ESM in assets/app.js via CDN import and mount conditionally when a data attribute container is present.
- cartStore: lightweight module wrapping Shopify AJAX endpoints (/cart.js, /cart/add.js, /cart/change.js). Centralizes state and emits custom events (cart:updated) to update all mounts.
- Mount points:
  - Header: <div data-vue-cart-header></div> inserted inside sections/header.liquid near the cart icon area.
  - Cart page: <div data-vue-cart-page></div> added to sections/cart.liquid (keep existing Liquid form for no-JS fallback; Vue renders over or in a separate container).
- Progressive enhancement: Keep existing Liquid form and links; Vue enhances when JS loads.

## Tasks, Owners, Dependencies
- T1: Tooling health check for Vue via CDN vs bundler — Owner: tooling-healthcheck — Dep: none — [ ]
- T2: Decide runtime approach (CDN-only vs Vite bundler) — Owner: User + Orchestrator — Dep: T1 — [✓] DONE (migrating to Vite)
- T3: Implement cartStore in assets/app.js (or assets/cart.js) — Owner: General agent — Dep: T2 — [✓] DONE (locale-aware endpoints via window.Shopify.routes.root)
- T4: Add mount points in header.liquid and cart.liquid (non-breaking) — Owner: Orchestrator — Dep: T3 (can be parallel) — [✓] DONE
- T5: Implement HeaderCart.vue (inline SFC via defineComponent) and mount — Owner: General agent — Dep: T3,T4 — [>] IN_PROGRESS
- T6: Implement CartPage.vue and mount on /cart — Owner: General agent — Dep: T3,T4 — [>] IN_PROGRESS (MVP list, quantity, remove, subtotal, checkout link)
- T7: Wire checkout actions (link to routes.cart_url and /checkout) — Owner: General agent — Dep: T6 — [ ]
- T8: Optional: Integrate Headless UI + Heroicons (CDN ESM) — Owner: General agent — Dep: T5 — [ ]
- T9: QA (a11y, mobile), docs — Owner: Orchestrator — Dep: T6 — [ ]

## Critical Path
T1 → T2 → T3 → (T4 || T5) → T6 → T7 → T9

## Acceptance Criteria (Definition of Done)
- Header:
  - Displays accurate cart item count within 500ms after load.
  - Updates count live after add/change/remove on any page.
  - Popover opens/closes with keyboard and click; screen reader labels present.
- Cart page:
  - Lists items with title, variant, price, quantity selector, remove.
  - Updates via AJAX reflect immediately and persist; shows Shopify error messages for inventory constraints.
  - Subtotal recalculates based on cart API response.
  - Checkout action navigates to /checkout or posts to routes.cart_url with name=checkout.
- No regressions to core Liquid fallback (cart remains usable with JS disabled).

## Execution Log
- 2025-11-05: Read project files (package.json, assets/app.js, layout/theme.liquid, sections/cart.liquid, templates/cart.json). Established Tailwind present; no Vue yet; app.js loaded via type=module.
- 2025-11-05: Implemented cartStore (fetchCart, changeLine, addLine) first via CDN ESM then migrated to bundler. Mounted header count badge; set JS enhancement flag for CSS fallbacks; localized endpoints via window.Shopify.routes.root.
- 2025-11-05: Updated sections/header.liquid to add data attributes for cart badge and hide Liquid count when JS active. Validated with shopify_validate_theme. Consulted Shopify AJAX Cart docs for payloads/errors.
- 2025-11-05: Added data-vue-cart-page mount to sections/cart.liquid and stylesheet to hide Liquid form when JS enhanced. Implemented minimal CartPage Vue UI (list, qty, remove, subtotal, checkout) and mounted. Validated changes.
- 2025-11-05: Deduplicated mountCartPage() in assets/app.js, added money formatting and line/subtotal display, and disabled controls during loading.
- 2025-11-05: Implemented header cart flyout preview (data-vue-cart-flyout) with item list, subtotal, View cart, Checkout; wired the cart link to toggle the flyout; validated theme files.
- 2025-11-06: A11y polish on flyout (ESC to close, focus management, aria attrs); fixed per-line error display in CartPage using state.lineErrors.

## Risks and Mitigations
- Risk: Introducing Vue with CDN may conflict with CSP or increase payload.
  - Mitigation: Use ESM CDN only; verify CSP headers; lazy init only when mount exists.
- Risk: Headless UI/Heroicons require bundler or ESM paths that may complicate setup.
  - Mitigation: Defer to enhancements; MVP uses plain Vue.
- Risk: Inventory limits not directly exposed via cart.js; updates may fail silently.
  - Mitigation: Surface errors from /cart/change.js response; disable increments on 422.
- Risk: Multi-currency totals mismatch.
  - Mitigation: Display subtotals echoed from Shopify response to avoid client-side math.

## Next Steps
- Await answers to open questions (CDN vs bundler, parity needs, currency scope).
- If CDN approach is approved:
  - Implement T3-T7 in small PRs, starting with cartStore and header count.
- If bundler desired, add a milestone to integrate Vite and switch assets/app.js to bundled output.
