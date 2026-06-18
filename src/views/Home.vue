<script setup lang="ts">
import { onUnmounted, watch } from "vue";
import { useRoute } from "vue-router";
import { useTranslation } from "@sonenta/vue-i18n";
import Header from "../components/Header.vue";
import Hero from "../components/Hero.vue";
import LiveSection from "../components/LiveSection.vue";
import InstallSnippet from "../components/InstallSnippet.vue";
import Features from "../components/Features.vue";
import Footer from "../components/Footer.vue";
import { scenarioStore } from "../state/scenario-store";

const route = useRoute();
const { ready } = useTranslation();

const readDemoParam = (): string | null => {
  const fromQuery = route.query.demo;
  if (typeof fromQuery === "string") return fromQuery;
  if (Array.isArray(fromQuery) && typeof fromQuery[0] === "string")
    return fromQuery[0];
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    return params.get("demo");
  }
  return null;
};

watch(
  () => ready.value,
  (ready) => {
    if (!ready) return;
    const demo = readDemoParam();
    if (demo === "play") scenarioStore.start("playing");
    else if (demo === "loop") scenarioStore.start("looping");
  },
  { immediate: true },
);

onUnmounted(() => {
  scenarioStore.stop();
});
</script>

<template>
  <Header />
  <main class="flex-1">
    <Hero />
    <LiveSection />
    <InstallSnippet />
    <Features />
  </main>
  <Footer />
</template>
