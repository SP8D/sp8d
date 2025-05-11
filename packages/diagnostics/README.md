# @sp8d/diagnostics

[![GitHub](https://img.shields.io/badge/source-github.com%2FSP8D%2Fsp8d-blue?logo=github)](https://github.com/SP8D/sp8d)

Diagnostics utilities for SP8D channels. Provides live stats, slot state, and protocol correctness tracking for [@sp8d/core](../core)

[← Back to Monorepo Root](https://github.com/SP8D/sp8d)
[→ Go to @sp8d/core package](https://github.com/SP8D/sp8d/tree/main/packages/core)

## Features

- Live throughput, lag, and slot state diagnostics
- Protocol correctness and slot reclamation tracking
- TypeScript-first, ESM output

## Usage

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

## Browser/Static Harness Usage

- The browser-ready ESM bundle (`sp8d-diagnostics.js`), its source map (`.js.map`), and type declarations (`.d.ts`, `.d.ts.map`) are included in the harness static build for debugging and TypeScript support.
- When using in the browser (e.g., in the harness), import with a relative path:
  ```js
  import { createChannelDiagnostics } from "./sp8d-diagnostics.js";
  ```
- Always run `npm run build` from the monorepo root before deploying or serving the static harness build.

## Live Diagnostics & E2E Harness

The live diagnostics dashboard and e2e test harness are now in the [@sp8d/harness](../harness) package.

- To run the harness locally:
  ```sh
  npm run serve:harness
  # Then open http://localhost:8080/
  ```
- To run e2e tests:
  ```sh
  npm run test -w @sp8d/harness
  ```

## Automated E2E Checks

E2E tests are automatically run on pre-push (and can be run manually) from the monorepo root. This ensures that all diagnostics and protocol changes are validated in a real browser before code is pushed or merged.

To run manually:

```sh
npm run e2e:dist
```

## Documentation

- [SP8D Docs Home](https://sp8d.github.io/)
- [API Reference: Channel](https://sp8d.github.io/api-reference/channel-api)
- [Quickstart](https://sp8d.github.io/quickstart/installation)
- [Minimal Example](https://sp8d.github.io/quickstart/minimal-example)
- [FAQs](https://sp8d.github.io/guides-and-howtos/faqs)

See the [full documentation](https://sp8d.github.io/) for more.

## See Also

- [@sp8d/diagnostics source & issues on GitHub](https://github.com/SP8D/sp8d/tree/main/packages/diagnostics)
- [@sp8d/core](../core) ([npm](https://www.npmjs.com/package/@sp8d/core))
- [Test Harness (index.html)](../harness/index.html)
- [Live Test Harness](https://harness.sp8d.com/)
- [Monorepo Root](https://github.com/SP8D/sp8d)

## License

MIT
