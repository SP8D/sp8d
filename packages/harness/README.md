# @sp8d/harness

E2E test harness and diagnostics dashboard for SP8D protocol.

## What Is It?

- Live, interactive dashboard to test and visualize SP8D protocol and diagnostics
- Runs all core protocol scenarios (stress, reclaim, race, correctness, wraparound) in the browser
- Includes Playwright-based e2e tests for automated browser validation

## Usage

### Local Dev Server

```sh
npm run dev
# Open http://localhost:8080/
```

### Build Static/SEO Version

```sh
npm run build
# Output: dist/index.html
```

### Preview Static Build

```sh
npm run preview
# Open http://localhost:8080/
```

### Netlify Deploy

- Netlify runs `npm run build` before deploy
- `dist/` is the publish directory

## Static Build Details

- `dist/` includes browser-ready `sp8d-core.js`, `sp8d-diagnostics.js`, source maps, and type declarations
- All browser imports use relative paths (e.g., `import { createChannel } from "./sp8d-core.js"`)
- Always run `npm run build` from the monorepo root before deploying or serving the static build

## E2E Checks

- E2E tests run automatically on pre-push and can be run manually from the monorepo root
- To run manually:

  ```sh
  npm run e2e
  # or: npm run harness:test:e2e
  ```

[Full documentation](https://sp8d.github.io/)
