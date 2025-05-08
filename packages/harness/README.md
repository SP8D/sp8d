# @sp8d/harness

E2E test harness and diagnostics dashboard for the SP8D protocol ecosystem.

## Purpose

- Provides a live, interactive dashboard to test and visualize the SP8D protocol and diagnostics modules together.
- Runs all core protocol scenarios (stress, reclaim, race, correctness, wraparound) in the browser.
- Includes Playwright-based e2e tests for automated browser validation.

## Usage

### Local Dev Server (source mode)

```
npm run dev
# Open http://localhost:8080/
```

### Distributable/Production Preview (Netlify-like)

```
npm run build    # from monorepo root
npm run prepare:netlify    # from harness/
npm run dev:dist
# Open http://localhost:8080/
```

### Prepare Netlify Publish Directory

```
npm run prepare:netlify
```

E2E tests are run from the monorepo root using Playwright.

## Automated E2E Checks

E2E tests are automatically run on pre-push (and can be run manually) from the monorepo root. This ensures that all protocol and diagnostics changes are validated in a real browser before code is pushed or merged.

To run manually:

```sh
npm run e2e:dist
```

## Structure

- `index.html` — Main dashboard UI
- `main.js` — Main harness logic (modular, imports all scenarios)
- `styles.css` — Harness styles (modular, imported in index.html)
- `scenarios/` — Modular scenario test logic (registered via scenarios/index.js)
- `sp8d-diagnostics-worker.js` — Diagnostics worker for live stats
- `sp8d.spec.ts` — Playwright e2e tests
- `serve.js` — Dev server
- `scripts/prepare-netlify.js` — Netlify publish script

## Dependencies

- [@sp8d/core](../core)
- [@sp8d/diagnostics](../diagnostics)

---

For more details, see the root [README](../../README.md).
