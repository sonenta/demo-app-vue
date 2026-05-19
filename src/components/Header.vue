<script setup lang="ts">
import { RouterLink } from "vue-router";
import { useTranslation } from "@verbumia/vue-i18n";
import Brand from "./Brand.vue";
import LangSwitcher from "./LangSwitcher.vue";

const { t } = useTranslation();
</script>

<template>
  <header
    class="sticky top-0 z-30 backdrop-blur-md bg-ink-950/75 border-b border-ink-800"
  >
    <div class="mx-auto max-w-6xl flex items-center gap-6 px-6 h-14">
      <RouterLink to="/" class="flex items-center" aria-label="Verbumia home">
        <Brand />
      </RouterLink>
      <span
        class="hidden md:inline-flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.18em] text-ink-300 px-2 py-0.5 border border-ink-700 rounded-sm"
      >
        <span class="h-1 w-1 rounded-full bg-emerald-400" />
        live demo · vue
      </span>
      <nav class="ml-auto hidden md:flex items-center gap-6 text-sm text-ink-300">
        <a href="#features" class="hover:text-ink-50 transition-colors">
          {{ t("nav.product") }}
        </a>
        <a href="#install" class="hover:text-ink-50 transition-colors">
          {{ t("install.eyebrow") }}
        </a>
        <a href="#docs" class="hover:text-ink-50 transition-colors">
          {{ t("nav.docs") }}
        </a>
        <RouterLink
          to="/quiz"
          class="text-emerald-400 hover:text-emerald-300 transition-colors"
        >
          {{ t("nav.trivia") }}
        </RouterLink>
      </nav>
      <LangSwitcher />
      <a
        href="#signin"
        class="hidden sm:inline-flex items-center text-sm font-medium text-ink-300 hover:text-ink-50 transition-colors"
      >
        {{ t("nav.signin") }} →
      </a>
    </div>
  </header>
</template>
