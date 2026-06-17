/**
 * App-side wiring for the OFFICIAL @sonenta/feedback/vue entry
 * (feedback@1.2.0, contract v6). Replaces the former local
 * /core stub + hand adapter.
 *
 * Dual-mode (master standard demo pattern):
 *  - DEFAULT: inject the canned demoFetch → static, Vercel-safe, offline.
 *  - OPT-IN VITE_FEEDBACK_LIVE=1: real fetch → backend-provisioned
 *    demo-public project (live loop).
 *
 * The official config takes a fixed `language`, so we create one
 * VueFeedback per language (lazily, cached) and swap the active one when
 * the app locale changes — the panel always rates the language on screen.
 * sessionId is server-minted; no tosVersion (SDK build-time constant, v4).
 */
import { shallowRef } from "vue";
import { createFeedback, type VueFeedback } from "@sonenta/feedback/vue";
import { demoFetch } from "../sdk/feedback-demo-fetch";

const LIVE = import.meta.env.VITE_FEEDBACK_LIVE === "1";
const API_BASE = LIVE
  ? (import.meta.env.VITE_FEEDBACK_API_BASE ?? "")
  : "http://demo.local";
const PROJECT_ID = LIVE
  ? (import.meta.env.VITE_FEEDBACK_PROJECT_ID ??
    "06a07109-3e3c-7bd7-8000-95368a87bd2e")
  : "demo";

const cache = new Map<string, VueFeedback>();

/** Active VueFeedback for the on-screen language (null until first set). */
export const activeFeedback = shallowRef<VueFeedback | null>(null);

/** Create-or-reuse the feedback instance for `language`, make it active. */
export const ensureFeedback = (language: string): VueFeedback => {
  let fb = cache.get(language);
  if (!fb) {
    fb = createFeedback({
      apiBase: API_BASE,
      projectId: PROJECT_ID,
      language,
      // spec v3: quiz strings live in their own i18n namespace. The SDK
      // namespace filter (applied as rendered ∩ "quiz") keeps the panel
      // to ONLY quiz strings — site chrome/nav (ns=common) is excluded.
      namespace: "quiz",
      // v5: no explicit keys — the SDK auto-scopes to on-screen strings
      // via globalThis.__verbumia_key_registry__ (our @local/vue-i18n
      // stub records rendered t() keys; reset per route). The registry
      // global name is intentionally frozen for cross-scope interop.
      // Explicit keys
      // remain the SDK's fallback only.
      // default → canned transport (static); live → real network fetch.
      fetchImpl: LIVE ? undefined : demoFetch,
    });
    cache.set(language, fb);
  }
  activeFeedback.value = fb;
  return fb;
};

/** Host CTA hook — open the panel for the active language. */
export const openFeedback = () => activeFeedback.value?.controller.open();
