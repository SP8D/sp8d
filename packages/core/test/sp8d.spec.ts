import { test, expect } from "@playwright/test";

// Utility to run a test case by clicking its button and waiting for PASS or FAIL
async function runAndCheck(page, buttonSelector, resultSelector) {
  await page.click(buttonSelector);
  // Wait for the result to change from "Not run"
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return el && el.textContent && !/Not run/.test(el.textContent);
    },
    resultSelector,
    { timeout: 15000 }
  );
  // Now wait for PASS or FAIL
  const resultText = await page.locator(resultSelector).innerText();
  expect(resultText).toMatch(/PASS/);
}

test("SP8D Advanced Edge Protocols", async ({ page }) => {
  await page.goto("http://localhost:8080/index.html");
  // Run each test case and check for PASS
  await runAndCheck(page, "#case1 .runbtn", "#stress_result");
  await runAndCheck(page, "#case2 .runbtn", "#reclaim_result");
  await runAndCheck(page, "#case3 .runbtn", "#race_result");
  await runAndCheck(page, "#case4 .runbtn", "#correct_result");
  await runAndCheck(page, "#case5 .runbtn", "#gencycle_result");
});
