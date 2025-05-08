import { encode } from './utils.js';

export function registerReclaimScenario({ createChannel, updateDiagnosticsDashboard, diagSummary, diagTestActive }) {
  window.runReclaimTest = async (btn) => {
    btn.disabled = true;
    const slots = 12, size = 80;
    const { channel } = createChannel({ slots, slotSize: size, sweepTimeoutMs: 10 });
    // Simulate abandoned slots
    Object.defineProperty(channel, "slotStatus", { value: channel["slotStatus"], writable: false, configurable: true, enumerable: false });
    Object.defineProperty(channel, "slotClaimTimestamp", { value: channel["slotClaimTimestamp"], writable: false, configurable: true, enumerable: false });
    for (let i = 0; i < slots / 2; i++) {
      channel.slotStatus[0][i] = 1;
      channel.slotClaimTimestamp[0][i] = Date.now() - 1000;
    }
    await new Promise((r) => setTimeout(r, 1000));
    const preReclaimed = 0;
    const stats = channel.stats();
    document.getElementById("reclaim_result").innerHTML =
      (stats.reclaimed > preReclaimed
        ? '<span class="success">PASS — '
        : '<span class="fail">FAIL — ') +
      `Slots Reclaimed: ${stats.reclaimed - preReclaimed}</span>`;
    document.getElementById("reclaim_output").textContent = `Reclaimed: ${stats.reclaimed - preReclaimed}, Errors: ${stats.errors}\nFree slots after: ${stats.free}`;
    diagSummary.peakThroughput = 0;
    diagSummary.avgThroughput = 0;
    diagSummary.maxLag = 0;
    diagSummary.totalConflicts = stats.conflicts;
    diagSummary.totalErrors = stats.errors;
    diagSummary.totalReclaimed = stats.reclaimed;
    diagSummary.finalSlotState = [];
    diagSummary.slots = slots;
    diagTestActive.value = false;
    updateDiagnosticsDashboard();
    btn.disabled = false;
  };
}
