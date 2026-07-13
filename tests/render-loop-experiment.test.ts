/**
 * TASK 1721 — TRY TO PROVOKE THE RENDER LOOP ON PURPOSE.
 *
 * Step 1 ARM THE INSTRUMENT: induce a REAL runaway and prove the counter sees
 * it. A negative from an unarmed detector is not evidence of absence — that is
 * precisely the reasoning that produced the false React Native alert.
 *
 * Step 2 MEASURE: with the SDK's guards removed, render a missing key and count.
 *
 * Step 2 only means anything because step 1 passed.
 *
 * RESULT (task 1721, engine mutated in node_modules — my rule: if you cannot
 * mutate the code, mutate the dependency):
 *
 *   armed: a genuine runaway            -> >100 renders  (the counter SEES loops)
 *   shipped engine, missing key         ->    3 renders
 *   park un-silenced + dedup gate GONE  ->    3 renders  <- IDENTICAL
 *   control: park writes a marker       -> marker reached the DOM, so the
 *                                          mutated path really did execute
 *
 * So in VUE the anti-loop guard is a FOSSIL: removing it changes nothing, and
 * the loop cannot be provoked on purpose. Every comment in our source calling it
 * load-bearing is, for this binding, a rumour with a date on it.
 *
 * THIS DOES NOT TRAVEL TO REACT. react-i18next re-renders off i18next STORE
 * events (bindI18n); vue-i18n re-renders off the engine's own _notify and never
 * sees them — which is the likely reason the guard is inert here. The same
 * experiment must be run on react-i18next before anyone calls the guard dead
 * fleet-wide.
 */
import { describe, it, expect } from "vitest";
import { defineComponent, h, ref } from "vue";
import { mount } from "@vue/test-utils";
import { createSonentaI18n, useTranslation } from "@sonenta/vue-i18n";
import { testI18nConfig, waitFor } from "./sdk-harness";

describe("STEP 1 — arm the instrument", () => {
  it("a genuine runaway registers 100+ renders on the counter", async () => {
    let renders = 0;
    // A real self-feeding render loop: the render reads a ref and mutates it.
    const Runaway = defineComponent({
      setup() {
        const spin = ref(0);
        return () => {
          renders++;
          spin.value++; // re-triggers this very render
          return h("p", String(spin.value));
        };
      },
    });
    mount(Runaway);
    await new Promise((r) => setTimeout(r, 200));

    // Vue's scheduler aborts recursive updates around 100; that is the runaway
    // signature. The point is that the COUNTER SEES IT.
    expect(renders).toBeGreaterThan(100);
  }, 10000);
});

describe("STEP 2 — measure the SDK path with the armed counter", () => {
  it("renders a missing key and counts renders", async () => {
    let renders = 0;
    const plugin = createSonentaI18n({ ...testI18nConfig });
    const Missing = defineComponent({
      setup() {
        const { t, ready } = useTranslation();
        return () => {
          renders++;
          return h("p", { "data-ready": String(ready.value) }, t("totally.absent.key"));
        };
      },
    });
    const w = mount(Missing, { global: { plugins: [plugin] } });
    await waitFor(() => w.find("p").attributes("data-ready") === "true");
    await new Promise((r) => setTimeout(r, 300)); // give a loop time to run away

    // eslint-disable-next-line no-console
    console.log(`[1721] renders on a missing key: ${renders}`);
    expect(w.find("p").text()).toBe("totally.absent.key");
    expect(renders).toBeLessThan(100); // NOT a runaway (100 = the armed signature)
  }, 15000);
});
