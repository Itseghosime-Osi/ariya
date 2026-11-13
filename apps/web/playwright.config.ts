import { defineConfig, devices } from "@playwright/test";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Ignore in CI where env vars are set directly
}

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Firefox and WebKit run only the cross-browser export check, and only when asked for
    // (CROSS_BROWSER=1), so the main suite stays on Chromium.
    ...(process.env.CROSS_BROWSER
      ? [
          {
            name: "firefox",
            testMatch: /designer-export-names\.spec\.ts/,
            use: { ...devices["Desktop Firefox"] },
          },
          {
            name: "webkit",
            testMatch: /designer-export-names\.spec\.ts/,
            use: { ...devices["Desktop Safari"] },
          },
        ]
      : []),
  ],
  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120 * 1000,
    env: {
      PAYSTACK_API_BASE: "http://127.0.0.1:57328",
    },
  },
});
