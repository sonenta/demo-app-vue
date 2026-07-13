/**
 * THE CASE THAT ACTUALLY MATTERS: does an in-context edit repaint a key that
 * was MISSING FIRST?
 *
 * A user reaches for in-context BECAUSE they are staring at a raw key. So the
 * real path is: key absent from the bundle -> renders raw -> editor types a
 * value -> screen must repaint. Editing a key that ALREADY had a value (see
 * in-context-repaint.test.ts) proves only the easy path.
 *
 * The park-shadow P1 (sdk): i18next PARKS a missing key FLAT
 * ({"hero.title": "hero.title"}) while an in-context edit writes NESTED — and
 * the flat park WINS the lookup, so the edit lands and the screen never
 * changes. Invisible on a key that was already present.
 *
 * EXPECTED: RED on i18n-core <= 1.1.1 (no un-park). GREEN on >= 1.1.2.
 * The red IS the negative control: it proves this test can SEE the P1. If this
 * test ever passes on 1.1.1, the test is broken, not the SDK.
 */
import { describe, it, expect } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { createSonentaI18n, useTranslation } from "@sonenta/vue-i18n";
import { applyEdit } from "@sonenta/in-context/core";
import { testI18nConfig, waitFor } from "./sdk-harness";

// Absent from every bundle: it renders raw, and i18next parks it.
const ABSENT_KEY = "promo.banner.headline";

const Banner = defineComponent({
  setup() {
    const { t, ready } = useTranslation();
    return () => h("h2", { "data-ready": String(ready.value) }, t(ABSENT_KEY));
  },
});

describe("in-context edit of a key that was MISSING first", () => {
  it("repaints the raw key with the edited value", async () => {
    const plugin = createSonentaI18n({ ...testI18nConfig });
    const wrapper = mount(Banner, {
      attachTo: document.body,
      global: { plugins: [plugin] },
    });

    await waitFor(() => wrapper.find("h2").attributes("data-ready") === "true");

    // The user's starting point: the key renders as its own name.
    expect(wrapper.find("h2").text()).toBe(ABSENT_KEY);
    const node = wrapper.find("h2").element;

    // The editor types a value for the key they are staring at.
    await applyEdit(plugin.i18n as never, {
      namespace: "common",
      key: ABSENT_KEY,
      languageCode: "en",
      value: "Now it has a value.",
    });

    // THE CLAIM: the screen stops showing the raw key.
    await waitFor(() => wrapper.find("h2").text() !== ABSENT_KEY, 2000);

    expect(wrapper.find("h2").text()).toBe("Now it has a value.");
    expect(wrapper.find("h2").element).toBe(node); // patched in place
  }, 10000);

  /**
   * THE PARK-SHADOW P1, PINNED.
   *
   * The test above passes — but ONLY because this demo is flat-keyed
   * (keySeparator:false), so i18next's flat park and in-context's write agree.
   * The P1 needs a flat-park / nested-write MISMATCH, which is what a
   * NESTED-keyed app (keySeparator:".", e.g. demo-app's prod bundles) has.
   * There the edit lands and the screen never changes.
   *
   * So the defect is a function of KEY STYLE, not of framework. A Vue customer
   * with nested bundles is still exposed. This case pins that.
   *
   * TRIPWIRE FIRED, AS DESIGNED. This was pinned with `it.fails` (asserting the
   * bug EXISTED) against i18n-core <= 1.1.1. On 1.1.2 it went red — i.e. the
   * nested edit started repainting — so the un-park fix is confirmed IN A REAL
   * CONSUMER, and the case is now a normal positive assertion. If the park ever
   * comes back, this goes red instead of the feature going quietly dead.
   */
  it("NESTED keys: edit repaints too (park-shadow P1 un-parked in i18n-core 1.1.2)", async () => {
    const plugin = createSonentaI18n({ ...testI18nConfig, keySeparator: "." });
    const wrapper = mount(Banner, { attachTo: document.body, global: { plugins: [plugin] } });
    await waitFor(() => wrapper.find("h2").attributes("data-ready") === "true");
    expect(wrapper.find("h2").text()).toBe(ABSENT_KEY);
    const node = wrapper.find("h2").element;

    await applyEdit(plugin.i18n as never, {
      namespace: "common",
      key: ABSENT_KEY,
      languageCode: "en",
      value: "Now it has a value.",
    });

    // On <=1.1.1 this never happened: the flat park shadowed the nested write.
    await waitFor(() => wrapper.find("h2").text() !== ABSENT_KEY, 2000);

    expect(wrapper.find("h2").text()).toBe("Now it has a value.");
    expect(wrapper.find("h2").element).toBe(node); // patched in place
  }, 10000);
});
