<script setup lang="ts">
import { computed, onMounted, onUnmounted, watch } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useTranslation } from "@sonenta/vue-i18n";
import Header from "../components/Header.vue";
import MissingKeysPanel from "../components/MissingKeysPanel.vue";
import { scenarioStore, SCENARIO_KEYS } from "../state/scenario-store";

const { t, ready } = useTranslation();
const route = useRoute();

const mode = computed(() => scenarioStore.state.mode);
const cursor = computed(() => scenarioStore.state.cursor);

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

const startScenarioForRoute = () => {
  // /demo defaults to loop unless an explicit ?demo=play is set.
  if (!ready.value) return;
  const demo = readDemoParam();
  if (demo === "play") scenarioStore.start("playing");
  else scenarioStore.start("looping");
};

onMounted(() => {
  startScenarioForRoute();
});

watch(
  () => ready.value,
  (ready) => {
    if (ready) startScenarioForRoute();
  },
);

onUnmounted(() => {
  scenarioStore.stop();
});
</script>

<template>
  <Header />
  <main class="flex-1">
    <section class="mx-auto max-w-6xl px-6 pt-12 pb-6">
      <RouterLink
        to="/"
        class="mono text-[11px] uppercase tracking-[0.22em] text-ink-300 hover:text-emerald-400 transition-colors inline-flex items-center"
      >
        {{ t("demo.back") }}
      </RouterLink>
      <h1
        class="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-ink-50"
      >
        {{ t("demo.title") }}
      </h1>
      <p class="mt-3 max-w-2xl text-base text-ink-300">{{ t("demo.subtitle") }}</p>
    </section>

    <section class="mx-auto max-w-6xl px-6 pb-8">
      <ol
        class="grid grid-cols-2 sm:grid-cols-4 gap-2 mono text-[11px] uppercase tracking-[0.18em]"
      >
        <li
          v-for="(k, i) in SCENARIO_KEYS"
          :key="k"
          :class="[
            'rounded-lg border px-3 py-3 transition-colors',
            mode !== 'idle' && cursor === i
              ? 'border-amber bg-amber-soft text-amber-bright'
              : 'border-ink-800 bg-ink-900 text-ink-300',
          ]"
        >
          <span class="block text-ink-100 truncate">{{ k }}</span>
          <span class="text-[9px] mt-1 block">
            {{ mode !== "idle" && cursor === i ? "firing" : "queued" }}
          </span>
        </li>
      </ol>
    </section>

    <section class="mx-auto max-w-6xl px-6 pb-20">
      <MissingKeysPanel />
    </section>
  </main>
</template>
