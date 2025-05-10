// Diagnostics Worker for SP8D Test Harness
// This worker attaches to a channel buffer, runs diagnostics, and posts updates to the main thread.
import { attachChannel } from "./sp8d-core.js";
import { createChannelDiagnostics } from "./sp8d-diagnostics.js";

let diagnostics = null;

self.onmessage = (e) => {
  const { buffer, options } = e.data;
  console.log("[DIAG WORKER] Received buffer and options", buffer, options);
  const channel = attachChannel(buffer);
  diagnostics = createChannelDiagnostics(channel, options);
  diagnostics.onUpdate((stats) => {
    // Debug: log stats before posting
    console.log("[DIAG WORKER] Posting stats", stats);
    self.postMessage(stats);
  });
  diagnostics.start();
  console.log("[DIAG WORKER] Diagnostics started");
};
