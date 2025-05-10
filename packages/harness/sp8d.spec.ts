import { test, expect } from "@playwright/test";
import { testCases } from "./testcases.js";

// Utility to run a test case by scrolling to it, clicking its button, and waiting for PASS or FAIL
async function runAndCheck(page, testId, resultSelector) {
  // Scroll to the test using hash navigation
  await page.evaluate((id) => {
    window.location.hash = "#" + id;
  }, testId);
  // Wait for the button to be visible before clicking
  const buttonSelector = `#${testId} .runbtn`;
  await page.waitForSelector(buttonSelector, {
    state: "visible",
    timeout: 7000,
  });
  // Wait for the result element to exist
  await page.waitForSelector(resultSelector, {
    state: "attached",
    timeout: 7000,
  });
  await page.click(buttonSelector);
  // Wait for the result to change from "Not run"
  try {
    await page.waitForFunction(
      (sel) => {
        const el = document.querySelector(sel);
        return el && el.textContent && !/Not run/.test(el.textContent);
      },
      resultSelector,
      { timeout: 45000 }
    );
  } catch (e) {
    // Output page content for debugging if wait fails
    console.log("[DEBUG] Page content:\n", await page.content());
    throw e;
  }
  // Now wait for PASS or FAIL
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return el && el.textContent && /PASS|FAIL/.test(el.textContent);
    },
    resultSelector,
    { timeout: 45000 }
  );
  const resultText = await page.locator(resultSelector).innerText();
  const testCase = testCases.find(
    (tc) => tc.metricId === resultSelector.replace("#", "")
  );
  let displayTitle = resultSelector;
  if (testCase && testCase.title) {
    const match = testCase.title.match(/<b>(.*?)<\/b>/);
    if (match) displayTitle = match[1];
    else displayTitle = testCase.title.replace(/<.*?>/g, "");
  }
  // Print the result for debugging (minimal, single-line, colorized)
  const isPass = /PASS/.test(resultText);
  const color = isPass ? "\x1b[32m" : "\x1b[31m"; // green or red
  const reset = "\x1b[0m";
  console.log(`${displayTitle}: ${color}${resultText.trim()}${reset}`);
  // If FAIL, exit the process immediately for CI robustness
  if (!isPass) {
    console.error(`\x1b[31mTest failed: result was "${resultText}"\x1b[0m`);
    process.exit(1);
  }
  expect(resultText).toMatch(/PASS/);
}

test("SP8D Advanced Edge Protocols", async ({ page }) => {
  test.setTimeout(60000); // 60 seconds for the whole test suite

  // Remove browser console and page error debug logs for publish-ready code
  await page.goto("http://localhost:8080/index.html");
  // Run each test case and check for PASS
  await runAndCheck(page, "live-high-throughput-stress", "#stress_result");
  await runAndCheck(
    page,
    "slot-reclamation-stale-job-handling",
    "#reclaim_result"
  );
  await runAndCheck(page, "race-condition-conflict-resolution", "#race_result");
  await runAndCheck(
    page,
    "protocol-correctness-data-integrity",
    "#correct_result"
  );
  await runAndCheck(
    page,
    "slot-generation-cycle-tag-wraparound",
    "#gencycle_result"
  );
  await runAndCheck(page, "dos-flood-resilience", "#dos_result");
});
