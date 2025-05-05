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

## Test Harness

- [Live Test Harness](https://sp8d.netlify.app/)

Run the local test harness:

```sh
npm run build -w @sp8d/core
npm run serve
```

Then open http://localhost:8080/ in your browser.

## Running Tests in All Browsers

To run Playwright tests for @sp8d/core in all browsers, always run from the monorepo root:

```
npm run test:core
```

This ensures the root Playwright configuration is used. Running tests from within the core directory is not supported.

## See Also

- [@sp8d/core on npm](https://www.npmjs.com/package/@sp8d/core)
- [@sp8d/core source & issues on GitHub](https://github.com/SP8D/sp8d/tree/main/packages/core)
- [Test Harness (index.html)](./test/index.html)
- [Live Test Harness (Netlify)](https://sp8d.netlify.app/)
- [Monorepo Root](https://github.com/SP8D/sp8d)

## Development

- Build: `npm run build -w @sp8d/core`
- Test: `npm run test -w @sp8d/core`

## License

MIT
