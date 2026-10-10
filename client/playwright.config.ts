import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  use: {
    baseURL: "http://127.0.0.1:5088",
    viewport: { width: 1600, height: 1000 },
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      process.platform === "win32"
        ? "..\\.venv\\Scripts\\python.exe tests/e2e_server.py"
        : "../.venv/bin/python tests/e2e_server.py",
    cwd: "../server",
    url: "http://127.0.0.1:5088/api/health",
    reuseExistingServer: false,
    timeout: 60000,
  },
});
