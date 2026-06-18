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
const { t } = useTranslation();

scenarioStore.attach(
  (key) => {
    t(key);
  },
  () => missingStore.clear(),
);
</script>

<template>
  <span class="hidden" />
</template>
