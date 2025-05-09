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

// === Carousel Logic ===
(function setupCarousel() {
  const dashboard = document.getElementById("diagnostics-dashboard");
  const testsSection = document.querySelector(".tests");
  const carouselTrack = document.getElementById("carousel-track");
  const prevBtn = document.getElementById("carousel-prev");
  const nextBtn = document.getElementById("carousel-next");
  let testCards = [];
  let cardWidth = 0,
    peekWidth = 0,
    currentIdx = 0,
    resizeTimeout;

  // Move test cards into carousel and cache
  function cacheTestCards() {
    testCards = Array.from(testsSection.querySelectorAll(".testcase"));
    testCards.forEach((card) => carouselTrack.appendChild(card));
    testsSection.style.display = "none";
  }

  function setCardWidths() {
    const dashRect = dashboard.getBoundingClientRect();
    cardWidth = Math.round(dashRect.width);
    peekWidth = Math.max(80, Math.min(180, Math.round(cardWidth / 3)));
    carouselTrack.style.paddingLeft = peekWidth + "px";
    carouselTrack.style.paddingRight = peekWidth + "px";
    testCards.forEach((card) => {
      card.style.width = cardWidth + "px";
      card.style.maxWidth = cardWidth + "px";
      card.style.minWidth = cardWidth + "px";
    });
  }

  function scrollToCard(idx, smooth = true) {
    if (!testCards.length) return;
    currentIdx = (idx + testCards.length) % testCards.length;
    const card = testCards[currentIdx];
    if (!card) return;
    const left = card.offsetLeft - peekWidth;
    carouselTrack.scrollTo({ left, behavior: smooth ? "smooth" : "auto" });
    setTimeout(() => {
      card.setAttribute("tabindex", "0");
      card.focus({ preventScroll: true });
      testCards.forEach((c, i) => {
        if (i !== currentIdx) c.removeAttribute("tabindex");
      });
    }, 350);
  }
  window.scrollToCard = scrollToCard;

  function handleChevronNav(direction) {
    scrollToCard(currentIdx + direction);
  }

  function handleChevronKey(e, direction) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleChevronNav(direction);
    }
  }

  function handleTrackKey(e) {
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      handleChevronNav(-1);
    }
    if (e.key === "ArrowRight") {
      e.preventDefault();
      handleChevronNav(1);
    }
  }

  function handleTrackFocus() {
    if (testCards.length) testCards[currentIdx].focus();
  }

  function updateSizes() {
    setCardWidths();
    scrollToCard(currentIdx, false);
  }

  // Attach all event listeners in a single reusable function
  function attachCarouselEvents() {
    prevBtn.addEventListener("click", () => handleChevronNav(-1));
    nextBtn.addEventListener("click", () => handleChevronNav(1));
    prevBtn.addEventListener("keydown", (e) => handleChevronKey(e, -1));
    nextBtn.addEventListener("keydown", (e) => handleChevronKey(e, 1));
    carouselTrack.addEventListener("keydown", handleTrackKey);
    carouselTrack.setAttribute("tabindex", "0");
    carouselTrack.addEventListener("focus", handleTrackFocus);
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(updateSizes, 100);
    });
  }

  // Init
  cacheTestCards();
  updateSizes();
  scrollToCard(0, false);
  attachCarouselEvents();
})();

// === Hash-based carousel navigation ===
(function enableHashScroll() {
  // Optionally map certain hashes to a different card index for business logic.
  const hashToIndex = {};
  function getCardIndexFromHash(hash) {
    const carouselTrack = document.getElementById("carousel-track");
    const testCards = Array.from(carouselTrack.querySelectorAll(".testcase"));
    if (hashToIndex.hasOwnProperty(hash)) {
      const idx = hashToIndex[hash];
      if (typeof idx === "number" && idx >= 0 && idx < testCards.length)
        return idx;
    }
    // Fallback: find card by ID
    const card = document.getElementById(hash);
    if (card && card.classList.contains("testcase")) {
      return testCards.indexOf(card);
    }
    return -1;
  }
  function scrollToHashTest() {
    const hash = window.location.hash.replace("#", "");
    if (!hash) return;
    let attempts = 0;
    function tryScroll() {
      const idx = getCardIndexFromHash(hash);
      if (typeof window.scrollToCard === "function" && idx >= 0) {
        window.scrollToCard(idx, true);
        return;
      }
      if (++attempts < 30) setTimeout(tryScroll, 50);
    }
    tryScroll();
  }
  // Attach all hash navigation events in a single reusable function
  function attachHashEvents() {
    window.addEventListener("hashchange", scrollToHashTest);
    window.addEventListener("DOMContentLoaded", scrollToHashTest);
    window.addEventListener("load", scrollToHashTest);
  }
  attachHashEvents();
})();
