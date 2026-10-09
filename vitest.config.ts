import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "node",
    include: ["src/**/*.test.ts", "src/**/*.dom.test.tsx"],
    environmentMatchGlobs: [["**/*.dom.test.tsx", "jsdom"]],
  },
});
