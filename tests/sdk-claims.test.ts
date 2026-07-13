/**
 * The other two framework claims, plus regression locks for the two bugs fixed
 * in faddb9d. All headless — no browser, no network (see tests/sdk-harness.ts).
 *
 * These exist because both bugs were INVISIBLE: no error, no warning, a green
 * build and a 200 response. Only driving the real SDK surfaced them. Now they
 * cannot come back silently.
 */
import { describe, it, expect } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { createSonentaI18n, useTranslation, type MissingKeyEvent } from "@sonenta/vue-i18n";
import { testI18nConfig, waitFor } from "./sdk-harness";

const withI18n = (extra: Record<string, unknown> = {}) =>
  createSonentaI18n({ ...testI18nConfig, ...extra });

describe("missing-key capture", () => {
  it("reports a miss to the transport", async () => {
    const seen: MissingKeyEvent[] = [];
    const plugin = withI18n({ transport: (b: MissingKeyEvent[]) => seen.push(...b) });
    const C = defineComponent({
      setup() {
        const { t, ready } = useTranslation();
        return () => h("p", { "data-ready": String(ready.value) }, t("hero.title.line1"));
      },
    });
    const w = mount(C, { global: { plugins: [plugin] } });
    await waitFor(() => w.find("p").attributes("data-ready") === "true");

    plugin.i18n.t("this.key.does.not.exist");
    await waitFor(() => seen.length > 0, 8000);

    expect(seen.map((e) => e.key)).toContain("this.key.does.not.exist");
  }, 12000);

  /**
   * REGRESSION LOCK (faddb9d): the SDK dedups a missing key per instance, so the
   * /demo autoplay loop re-fired the same canonical keys every cycle and the SDK
   * reported NOTHING from cycle 2 on — the inspector cleared and never refilled,
   * on the surface whose entire pitch is catching missing keys. Needs
   * i18n-core >= 1.1.1 (resetMissingDedup), which ScenarioRunner calls at the
   * loop reset. If this fails, the autoplay loop is silently dead again.
   */
  it("re-reports the same key across loop cycles after resetMissingDedup", async () => {
    const seen: MissingKeyEvent[] = [];
    const plugin = withI18n({ transport: (b: MissingKeyEvent[]) => seen.push(...b) });
    // The engine starts on plugin INSTALL, so it must actually be mounted —
    // creating the plugin alone never calls start() and `ready` stays false.
    mount(defineComponent({ setup: () => () => h("i") }), { global: { plugins: [plugin] } });
    await waitFor(() => plugin.i18n.ready, 8000);

    const cycle = async () => {
      seen.length = 0;
      plugin.i18n.resetMissingDedup(); // what the loop reset does
      plugin.i18n.t("legal.gdpr.long_clause");
      await waitFor(() => seen.length > 0, 8000);
      return seen.length;
    };

    expect(await cycle()).toBe(1); // cycle 1
    expect(await cycle()).toBe(1); // cycle 2 — was 0 before the fix
    expect(await cycle()).toBe(1); // cycle 3
  }, 30000);
});

describe("locale switch", () => {
  it("repaints the mounted component in the new language", async () => {
    const plugin = withI18n();
    const C = defineComponent({
      setup() {
        const { t, ready, language } = useTranslation();
        return () =>
          h("h1", { "data-ready": String(ready.value), "data-lang": language.value }, t("hero.title.line1"));
      },
    });
    const w = mount(C, { attachTo: document.body, global: { plugins: [plugin] } });
    await waitFor(() => w.find("h1").attributes("data-ready") === "true");

    const node = w.find("h1").element;
    const en = w.find("h1").text();
    expect(en).toBe("Ship in every language.");

    // NB: vue-i18n exposes this as setLanguage; sdk has ruled setLocale canonical
    // (setLanguage kept as an alias) but that release is not on npm yet.
    await plugin.i18n.setLocale("fr");
    await waitFor(() => w.find("h1").text() !== en);

    expect(w.find("h1").attributes("data-lang")).toBe("fr");
    expect(w.find("h1").text()).not.toBe(en);
    expect(w.find("h1").element).toBe(node); // patched in place, not remounted
  }, 12000);
});
