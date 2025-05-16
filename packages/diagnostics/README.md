# @sp8d/diagnostics

Live diagnostics and protocol correctness tracking for [@sp8d/core](../core) channels.

---

## What is @sp8d/diagnostics?

- Live throughput, lag, and slot state
- Protocol correctness and slot reclamation tracking
- TypeScript-first, ESM output

---

## Local Development (from this package)

Use these scripts for local development only (from this directory):

- **Build:**
  ```sh
  npm run build
  ```

> For full builds, tests, and E2E/CI, use the monorepo root scripts below.

---

## Monorepo Build & Test (from the root)

- **Build only diagnostics:**
  ```sh
  npm run diagnostics:build
  # (from the monorepo root)
  ```
- **Test only diagnostics:**
  ```sh
  npm run diagnostics:test
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

See the [root README](../../README.md) for more details and the latest script names.

---

## Documentation

For API, advanced usage, and guides, see the [SP8D Documentation Site](https://sp8d.github.io/).

---

## See Also

- [@sp8d/core](../core): Core protocol implementation
- [@sp8d/harness](../harness): E2E test harness and diagnostics dashboard
- [Full documentation](https://sp8d.github.io/)
