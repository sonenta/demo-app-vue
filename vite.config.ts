import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Backend interim unblock (CORS is a tracked launch-critical backend
// fix): proxy /v1/feedback/* to the provisioned demo API so opt-in live
// mode (VITE_FEEDBACK_LIVE=1) calls SAME-ORIGIN and sidesteps CORS in
// local dev. Dev/preview only — never affects the static production
// build (default mode uses the canned demoFetch, zero network).
const feedbackProxy = {
  "/v1/feedback": {
    target: "http://localhost:8820",
    changeOrigin: true,
  },
};

export default defineConfig(({ command }) => ({
  // Served as a sub-app under verbumia.ca/demos/vue/ in production
  // (rsync target /data/clients/verbumia.ca/www/demos/vue, nginx SPA
  // fallback owned by the website peer). Dev keeps root for vite preview
  // + Vercel preview deploys.
  base: command === "build" ? "/demos/vue/" : "/",
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      "@verbumia/vue-i18n": path.resolve(
        __dirname,
        "src/sdk/verbumia-vue-i18n.ts",
      ),
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: { proxy: feedbackProxy },
  preview: { proxy: feedbackProxy },
}));
