<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useTranslation } from "@verbumia/vue-i18n";
import { missingStore } from "../state/missing-store";
import { scenarioStore } from "../state/scenario-store";

const { t, i18n } = useTranslation();

const events = computed(() => missingStore.state.events);
const lastBatchAt = computed(() => missingStore.state.lastBatchAt);
const scenarioMode = computed(() => scenarioStore.state.mode);
const count = computed(() => events.value.length);

const headerEl = ref<HTMLElement | null>(null);
const flushedFlash = ref(false);

watch(lastBatchAt, (value) => {
  if (value == null) return;
  const el = headerEl.value;
  if (!el) return;
  el.classList.remove("pulse-amber");
  void el.offsetWidth;
  el.classList.add("pulse-amber");
  flushedFlash.value = true;
  window.setTimeout(() => {
    flushedFlash.value = false;
  }, 1800);
});

const countLabel = computed(() => {
  if (count.value === 0) return t("live.empty");
  return t(count.value === 1 ? "live.count.one" : "live.count.other", {
    values: { count: count.value },
  });
});

const formatTime = (ts: number, locale: string) => {
  try {
    return new Intl.DateTimeFormat(locale, {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleTimeString();
  }
};
</script>

<template>
  <div
    class="rounded-2xl border border-ink-800 bg-ink-900 shadow-[0_1px_0_rgba(255,255,255,0.02),0_24px_60px_-30px_rgba(0,0,0,0.6)] overflow-hidden"
  >
    <div
      ref="headerEl"
      class="flex items-center gap-3 px-5 py-4 border-b border-ink-800 bg-gradient-to-b from-ink-900 to-ink-900/70 rounded-t-2xl"
    >
      <span class="relative flex h-2.5 w-2.5">
        <span class="absolute inset-0 rounded-full bg-amber blink" />
        <span class="absolute inset-0 rounded-full bg-amber/40 animate-ping" />
      </span>
      <h2 class="text-[1.05rem] font-semibold tracking-tight text-ink-50">
        {{ t("live.title") }}
      </h2>
      <span
        v-if="scenarioMode !== 'idle'"
        class="mono text-[10px] uppercase tracking-[0.18em] text-ink-950 bg-emerald-400 px-1.5 py-0.5 rounded-sm ml-auto inline-flex items-center gap-1"
      >
        <span class="h-1 w-1 rounded-full bg-ink-950 blink" />
        {{ scenarioMode === "looping" ? "loop" : "auto" }}
      </span>
      <span
        v-else
        class="mono text-[10px] uppercase tracking-[0.18em] text-amber-bright bg-amber-soft px-1.5 py-0.5 rounded-sm ml-auto"
      >
        live
      </span>
    </div>

    <div
      class="px-5 py-3 flex items-center gap-3 text-sm border-b border-ink-800"
    >
      <span class="mono text-xs tabular-nums text-ink-100">
        {{ String(count).padStart(2, "0") }}
      </span>
      <span class="text-ink-300">{{ countLabel }}</span>
      <span
        v-if="flushedFlash"
        class="ml-auto mono text-[11px] text-amber-bright slide-in"
      >
        {{ t("live.flushed") }}
      </span>
      <button
        v-else-if="count > 0"
        type="button"
        class="ml-auto mono text-[11px] uppercase tracking-wider text-ink-300 hover:text-ink-50 transition-colors"
        @click="missingStore.clear()"
      >
        {{ t("panel.clear") }}
      </button>
    </div>

    <p class="px-5 py-3 text-xs text-ink-300 border-b border-ink-800">
      {{ t("live.subtitle") }}
    </p>

    <ol class="divide-y divide-ink-800 max-h-[24rem] overflow-y-auto">
      <li
        v-if="events.length === 0"
        class="px-5 py-12 text-center text-ink-300 text-sm"
      >
        <span
          class="mono text-[11px] uppercase tracking-[0.18em] text-ink-300/60 block mb-2"
        >
          POST /v1/missing
        </span>
        {{ t("live.empty") }}
      </li>
      <li
        v-for="(ev, i) in events"
        :key="`${ev.locale}-${ev.ns}-${ev.key}-${ev.ts}-${i}`"
        class="px-5 py-3 grid grid-cols-[1fr_auto_auto] items-center gap-3 slide-in"
      >
        <code class="mono text-[13px] text-ink-100 truncate" :title="ev.key">
          <span class="text-emerald-400">{{ ev.ns }}</span>
          <span class="text-ink-300">:</span>
          {{ ev.key }}
        </code>
        <span
          class="mono text-[10px] uppercase tracking-[0.18em] text-amber-bright bg-amber-soft px-1.5 py-0.5 rounded-sm"
        >
          {{ ev.locale }}
        </span>
        <time
          class="mono text-[11px] text-ink-300 tabular-nums"
          :datetime="new Date(ev.ts).toISOString()"
        >
          {{ formatTime(ev.ts, i18n.language) }}
        </time>
      </li>
    </ol>
  </div>
</template>
