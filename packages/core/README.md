# @sp8d/core

Ultra-low-latency, robust message channels for browser and worker concurrency. Designed for AI/data science copilots needing safe, lossless, and high-throughput communication.

[Monorepo Root](https://github.com/SP8D/sp8d)

## Why Use @sp8d/core?

- **Bounded, lock-free channels** for browser/worker concurrency
- **No message loss, no UI freezes**
- **Automatic slot reclamation** and fault recovery
- **Race condition and data integrity protection**
- **TypeScript-first, ESM output**

## Quick Start

```js
import { createChannel } from "@sp8d/core";
const { channel, buffer } = createChannel({ slots: 32, slotSize: 64 });
// channel.send(), channel.recv(), etc.
```

### Browser Usage

- Use the ESM bundle (`sp8d-core.js`) and types in the harness static build.
- Import with a relative path in browser harness:
  ```js
  import { createChannel } from "./sp8d-core.js";
  ```
- Always run `npm run build` from the monorepo root before deploying or serving the static harness build.

## API Highlights

- **trySend**: Returns `false` if the channel is full or payload too large (no throw)
- **tryRecv**: Returns `null` if the channel is empty

```js
const ok = channel.trySend(new Uint8Array([1, 2, 3]));
if (!ok) {
  /* handle backpressure */
}
const msg = channel.tryRecv();
if (msg) {
  /* process message */
}
```

## Advanced

- Supports SPSC, MPSC, and MPMC concurrency
- Tunable slots, segment count, message size
- See [@sp8d/diagnostics](../diagnostics) for live stats and correctness tracking

## See Also

- [@sp8d/diagnostics](../diagnostics): Live stats, slot state, protocol correctness
- [@sp8d/harness](../harness): E2E test harness and diagnostics dashboard

[Full documentation](https://sp8d.github.io/)
