import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.dom.test.tsx"],
    environmentMatchGlobs: [["**/*.dom.test.tsx", "jsdom"]],
    coverage: {
      provider: "v8",
      include: ["src/domain/**/*.ts"],
      exclude: ["src/domain/**/*.test.ts", "src/domain/__fixtures__/**"],
      thresholds: {
        lines: 95,
        statements: 95,
        functions: 95,
        branches: 80,
      },
    },
  },
});
