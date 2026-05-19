# @verbumia/demo-app-vue

Live showcase + dogfooding app for the **`@verbumia/vue-i18n`** SDK
(Vue 3 + TypeScript + Vite + Tailwind).

This is one of three Verbumia demo apps — the other two consume the React
and Svelte SDKs respectively. All three render the same scenario so you can
compare framework idioms side by side.

## What's in here

- A landing page that uses the SDK live (FR / EN / ES) — the hero, features
  and copy are translated through `useTranslation()`.
- A live "missing-key telemetry" panel: every fallback the SDK serves shows
  up immediately, identical to what the real backend would publish via
  Centrifugo.
- A `/demo` route with autoplay (`?demo=play` runs once, `?demo=loop` loops)
  for screen recordings and unattended kiosks.
- A local stub of the SDK at `src/sdk/verbumia-vue-i18n.ts` mirroring the
  proposed V1 surface — replace with `npm i @verbumia/vue-i18n` once the
  real package is published from the backend repo.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173 — switch languages with the FR/EN/ES pill, or hit
`/#/demo` for the autoplay timeline.

## Build

```bash
npm run build
```

Output goes to `dist/`. Vercel-ready: `vercel.json` ships caching headers
for `/locales/*` (short TTL + SWR) and `/assets/*` (immutable). The router
runs in **hash mode** (`createWebHashHistory`) so static deploys don't need
SPA rewrites.

## SDK contract (sketch)

```ts
import { createApp } from "vue";
import { VerbumiaPlugin, useTranslation } from "@verbumia/vue-i18n";
import App from "./App.vue";

createApp(App)
  .use(VerbumiaPlugin, {
    projectId: "proj_xxx",
    apiKey: import.meta.env.VITE_VERBUMIA_KEY,
    baseUrl: "https://api.verbumia.ca",
    cdnUrl: "/locales", // or "{baseUrl}/p/{projectId}/{lang}/{namespace}"
    defaultLocale: "en",
    namespaces: ["common"],
    missingHandlerEndpoint: "https://api.verbumia.ca/v1/missing",
    debounceMs: 5000,
    transport: (batch) => {
      // optional override — POST batch yourself, or pipe to a local panel
    },
  })
  .mount("#app");

// any component
const { t, i18n } = useTranslation();
i18n.language;          // reactive Locale
i18n.ready;             // reactive boolean — bundle for {locale,defaultNS} fetched
i18n.changeLanguage(l); // setter
t("hero.title");        // string, reports a MissingKeyEvent if absent
```

`transport` and `i18n.ready` are the Vue equivalents of the React surface
(see `verbumia.ca/demo-app/src/sdk/verbumia-react-i18next.tsx`). Both
SDKs deliberately share these affordances so dogfood patterns are portable.

## License

MIT — see [LICENSE](./LICENSE).
