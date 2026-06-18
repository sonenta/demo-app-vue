<script setup lang="ts">
import { computed, ref } from "vue";
import { useTranslation } from "@sonenta/vue-i18n";
import { tokenizeTsx, type Token } from "../lib/highlight";

const { t } = useTranslation();

// Official first-class Vue 3 binding — this demo runs on @sonenta/vue-i18n.
const USAGE = [
  `// Vue 3 — official Sonenta binding`,
  `// npm i @sonenta/vue-i18n`,
  `import { createApp } from "vue";`,
  `import { createSonentaI18n, useTranslation } from "@sonenta/vue-i18n";`,
  `import App from "./App.vue";`,
  ``,
  `createApp(App)`,
  `  .use(createSonentaI18n({`,
  `    token: import.meta.env.VITE_SONENTA_KEY,`,
  `    projectUuid: "proj_xxx",`,
  `    defaultLocale: "en",`,
  `  }))`,
  `  .mount("#app");`,
  ``,
  `// any component`,
  `const { t, setLanguage } = useTranslation();`,
  `// template:  {{ t("hero.title") }}`,
].join("\n");

const usageTokens = computed<Token[]>(() => tokenizeTsx(USAGE));

const copiedUsage = ref(false);

const copyUsage = async () => {
  try {
    await navigator.clipboard.writeText(USAGE);
    copiedUsage.value = true;
    window.setTimeout(() => {
      copiedUsage.value = false;
    }, 1400);
  } catch {
    // clipboard blocked — non-fatal in demo context
  }
};
</script>

<template>
  <section id="install" class="mx-auto max-w-6xl px-6 py-20">
    <header class="max-w-2xl mb-8">
      <p
        class="mono text-[11px] uppercase tracking-[0.22em] text-emerald-400 inline-flex items-center gap-2"
      >
        <span class="h-1 w-1 rounded-full bg-emerald-400" />
        {{ t("install.eyebrow") }}
      </p>
      <h2
        class="text-3xl md:text-4xl font-semibold tracking-[-0.02em] text-ink-50 mt-3"
      >
        {{ t("install.title") }}
      </h2>
      <div class="mt-4 flex flex-wrap items-center gap-2">
        <span
          class="mono text-[11px] uppercase tracking-[0.18em] rounded-full border border-ink-700 px-2.5 py-1 text-ink-200"
        >
          {{ t("binding.label") }}
        </span>
        <span
          class="mono text-[11px] uppercase tracking-[0.18em] rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-emerald-300"
        >
          {{ t("binding.status") }}
        </span>
      </div>
      <p class="mt-4 text-sm md:text-base leading-relaxed text-ink-300">
        {{ t("binding.positioning") }}
      </p>
    </header>
    <div class="max-w-3xl">
      <figure
        class="rounded-2xl border border-ink-800 bg-ink-900 overflow-hidden shadow-[0_24px_60px_-30px_rgba(0,0,0,0.7)]"
      >
        <figcaption
          class="flex items-center gap-3 px-4 py-2.5 border-b border-ink-800 text-xs"
        >
          <span class="flex gap-1.5">
            <span class="h-2.5 w-2.5 rounded-full bg-ink-700" />
            <span class="h-2.5 w-2.5 rounded-full bg-ink-700" />
            <span class="h-2.5 w-2.5 rounded-full bg-ink-700" />
          </span>
          <span class="mono uppercase tracking-[0.18em] text-ink-300">
            src/main.ts
          </span>
          <button
            type="button"
            class="ml-auto mono text-[10px] uppercase tracking-[0.18em] text-ink-300 hover:text-emerald-400 transition-colors"
            @click="copyUsage"
          >
            {{ copiedUsage ? "copied ✓" : "copy" }}
          </button>
        </figcaption>
        <pre class="overflow-x-auto px-5 py-4 text-[13px] leading-relaxed mono"><code><span
              v-for="(tok, i) in usageTokens"
              :key="i"
              :class="`tok-${tok.kind}`"
            >{{ tok.text }}</span></code></pre>
      </figure>
    </div>
  </section>
</template>
