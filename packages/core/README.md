# @sp8d/core

Ultra-low-latency, memory-safe message channels for browser and worker concurrency. Designed for AI/data science copilots needing secure, lossless, and high-throughput communication with comprehensive safety guarantees.

---

## What is @sp8d/core?

- **Memory-Safe**: Comprehensive bounds checking and buffer validation prevent corruption
- **Race-Condition Free**: Atomic operations and CAS-based pointer management ensure correctness
- **Lock-Free Channels**: High-performance browser/worker concurrency without blocking
- **Zero Message Loss**: Robust protocol with automatic fault recovery and slot reclamation
- **Production Ready**: Extensively tested with security hardening and protocol validation
- **TypeScript-First**: Full type safety with ESM output for modern applications

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
