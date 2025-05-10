# @sp8d/harness

E2E test harness and diagnostics dashboard for the SP8D protocol ecosystem.

## Purpose

- Provides a live, interactive dashboard to test and visualize the SP8D protocol and diagnostics modules together.
- Runs all core protocol scenarios (stress, reclaim, race, correctness, wraparound) in the browser.
- Includes Playwright-based e2e tests for automated browser validation.

## Usage

### Local Dev Server (dynamic, source mode)

```
npm run dev
# Open http://localhost:8080/
```

### Build Static/SEO Version (for Netlify or production)

```
npm run build
# Output: dist/index.html (with all test cards statically rendered)
```

### Preview Static Build Locally

```
npm run preview
# Open http://localhost:8080/
```

### Netlify Deploy

- Netlify should run `npm run build` before deploy.
- The `dist/` directory is the publish directory.

## Production/Static Build Details

- The harness `dist/` directory includes browser-ready `sp8d-core.js`, `sp8d-diagnostics.js`, their `.js.map` source maps, and `.d.ts` type declarations.
- All browser imports use relative paths (e.g., `import { createChannel } from "./sp8d-core.js"`).
- The static build will fail if these files are missing; always run `npm run build` from the monorepo root before deploying or serving the static build.

## Automated E2E Checks

E2E tests are automatically run on pre-push (and can be run manually) from the monorepo root. This ensures that all protocol and diagnostics changes are validated in a real browser before code is pushed or merged.

To run manually:

```sh
npm run e2e:dist
```

- Playwright tests now wait for the UI to show "PASS" or "FAIL" before asserting, improving reliability and eliminating race conditions with intermediate states like "Running...".

## Structure

- `index.html` — Main dashboard UI
- `main.js` — Main harness logic (modular, imports all scenarios)
- `styles.css` — Harness styles (modular, imported in index.html)
- `scenarios/` — Modular scenario test logic (registered via scenarios/index.js)
- `sp8d-diagnostics-worker.js` — Diagnostics worker for live stats
- `sp8d.spec.ts` — Playwright e2e tests
- `serve.js` — Dev/static server
- `scripts/prepare-netlify.js` — Static build script

## Dependencies

- [@sp8d/core](../core)
- [@sp8d/diagnostics](../diagnostics)

---

For more details, see the root [README](../../README.md).
