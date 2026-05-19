import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { VerbumiaPlugin } from "@verbumia/vue-i18n";
import { missingStore } from "./state/missing-store";
import "./index.css";

const app = createApp(App);

app.use(router);

app.use(VerbumiaPlugin, {
  projectId: "demo-verbumia-ca-vue",
  apiKey: "demo-public-key",
  baseUrl: "https://api.verbumia.ca",
  cdnUrl: "/locales",
  defaultLocale: "en",
  defaultNS: "common",
  namespaces: ["common", "quiz"],
  missingHandlerEndpoint: "https://api.verbumia.ca/v1/missing",
  debounceMs: 5000,
  transport: (batch) => missingStore.pushBatch(batch),
});

// @verbumia/feedback wiring lives in src/feedback/feedback.ts (official
// /vue entry, dual-mode) and is mounted by App.vue, kept in sync with the
// active locale. Nothing to do here.

app.mount("#app");
