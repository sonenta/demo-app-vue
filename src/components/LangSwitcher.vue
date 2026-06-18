<script setup lang="ts">
import { useTranslation } from "@sonenta/vue-i18n";

const { t, language, setLanguage } = useTranslation();

const LOCALES = [
  { code: "fr", labelKey: "lang.fr" },
  { code: "en", labelKey: "lang.en" },
  { code: "es", labelKey: "lang.es" },
] as const;
</script>

<template>
  <div
    role="group"
    :aria-label="t('lang.switcher.label')"
    class="inline-flex items-center rounded-full border border-ink-700 bg-ink-900/60 p-0.5 text-xs font-medium"
  >
    <button
      v-for="l in LOCALES"
      :key="l.code"
      type="button"
      :class="[
        'px-3 py-1 rounded-full transition-colors uppercase tracking-wider',
        language === l.code
          ? 'bg-ink-50 text-ink-950'
          : 'text-ink-300 hover:text-ink-50',
      ]"
      :aria-pressed="language === l.code"
      :aria-label="t(l.labelKey)"
      :lang="l.code"
      @click="setLanguage(l.code)"
    >
      {{ l.code }}
    </button>
  </div>
</template>
