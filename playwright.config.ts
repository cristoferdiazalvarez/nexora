import { defineConfig } from "@playwright/test";
import { existsSync } from "node:fs";
const chrome = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const executablePath =
  process.env.CHROME_PATH ||
  (process.platform === "darwin" && existsSync(chrome) ? chrome : undefined);
export default defineConfig({
  testDir: "e2e",
  timeout: 90000,
  workers: 1,
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:5173",
    launchOptions: { executablePath },
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer:
    process.env.E2E_START_SERVERS === "1"
      ? [
          {
            command: "node apps/api/dist/server.js",
            url: "http://127.0.0.1:4000/api/health",
            reuseExistingServer: !process.env.CI,
            timeout: 30000,
          },
          {
            command: "npm run preview -w apps/web",
            url: "http://127.0.0.1:5173",
            reuseExistingServer: !process.env.CI,
            timeout: 30000,
          },
        ]
      : undefined,
  reporter: [["list"], ["json", { outputFile: "test-results/results.json" }]],
});
