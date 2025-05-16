# SP8D Monorepo

> **Audience:** Contributors, advanced users, and CI maintainers working with the SP8D protocol and its test harness.

---

## Features at a Glance

- Ultra-low-latency, robust browser/worker channels
- Live diagnostics and protocol correctness
- E2E test harness with Playwright automation
- CI/CD and Netlify-ready static builds

---

## Monorepo Structure

- **[@sp8d/core](./packages/core):** Core protocol implementation
- **[@sp8d/diagnostics](./packages/diagnostics):** Live stats and protocol correctness
- **[@sp8d/harness](./packages/harness):** E2E test harness and diagnostics dashboard

---

## Quick Start

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Build all packages:**
   ```sh
   npm run build
   ```
3. **Run the test harness (dev mode):**
   ```sh
   npm run harness:dev
   # Open http://localhost:8080/
   ```

---

## Script Reference (Monorepo Root)

| Script                   | Description                                    |
| ------------------------ | ---------------------------------------------- |
| core:build               | Build @sp8d/core package                       |
| core:test                | Test @sp8d/core package                        |
| diagnostics:build        | Build @sp8d/diagnostics package                |
| diagnostics:test         | Test @sp8d/diagnostics package                 |
| harness:build            | Build @sp8d/harness package (static/SEO build) |
| harness:test             | Test @sp8d/harness package                     |
| harness:dev              | Start harness dev server                       |
| harness:preview          | Serve harness static build from dist/          |
| harness:test:e2e         | Run Playwright e2e tests for harness           |
| harness:test:e2e:dist    | Build and run Playwright e2e tests (dist)      |
| build                    | Build all packages                             |
| test                     | Run all tests for all packages                 |
| ci:playwright-install    | Install Playwright browsers (CI/Netlify)       |
| ci:harness:test:e2e:dist | CI: Install browsers, build, run e2e (dist)    |
| netlify:build            | Netlify entry: full CI build/test/e2e          |

> For local development in a specific package, see that package's README for its own scripts.

---

## Development & Contribution

- **Pre-commit:** Lint, typecheck, and unit tests on staged files
- **Pre-push:** Full e2e tests against the distributable harness (`npm run harness:test:e2e:dist`)
- If any check fails, the commit or push is blocked

---

## Directory Layout

```
/packages
  /core         # @sp8d/core source, tests
  /diagnostics  # @sp8d/diagnostics source
  /harness      # @sp8d/harness test harness
playwright.config.ts # E2E/browser test config
```

---

## Documentation

- [Full documentation](https://sp8d.github.io/)
- [@sp8d/core on npm](https://www.npmjs.com/package/@sp8d/core)
- [GitHub repository](https://github.com/SP8D/sp8d)
- [Live Test Harness](https://harness.sp8d.com/)

---

## FAQ

**Q: Playwright install fails on Netlify?**  
A: See the “ci:playwright-install” script and the [harness README](./packages/harness/README.md#faq).

**Q: How do I contribute?**  
A: See [CONTRIBUTING.md](./CONTRIBUTING.md) or open an issue on GitHub.

---

## Where to Get Help

- [GitHub Issues](https://github.com/SP8D/sp8d/issues)
- [Full documentation](https://sp8d.github.io/)

---

## License

MIT
