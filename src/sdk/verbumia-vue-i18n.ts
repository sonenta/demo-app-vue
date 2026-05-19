/**
 * Local stub of @verbumia/vue-i18n.
 *
 * Mirrors the V1 contract sketched by the backend peer (Vue idiom):
 *   app.use(VerbumiaPlugin, { projectId, apiKey, baseUrl, cdnUrl,
 *                              defaultLocale, defaultNS, namespaces,
 *                              missingHandlerEndpoint, debounceMs, transport })
 *   useTranslation(ns?) ->
 *     { t, locale, setLocale,
 *       i18n: { language, ready, changeLanguage, exists } }
 *
 * Bundles are fetched from a CDN-shaped path:
 *   {cdnUrl}/{lang}/{ns}.json  (or {projectId}/{lang}/{namespace} placeholders)
 *
 * Missing-key detections are debounce-batched and dispatched to a transport
 * function (default: POST to missingHandlerEndpoint). The demo replaces the
 * transport to intercept events for the live panel; in production the same
 * batches reach the backend's /v1/missing endpoint.
 *
 * Replace this file with `npm i @verbumia/vue-i18n` once the real package
 * is published — same surface, same behaviour.
 */
import {
  computed,
  getCurrentInstance,
  inject,
  onUnmounted,
  reactive,
  ref,
  type App,
  type InjectionKey,
  type Ref,
} from "vue";

export type Locale = string;
export type Namespace = string;

/* ---- rendered-key registry (v5 auto-scoping contract) ----
 * @verbumia/feedback resolves on-screen strings via
 * globalThis.__verbumia_key_registry__.snapshot() when no explicit keys
 * are passed. We record every resolved t() key and reset per view (router
 * hook) so the feedback panel auto-scopes to the CURRENT screen. */
type RegKey = { namespace: Namespace; key: string };
type RegEntry = { key: RegKey; n: number };
const counts = new Map<string, RegEntry>();
const keyId = (ns: Namespace, key: string) => `${ns} ${key}`;
const acquireRenderedKey = (id: string, key: RegKey) => {
  const e = counts.get(id);
  if (e) e.n += 1;
  else counts.set(id, { key, n: 1 });
};
const releaseRenderedKeys = (ids: Iterable<string>) => {
  for (const id of ids) {
    const e = counts.get(id);
    if (!e) continue;
    e.n -= 1;
    if (e.n <= 0) counts.delete(id);
  }
};
if (typeof globalThis !== "undefined") {
  (globalThis as Record<string, unknown>).__verbumia_key_registry__ = {
    snapshot: (): RegKey[] => [...counts.values()].map((e) => e.key),
  };
}

/* NOTE: @verbumia/vue-i18n has NO add-on `plugins[]` slot — the i18n
 * plugin slot is React-only (@verbumia/react-i18next). @verbumia/feedback
 * integrates in Vue via its framework-agnostic /core client + an
 * app-owned adapter (see src/sdk/verbumia-feedback-vue.ts), not through
 * this provider. */

export type MissingKeyEvent = {
  key: string;
  ns: Namespace;
  locale: Locale;
  ts: number;
  fallback: string;
};

export type MissingKeyTransport = (
  batch: MissingKeyEvent[],
) => void | Promise<void>;

export type VerbumiaPluginOptions = {
  projectId: string;
  apiKey: string;
  baseUrl?: string;
  cdnUrl?: string;
  defaultLocale?: Locale;
  defaultNS?: Namespace;
  namespaces?: Namespace[];
  missingHandlerEndpoint?: string;
  debounceMs?: number;
  transport?: MissingKeyTransport;
};

export type TOptions = {
  ns?: Namespace;
  defaultValue?: string;
  values?: Record<string, string | number>;
};

type Bundle = Record<string, string>;
type LocaleBundles = Record<Namespace, Bundle>;

type ResolvedOptions = VerbumiaPluginOptions & {
  cdnUrl: string;
  defaultLocale: Locale;
  defaultNS: Namespace;
  namespaces: Namespace[];
  debounceMs: number;
};

type I18nCtx = {
  options: ResolvedOptions;
  locale: Ref<Locale>;
  bundles: Ref<Record<Locale, LocaleBundles>>;
  attempted: Ref<Set<string>>;
  setLocale: (l: Locale) => void;
  reportMissing: (
    key: string,
    ns: Namespace,
    locale: Locale,
    fallback: string,
  ) => void;
};

export const VerbumiaInjectionKey: InjectionKey<I18nCtx> = Symbol("verbumia");

const interpolate = (
  template: string,
  values?: Record<string, string | number>,
): string => {
  if (!values) return template;
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) =>
    values[k] != null ? String(values[k]) : `{{${k}}}`,
  );
};

const lookup = (
  bundles: Record<Locale, LocaleBundles>,
  locale: Locale,
  ns: Namespace,
  key: string,
): string | undefined => bundles[locale]?.[ns]?.[key];

const attemptedKey = (locale: Locale, ns: Namespace) => `${locale}::${ns}`;

const resolveUrl = (
  cdnUrl: string,
  projectId: string,
  locale: Locale,
  ns: Namespace,
): string =>
  cdnUrl.includes("{")
    ? cdnUrl
        .replace("{projectId}", projectId)
        .replace("{lang}", locale)
        .replace("{namespace}", ns)
    : `${cdnUrl}/${locale}/${ns}.json`;

