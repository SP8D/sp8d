# @sp8d/harness

E2E test harness and diagnostics dashboard for SP8D protocol.

---

## What is @sp8d/harness?

- Internal tool for protocol maintainers and contributors
- Live, interactive dashboard to test and visualize SP8D protocol and diagnostics
- Runs all core protocol scenarios (stress, reclaim, race, correctness, wraparound) in the browser
- Includes Playwright-based e2e tests for automated browser validation

> **Note:** This package is not intended for end users of SP8D. For API usage, integration, and guides, see the [SP8D Documentation Site](https://sp8d.github.io/).

---

## Try the Live Harness

- [Live Harness Demo](https://harness.sp8d.com)

---

## Local Development (for maintainers/contributors)

Use these scripts for local development and preview only (from this directory):

- **Dev server:**
  ```sh
  npm run dev
  # Open http://localhost:8080/
  ```
- **Build static/SEO version:**
  ```sh
  npm run build
  # Output: dist/index.html
  ```
- **Preview static build:**
  ```sh
  npm run preview
  # Open http://localhost:8080/
  ```

> Do not use these scripts for full builds, tests, or E2E/CI. See below for monorepo-wide commands.

---

## Monorepo Build, Test, and E2E (from the root)

For full builds, tests, and E2E/CI flows, always use the monorepo root scripts. These manage all dependencies, Playwright browsers, and CI flows. See the [root README](../../README.md) for the latest script names and details.

- **Build only harness:**
  ```sh
  npm run harness:build
  # (from the monorepo root)
  ```
- **Test only harness:**
  ```sh
  npm run harness:test
  # (from the monorepo root)
  ```
- **Build all packages:**
  ```sh
  npm run build
  # (from the monorepo root)
  ```
- **Test all packages:**
  ```sh
  npm run test
  # (from the monorepo root)
  ```
- **E2E for harness:**
  ```sh
  npm run harness:test:e2e
  # (from the monorepo root)
  ```
- **Build and run E2E tests (dist):**
  ```sh
  npm run harness:test:e2e:dist
  # (from the monorepo root)
  ```
- **Full CI/Netlify build/test/e2e:**
  ```sh
  npm run netlify:build
  # (from the monorepo root)
  ```

---

## Documentation

For all user-facing API, integration, and advanced guides, see the [SP8D Documentation Site](https://sp8d.github.io/).

---

## Netlify Deploy

- Netlify runs `npm run build` before deploy (from the root)
- `dist/` is the publish directory

---

## Static Build Details

- `dist/` includes browser-ready `sp8d-core.js`, `sp8d-diagnostics.js`, source maps, and type declarations
- All browser imports use relative paths (e.g., `import { createChannel } from "./sp8d-core.js"`)
- Always run `npm run build` from the monorepo root before deploying or serving the static build

---
