# SP8D Monorepo

A modern monorepo for the SP8D protocol: ultra-low-latency, robust browser channels and diagnostics for AI/data science copilots.

## Packages

- [@sp8d/core](./packages/core): Core protocol implementation
- [@sp8d/diagnostics](./packages/diagnostics): Live stats and protocol correctness
- [@sp8d/harness](./packages/harness): E2E test harness and diagnostics dashboard

See each package's README for usage and development notes.

## Getting Started

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Build all packages:**
   ```sh
   npm run build
   ```
   - Builds browser-ready `.js`, `.js.map`, and `.d.ts` files for `@sp8d/core` and `@sp8d/diagnostics` into the harness `dist/` directory.
   - Always run `npm run build` from the monorepo root before deploying or serving the static build.
3. **Run the test harness (dev mode):**
   ```sh
   npm run harness:dev
   # Open http://localhost:8080/
   ```

## Testing

- **All tests:**
  ```sh
  npm test
  ```
- **All E2E tests:**
  ```sh
  npm run test:e2e
  ```

## Scripts (Monorepo Root)

| Script            | Description                                    |
| ----------------- | ---------------------------------------------- |
| core:build        | Build @sp8d/core package                       |
| diagnostics:build | Build @sp8d/diagnostics package                |
| harness:build     | Build @sp8d/harness package (static/SEO build) |
| build             | Build all packages                             |
| test              | Run all tests for all packages                 |
| harness:dev       | Start harness dev server                       |
| harness:preview   | Serve harness static build from dist/          |
| harness:test:e2e  | Run Playwright e2e tests for harness           |
| e2e               | Alias for harness:test:e2e                     |

## Pre-commit & Pre-push Checks

- **Pre-commit:** Lint, typecheck, and unit tests on staged files
- **Pre-push:** Full e2e tests against the distributable harness (`npm run e2e:dist`)
- If any check fails, the commit or push is blocked

## Structure

```
/packages
  /core         # @sp8d/core source, tests
  /diagnostics  # @sp8d/diagnostics source
  /harness      # @sp8d/harness test harness
playwright.config.ts # E2E/browser test config
```

## Docs

- [Full documentation](https://sp8d.github.io/)
- [@sp8d/core on npm](https://www.npmjs.com/package/@sp8d/core)
- [GitHub repository](https://github.com/SP8D/sp8d)
- [Live Test Harness](https://harness.sp8d.com/)

## License

MIT
