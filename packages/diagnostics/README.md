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

## See Also

- [@sp8d/diagnostics source & issues on GitHub](https://github.com/SP8D/sp8d/tree/main/packages/diagnostics)
- [@sp8d/core](../core) ([npm](https://www.npmjs.com/package/@sp8d/core))
- [Test Harness (index.html)](../core/test/index.html)
- [Live Test Harness](https://sp8d.netlify.app/)
- [Monorepo Root](https://github.com/SP8D/sp8d)

## License

MIT
