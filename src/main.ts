import { createApp } from "vue";
import App from "./App.vue";
import { router } from "./router";
import { createSonentaI18n } from "@sonenta/vue-i18n";
import { missingStore } from "./state/missing-store";
import "./index.css";

const app = createApp(App);

app.use(router);

// Official @sonenta/vue-i18n binding (1.0.0 stable). The demo ships its own
// bundles in the SDK's CDN path layout under
// /cdn (`{cdnBase}/p/{projectUuid}/{version}/latest/{lang}/{ns}.json`), so it
// stays offline / Vercel-safe while exercising the real SDK fetch pipeline.
// projectUuid = the canonical "demo-public" project (backend). token is a
// placeholder — bundles are public, no auth; missing-key delivery is
// redirected to the in-app inspector via `transport` (no network POST).
app.use(
  createSonentaI18n({
    token: "demo-public-key",
    projectUuid: "06a07109-3e3c-7bd7-8000-95368a87bd2e",
    cdnBase: `${import.meta.env.BASE_URL}cdn`,
    version: "main",
    apiBase: "https://api.sonenta.com",
    // Bundles are flat-keyed ("hero.lede"). KEEP THIS EXPLICIT: when omitted,
    // the SDK auto-detects key_style from version metadata, which means a
    // cross-origin GET {apiBase}/v1/projects/{uuid}/versions/{version} on every
    // load. That endpoint is 401 for this demo (public CDN bundles, no API
    // token), so every visitor would eat a failed request + console error for a
    // value we already know. Resolution works either way — this keeps it offline.
    keySeparator: false,
    defaultLocale: "en",
    defaultNS: "common",
    namespaces: ["common", "quiz"],
    disableLanguageManifest: true,
    disableLanguageCatalog: true,
    transport: (batch) => missingStore.pushBatch(batch),
  }),
);

// @sonenta/feedback wiring lives in src/feedback/feedback.ts (official
// /vue entry, dual-mode) and is mounted by App.vue, kept in sync with the
// active locale. Nothing to do here.

app.mount("#app");
