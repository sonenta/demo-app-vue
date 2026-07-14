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

    await plugin.i18n.setLocale("fr");
    await waitFor(() => w.find("h1").text() !== en);

    // ASSERT THE ACTUAL FRENCH STRING, not merely "not English".
    // This test used to assert `.not.toBe(en)` — and it PASSED while the locale
    // switch was BROKEN: i18n-core <=1.1.4 dropped a custom fetchImpl on
    // setLocale(), fell back to the global fetch, failed to load the fr bundle,
    // and degraded to rendering the RAW KEY. "hero.title.line1" is not English,
    // so the assertion was satisfied by the bug. A "not the old value" assertion
    // cannot tell a translation from a failure. Needs i18n-core >= 1.1.6.
    expect(w.find("h1").text()).toBe("Livrez dans toutes les langues.");
    expect(w.find("h1").attributes("data-lang")).toBe("fr");
    expect(w.find("h1").element).toBe(node); // patched in place, not remounted
  }, 12000);
});

/**
 * P0 REGRESSION LOCK — an empty key must not destroy the catalog.
 *
 * i18next's ResourceStore.addResource builds `path = [lng, ns]` and only
 * concatenates the key `if (key)`. An EMPTY key is falsy, so the path stays two
 * elements and setPath REPLACES THE WHOLE NAMESPACE. The SDK's missing-key park
 * handed it exactly that: one t("") wiped 474 keys at a customer and the app
 * rendered raw keys (buttons literally reading auth.signIn), silently.
 *
 * Reproduced here on i18n-core 1.1.6: 77 keys -> 0 on a single t(""). Fixed in
 * 1.1.8. This demo calls t() with a VARIABLE in six places (t(f.titleKey),
 * t(trig.labelKey), t(key), ...) — all fed from static arrays today, so one bad
 * data entry away from losing the catalog in production. Hence the lock.
 */
describe("P0: an empty key must not wipe the catalog", () => {
  it("survives t('') with every key intact", async () => {
    const plugin = withI18n();
    mount(defineComponent({ setup: () => () => h("i") }), { global: { plugins: [plugin] } });
    await waitFor(() => plugin.i18n.ready, 8000);

    const bundle = () => plugin.i18n.i18next.getResourceBundle("en", "common") ?? {};
    const before = Object.keys(bundle()).length;
    expect(before).toBeGreaterThan(50); // the real bundle, not an empty one

    plugin.i18n.t(""); // the killer call

    expect(Object.keys(bundle()).length).toBe(before); // catalog intact
    expect(plugin.i18n.t("hero.title.line1")).toBe("Ship in every language.");
  }, 12000);
});

/**
 * NULLISH KEYS — TRIPWIRE FIRED AND FLIPPED.
 *
 * The P0 (one t("") wiping the whole catalog) was fixed in i18n-core 1.1.8. But
 * the nullish shapes still THREW a TypeError: they never reached the
 * `if (!key) return` guard, because something called key.indexOf() first. I
 * reported that — sdk's own advisory tells customers to audit `t(someVar)` where
 * the variable can be "empty OR UNDEFINED", so a customer following their own
 * instructions hit a crash instead of a wipe. It matters more in Vue than React:
 * a throw in render hits an error boundary in React; in Vue it kills the
 * component.
 *
 * I pinned it with `it.fails` (asserting the throw EXISTED). On i18n-core 1.1.10
 * it went RED — i.e. the throw was gone — so the fix is confirmed IN A REAL
 * CONSUMER and the case is now a normal positive assertion. My suite told me the
 * fix had landed; sdk did not have to remember to.
 */
describe("nullish and empty keys are handled gracefully", () => {
  it("returns empty and leaves the catalog intact", async () => {
    const plugin = withI18n();
    mount(defineComponent({ setup: () => () => h("i") }), { global: { plugins: [plugin] } });
    await waitFor(() => plugin.i18n.ready, 8000);

    const bundle = () => plugin.i18n.i18next.getResourceBundle("en", "common") ?? {};
    const before = Object.keys(bundle()).length;
    expect(before).toBeGreaterThan(50);

    for (const bad of ["", undefined, null]) {
      expect(() => plugin.i18n.t(bad as unknown as string)).not.toThrow();
      expect(plugin.i18n.t(bad as unknown as string)).toBe("");
    }

    expect(Object.keys(bundle()).length).toBe(before); // catalog never wiped
    expect(plugin.i18n.t("hero.title.line1")).toBe("Ship in every language.");
  }, 12000);
});

/**
 * TRIPWIRE — the a11y API still throws on nullish keys (i18n-core 1.1.10).
 *
 * t() was guarded in 1.1.8/1.1.9, and sdk announced both doors shut. They were
 * not: five sibling methods funnel through the same key-splitting line, which
 * dereferences a nullish key. sdk guarded the door they were looking at.
 *
 * I enumerated all 14 key-taking public methods rather than trust the reported
 * list — because a defect report names one occurrence and is never evidence
 * there is only one. That found the right SET, and I still got the ANSWER wrong:
 * I first reported FOUR doors and called a11y() safe. It is FIVE.
 *
 * a11y() throws only when BOTH conditions hold:
 *   - it is called with its REQUIRED second argument, a11y(key, surface) — my
 *     sweep passed ONE argument to every method, so it returned early and looked
 *     safe. AN ENUMERATION THAT IGNORES EACH METHOD'S SIGNATURE TESTS NOTHING.
 *   - AND a11ySurfaces is configured. With surfaces unset it is safe even when
 *     called correctly.
 *
 * Verified as a matrix on 1.1.10 (doors x arity x config):
 *   aria / alt / asset / a11yAsset : THROW on undefined+null in every room
 *   a11y(key, surface)             : THROWS only when a11ySurfaces is SET
 *   t + the other 9 public methods : clean everywhere
 *
 * Two lessons, both mine: enumerate every door IN EVERY ROOM (a config is an
 * input, and it can hide the defect from the instrument looking for it), and
 * CALL EACH DOOR WITH ITS REAL SIGNATURE (a one-arg probe of a two-arg method is
 * a green that proves nothing).
 *
 * NOT A CRASH RISK FOR THIS DEMO: it calls no a11y API at all (grep: zero
 * sites). This tracks an SDK defect so my suite tells me when the real fix
 * (1.1.11, "guard at the joint") lands — as it did for the t() nullish fix.
 * `it.fails` = must throw today; goes RED when fixed.
 */
describe("SDK defect tracker: a11y API on nullish keys", () => {
  it.fails("aria(undefined) throws instead of returning gracefully", async () => {
    const plugin = withI18n();
    mount(defineComponent({ setup: () => () => h("i") }), { global: { plugins: [plugin] } });
    await waitFor(() => plugin.i18n.ready, 8000);

    expect(() => plugin.i18n.aria(undefined as unknown as string)).not.toThrow();
  }, 12000);
});
