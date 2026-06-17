<script setup lang="ts">
import { useTranslation } from "@local/vue-i18n";
import Brand from "./Brand.vue";

const { t } = useTranslation();
</script>

<template>
  <footer class="border-t border-ink-800">
    <div class="mx-auto max-w-6xl px-6 py-10 flex flex-wrap items-center gap-6">
      <Brand :size="22" />
      <p class="text-ink-300 text-sm">{{ t("footer.tagline") }}</p>
      <div class="ml-auto flex items-center gap-5 text-xs text-ink-300 mono">
        <a
          href="https://github.com/sonenta/demo-app-vue"
          class="hover:text-ink-50 transition-colors"
        >
          {{ t("footer.repo") }}
        </a>
        <span class="border-l border-ink-800 h-4" />
        <span>{{ t("footer.demo") }}</span>
      </div>
    </div>
  </footer>
</template>
