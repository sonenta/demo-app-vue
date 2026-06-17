<script setup lang="ts">
withDefaults(defineProps<{ size?: number }>(), { size: 28 });
</script>

<template>
  <span class="inline-flex items-center gap-2.5">
    <svg aria-hidden viewBox="0 0 100 100" :width="size" :height="size" class="shrink-0">
      <rect width="100" height="100" rx="22" fill="#0e1015" />
      <text x="45" y="76" text-anchor="middle" font-family="'Times New Roman', Times, Georgia, serif" font-size="80" font-weight="700" fill="#10b981" stroke="#10b981" stroke-width="3" stroke-linejoin="round" paint-order="stroke">S</text>
      <circle cx="80" cy="70" r="7" fill="#34d399" />
    </svg>
    <span class="text-[1.05rem] font-semibold tracking-tight text-ink-50">
      Sonenta
    </span>
  </span>
</template>
