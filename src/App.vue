<script setup lang="ts">
import { computed, watch } from "vue";
import { useTranslation } from "@local/vue-i18n";
import Splash from "./components/Splash.vue";
import ScenarioRunner from "./components/ScenarioRunner.vue";
import { activeFeedback, ensureFeedback } from "./feedback/feedback";

const { i18n } = useTranslation();

// Keep <html lang> + the active feedback instance synced to the locale,
// so the official panel rates the language currently on screen.
watch(
  () => i18n.language,
  (lang) => {
    document.documentElement.lang = lang;
    ensureFeedback(lang);
  },
  { immediate: true },
);

// Official @sonenta/feedback/vue panel — mounted once near root.
const FeedbackPanel = computed(() => activeFeedback.value?.FeedbackPanel);
</script>

<template>
  <Splash :ready="i18n.ready" />
  <ScenarioRunner />
  <div
    class="min-h-screen flex flex-col transition-opacity duration-300"
    :class="i18n.ready ? 'opacity-100' : 'opacity-0'"
  >
    <RouterView />
  </div>
  <component :is="FeedbackPanel" v-if="FeedbackPanel" :key="i18n.language" />
</template>
