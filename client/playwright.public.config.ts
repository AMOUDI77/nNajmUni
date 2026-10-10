import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e",
  testMatch: "public.spec.ts",
  workers: 1,
  retries: 0,
  timeout: 60000,
  use: {
    baseURL: "http://127.0.0.1:5179",
    viewport: { width: 1440, height: 1000 },
    launchOptions:
      process.platform === "win32"
        ? {
            executablePath:
              "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
          }
        : {},
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5179 --strictPort",
      url: "http://127.0.0.1:5179",
      env: { NAJMUNI_DEV_API_TARGET: "http://127.0.0.1:5091" },
      reuseExistingServer: true,
    },
    {
      command:
        process.platform === "win32"
          ? "..\\.venv\\Scripts\\python.exe tests/public_e2e_server.py"
          : "../.venv/bin/python tests/public_e2e_server.py",
      cwd: "../server",
      url: "http://127.0.0.1:5091/api/health",
      reuseExistingServer: true,
    },
  ],
});
