/**
 * DOES AN IN-CONTEXT LIVE EDIT REPAINT A VUE SCREEN?
 *
 * This is the framework claim marketing wants to publish. It was previously
 * only DECLARED (traced through the source). This test OBSERVES it.
 *
 * WHAT A GREEN HERE PROVES:  a live edit repaints a mounted Vue component,
 *                            in place, with no remount and no bundle refetch.
 * WHAT IT DOES *NOT* PROVE:  the pairing / Centrifugo transport. That is
 *                            framework-AGNOSTIC (the same LiveClient on every
 *                            binding), so it is not the part in doubt — but it
 *                            is NOT covered here and must not be claimed.
 *
 * applyEdit() IS the repaint path: in-context calls exactly this on an incoming
 * edit event (override write + refresh()). We call it directly, which removes
 * the need for a paired session, a prod credential, an editor on the other end,
 * and a browser.
 *
 * NOTE: applyEdit is imported from `@sonenta/in-context/core`, NOT `/vue` — the
 * published 1.2.0 `/vue` entry does not re-export it yet (sdk added that today,
 * unreleased). It is framework-agnostic, so /core is the correct import anyway.
 */
import { describe, it, expect } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { createSonentaI18n, useTranslation } from "@sonenta/vue-i18n";
import { applyEdit } from "@sonenta/in-context/core";
import { staticCdnFetch, testI18nConfig, waitFor } from "./sdk-harness";

const Hero = defineComponent({
  setup() {
    const { t, ready } = useTranslation();
    return () =>
      h("h1", { "data-ready": String(ready.value) }, t("hero.title.line1"));
  },
});

describe("in-context live edit → Vue repaint", () => {
  it("repaints the mounted component in place, with no refetch", async () => {
    // Real fetch counter — the repaint must not pull a bundle again.
    let fetches = 0;
    const countingFetch: typeof fetch = (...args) => {
      fetches++;
      return staticCdnFetch(...args);
    };

    const plugin = createSonentaI18n({ ...testI18nConfig, fetchImpl: countingFetch });
    const wrapper = mount(Hero, { attachTo: document.body, global: { plugins: [plugin] } });

    await waitFor(() => wrapper.find("h1").attributes("data-ready") === "true");
    const before = wrapper.find("h1").text();
    expect(before).toBe("Ship in every language.");

    // Identity of the live DOM node: if the edit REPAINTS in place, Vue patches
    // THIS node. If it remounts/reloads, we get a different node object.
    const nodeBefore = wrapper.find("h1").element;
    expect(nodeBefore.isConnected).toBe(true);
    const fetchesBeforeEdit = fetches;

    // THE EDIT — exactly what in-context does when an editor changes a string.
    await applyEdit(plugin.i18n as never, {
      namespace: "common",
      key: "hero.title.line1",
      languageCode: "en",
      value: "Edited live, no reload.",
    });

    await waitFor(() => wrapper.find("h1").text() !== before);

    // THE CLAIM, asserted three ways.
    expect(wrapper.find("h1").text()).toBe("Edited live, no reload."); // new text
    expect(wrapper.find("h1").element).toBe(nodeBefore); // SAME node — patched, not remounted
    expect(nodeBefore.isConnected).toBe(true); // still in the document
    expect(fetches).toBe(fetchesBeforeEdit); // no bundle refetch
  });

  it("leaves untouched keys alone", async () => {
    const plugin = createSonentaI18n({ ...testI18nConfig });
    const Both = defineComponent({
      setup() {
        const { t, ready } = useTranslation();
        return () =>
          h("div", { "data-ready": String(ready.value) }, [
            h("h1", t("hero.title.line1")),
            h("p", t("hero.lede")),
          ]);
      },
    });
    const wrapper = mount(Both, { global: { plugins: [plugin] } });
    await waitFor(() => wrapper.find("div").attributes("data-ready") === "true");

    const ledeBefore = wrapper.find("p").text();
    await applyEdit(plugin.i18n as never, {
      namespace: "common",
      key: "hero.title.line1",
      languageCode: "en",
      value: "Only this one changed.",
    });
    await waitFor(() => wrapper.find("h1").text() === "Only this one changed.");

    expect(wrapper.find("p").text()).toBe(ledeBefore);
  });
});