export const VerbumiaPlugin = {
  install(app: App, rawOptions: VerbumiaPluginOptions) {
    const options: ResolvedOptions = {
      cdnUrl: "/locales",
      defaultLocale: "en",
      defaultNS: "common",
      namespaces: ["common"],
      debounceMs: 5000,
      ...rawOptions,
    };

    const locale = ref<Locale>(options.defaultLocale);
    const bundles = ref<Record<Locale, LocaleBundles>>({});
    const attempted = ref<Set<string>>(new Set());

    const queue: MissingKeyEvent[] = [];
    const seen = new Set<string>();
    let timer: number | null = null;

    const flush = async () => {
      if (queue.length === 0) return;
      const batch = queue.splice(0, queue.length);
      timer = null;
      if (options.transport) {
        try {
          await options.transport(batch);
        } catch {
          // transport failures should not break the app.
        }
        return;
      }
      if (options.missingHandlerEndpoint) {
        try {
          await fetch(options.missingHandlerEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "X-Verbumia-Project": options.projectId,
            },
            body: JSON.stringify({ events: batch }),
            keepalive: true,
          });
        } catch {
          // network failure is fine — batches are best-effort observability.
        }
      }
    };

    const reportMissing: I18nCtx["reportMissing"] = (
      key,
      ns,
      loc,
      fallback,
    ) => {
      // skip until the bundle for this {locale, ns} has been fetch-attempted —
      // otherwise the very first paint would mark every consumed key as missing.
      if (!attempted.value.has(attemptedKey(loc, ns))) return;
      const dedupe = `${loc}::${ns}::${key}`;
      if (seen.has(dedupe)) return;
      seen.add(dedupe);
      queue.push({ key, ns, locale: loc, ts: Date.now(), fallback });
      if (timer == null) {
        timer = window.setTimeout(() => void flush(), options.debounceMs);
      }
    };

    const fetchLocale = async (loc: Locale) => {
      const next: LocaleBundles = {};
      const justAttempted: string[] = [];
      for (const ns of options.namespaces) {
        const url = resolveUrl(options.cdnUrl, options.projectId, loc, ns);
        try {
          const res = await fetch(url, { cache: "no-cache" });
          if (res.ok) next[ns] = (await res.json()) as Bundle;
        } catch {
          // swallow — still mark attempted so missing handler fires for keys
          // consumed in this locale/ns.
        }
        justAttempted.push(attemptedKey(loc, ns));
      }
      bundles.value = { ...bundles.value, [loc]: next };
      const merged = new Set(attempted.value);
      for (const k of justAttempted) merged.add(k);
      attempted.value = merged;
    };

    const setLocale = (l: Locale) => {
      if (l === locale.value) return;
      locale.value = l;
      void fetchLocale(l);
    };

    void fetchLocale(locale.value);

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", () => {
        if (timer != null) {
          window.clearTimeout(timer);
          void flush();
        }
      });
    }

    const ctx: I18nCtx = {
      options,
      locale,
      bundles,
      attempted,
      setLocale,
      reportMissing,
    };

    app.provide(VerbumiaInjectionKey, ctx);
  },
};

/**
 * Reactive instance returned from useTranslation().i18n.
 * `language` and `ready` are auto-unwrapped reactive properties (read in
 * templates without .value, just like i18next's i18n object).
 */
export type I18nInstance = {
  readonly language: Locale;
  readonly ready: boolean;
  changeLanguage: (l: Locale) => void;
  exists: (key: string, ns?: Namespace) => boolean;
};

export type UseTranslation = {
  t: (key: string, opts?: TOptions) => string;
  locale: Ref<Locale>;
  setLocale: (l: Locale) => void;
  i18n: I18nInstance;
};

export function useTranslation(ns?: Namespace): UseTranslation {
  const ctx = inject(VerbumiaInjectionKey);
  if (!ctx) {
    throw new Error(
      "[verbumia] useTranslation called outside of app.use(VerbumiaPlugin).",
    );
  }
  const namespace = ns ?? ctx.options.defaultNS;

  // §0e: this consumer holds a ref on every key it renders for as long
  // as its component is mounted; released on unmount.
  const acquired = new Set<string>();
  if (getCurrentInstance()) {
    onUnmounted(() => releaseRenderedKeys(acquired));
  }

  const t = (key: string, opts: TOptions = {}) => {
    const useNS = opts.ns ?? namespace;
    const id = keyId(useNS, key);
    if (!acquired.has(id)) {
      acquired.add(id);
      acquireRenderedKey(id, { namespace: useNS, key });
    }
    const hit = lookup(ctx.bundles.value, ctx.locale.value, useNS, key);
    if (hit != null) return interpolate(hit, opts.values);
    const fallback = opts.defaultValue ?? key;
    ctx.reportMissing(key, useNS, ctx.locale.value, fallback);
    return interpolate(fallback, opts.values);
  };

  const i18n = reactive({
    language: ctx.locale,
    ready: computed(() =>
      ctx.attempted.value.has(
        attemptedKey(ctx.locale.value, ctx.options.defaultNS),
      ),
    ),
    changeLanguage: ctx.setLocale,
    exists: (key: string, exNs?: Namespace) =>
      lookup(ctx.bundles.value, ctx.locale.value, exNs ?? namespace, key) !=
      null,
  }) as I18nInstance;

  return { t, locale: ctx.locale, setLocale: ctx.setLocale, i18n };
}
