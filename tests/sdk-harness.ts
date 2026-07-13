/**
 * Headless SDK test harness — COPYABLE by the other demos (react/svelte/expo).
 *
 * Why this exists: proving SDK framework claims (live-edit repaint, missing-key
 * capture, locale switch) used to mean driving a real Chrome, which opened
 * windows on the founder's machine. This harness proves the same claims in
 * jsdom, headless, with zero visible windows and zero network.
 *
 * The one rule it enforces: bundles are served from the SAME static files the
 * app ships (public/cdn), through an injected fetchImpl — so a green here is a
 * statement about the real SDK against the real bundles, not against a mock.
 *
 * PORTING WARNING — `fetchImpl` IS NOT A UNIVERSAL SEAM.
 * vue-i18n, svelte-i18n and next accept `fetchImpl` in their options and forward
 * it to start(). @sonenta/react-i18next DOES NOT: its provider calls `start()`
 * with no argument, and `SonentaConfig` has no `fetchImpl`, so the key here is
 * SILENTLY IGNORED on React and the SDK hits the REAL NETWORK. Verified in the
 * published tarball (2.6.1): no `fetchImpl` in the typings, `.start()` with no
 * arg. It type-checks clean and does nothing — a booby trap, not an error.
 * Until react-i18next 2.7.0 adds the seam, a React port must stub
 * `globalThis.fetch` BEFORE mounting instead.
 */
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const ROOT = resolve(__dirname, "..");

/** Serves the app's real bundles off disk; everything else 404s (offline). */
export const staticCdnFetch: typeof fetch = async (input) => {
  const url = typeof input === "string" ? input : String(input);
  const path = new URL(url, "http://test.local/").pathname;
  try {
    const body = await readFile(resolve(ROOT, "public" + path), "utf8");
    return new Response(body, { status: 200, headers: { "Content-Type": "application/json" } });
  } catch {
    return new Response("not found", { status: 404 });
  }
};

/** The demo's real i18n config, minus anything that would touch the network. */
export const testI18nConfig = {
  token: "demo-public-key",
  projectUuid: "06a07109-3e3c-7bd7-8000-95368a87bd2e",
  cdnBase: "/cdn",
  version: "main",
  apiBase: "http://api.invalid",
  keySeparator: false as const,
  defaultLocale: "en",
  defaultNS: "common",
  namespaces: ["common", "quiz"],
  disableLanguageManifest: true,
  disableLanguageCatalog: true,
  fetchImpl: staticCdnFetch,
};

/** Resolves once the SDK has loaded its bundles (poll — no arbitrary sleeps). */
export const waitFor = async (cond: () => boolean, timeoutMs = 3000) => {
  const started = Date.now();
  while (!cond()) {
    if (Date.now() - started > timeoutMs) throw new Error("waitFor: timed out");
    await new Promise((r) => setTimeout(r, 10));
  }
};
