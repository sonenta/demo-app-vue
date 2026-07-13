import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";

// Headless SDK proofs — jsdom, no browser, no network (see tests/sdk-harness.ts).
export default defineConfig({
  plugins: [vue()],
  test: { environment: "jsdom", include: ["tests/**/*.test.ts"] },
});
