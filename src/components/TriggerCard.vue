<script setup lang="ts">
import { computed } from "vue";
import { useTranslation } from "@sonenta/vue-i18n";
import {
  scenarioStore,
  SCENARIO_KEYS,
  type ScenarioMode,
} from "../state/scenario-store";

const { t } = useTranslation();

const TRIGGERS = SCENARIO_KEYS.map((k, i) => ({
  key: k,
  labelKey: [
    "live.trigger.button.legal",
    "live.trigger.button.checkout",
    "live.trigger.button.error",
    "live.trigger.button.coming",
  ][i]!,
}));

const mode = computed(() => scenarioStore.state.mode);
const cursor = computed(() => scenarioStore.state.cursor);
const isAuto = computed(() => mode.value !== "idle");

const trigger = (missingKey: string) => {
  t(missingKey);
};

const setMode = (m: ScenarioMode) => {
  if (m === "idle") scenarioStore.stop();
  else scenarioStore.start(m);
};
</script>

<template>
  <aside class="rounded-2xl border border-ink-800 bg-ink-900 p-6">
    <div class="flex items-center gap-2 mb-1.5">
      <svg
        aria-hidden
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="1.8"
        class="text-emerald-400"
      >
        <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8z" stroke-linejoin="round" />
      </svg>
      <h3 class="text-[1.05rem] font-semibold tracking-tight text-ink-50">
        {{ t("live.trigger.title") }}
      </h3>
    </div>
    <p class="text-sm text-ink-300 mb-4">{{ t("live.trigger.subtitle") }}</p>

    <div
      class="flex items-center gap-1 mb-4 p-1 rounded-full border border-ink-800 bg-ink-950/60"
    >
      <button
        type="button"
        :aria-pressed="mode === 'playing'"
        :class="[
          'flex-1 px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
          mode === 'playing'
            ? 'bg-emerald-500 text-ink-950'
            : 'text-ink-300 hover:text-ink-50 hover:bg-ink-900',
        ]"
        @click="setMode(mode === 'playing' ? 'idle' : 'playing')"
      >
        ▷ {{ t("scenario.play") }}
      </button>
      <button
        type="button"
        :aria-pressed="mode === 'looping'"
        :class="[
          'flex-1 px-3 py-1.5 text-xs font-medium rounded-full transition-colors',
          mode === 'looping'
            ? 'bg-emerald-500 text-ink-950'
            : 'text-ink-300 hover:text-ink-50 hover:bg-ink-900',
        ]"
        @click="setMode(mode === 'looping' ? 'idle' : 'looping')"
      >
        ↻ {{ t("scenario.loop") }}
      </button>
    </div>

    <div class="grid gap-2.5">
      <button
        v-for="(trig, i) in TRIGGERS"
        :key="trig.key"
        type="button"
        :disabled="isAuto"
        :class="[
          'group flex items-center justify-between gap-3 px-4 py-3 rounded-lg border bg-ink-950/40 transition-colors text-left disabled:cursor-not-allowed disabled:opacity-70',
          isAuto && cursor === i
            ? 'border-amber bg-amber-soft'
            : 'border-ink-800 hover:border-ink-700 hover:bg-ink-900',
        ]"
        @click="trigger(trig.key)"
      >
        <span class="flex flex-col">
          <span class="text-sm font-medium text-ink-100">
            {{ t(trig.labelKey) }}
          </span>
          <code class="mono text-[11px] text-ink-300 mt-0.5">
            t(&quot;{{ trig.key }}&quot;)
          </code>
        </span>
        <span
          aria-hidden
          :class="[
            'mono text-[10px] uppercase tracking-[0.18em] px-2 py-1 rounded-sm transition-colors',
            isAuto && cursor === i
              ? 'bg-amber text-ink-50'
              : 'bg-amber-soft text-amber-bright group-hover:bg-amber group-hover:text-ink-50',
          ]"
        >
          {{ isAuto && cursor === i ? "firing" : "fire" }}
        </span>
      </button>
    </div>
  </aside>
</template>
