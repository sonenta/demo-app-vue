<script setup lang="ts">
import { onUnmounted, ref, watch } from "vue";

/**
 * First-paint cover: holds the page hidden (visually) for a beat while the
 * locale bundle loads, then fades out. We always render the page tree behind
 * it so the SDK kicks off the fetch immediately — Splash is purely cosmetic.
 *
 * CAPPED (react 34ab10d parity): `ready` waits on a network fetch, so gating
 * the reveal on it alone lets a slow link hide the whole page indefinitely
 * (measured "never" on 2G in the React sibling). After MAX_COVER_MS we reveal
 * regardless — a page with a few keys still resolving beats no page at all,
 * and the controls work meanwhile. Do NOT reintroduce an opacity/v-if gate on
 * the page tree: the cap would then expire onto an empty screen.
 */
const props = defineProps<{ ready: boolean }>();

const MAX_COVER_MS = 1200;

const mounted = ref(true);
const fading = ref(false);

const reveal = () => {
  if (fading.value) return;
  fading.value = true;
  window.setTimeout(() => {
    mounted.value = false;
  }, 320);
};

watch(() => props.ready, (ready) => ready && reveal(), { immediate: true });

const capId = window.setTimeout(reveal, MAX_COVER_MS);
onUnmounted(() => window.clearTimeout(capId));
</script>

<template>
  <div
    v-if="mounted"
    role="status"
    aria-live="polite"
    :aria-busy="!ready"
    class="fixed inset-0 z-50 grid place-items-center bg-ink-950 transition-opacity duration-300"
    :class="fading ? 'opacity-0 pointer-events-none' : 'opacity-100'"
  >
    <div class="flex flex-col items-center gap-5">
      <svg aria-hidden viewBox="0 0 32 32" width="48" height="48" class="splash-logo">
        <rect width="32" height="32" rx="7" fill="#0e1015" />
        <path d="M9 9.5l5.6 12.5h2L22 9.5h-2.5l-4 9.4-3.9-9.4z" fill="#10b981" />
      </svg>
      <span class="mono text-[10px] uppercase tracking-[0.22em] text-ink-300">
        loading bundles
      </span>
      <span class="block h-px w-24 bg-ink-800 overflow-hidden rounded-full">
        <span class="block h-full w-1/2 bg-emerald-500 splash-bar" />
      </span>
    </div>
  </div>
</template>
