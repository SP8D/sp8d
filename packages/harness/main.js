import { registerAllScenarios } from "./scenarios/index.js";
import { encode, decode } from "./scenarios/utils.js";
import { createChannel } from "/core/sp8d-core.js";
// Shared state for scenarios
const diagSummary = {};
const diagTestActive = { value: false };
window.diagSummary = diagSummary;
// Dashboard update implementation
function updateDiagnosticsDashboard() {
  const diag = window.diagSummary || {};
  const el = document.getElementById("diag-global");
  if (!el) return;
  el.innerHTML = `
    <span class="metric">Peak Throughput: ${
      diag.peakThroughput !== undefined ? Math.round(diag.peakThroughput) : "-"
    } msg/s</span>
    <span class="metric">Avg Throughput: ${
      diag.avgThroughput !== undefined ? Math.round(diag.avgThroughput) : "-"
    } msg/s</span>
    <span class="metric">Max Lag: ${diag.maxLag ?? "-"} ms</span>
    <span class="metric">Total Conflicts: ${diag.totalConflicts ?? "-"}</span>
    <span class="metric">Total Errors: ${diag.totalErrors ?? "-"}</span>
    <span class="metric">Total Reclaimed: ${diag.totalReclaimed ?? "-"}</span>
    <span class="metric">Slots: ${diag.slots ?? "-"}</span>
  `;
  // Slot grid visualisation (optional, only if slot state is present)
  const slotGrid = document.getElementById("diag-slotgrid");
  if (slotGrid && diag.finalSlotState && Array.isArray(diag.finalSlotState)) {
    slotGrid.innerHTML = diag.finalSlotState
      .map((slot, i) => {
        let color = "#e2e6ee";
        if (slot.status === 1) color = "#e04446"; // claimed
        else if (slot.status === 2) color = "#19c37d"; // ready
        else if (slot.status === 0) color = "#b3b7be"; // empty
        return `<div style="width:18px;height:18px;border-radius:3px;background:${color};border:1px solid #ccc;display:inline-block;margin:1px;" title="Slot ${i}: status ${slot.status}"></div>`;
      })
      .join("");
  }
}
// Register all scenarios
registerAllScenarios({
  createChannel,
  updateDiagnosticsDashboard,
  diagSummary,
  diagTestActive,
});
// Initial dashboard update
updateDiagnosticsDashboard();
