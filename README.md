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
A: See the Netlify build pipeline section above and the [harness README](./packages/harness/README.md#faq).

**Q: How do I contribute?**  
A: See [CONTRIBUTING.md](./CONTRIBUTING.md) or open an issue on GitHub.

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
- **Netlify CI:** Chromium, Firefox, Edge (WebKit skipped due to system dependency issues)

## Netlify CI Build Pipeline

1. **Skip Playwright browser downloads**: Set in `netlify.toml`:
   ```toml
   [build.environment]
   PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD = "1"
   ```
2. **Install Edge and system dependencies**: Handled in [`.netlify/build.sh`](.netlify/build.sh)
3. **Install Playwright system dependencies**: `npx playwright install-deps` (run in the build script)
4. **Build and test**: `npm run build` then `npx playwright test --config=playwright.dist.config.ts` (run in the build script)

## Netlify Build Script

All Netlify CI setup steps are automated in [`/.netlify/build.sh`](.netlify/build.sh). You do not need to run these manually—Netlify will execute this script as part of the build process. For details, see the script itself.

## playwright.dist.config.ts

- In CI: runs Chromium, Firefox, Edge (no WebKit)
- Locally: runs all browsers
- Edge is run via the system-installed `msedge` channel

## Local Developer Experience

- `npx playwright install` is run on `postinstall` for local devs (see `package.json`)
- All browsers are available locally

## Troubleshooting

- **WebKit on CI:** Skipped due to system dependency issues on Netlify Ubuntu images. If Netlify updates their build image, you may re-enable WebKit in CI.
- **Edge on CI:** If Edge install fails, check Microsoft repo status and APT logs.
- **Playwright browser errors:** Ensure `PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1` is set in CI, and that you do not run `npx playwright install` in CI.

## Maintenance

- If you want to re-enable WebKit in CI, add it to the `projects` array in `playwright.dist.config.ts` for CI.
- Keep `.netlify/build.sh` up to date with any new browser/system requirements.

---

For more, see the canonical documentation at https://sp8d.com/docs
