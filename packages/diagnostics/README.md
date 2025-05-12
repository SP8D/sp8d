# @sp8d/diagnostics

Live diagnostics and protocol correctness tracking for [@sp8d/core](../core) channels.

[Monorepo Root](https://github.com/SP8D/sp8d) | [@sp8d/core](../core)

## Why Use @sp8d/diagnostics?

- **Live throughput, lag, and slot state**
- **Protocol correctness and slot reclamation tracking**
- **TypeScript-first, ESM output**

## Quick Start

```js
import { createChannel } from "@sp8d/core";
import { createChannelDiagnostics } from "@sp8d/diagnostics";
const { channel } = createChannel({ slots: 32, slotSize: 64 });
const diagnostics = createChannelDiagnostics(channel, 50);
diagnostics.onUpdate((stats) => {
  console.log("update:", stats);
});
diagnostics.start();
```

### Browser Usage

- Use the ESM bundle (`sp8d-diagnostics.js`) and types in the harness static build.
- Import with a relative path in browser harness:
  ```js
  import { createChannelDiagnostics } from "./sp8d-diagnostics.js";
  ```
- Always run `npm run build` from the monorepo root before deploying or serving the static harness build.

## Live Dashboard & E2E Harness

- The live diagnostics dashboard and e2e test harness are in [@sp8d/harness](../harness).
- To run locally:
  ```sh
  npm run harness:dev
  # Open http://localhost:8080/
  ```
- To run e2e tests:
  ```sh
  npm run e2e
  # or: npm run harness:test:e2e
  ```

[Full documentation](https://sp8d.github.io/)
