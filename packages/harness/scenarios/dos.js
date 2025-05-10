import { encode } from "./utils.js";

export function registerDosScenario({
  createChannel,
  updateDiagnosticsDashboard,
  diagSummary,
  diagTestActive,
}) {
  console.log("[dos.js] registerDosScenario called");
  window.runDosTest = async (btn, { isAborted, onAbort } = {}) => {
    console.log("[dos.js] runDosTest triggered");
    btn.disabled = true;
    const N = 50000,
      slots = 16,
      size = 80;
    let processed = 0,
      sent = 0,
      timeouts = 0;
    const { channel } = createChannel({
      slots,
      slotSize: size,
      sweepTimeoutMs: 40,
    });
    const start = Date.now();
    let producerDone = false;
    // Producer: sendAsync in a loop, but yield and update UI every 1000
    const producer = (async () => {
      for (let i = 0; i < N; i++) {
        if (isAborted && isAborted()) return;
        const ok = await channel.sendAsync(encode({ i }), undefined, {
          timeoutMs: 10000,
        });
        if (!ok) timeouts++;
        sent++;
        if (i % 1000 === 0) {
          if (isAborted && isAborted()) return;
          document.getElementById(
            "dos_output"
          ).textContent = `Sent: ${sent}  Processed: ${processed}  Timeouts: ${timeouts}`;
          await new Promise((r) => setTimeout(r, 0));
        }
      }
      producerDone = true;
    })();
    // Consumer: drain as fast as possible, yield every 1000
    const consumer = (async () => {
      while (!producerDone || !channel.empty()) {
        if (isAborted && isAborted()) return;
        let msg;
        let localCount = 0;
        while ((msg = channel.recv())) {
          processed++;
          localCount++;
          if (localCount % 1000 === 0) {
            if (isAborted && isAborted()) return;
            document.getElementById(
              "dos_output"
            ).textContent = `Sent: ${sent}  Processed: ${processed}  Timeouts: ${timeouts}`;
          }
        }
        await new Promise((r) => setTimeout(r, 0));
      }
    })();
    await Promise.all([producer, consumer]);
    if (isAborted && isAborted()) return;
    const duration = Date.now() - start;
    document.getElementById("dos_result").innerHTML =
      (processed === N && timeouts === 0
        ? '<span class="success">PASS — '
        : '<span class="fail">FAIL — ') +
      `Processed ${processed}/${N} (${((processed / N) * 100).toFixed(
        1
      )}%)</span>`;
    document.getElementById(
      "dos_output"
    ).textContent = `Duration: ${duration} ms\nTimeouts: ${timeouts}`;
    const stats = channel.stats();
    diagSummary.peakThroughput = processed / (duration / 1000);
    diagSummary.avgThroughput = processed / (duration / 1000);
    diagSummary.maxLag = 0;
    diagSummary.totalConflicts = stats.conflicts;
    diagSummary.totalErrors = stats.errors + timeouts;
    diagSummary.totalReclaimed = stats.reclaimed;
    diagSummary.finalSlotState = [];
    diagSummary.slots = slots;
    diagTestActive.value = false;
    updateDiagnosticsDashboard();
    btn.disabled = false;
  };
}
