import { test, expect } from "@playwright/test";
import { testCases } from "./testcases.js";

// Helper: Ensure the test scenario is visible/active before running
async function ensureScenarioVisible(page, testId) {
  const scenarioSelector = `#${testId}`;
  const buttonSelector = `#${testId} .runbtn`;
  // Wait for carousel to render at least one card
  await page.waitForFunction(
    () => {
      const track = document.getElementById("carousel-track");
      return track && track.children.length > 0;
    },
    null,
    { timeout: 4000 }
  );
  // Wait for scenario to exist in DOM
  await page.waitForSelector(scenarioSelector, {
    state: "attached",
    timeout: 4000,
  });
  // Try up to 8s for aria-selected="true"
  const maxTries = 40;
  for (let i = 0; i < maxTries; i++) {
    const isSelected = await page.evaluate((sel) => {
      const el = document.querySelector(sel);
      return el && el.getAttribute("aria-selected") === "true";
    }, scenarioSelector);
    if (isSelected) {
      await page.waitForSelector(buttonSelector + ":not([disabled])", {
        state: "visible",
        timeout: 2000,
      });
      return;
    }
    // After 2s, force hash and dispatch event
    if (i === 10) {
      await page.evaluate((id) => {
        window.location.hash = "#" + id;
        window.dispatchEvent(new HashChangeEvent("hashchange"));
      }, testId);
    }
    await page.waitForTimeout(200);
  }
  const html = await page.content();
  console.log(
    `[DEBUG] Could not activate scenario ${testId}. Carousel HTML:\n`,
    html
  );
  throw new Error(`Could not activate scenario ${testId}`);
}

// Utility to run a test case by scrolling to it, clicking its button, and waiting for PASS or FAIL
async function runAndCheck(page, testId, resultSelector) {
  await ensureScenarioVisible(page, testId);
  const buttonSelector = `#${testId} .runbtn`;
  await Promise.all([
    page.waitForSelector(buttonSelector, { state: "visible", timeout: 2000 }),
    page.waitForSelector(resultSelector, { state: "attached", timeout: 2000 }),
  ]);
  await page.click(buttonSelector);
  // Wait for the result to change from "Not run" (adaptive, up to 10s)
  let resultText = await page.locator(resultSelector).textContent();
  if (/Not run/.test(resultText || "")) {
    try {
      await page.waitForFunction(
        (sel) => {
          const el = document.querySelector(sel);
          return el && el.textContent && !/Not run/.test(el.textContent);
        },
        resultSelector,
        { timeout: 10000 }
      );
    } catch (e) {
      console.log("[DEBUG] Page content:\n", await page.content());
      throw e;
    }
    resultText = await page.locator(resultSelector).textContent();
  }
  // Now wait for PASS or FAIL (up to 45s, but exit early if already set)
  if (!/PASS|FAIL/.test(resultText || "")) {
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        return el && el.textContent && /PASS|FAIL/.test(el.textContent);
      },
      resultSelector,
      { timeout: 45000 }
    );
    resultText = await page.locator(resultSelector).textContent();
  }
  const testCase = testCases.find(
    (tc) => tc.metricId === resultSelector.replace("#", "")
  );
  let displayTitle = resultSelector;
  if (testCase && testCase.title) {
    const match = testCase.title.match(/<b>(.*?)<\/b>/);
    if (match) displayTitle = match[1];
    else displayTitle = testCase.title.replace(/<.*?>/g, "");
  }
  const isPass = /PASS/.test(resultText || "");
  const color = isPass ? "\x1b[32m" : "\x1b[31m";
  const reset = "\x1b[0m";
  console.log(`${displayTitle}: ${color}${(resultText || "").trim()}${reset}`);
  if (!isPass) {
    console.error(`\x1b[31mTest failed: result was \"${resultText}\"\x1b[0m`);
    process.exit(1);
  }
  expect(resultText).toMatch(/PASS/);
}

test.describe("SP8D Advanced Edge Protocols", () => {
  const scenarios = [
    {
      id: "live-high-throughput-stress",
      result: "#stress_result",
      timeout: 20000,
    },
    {
      id: "slot-reclamation-stale-job-handling",
      result: "#reclaim_result",
      timeout: 20000,
    },
    {
      id: "race-condition-conflict-resolution",
      result: "#race_result",
      timeout: 20000,
    },
    {
      id: "protocol-correctness-data-integrity",
      result: "#correct_result",
      timeout: 20000,
    },
    {
      id: "slot-generation-cycle-tag-wraparound",
      result: "#gencycle_result",
      timeout: 30000,
    },
    { id: "dos-flood-resilience", result: "#dos_result", timeout: 45000 },
  ];

  for (const scenario of scenarios) {
    test(`${scenario.id}`, async ({ page }) => {
      test.setTimeout(scenario.timeout + 10000); // buffer for setup
      // Load the page with the hash for the scenario
      await page.goto(`http://localhost:8080/index.html#${scenario.id}`);
      await ensureScenarioVisible(page, scenario.id);
      await runAndCheck(page, scenario.id, scenario.result);
    });
  }
});
