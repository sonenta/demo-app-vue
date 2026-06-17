import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { SonentaPlugin } from "@local/vue-i18n";
import { missingStore } from "./state/missing-store";
import "./index.css";

const app = createApp(App);

app.use(router);

app.use(SonentaPlugin, {
  // Canonical shared demo project (slug "demo-public"); the real CDN bundles
  // live under this UUID. Cosmetic here since the demo serves LOCAL locales
  // (cdnUrl below), but kept canonical + in sync with feedback.ts. apiKey is
  // a placeholder — demo-public CDN bundles are public, no auth (per backend).
  projectId: "06a07109-3e3c-7bd7-8000-95368a87bd2e",
  apiKey: "demo-public-key",
  baseUrl: "https://api.sonenta.com",
  cdnUrl: `${import.meta.env.BASE_URL}locales`,
  defaultLocale: "en",
  defaultNS: "common",
  namespaces: ["common", "quiz"],
  missingHandlerEndpoint: "https://api.sonenta.com/v1/missing",
  debounceMs: 5000,
  transport: (batch) => missingStore.pushBatch(batch),
});

// @sonenta/feedback wiring lives in src/feedback/feedback.ts (official
// /vue entry, dual-mode) and is mounted by App.vue, kept in sync with the
// active locale. Nothing to do here.

app.mount("#app");
