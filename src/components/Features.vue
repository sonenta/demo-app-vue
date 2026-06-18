<script setup lang="ts">
import { useTranslation } from "@sonenta/vue-i18n";

const { t } = useTranslation();

const FEATURES = [
  { n: "01", titleKey: "features.one.title", bodyKey: "features.one.body", glyph: "⚡" },
  { n: "02", titleKey: "features.two.title", bodyKey: "features.two.body", glyph: "◆" },
  { n: "03", titleKey: "features.three.title", bodyKey: "features.three.body", glyph: "≈" },
] as const;
</script>

<template>
  <section id="features" class="mx-auto max-w-6xl px-6 py-20 lg:py-28">
    <header class="max-w-3xl mb-12">
      <h2
        class="text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-ink-50"
      >
        {{ t("features.title") }}
      </h2>
    </header>
    <div
      class="grid md:grid-cols-3 gap-px bg-ink-800 rounded-2xl overflow-hidden border border-ink-800"
    >
      <article
        v-for="f in FEATURES"
        :key="f.n"
        class="bg-ink-900 p-7 flex flex-col gap-4 min-h-[14rem]"
      >
        <div class="flex items-center justify-between">
          <span class="mono text-[11px] uppercase tracking-[0.2em] text-ink-300">
            {{ f.n }}
          </span>
          <span aria-hidden class="text-2xl text-emerald-400">{{ f.glyph }}</span>
        </div>
        <h3 class="text-xl font-semibold tracking-tight leading-snug text-ink-50">
          {{ t(f.titleKey) }}
        </h3>
        <p class="text-sm leading-relaxed text-ink-300">{{ t(f.bodyKey) }}</p>
      </article>
    </div>
  </section>
</template>
