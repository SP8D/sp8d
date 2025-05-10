# @sp8d/core

[![npm version](https://img.shields.io/npm/v/@sp8d/core?label=%40sp8d%2Fcore)](https://www.npmjs.com/package/@sp8d/core)
[![GitHub](https://img.shields.io/badge/source-github.com%2FSP8D%2Fsp8d-blue?logo=github)](https://github.com/SP8D/sp8d)

Ultra-low-latency, robust browser protocol for safe, lossless, and concurrent message passing—designed for demanding AI and data science copilots.

[← Back to Monorepo Root](https://github.com/SP8D/sp8d)

## Features

- Bounded, lock-free channel for browser/worker concurrency
- High throughput, no message loss, no UI freezes
- Automatic slot reclamation and fault recovery
- Race condition and data integrity protection
- TypeScript-first, ESM output

## Usage

```js
import { createChannel } from "@sp8d/core";

const { channel, buffer } = createChannel({ slots: 32, slotSize: 64 });
// Use channel.send(), channel.recv(), etc.
```

## Browser/Static Harness Usage

- The browser-ready ESM bundle (`sp8d-core.js`), its source map (`.js.map`), and type declarations (`.d.ts`, `.d.ts.map`) are included in the harness static build for debugging and TypeScript support.
- When using in the browser (e.g., in the harness), import with a relative path:
  ```js
  import { createChannel } from "./sp8d-core.js";
  ```
- Always run `npm run build` from the monorepo root before deploying or serving the static harness build.

## Advanced Usage & New Features

### Non-throwing Send/Receive

```js
// trySend returns false instead of throwing if the channel is full or payload is too large
const ok = channel.trySend(new Uint8Array([1, 2, 3]));
if (!ok) {
  // handle backpressure or retry
}

// tryRecv returns null if the channel is empty
const msg = channel.tryRecv();
if (msg) {
  // process message
}
```

### Async Channel Close

```js
// Gracefully close the channel and wait for all background tasks to stop
await channel.closeAsync();
```

### Channel Reset (for reuse)

```js
// Reset the channel to its initial state (empties all slots, resets counters)
channel.reset();
```

### Diagnostics & Debugging

```js
// Access slot status, generation, and timestamps for live diagnostics
console.log(channel.slotStatus[0]); // Uint8Array of slot statuses
console.log(channel.slotGeneration[0]); // Uint8Array of generation tags
console.log(channel.slotClaimTimestamp[0]); // Uint32Array of claim timestamps
```

### Async Send with Backpressure (Browser-First)

```js
// sendAsync waits for a slot to become available (with optional timeout/abort)
await channel.sendAsync(new Uint8Array([1, 2, 3]), undefined, {
  timeoutMs: 1000,
});
// This is browser-friendly and ensures no message loss under bursty load.
```

## Test Harness

The E2E test harness and diagnostics dashboard are now in the [@sp8d/harness](../harness) package. The harness is fully modularized (see main.js, styles.css, and scenarios/).

- To run the harness locally:
  ```sh
  npm run serve:harness
  # Then open http://localhost:8080/
  ```
- To run e2e tests:
  ```sh
  npm run test -w @sp8d/harness
  ```

## Running Tests in All Browsers

To run Playwright tests for @sp8d/core in all browsers, always run from the monorepo root:

```
npm run test:core
```

This ensures the root Playwright configuration is used. Running tests from within the core directory is not supported.

## Automated E2E Checks

E2E tests are automatically run on pre-push (and can be run manually) from the monorepo root. This ensures that all protocol changes are validated in a real browser before code is pushed or merged.

To run manually:

```sh
npm run e2e:dist
```

## See Also

- [@sp8d/core on npm](https://www.npmjs.com/package/@sp8d/core)
- [@sp8d/core source & issues on GitHub](https://github.com/SP8D/sp8d/tree/main/packages/core)
- [Test Harness (index.html)](../harness/index.html)
- [Live Test Harness (Netlify)](https://sp8d.netlify.app/)
- [Monorepo Root](https://github.com/SP8D/sp8d)

## Development

- Build: `npm run build -w @sp8d/core`
- Test: `npm run test -w @sp8d/core`

## License

MIT
