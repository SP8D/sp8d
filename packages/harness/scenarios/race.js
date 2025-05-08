import { encode } from './utils.js';

export function registerRaceScenario({ createChannel, updateDiagnosticsDashboard, diagSummary, diagTestActive }) {
  window.runRaceTest = async (btn) => {
    btn.disabled = true;
    const producers = 12, consumers = 12, slots = 2, size = 80, N = 2000;
    let written = 0, read = 0;
    const { channel } = createChannel({ slots, slotSize: size, sweepTimeoutMs: 30 });
    channel.__getTestStats = () => ({ errors: channel.errors, conflicts: channel.conflicts });
    const start = Date.now();
    const prodInt = Array.from({ length: producers }, (_, p) => setInterval(() => {
      for (let c = 0; c < 100 && written < N; c++)
        if (channel.send(encode({ w: written }, size))) written++;
    }, 1));
    const consInt = Array.from({ length: consumers }, (_, c) => setInterval(() => {
      let msg;
      while ((msg = channel.recv())) read++;
    }, 1));
    const timeout = 3000;
    while (read < N && Date.now() - start < timeout)
      await new Promise((r) => setTimeout(r, 10));
    prodInt.forEach(clearInterval);
    consInt.forEach(clearInterval);
    const { conflicts, errors } = channel.__getTestStats();
    document.getElementById("race_result").innerHTML =
      (conflicts > 0 || errors > N / 2
        ? '<span class="success">PASS — '
        : '<span class="fail">FAIL — ') +
      `Conflicts detected: ${conflicts}, Errors: ${errors}`;
    document.getElementById("race_output").textContent = `Produced: ${written}, Consumed: ${read}, Conflicts: ${conflicts}, Errors: ${errors}`;
    const duration = Date.now() - start;
    const stats = channel.stats();
    const avgThroughput = duration > 0 ? written / (duration / 1000) : 0;
    diagSummary.peakThroughput = avgThroughput;
    diagSummary.avgThroughput = avgThroughput;
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
