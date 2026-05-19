<script setup lang="ts">
import { computed, ref } from "vue";
import { useTranslation } from "@verbumia/vue-i18n";
import { tokenizeBash, tokenizeTsx, type Token } from "../lib/highlight";

const { t } = useTranslation();

const INSTALL = `npm install @verbumia/vue-i18n`;

const USAGE = [
  `import { createApp } from "vue";`,
  `import { VerbumiaPlugin, useTranslation } from "@verbumia/vue-i18n";`,
  `import App from "./App.vue";`,
  ``,
  `createApp(App)`,
  `  .use(VerbumiaPlugin, {`,
  `    projectId: "proj_xxx",`,
  `    apiKey: import.meta.env.VITE_VERBUMIA_KEY,`,
  `    defaultLocale: "en",`,
  `  })`,
  `  .mount("#app");`,
  ``,
  `// any component`,
  `const { t, i18n } = useTranslation();`,
  `// template:  {{ t("hero.title") }}`,
].join("\n");

const installTokens = computed<Token[]>(() => tokenizeBash(INSTALL));
const usageTokens = computed<Token[]>(() => tokenizeTsx(USAGE));

const copiedInstall = ref(false);
const copiedUsage = ref(false);

const copy = async (which: "install" | "usage") => {
  const code = which === "install" ? INSTALL : USAGE;
  try {
    await navigator.clipboard.writeText(code);
    if (which === "install") copiedInstall.value = true;
    else copiedUsage.value = true;
    window.setTimeout(() => {
      copiedInstall.value = false;
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
    </header>
    <div class="grid lg:grid-cols-2 gap-4">
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
            terminal
          </span>
          <button
            type="button"
            class="ml-auto mono text-[10px] uppercase tracking-[0.18em] text-ink-300 hover:text-emerald-400 transition-colors"
            @click="copy('install')"
          >
            {{ copiedInstall ? "copied ✓" : "copy" }}
          </button>
        </figcaption>
        <pre class="overflow-x-auto px-5 py-4 text-[13px] leading-relaxed mono"><code><span
              v-for="(tok, i) in installTokens"
              :key="i"
              :class="`tok-${tok.kind}`"
            >{{ tok.text }}</span></code></pre>
      </figure>
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
            @click="copy('usage')"
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
