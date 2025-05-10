export function registerGenCycleScenario({
  createChannel,
  updateDiagnosticsDashboard,
  diagSummary,
  diagTestActive,
}) {
  window.runGenCycleWrapTest = async (btn, { isAborted, onAbort } = {}) => {
    btn.disabled = true;
    const slots = 1,
      size = 32,
      cycles = 300;
    const { channel } = createChannel({
      slots,
      slotSize: size,
      sweepTimeoutMs: 20,
    });
    let errors = 0;
    let lastGen = null;
    for (let i = 0; i < cycles; i++) {
      if (isAborted && isAborted()) return;
      try {
        channel.send(new Uint8Array([i % 256]));
        const msg = channel.recv();
        if (!msg) throw new Error("No message received");
        const gen = channel.slotGeneration[0][0];
        if (lastGen !== null && ((lastGen + 2) & 0xff) !== gen) errors++;
        lastGen = gen;
      } catch (e) {
        errors++;
      }
      await new Promise((r) => setTimeout(r, 1));
    }
    if (isAborted && isAborted()) return;
    let protocolError = false;
    try {
      channel.validate();
    } catch (e) {
      protocolError = true;
    }
    const stats = channel.stats();
    document.getElementById("gencycle_result").innerHTML =
      !protocolError && errors === 0
        ? '<span class="success">PASS — '
        : '<span class="fail">FAIL — ' +
          `Cycles: ${cycles}, Errors: ${errors}${
            protocolError ? ", Protocol Error" : ""
          }</span>`;
    document.getElementById(
      "gencycle_output"
    ).textContent = `Cycles: ${cycles}, Errors: ${errors}, Final Gen: ${lastGen}, Protocol Error: ${protocolError}`;
    diagSummary.peakThroughput = 0;
    diagSummary.avgThroughput = 0;
    diagSummary.maxLag = 0;
    diagSummary.totalConflicts = stats.conflicts;
    diagSummary.totalErrors = stats.errors + errors + (protocolError ? 1 : 0);
    diagSummary.totalReclaimed = stats.reclaimed;
    diagSummary.finalSlotState = channel.slotStatus
      ? [{ status: channel.slotStatus[0][0] }]
      : [];
    diagSummary.slots = slots;
    diagTestActive.value = false;
    updateDiagnosticsDashboard();
    btn.disabled = false;
  };
}
