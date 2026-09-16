import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    include: ["src/crm/**/*.test.tsx", "src/crm/**/*.test.ts"],
    setupFiles: ["./src/crm/test-setup.ts"],
  },
});
