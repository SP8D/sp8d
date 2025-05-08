import type { Channel, ChannelStats } from "@sp8d/core";

export interface SlotState {
  index: number;
  status: number;
  ageMs: number;
}

export interface ChannelDiagnostics {
  readonly stats: ChannelStats & {
    throughput: number; // messages/sec (avg)
    consumerLag: number; // ms
    avgSlotAge: number;
    maxSlotAge: number;
  };
  getSlotState(): SlotState[];
  getHistory(): ChannelStats[];
  start(): void;
  stop(): void;
  onUpdate(cb: (stats: ChannelDiagnostics["stats"]) => void): void;
}

export interface ChannelDiagnosticsOptions {
  intervalMs?: number;
  slotSample?: number | "all";
  onUpdate?: (stats: ChannelDiagnostics["stats"]) => void;
}

/**
 * Create diagnostics for a channel, with flexible options and developer-friendly API.
 * @param channel The channel to monitor
 * @param options Diagnostics options (intervalMs, slotSample, onUpdate)
 */
export function createChannelDiagnostics(
  channel: Channel,
  options: ChannelDiagnosticsOptions = {}
): ChannelDiagnostics {
  const intervalMs = options.intervalMs ?? 50;
  const slotSample = options.slotSample ?? "all";
  let lastMsgCount = 0;
  let lastTime = Date.now();
  let throughput = 0;
  let consumerLag = 0;
  let avgSlotAge = 0;
  let maxSlotAge = 0;
  let updateCb: ((s: ChannelDiagnostics["stats"]) => void) | undefined =
    options.onUpdate;
  let timer: ReturnType<typeof setInterval>;
  const statsHistory: ChannelStats[] = [];

  function getSlotState(): SlotState[] {
    const testChannel = channel as any;
    if (!testChannel.slotStatus || !testChannel.slotClaimTimestamp)
      throw new Error("Channel internals not exposed");
    const statusArr = testChannel.slotStatus[0];
    const claimTS = testChannel.slotClaimTimestamp[0];
    const result: SlotState[] = [];
    const N = statusArr.length;
    if (slotSample === "all" || slotSample >= N) {
      for (let i = 0; i < N; i++) {
        result.push({
          index: i,
          status: statusArr[i],
          ageMs:
            statusArr[i] === 1 || statusArr[i] === 2
              ? Date.now() - claimTS[i]
              : 0,
        });
      }
    } else {
      // Sample random slots for large channels
      for (let s = 0; s < slotSample; s++) {
        const i = Math.floor(Math.random() * N);
        result.push({
          index: i,
          status: statusArr[i],
          ageMs:
            statusArr[i] === 1 || statusArr[i] === 2
              ? Date.now() - claimTS[i]
              : 0,
        });
      }
    }
    return result;
  }

  function updateStats() {
    const stats = channel.stats();
    const currentTime = Date.now();
    throughput =
      ((stats.used - lastMsgCount) * 1000) / (currentTime - lastTime);
    lastMsgCount = stats.used;
    lastTime = currentTime;
    const slotState = getSlotState();
    const ages = slotState
      .filter((s) => s.status !== 0)
      .map((s) => s.ageMs)
      .sort((a, b) => a - b);
    avgSlotAge =
      ages.length > 0 ? ages.reduce((a, b) => a + b) / ages.length : 0;
    maxSlotAge = ages.length > 0 ? ages[ages.length - 1] : 0;
    consumerLag = maxSlotAge;
    const enhancedStats = {
      ...stats,
      throughput: Math.max(0, throughput),
      consumerLag,
      avgSlotAge,
      maxSlotAge,
      slotState, // <-- include slotState for dashboard
    };
    statsHistory.push(stats);
    if (updateCb) updateCb(enhancedStats);
    return enhancedStats;
  }

  function start() {
    timer = setInterval(updateStats, intervalMs);
  }
  function stop() {
    clearInterval(timer!);
  }
  function onUpdate(cb: (s: ChannelDiagnostics["stats"]) => void) {
    updateCb = cb;
  }
  function getHistory(): ChannelStats[] {
    return statsHistory.slice();
  }
  updateStats();
  return {
    get stats() {
      return updateStats();
    },
    getSlotState,
    getHistory,
    start,
    stop,
    onUpdate,
  };
}

/**
 * Start diagnostics in a worker thread for zero main-thread impact.
 * @param channel The channel to monitor
 * @param options Diagnostics options (intervalMs, slotSample, onUpdate)
 * @returns The Worker instance
 */
export function startDiagnosticsWorker(
  channel: Channel,
  options: ChannelDiagnosticsOptions = {}
): Worker {
  // Create a diagnostics channel for stats transfer
  // (User must provide a worker script that imports this logic)
  const worker = new Worker(
    new URL("./sp8d-diagnostics-worker.js", import.meta.url),
    { type: "module" }
  );
  // Pass channel buffer and options to worker
  const testChannel = channel as any;
  worker.postMessage({
    buffer: testChannel.sab || testChannel.buffer,
    options,
  });
  return worker;
}

// --- Worker Script Template (sp8d-diagnostics-worker.js) ---
// import { attachChannel } from "@sp8d/core";
// self.onmessage = (e) => {
//   const { buffer, options } = e.data;
//   const channel = attachChannel(buffer);
//   const diagnostics = createChannelDiagnostics(channel, options);
//   diagnostics.onUpdate((stats) => {
//     self.postMessage(stats);
//   });
//   diagnostics.start();
// };
// ---------------------------------------------------------
