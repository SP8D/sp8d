import { encode, decode } from './utils.js';

export function registerCorrectScenario({ createChannel, updateDiagnosticsDashboard, diagSummary, diagTestActive }) {
  window.runCorrectTest = async (btn) => {
    btn.disabled = true;
    const slots = 32, size = 80, N = 30;
    const sent = [], got = [];
    const { channel } = createChannel({ slots, slotSize: size, sweepTimeoutMs: 50 });
    for (let i = 0; i < N; i++) {
      const obj = { msg: i, rnd: Math.random() };
      sent.push(obj);
      channel.send(encode(obj, size));
    }
    let broken = null;
    const start = Date.now();
    for (let tr = 0; tr < 200 && got.length < N && !broken; tr++) {
      let out;
      while ((out = channel.recv())) {
        const obj = decode(out);
        got.push(obj);
        const ref = sent[obj.msg];
        if (!ref || ref.rnd !== obj.rnd) broken = obj;
      }
      await new Promise((r) => setTimeout(r, 50));
    }
    document.getElementById("correct_result").innerHTML = broken
      ? '<span class="fail">FAIL — Data Corruption!</span>'
      : got.length === N
      ? '<span class="success">PASS — All messages correct!</span>'
      : '<span class="fail">FAIL — Message Loss</span>';
    document.getElementById("correct_output").textContent =
      `Sent: ${N}, Received: ${got.length}, Fail? ${broken ? JSON.stringify(broken) : "No"}` +
      (broken ? `\nMISMATCH: got ${JSON.stringify(broken)} expected rnd=${sent[broken.msg] && sent[broken.msg].rnd}` : "");
    const duration = Date.now() - start;
    const stats = channel.stats();
    const avgThroughput = duration > 0 ? got.length / (duration / 1000) : 0;
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
