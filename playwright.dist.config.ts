import { defineConfig, devices } from "@playwright/test";

// Detect CI (Netlify or other)
const isCI = !!process.env.CI || !!process.env.NETLIFY;

/**
 * Playwright config:
 * - In CI: Chromium, Firefox (Edge/WebKit skipped due to Netlify limitations)
 * - Locally: Chromium, Firefox, WebKit, Edge
 */
export default defineConfig({
  testDir: "./packages/harness",
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 1 : undefined,
  reporter: "html",
  use: {
    trace: "on-first-retry",
  },
  projects: isCI
    ? [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "firefox", use: { ...devices["Desktop Firefox"] } },
      ]
    : [
        { name: "chromium", use: { ...devices["Desktop Chrome"] } },
        { name: "firefox", use: { ...devices["Desktop Firefox"] } },
        { name: "webkit", use: { ...devices["Desktop Safari"] } },
        {
          name: "Microsoft Edge",
          use: { ...devices["Desktop Edge"], channel: "msedge" },
        },
      ],
  webServer: {
    command: "npm run preview -w @sp8d/harness",
    url: "http://127.0.0.1:8080",
    reuseExistingServer: false,
  },
});
