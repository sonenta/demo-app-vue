<script setup lang="ts">
import { useTranslation } from "@sonenta/vue-i18n";
import { scenarioStore } from "../state/scenario-store";
import { missingStore } from "../state/missing-store";

/**
 * Side-effect-only component mounted at app root. Wires the scenario store's
 * fire/reset hooks to t() (so calls go through the SDK's missing-key handler
 * exactly as a real user click would). Each view decides when to actually
 * start the scenario — see Home.vue and Demo.vue.
 */
const { t, resetMissingDedup } = useTranslation();

scenarioStore.attach(
  (key) => {
    t(key);
  },
  () => {
    missingStore.clear();
    // The SDK dedups a missing key per instance — without this, the loop's
    // 2nd cycle onward re-fires the same keys, the SDK reports NOTHING, and
    // the inspector stays empty for the rest of the capture (verified: cycle 1
    // reports 2 misses, cycle 2 reports 0). Exposed on the binding since
    // @sonenta/vue-i18n 1.1.0 (was an engine escape hatch before).
    resetMissingDedup();
  },
);
</script>

<template>
  <span class="hidden" />
</template>
