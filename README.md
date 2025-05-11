# SP8D Monorepo

A modern monorepo for the SP8D protocol ecosystem: ultra-low-latency, robust browser channels and diagnostics for AI/data science copilots.

[![npm version](https://img.shields.io/npm/v/@sp8d/core?label=%40sp8d%2Fcore)](https://www.npmjs.com/package/@sp8d/core)
[![GitHub](https://img.shields.io/badge/source-github.com%2FSP8D%2Fsp8d-blue?logo=github)](https://github.com/SP8D/sp8d)

## Packages

- [@sp8d/core](./packages/core) — The core SP8D protocol implementation ([npm](https://www.npmjs.com/package/@sp8d/core), [GitHub](https://github.com/SP8D/sp8d/tree/main/packages/core))
- [@sp8d/diagnostics](./packages/diagnostics) — Diagnostics utilities for live stats and protocol correctness ([npm](https://www.npmjs.com/package/@sp8d/diagnostics), [GitHub](https://github.com/SP8D/sp8d/tree/main/packages/diagnostics))
- [@sp8d/harness](./packages/harness) — E2E test harness and diagnostics dashboard for SP8D protocol ([GitHub](https://github.com/SP8D/sp8d/tree/main/packages/harness))
  - Modular: main.js, styles.css, and scenarios/ for maintainable, production-grade browser testing

See each package's README for detailed usage, API, and development notes.

## Getting Started

1. **Install dependencies:**
   ```sh
   npm install
   ```
2. **Build all packages:**
   ```sh
   npm run build
   ```
   - The build process ensures browser-ready `.js`, `.js.map`, and `.d.ts` files for `@sp8d/core` and `@sp8d/diagnostics` are copied into the harness `dist/` directory for static hosting and debugging. All browser imports in the harness use relative paths to these files.
   - The static build will fail if these files are missing; always run `npm run build` from the monorepo root before deploying or serving the static build.
3. **Run the test harness (dev mode):**
   ```sh
   npm run harness:dev
   # Open http://localhost:8080/
   ```

## Running All Tests

To run all automated tests for the monorepo, use:

```
npm test
```

This will run Playwright tests for @sp8d/core using the root configuration and all supported browsers. If additional packages add automated tests in the future, the root test script will be updated to include them.

## Running All E2E Tests

To run all browser-based e2e tests for the monorepo, use:

```
npm run test:e2e
```

This will run Playwright tests in all supported browsers using the root configuration, targeting the harness package.

## Development & Scripts

## Scripts (Monorepo Root)

| Script            | Description                                     |
| ----------------- | ----------------------------------------------- |
| core:build        | Build @sp8d/core package                        |
| diagnostics:build | Build @sp8d/diagnostics package                 |
| harness:build     | Build @sp8d/harness package (static/SEO build)  |
| build             | Build all packages                              |
| test              | Run all tests for all packages                  |
| harness:dev       | Start harness dev server (dynamic, source mode) |
| harness:preview   | Serve harness static build from dist/           |
| harness:test:e2e  | Run Playwright e2e tests for harness            |
| e2e               | Alias for harness:test:e2e                      |

- **Local Dev Server (harness, source mode):**
  ```sh
  npm run harness:dev
  # Open http://localhost:8080/
  ```
- **Build Static/SEO Version (for Netlify or production):**
  ```sh
  npm run harness:build
  # Output: packages/harness/dist/index.html
  ```
- **Preview Static Build Locally:**
  ```sh
  npm run harness:preview
  # Open http://localhost:8080/
  ```
- **Run All E2E Tests:**
  ```sh
  npm run e2e
  # or: npm run harness:test:e2e
  ```

## Automated Pre-commit & Pre-push Checks

This monorepo uses [Husky](https://typicode.github.io/husky/) and [lint-staged](https://github.com/okonet/lint-staged) to enforce quality and integration at every commit:

- **Pre-commit:** Runs lint, typecheck, and unit tests on staged files for fast feedback.
- **Pre-push:** Runs full e2e tests against the distributable harness (`npm run e2e:dist`).
- If any check fails, the commit or push is blocked.

You can always run the full e2e workflow manually:

```sh
npm run e2e:dist
```

This ensures that the distributable harness is always tested in a real browser before code is pushed or merged.

## Structure

```
/packages
  /core         # @sp8d/core source, tests, README
  /diagnostics  # @sp8d/diagnostics source, README
  /harness      # @sp8d/harness test harness, README
playwright.config.ts # E2E/browser test config
```

## Source & Docs

- [@sp8d/core on npm](https://www.npmjs.com/package/@sp8d/core)
- [GitHub repository](https://github.com/SP8D/sp8d)
- [Live Test Harness](https://harness.sp8d.com/)

## Documentation

Comprehensive documentation is available at [https://sp8d.github.io/](https://sp8d.github.io/). Key topics:

- [What is SP8D?](https://sp8d.github.io/introduction/what-is-sp8d)
- [Channel API Reference](https://sp8d.github.io/api-reference/channel-api)
- [Concurrency Models](https://sp8d.github.io/principles/concurrency-models)
- [Quickstart Guide](https://sp8d.github.io/quickstart/installation)
- [Minimal Example](https://sp8d.github.io/quickstart/minimal-example)
- [Common Recipes](https://sp8d.github.io/quickstart/common-recipes)
- [FAQs](https://sp8d.github.io/guides-and-howtos/faqs)

See the [full documentation](https://sp8d.github.io/) for more.

## Contributing

Pull requests and issues are welcome! See each package's README for details.

## License

MIT

---

# SP8D — Ultra-Low-Latency Bounded Channel for Web-Based AI Copilots

## TL;DR

**What it is:**
Next-gen SharedArrayBuffer protocol for browser threads and AI agents, outperforming standard MessageChannel/SharedWorker pipes.

**Why it matters:**
Enables “desktop-class” multi-agent coordination, backpressure, and resource safety in browsers and Node—no lockups, no leaks.

**Instant Demo:** [Live Harness Link]
**Source & Benchmarks:** [GitHub link]

---

## 1. Why SP8D Exists

- **Problem:**
  Today’s browser comms mechanisms (`postMessage`, `MessageChannel`) are slow, garbage-collected, rarely bounded, and impossible to diagnose at a low level. They offer zero backpressure, error recovery, or slot-level control.

- **Solution:**
  **SP8D** is a fast, lock-less, shared-memory channel with explicit segmenting and protocol modes for any concurrency model (SPSC/MPSC/MPMC). It provides transparent slot state, error tracking, slot age, lag, and protocol conformance.

---

## 2. Protocol Architecture

- **Slot Lifecycle:**
  `EMPTY → CLAIMED → READY → EMPTY` (with atomic transitions)

- **Core Concepts:**

  - **Slots:** Fixed-size message buffers with explicit state.
  - **Segments:** Support for multi-segment (multi-producer/consumer) topologies.
  - **Sweep/Reclaim:** Automatic recovery of abandoned slots.
  - **Backpressure:** Bounded resource usage, never unbounded queue growth.
  - **Diagnostics:** Live stats, slot state, error/correctness tracking.

- **Why Bounded?**
  Explicit resource control beats queue/channel abstractions from other ecosystems, ensuring reliability and observability.

---

## 3. Features

- **Modes:**

  - **SPSC:** Single Producer, Single Consumer
  - **MPSC:** Multi Producer, Single Consumer
  - **MPMC:** Multi Producer, Multi Consumer

- **Tunable Parameters:**

  - Number of slots
  - Segment count
  - Message size
  - Sweep interval

- **Live Diagnostics:**

  - Throughput (messages/sec)
  - Consumer lag (ms)
  - Slot age (avg/max)
  - Errors, conflicts, reclaimed slots

- **Hard Fault Recovery:**
  Sweeper auto-unblocks stuck slots/producers, always observable in diagnostics.

---

## 4. Live Demo & Test Harness

- **What you can see/test:**

  - Spin up producers/consumers, simulate load/chaos
  - Observe live slot state (visual grid), stats, logs
  - Compare SP8D and vanilla MessageChannel, side-by-side (A/B)
  - Stress with “panic” (stall), fault injection, recovery

- **Test Cases (see `packages/harness/index.html`):**

  1. **Live High-Throughput Stress:**
     Measures throughput and loss under heavy load.
  2. **Slot Reclamation & Stale-Job Handling:**
     Ensures abandoned slots are reclaimed automatically.
  3. **Race Condition & Conflict Resolution:**
     Hammers the channel with many producers/consumers to test conflict handling.
  4. **Protocol Correctness & Data Integrity:**
     Verifies no message loss, corruption, or reordering.

- **Each test is mapped to protocol fields and UI observables:**

  | Counter/Field   | Tested In                          | Observable in UI Grid/Stats         |
  | --------------- | ---------------------------------- | ----------------------------------- |
  | slots/used/free | All basic, stress, starvation      | Live grid + stats, color/percent    |
  | errors          | protocolViolation, payloadOverflow | Error panel, logs, highlighted slot |
  | conflicts       | stressMpsc, stressMpmc             | Conflict meter                      |
  | reclaimed       | sweepReclaim, starvation           | Log entry, slot recycles, counter   |
  | consumerLag     | all                                | Max lag, per-slot, in stats panel   |

---

## 5. Usage

### Quickstart

```ts
import { createChannel } from "./src/sp8d-core";

const { channel, buffer } = createChannel({
  slots: 32,
  slotSize: 64,
  mode: "MPMC",
});

channel.send(new Uint8Array([1, 2, 3]));
const msg = channel.recv();
```

### Diagnostics

```ts
import { createChannelDiagnostics } from "./src/sp8d-diagnostics";

const diagnostics = createChannelDiagnostics(channel, 50);
diagnostics.onUpdate((stats) => {
  console.log("update:", stats);
});
diagnostics.start();
```

### Integration

- Multiprocess AI copilot task offload/scheduling
- Real-time browser/worker communication

---

## 6. Benchmarks

- **Quantitative:**

  - Throughput: SP8D vs MessageChannel
  - Latency histogram
  - Resource usage (CPU/mem)

- **Qualitative:**
  - Protocol correctness under stress
  - Fault recovery and slot reclamation

---

## 7. Full Test Coverage

- **Enumerated test cases** mapped to internal protection/diagnostic logic.
- Each test: scenario ➔ result ➔ relevant fields (`.errors`, `.reclaimed`, `.conflicts`, etc.).
- See `packages/harness/index.html` for live mapping.

---

## 8. Implementation Insights

- **Critical invariants:**
  Slot states, atomic transitions, validation.
- **Diagnostics:**
  Protocol-violation catchers, live stats, slot state.
- **TypeScript-first:**
  Seamless Node/browser compatibility.

---

## 9. Limitations & Future Work

- **Known limitations:**
  - Lottery fairness in high-contention MPMC
  - Browser platform differences (timing, Atomics)
- **Planned extensions:**
  - Direct integration with webworker pools
  - WASM support

---

## 10. Contact / About

- [Your contact or project link here]
