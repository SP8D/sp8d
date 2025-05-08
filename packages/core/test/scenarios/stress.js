import { encode } from './utils.js';

export function registerStressScenario({ createChannel, updateDiagnosticsDashboard, diagSummary, diagTestActive }) {
  window.runStressTest = async (btn) => {
    btn.disabled = true;
    const N = 5000,
      slots = 16,
      size = 80;
    let processed = 0,
      sent = 0;
    const { channel } = createChannel({
      slots,
      slotSize: size,
      sweepTimeoutMs: 40,
    });
    const start = Date.now();
    const prod = setInterval(() => {
      for (let tries = 0; tries < 100 && sent < N; tries++)
        if (channel.send(encode({ i: sent }))) sent++;
    }, 0);
    const cons = setInterval(() => {
      let msg;
      while ((msg = channel.recv())) processed++;
    }, 0);
    const timeout = 2500,
      t0 = Date.now();
    while (processed < N && Date.now() - t0 < timeout)
      await new Promise((r) => setTimeout(r, 10));
    clearInterval(prod);
    clearInterval(cons);
    const duration = Date.now() - start;
    document.getElementById("stress_result").innerHTML =
      (processed === N
        ? '<span class="success">PASS — '
        : '<span class="fail">FAIL — ') +
      `Processed ${processed}/${N} (${((processed / N) * 100).toFixed(
        1
      )}%)</span>`;
    document.getElementById(
      "stress_output"
    ).textContent = `Duration: ${duration} ms\nLost: ${N - processed}`;
    const stats = channel.stats();
    const avgThroughput = duration > 0 ? processed / (duration / 1000) : 0;
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
