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
    div.setAttribute("role", "option");
    div.setAttribute("aria-selected", "false");
    div.setAttribute("tabindex", "-1"); // Not individually tabbable, track is.

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
  carouselTrack.innerHTML = ""; // Clear existing before render
  testCases.forEach((tc) => carouselTrack.appendChild(createTestCase(tc)));

  // === Carousel Logic: New Clean-Slate Implementation ===

  const prevButtonEl = document.getElementById("carousel-prev");
  const nextButtonEl = document.getElementById("carousel-next");
  const cardElements = Array.from(carouselTrack.querySelectorAll(".testcase"));
  let activeCardIndex = 0;
  let hashUpdateDebounceTimer;
  let scrollDebounceTimer;

  function getCardPlaceholderOutput(cardId) {
    switch (cardId) {
      case "live-high-throughput-stress":
        return "Duration: - ms\nLost: -";
      case "slot-reclamation-stale-job-handling":
        return "Reclaimed: -, Errors: - Free slots after: -";
      case "race-condition-conflict-resolution":
        return "Produced: -, Consumed: -, Conflicts: -, Errors: -";
      case "protocol-correctness-data-integrity":
        return "Sent: -, Received: -";
      case "slot-generation-cycle-tag-wraparound":
        return "Cycles: -, Errors: -, Final Gen: -, Protocol Error: -";
      case "dos-flood-resilience":
        return "Duration: - ms\nTimeouts: -";
      default:
        return "-";
    }
  }

  function resetCardResults(cardElement) {
    if (!cardElement) return;
    const metricEl = cardElement.querySelector(".metric");
    const outputEl = cardElement.querySelector(".live-output");
    const runBtn = cardElement.querySelector(".runbtn");

    if (metricEl) {
      metricEl.textContent = "Not run";
      metricEl.classList.remove("success", "fail");
    }
    if (outputEl) {
      outputEl.textContent = getCardPlaceholderOutput(cardElement.id);
    }
    if (runBtn) {
      runBtn.disabled = false; // Re-enable run button
    }
    // Also reset global diagnostics display
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
  }

  function updateChevronStates() {
    prevButtonEl.disabled = activeCardIndex === 0;
    nextButtonEl.disabled = activeCardIndex === cardElements.length - 1;
  }

  function debouncedUpdateUrlHash(cardId) {
    clearTimeout(hashUpdateDebounceTimer);
    hashUpdateDebounceTimer = setTimeout(() => {
      // Only update if the card is still the active one,
      // to prevent race conditions with rapid interactions.
      if (
        cardElements[activeCardIndex] &&
        cardElements[activeCardIndex].id === cardId
      ) {
        history.replaceState(null, "", `#${cardId}`);
      }
    }, 250); // Debounce time for hash update
  }

  function setActiveCard(newIndex, options = {}) {
    const {
      updateHash = true,
      smoothScroll = true,
      focusTrack = false,
      isScrollEvent = false, // Indicates if triggered by scroll/swipe
    } = options;

    if (newIndex < 0 || newIndex >= cardElements.length) {
      return; // Index out of bounds
    }

    // If not a scroll event and index is same, do nothing unless forced (e.g. initial load)
    if (!isScrollEvent && newIndex === activeCardIndex && !options.force) {
      return;
    }

    abortCurrentTest(); // Abort any test running on the outgoing card

    // Update ARIA attributes for the outgoing card
    if (cardElements[activeCardIndex]) {
      cardElements[activeCardIndex].setAttribute("aria-selected", "false");
    }

    const oldIndex = activeCardIndex;
    activeCardIndex = newIndex;
    const newActiveCard = cardElements[activeCardIndex];

    if (!newActiveCard) return;

    newActiveCard.setAttribute("aria-selected", "true");

    // Reset results for the NEWLY active card
    // This should happen BEFORE scrolling into view if possible, or ensure it looks clean.
    resetCardResults(newActiveCard);

    // Scroll into view
    // Only programmatically scroll if not triggered by a user scroll event that already positioned the card
    if (!isScrollEvent) {
      newActiveCard.scrollIntoView({
        behavior: smoothScroll ? "smooth" : "auto",
        block: "nearest", // Ensures the whole card is visible
        inline: "center", // Aligns to the center of the scroll container
      });
    }

    if (updateHash) {
      debouncedUpdateUrlHash(newActiveCard.id);
    }

    updateChevronStates();

    if (focusTrack) {
      carouselTrack.focus({ preventScroll: true }); // preventScroll if already handled
    }
  }

  function handleKeyDown(event) {
    let newIndex = activeCardIndex;
    let shouldPreventDefault = true;

    switch (event.key) {
      case "ArrowLeft":
        newIndex = activeCardIndex - 1;
        break;
      case "ArrowRight":
        newIndex = activeCardIndex + 1;
        break;
      case "Home":
        newIndex = 0;
        break;
      case "End":
        newIndex = cardElements.length - 1;
        break;
      default:
        shouldPreventDefault = false; // Don't prevent default for other keys
    }

    if (shouldPreventDefault) {
      event.preventDefault();
      if (newIndex !== activeCardIndex) {
        // Avoid re-setting if already at boundary
        setActiveCard(newIndex, {
          smoothScroll: true,
          focusTrack: true,
          updateHash: true,
        });
      }
    }
  }

  function handleScroll() {
    clearTimeout(scrollDebounceTimer);
    scrollDebounceTimer = setTimeout(() => {
      if (!cardElements.length) return;

      const trackRect = carouselTrack.getBoundingClientRect();
      const trackCenter = trackRect.left + trackRect.width / 2;

      let closestCardIndex = -1;
      let minDistance = Infinity;

      cardElements.forEach((card, index) => {
        const cardRect = card.getBoundingClientRect();
        // Calculate the distance from the center of the card to the center of the track
        const cardCenter = cardRect.left + cardRect.width / 2;
        const distance = Math.abs(trackCenter - cardCenter);

        if (distance < minDistance) {
          minDistance = distance;
          closestCardIndex = index;
        }
      });

      // Check if the closest card is sufficiently "snapped" (e.g., within a certain tolerance of the center)
      // This helps avoid premature updates while scrolling fast.
      // A simple check: if the closest card's center is within, say, 1/4 of its width from the track center.
      if (closestCardIndex !== -1 && cardElements[closestCardIndex]) {
        const cardWidth = cardElements[closestCardIndex].offsetWidth;
        if (minDistance < cardWidth / 4) {
          // Tolerance for snapping
          if (closestCardIndex !== activeCardIndex) {
            setActiveCard(closestCardIndex, {
              updateHash: true,
              smoothScroll: false, // Scroll already happened
              isScrollEvent: true,
              focusTrack: false,
            });
          }
        }
      }
    }, 150); // Debounce scroll handler
  }

  // Initial Setup
  if (cardElements.length > 0) {
    const hashId = window.location.hash.substring(1);
    let initialIndex = 0;
    if (hashId) {
      const foundIndex = testCases.findIndex((tc) => tc.id === hashId);
      if (foundIndex !== -1) {
        initialIndex = foundIndex;
      }
    }
    // Force initial card setup, even if index is 0
    setActiveCard(initialIndex, {
      updateHash: false,
      smoothScroll: false,
      force: true,
    });
  } else {
    updateChevronStates(); // Handle empty carousel case
  }

  prevButtonEl.addEventListener("click", () =>
    setActiveCard(activeCardIndex - 1, {
      updateHash: true,
      smoothScroll: true,
      focusTrack: false,
    })
  );
  nextButtonEl.addEventListener("click", () =>
    setActiveCard(activeCardIndex + 1, {
      updateHash: true,
      smoothScroll: true,
      focusTrack: false,
    })
  );
  carouselTrack.addEventListener("keydown", handleKeyDown);
  carouselTrack.addEventListener("scroll", handleScroll, { passive: true });
});
