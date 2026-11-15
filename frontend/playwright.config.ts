import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 20000 },
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    channel: "chrome",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    viewport: { width: 1512, height: 1100 },
  },
  webServer: [
    {
      command:
        process.platform === "win32" ? "..\\backend\\.venv\\Scripts\\python.exe -m uvicorn main:app --app-dir ..\\backend --host 127.0.0.1 --port 8000" : "../backend/.venv/bin/python -m uvicorn main:app --app-dir ../backend --host 127.0.0.1 --port 8000",
      url: "http://localhost:8000/health",
      reuseExistingServer: true,
      timeout: 30000,
    },
    {
      // CI builds the app before Playwright runs. Serving that build avoids a
      // second, cold development compilation competing with the browser tests.
      command: process.env.CI
        ? "npm run start -- --hostname 127.0.0.1"
        : "npm run dev -- --hostname 127.0.0.1",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 90000,
    },
  ],
});
