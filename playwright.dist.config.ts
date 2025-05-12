import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./packages/harness",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    trace: "on-first-retry",
  },
  projects: [
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
