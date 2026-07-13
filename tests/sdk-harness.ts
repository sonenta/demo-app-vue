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
