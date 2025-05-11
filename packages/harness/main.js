import { registerAllScenarios } from "./scenarios/index.js";
import { createChannel } from "/sp8d-core.js";
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

// Clean-slate carousel and card rendering logic

document.addEventListener("DOMContentLoaded", () => {
  // === Test Card Rendering Utilities ===
  const testCases = [
    {
      id: "live-high-throughput-stress",
      title: "1. <b>Live High-Throughput Stress</b>",
      scenario:
        "Simulates 5,000 message events between async producer and consumer, measuring actual messages processed and time to completion.",
      why: "Legacy <code>postMessage</code> or event bus patterns collapse well below this throughput. Real data science copilots require <b>thousands/sec without UI freezes</b>.",
      metricId: "stress_result",
      outputId: "stress_output",
      runHandler: (abortObj) =>
        window.runStressTest &&
        window.runStressTest(
          document
            .getElementById("live-high-throughput-stress")
            .querySelector(".runbtn"),
          abortObj
        ),
      keyMetric: "throughput, no missed/lost messages, no lag.",
    },
    {
      id: "slot-reclamation-stale-job-handling",
      title: "2. <b>Slot Reclamation & Stale-Job Handling</b>",
      scenario:
        "Intentionally abandons some job slots to see if protocol reclaims memory/slots automatically.",
      why: "This is vital for long-running browser sessions—leaks or stuck jobs can creep in and kill reliability.",
      metricId: "reclaim_result",
      outputId: "reclaim_output",
      runHandler: (abortObj) =>
        window.runReclaimTest &&
        window.runReclaimTest(
          document
            .getElementById("slot-reclamation-stale-job-handling")
            .querySelector(".runbtn"),
          abortObj
        ),
      keyMetric: "Reclaimed slot count, protocol recovery visible in logs.",
    },
    {
      id: "race-condition-conflict-resolution",
      title: "3. <b>Race Condition & Conflict Resolution</b>",
      scenario:
        "Multiple producers and consumers hammer the shared channel, purposely colliding on slots.",
      why: "Race bugs in message-passing systems are the #1 hidden browser reliability risk. SP8D must resolve conflicts cleanly.",
      metricId: "race_result",
      outputId: "race_output",
      runHandler: (abortObj) =>
        window.runRaceTest &&
        window.runRaceTest(
          document
            .getElementById("race-condition-conflict-resolution")
            .querySelector(".runbtn"),
          abortObj
        ),
      keyMetric: "# of resolved conflicts and error count.",
    },
    {
      id: "protocol-correctness-data-integrity",
      title: "4. <b>Protocol Correctness & Data Integrity</b>",
      scenario:
        "Sends randomized messages and checks every output for corruption, order, duplicates, or loss.",
      why: "Real-world browsers lose/corrupt data under stress if protocol is weak—financial workflows can't tolerate this.",
      metricId: "correct_result",
      outputId: "correct_output",
      runHandler: (abortObj) =>
        window.runCorrectTest &&
        window.runCorrectTest(
          document
            .getElementById("protocol-correctness-data-integrity")
            .querySelector(".runbtn"),
          abortObj
        ),
      keyMetric: "end-to-end message correctness, reports first failure.",
    },
    {
      id: "slot-generation-cycle-tag-wraparound",
      title: "5. <b>Slot Generation/Cycle Tag Wraparound</b>",
      scenario:
        "Repeatedly fills and drains a slot to force the slot generation/cycle tag (Gen/Cycle Byte) to wrap from 255 to 0.",
      why: "Ensures protocol correctness and no message loss or corruption even after many cycles, validating the slot generation logic.",
      metricId: "gencycle_result",
      outputId: "gencycle_output",
      runHandler: (abortObj) =>
        window.runGenCycleWrapTest &&
        window.runGenCycleWrapTest(
          document
            .getElementById("slot-generation-cycle-tag-wraparound")
            .querySelector(".runbtn"),
          abortObj
        ),
      keyMetric: "No protocol errors, all slots healthy after wraparound.",
    },
    {
      id: "dos-flood-resilience",
      title: "6. <b>DoS/Flood Resilience</b>",
      scenario:
        "Floods the channel with 50,000+ messages as fast as possible, simulating a denial-of-service or buggy producer.",
      why: "Validates protocol stability, error handling, and resource usage under extreme load. Ensures no crash, memory leak, or starvation of legitimate consumers.",
      metricId: "dos_result",
      outputId: "dos_output",
      runHandler: (abortObj) =>
        window.runDosTest &&
        window.runDosTest(
          document
            .getElementById("dos-flood-resilience")
            .querySelector(".runbtn"),
          abortObj
        ),
      keyMetric: "No crash, no memory leak, no starvation, error count.",
    },
  ];

  // Global test run state for abort/cancel support
  let currentTestRun = {
    id: null,
    abort: null, // function to abort/cancel the test
  };

  function abortCurrentTest() {
    if (currentTestRun.abort) {
      currentTestRun.abort();
      currentTestRun.abort = null;
    }
    currentTestRun.id = null;
    // Re-enable all run buttons in case a test was aborted
    document
      .querySelectorAll(".runbtn")
      .forEach((btn) => (btn.disabled = false));
  }

  function createTestCase({
    id,
    title,
    scenario,
    why,
    metricId,
    outputId,
    runHandler,
    keyMetric,
  }) {
    // Provide scenario-specific output placeholders
    let outputPlaceholder = "";
    switch (id) {
      case "live-high-throughput-stress":
        outputPlaceholder = "Duration: - ms\nLost: -";
        break;
      case "slot-reclamation-stale-job-handling":
        outputPlaceholder = "Reclaimed: -, Errors: - Free slots after: -";
        break;
      case "race-condition-conflict-resolution":
        outputPlaceholder = "Produced: -, Consumed: -, Conflicts: -, Errors: -";
        break;
      case "protocol-correctness-data-integrity":
        outputPlaceholder = "Sent: -, Received: -";
        break;
      case "slot-generation-cycle-tag-wraparound":
        outputPlaceholder =
          "Cycles: -, Errors: -, Final Gen: -, Protocol Error: -";
        break;
      case "dos-flood-resilience":
        outputPlaceholder = "Duration: - ms\nTimeouts: -";
        break;
      default:
        outputPlaceholder = "-";
    }
    const div = document.createElement("div");
    div.className = "testcase";
    div.id = id;
    div.innerHTML = `
      <div class="testcase-header">
        <h2>${title}</h2>
        <button class="runbtn">▶ Run</button>
      </div>
      <div class="test-desc">
        <b>Scenario:</b> ${scenario}<br />
        <b>Why It Matters:</b> ${why}
      </div>
      <div class="metricbar">
        <span class="metric" id="${metricId}">Not run</span>
      </div>
      <div class="live-output" id="${outputId}">${outputPlaceholder}</div>
      <div class="case-footer">Key metric: ${keyMetric}</div>
    `;
    const runBtn = div.querySelector(".runbtn");
    runBtn.onclick = () => {
      abortCurrentTest(); // Abort any previous test
      // Set metric bar to 'Running…' immediately
      const metric = div.querySelector(".metric");
      if (metric) metric.textContent = "Running…";
      // Create a cancel flag for this test
      let aborted = false;
      currentTestRun = {
        id,
        abort: () => {
          aborted = true;
        },
      };
      // Wrap the runHandler to pass abort/cancel support
      runHandler({
        isAborted: () => aborted,
        onAbort: (cb) => {
          currentTestRun.abort = () => {
            aborted = true;
            cb && cb();
          };
        },
      });
    };
    return div;
  }

  // Render test cases into the carousel-track
  const carouselTrack = document.getElementById("carousel-track");
  carouselTrack.innerHTML = "";
  testCases.forEach((tc) => carouselTrack.appendChild(createTestCase(tc)));

  // === Carousel Logic: Clean-Slate Implementation ===
  (function setupCarousel() {
    const carouselContainer = document.querySelector(".carousel-container");
    const carouselTrack = document.getElementById("carousel-track");
    const prevBtn = document.getElementById("carousel-prev");
    let testCards = Array.from(carouselTrack.querySelectorAll(".testcase"));
    let currentIdx = 0;
    let resizeTimeout;

    // --- Sizing: Use only CSS for card sizing ---
    function setCardCSSWidths() {
      testCards = Array.from(carouselTrack.querySelectorAll(".testcase"));
      testCards.forEach((card) => {
        card.style.flex = "0 0 100%";
        card.style.width = "100%";
        card.style.maxWidth = "100%";
        card.style.minWidth = "100%";
        card.style.boxSizing = "border-box";
      });
      carouselTrack.style.scrollBehavior = "auto";
      // Only scroll to the first card if there is no hash in the URL
      if (!window.location.hash) {
        scrollToCard(currentIdx, false);
      }
      setTimeout(() => {
        carouselTrack.style.scrollBehavior = "smooth";
      }, 10);
    }

    // --- Scroll to a card by index using scrollIntoView ---
    function scrollToCard(idx, smooth = true, updateHash = true) {
      abortCurrentTest(); // Abort any running test on card switch
      // Preserve dashboard layout with placeholders
      const diagGlobal = document.getElementById("diag-global");
      if (diagGlobal) {
        diagGlobal.innerHTML = `
          <span class="metric">Peak Throughput: - msg/s</span>
          <span class="metric">Avg Throughput: - msg/s</span>
          <span class="metric">Max Lag: - ms</span>
          <span class="metric">Total Conflicts: -</span>
          <span class="metric">Total Errors: -</span>
          <span class="metric">Total Reclaimed: -</span>
          <span class="metric">Slots: -</span>
        `;
      }
      // Also reset all metricbars and live-outputs to placeholders for all test cases
      testCards = Array.from(carouselTrack.querySelectorAll(".testcase"));
      testCards.forEach(function (card) {
        const metric = card.querySelector(".metric");
        if (metric) {
          metric.textContent = "Not run";
        }
        const liveOutput = card.querySelector(".live-output");
        if (liveOutput) {
          // Set scenario-specific output placeholder
          switch (card.id) {
            case "live-high-throughput-stress":
              liveOutput.textContent = "Duration: - ms\nLost: -";
              break;
            case "slot-reclamation-stale-job-handling":
              liveOutput.textContent =
                "Reclaimed: -, Errors: - Free slots after: -";
              break;
            case "race-condition-conflict-resolution":
              liveOutput.textContent =
                "Produced: -, Consumed: -, Conflicts: -, Errors: -";
              break;
            case "protocol-correctness-data-integrity":
              liveOutput.textContent = "Sent: -, Received: -";
              break;
            case "slot-generation-cycle-tag-wraparound":
              liveOutput.textContent =
                "Cycles: -, Errors: -, Final Gen: -, Protocol Error: -";
              break;
            case "dos-flood-resilience":
              liveOutput.textContent = "Duration: - ms\nTimeouts: -";
              break;
            default:
              liveOutput.textContent = "-";
          }
        }
      });
      if (!testCards.length) return;
      currentIdx = (idx + testCards.length) % testCards.length;
      const card = testCards[currentIdx];
      if (!card) return;
      card.scrollIntoView({
        behavior: smooth ? "smooth" : "auto",
        block: "nearest",
        inline: "start",
      });
      if (updateHash) {
        // Update URL hash without scrolling
        history.replaceState(null, "", `#${card.id}`);
      }
    }

    // --- Arrow Button Handlers ---
    function showPrevCard() {
      scrollToCard(currentIdx - 1);
    }
    function showNextCard() {
      scrollToCard(currentIdx + 1);
    }

    // --- Initial Setup ---
    setCardCSSWidths();
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(setCardCSSWidths, 100);
    });
    prevBtn.addEventListener("click", showPrevCard);
    document
      .getElementById("carousel-next")
      .addEventListener("click", showNextCard);
    carouselTrack.addEventListener("wheel", (e) => {
      e.preventDefault();
      if (e.deltaY < 0) {
        showPrevCard();
      } else {
        showNextCard();
      }
    });
    // Initial scroll to the correct card based on URL hash
    const hash = window.location.hash.substring(1);
    if (hash) {
      const idx = testCases.findIndex((tc) => tc.id === hash);
      if (idx !== -1) {
        currentIdx = idx;
        scrollToCard(currentIdx, false);
      }
    }
  })();
});
