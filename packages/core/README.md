# @sp8d/core

Ultra-low-latency, robust message channels for browser and worker concurrency. Designed for AI/data science copilots needing safe, lossless, and high-throughput communication.

---

## What is @sp8d/core?

- Bounded, lock-free channels for browser/worker concurrency
- No message loss, no UI freezes
- Automatic slot reclamation and fault recovery
- Race condition and data integrity protection
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

- **Build only core:**
  ```sh
  npm run core:build
  # (from the monorepo root)
  ```
- **Test only core:**
  ```sh
  npm run core:test
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

## Quick Start

```js
import { createChannel } from "@sp8d/core";
const { channel, buffer } = createChannel({ slots: 32, slotSize: 64 });
// channel.send(), channel.recv(), etc.
```

---

## See Also

- [@sp8d/diagnostics](../diagnostics): Live stats, slot state, protocol correctness
- [@sp8d/harness](../harness): E2E test harness and diagnostics dashboard
- [Full documentation](https://sp8d.github.io/)
