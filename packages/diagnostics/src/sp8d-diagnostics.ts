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

export function createChannelDiagnostics(
  channel: Channel,
  intervalMs: number = 50
): ChannelDiagnostics {
  let lastMsgCount = 0;
  let lastTime = Date.now();
  let throughput = 0;
  let consumerLag = 0;
  let avgSlotAge = 0;
  let maxSlotAge = 0;
  let updateCb: ((s: ChannelDiagnostics["stats"]) => void) | undefined;
  let timer: ReturnType<typeof setInterval>;
  const statsHistory: ChannelStats[] = [];

  function getSlotState(): SlotState[] {
    // Use type assertion for test/dev builds only
    const testChannel = channel as any;
    if (!testChannel.slotStatus || !testChannel.slotClaimTimestamp)
      throw new Error("Channel internals not exposed");
    const statusArr = testChannel.slotStatus[0];
    const claimTS = testChannel.slotClaimTimestamp[0];
    const result: SlotState[] = [];
    for (let i = 0; i < statusArr.length; i++) {
      result.push({
        index: i,
        status: statusArr[i],
        ageMs:
          statusArr[i] === 1 || statusArr[i] === 2
            ? Date.now() - claimTS[i]
            : 0,
      });
    }
    return result;
  }

  function updateStats() {
    const stats = channel.stats();
    const currentTime = Date.now();
    // Throughput: messages/sec (used slot diff per time)
    throughput =
      ((stats.used - lastMsgCount) * 1000) / (currentTime - lastTime);
    lastMsgCount = stats.used;
    lastTime = currentTime;

    // Compute slot ages
    const slotState = getSlotState();
    const ages = slotState
      .filter((s) => s.status !== 0)
      .map((s) => s.ageMs)
      .sort((a, b) => a - b);

    avgSlotAge =
      ages.length > 0 ? ages.reduce((a, b) => a + b) / ages.length : 0;
    maxSlotAge = ages.length > 0 ? ages[ages.length - 1] : 0;
    consumerLag = maxSlotAge;

    // Compose enhanced stats object for easy visualization/trending
    const enhancedStats = {
      ...stats,
      throughput: Math.max(0, throughput),
      consumerLag,
      avgSlotAge,
      maxSlotAge,
    };

    statsHistory.push(stats);
    if (updateCb) updateCb(enhancedStats);
    // Optionally, return for UI polling
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

  // Initial call to populate baseline
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

// import { createChannel, attachChannel } from "./sp8d-core";
// import { createChannelDiagnostics } from "./sp8d-diagnostics";

// const { channel, buffer } = createChannel({ slots: 32, slotSize: 64 });

// // Diagnostics extension (MUST be public in core!)
// const diagnostics = createChannelDiagnostics(channel, 50);

// diagnostics.onUpdate((stats) => {
//   // This should print the stats each time they update
//   // If running in browser, consider appendChild or textContent on DOM node
//   console.log("update:", stats);
//   // For live UI: document.getElementById("stats").textContent = JSON.stringify(stats)
// });
// diagnostics.start();

// // Keep the interval running for logging/developer use
// setInterval(() => {
//   // Dump stats to console
//   console.log("interval stats", diagnostics.stats);

//   // Optional: show live slot states (for visual UI)
//   const slotState = diagnostics.getSlotState();
//   console.table(slotState);
// }, 500);
