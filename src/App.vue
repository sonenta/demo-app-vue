<script setup lang="ts">
import { computed, watch } from "vue";
import { useTranslation } from "@sonenta/vue-i18n";
import Splash from "./components/Splash.vue";
import ScenarioRunner from "./components/ScenarioRunner.vue";
import { activeFeedback, ensureFeedback } from "./feedback/feedback";

const { language, ready } = useTranslation();

// Keep <html lang> + the active feedback instance synced to the locale,
// so the official panel rates the language currently on screen.
watch(
  () => language.value,
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
  <Splash :ready="ready" />
  <ScenarioRunner />
  <div
    class="min-h-screen flex flex-col transition-opacity duration-300"
    :class="ready ? 'opacity-100' : 'opacity-0'"
  >
    <RouterView />
  </div>
  <component :is="FeedbackPanel" v-if="FeedbackPanel" :key="language" />
</template>
