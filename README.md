# SP8D Monorepo

> **Audience:** Contributors, advanced users, and CI maintainers working with the SP8D protocol and its test harness.

---

## Features at a Glance

- **Memory-Safe, Lock-Free Channels**: Ultra-low-latency browser/worker communication with comprehensive safety guarantees
- **Race-Condition Prevention**: Atomic operations and CAS-based pointer management ensure protocol correctness
- **Live Diagnostics & Monitoring**: Real-time protocol correctness validation and performance metrics
- **Comprehensive Testing**: E2E test harness with Playwright automation and security validation
- **Production Ready**: CI/CD pipeline with Netlify-ready static builds and security hardening

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

| Script                | Description                                    |
| --------------------- | ---------------------------------------------- |
| core:build            | Build @sp8d/core package                       |
| core:test             | Test @sp8d/core package                        |
| diagnostics:build     | Build @sp8d/diagnostics package                |
| diagnostics:test      | Test @sp8d/diagnostics package                 |
| harness:build         | Build @sp8d/harness package (static/SEO build) |
| harness:test          | Test @sp8d/harness package                     |
| harness:dev           | Start harness dev server                       |
| harness:preview       | Serve harness static build from dist/          |
| harness:test:e2e      | Run Playwright e2e tests for harness           |
| harness:test:e2e:dist | Build and run Playwright e2e tests (dist)      |
| build                 | Build all packages                             |
| test                  | Run all tests for all packages                 |

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
```

---

## Documentation

- [Full documentation](https://sp8d.github.io/)
- [@sp8d/core on npm](https://www.npmjs.com/package/@sp8d/core)
- [GitHub repository](https://github.com/SP8D/sp8d)
- [Live Test Harness](https://harness.sp8d.com/)

---

## Where to Get Help

- [GitHub Issues](https://github.com/SP8D/sp8d/issues)
- [Full documentation](https://sp8d.github.io/)

---

## License

MIT

# SP8D Protocol Test Harness: Playwright E2E & Netlify CI Setup

## E2E Browser Coverage

- **Local:** Chromium, Firefox, WebKit, Edge
- **Netlify CI:** Chromium, Firefox (Edge, WebKit skipped due to system dependency issues)
