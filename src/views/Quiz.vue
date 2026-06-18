<script setup lang="ts">
import { computed, onUnmounted, ref } from "vue";
import { RouterLink } from "vue-router";
import { useTranslation } from "@sonenta/vue-i18n";
import Header from "../components/Header.vue";
import Footer from "../components/Footer.vue";
import {
  quizStore,
  OPTION_NUMS,
  TOTAL,
  promptKey,
  optionKey,
} from "../state/quiz-store";
import { openFeedback } from "../feedback/feedback";

const { t } = useTranslation("quiz");

const name1 = ref("");
const name2 = ref("");

const phase = computed(() => quizStore.state.phase);
const index = computed(() => quizStore.state.index);
const selected = computed(() => quizStore.state.selected);
const scores = computed(() => quizStore.state.scores);
const names = computed(() => quizStore.state.names);

const question = computed(() => quizStore.currentQuestion());
const correct = computed(() => question.value?.correct ?? null);

const displayName = (i: 0 | 1) =>
  names.value[i] ||
  t(i === 0 ? "setup.player1.default" : "setup.player2.default");

const currentName = computed(() => displayName(quizStore.currentPlayer()));

const promptText = computed(() =>
  question.value ? t(promptKey(question.value.n)) : "",
);
const optionText = (o: number) =>
  question.value ? t(optionKey(question.value.n, o)) : "";

const isCorrectAnswer = computed(
  () => selected.value != null && selected.value === correct.value,
);

const winnerLabel = computed(() => {
  const [a, b] = scores.value;
  if (a === b) return t("result.tie");
  return t("result.winner", {
    values: { name: displayName(a > b ? 0 : 1) },
  });
});

const scoreline = (i: 0 | 1) =>
  t("result.scoreline", {
    values: { name: displayName(i), score: scores.value[i], total: TOTAL },
  });

const startMatch = () => {
  quizStore.start(
    name1.value.trim() || t("setup.player1.default"),
    name2.value.trim() || t("setup.player2.default"),
  );
};

const pick = (o: number) => quizStore.select(o);
const lock = () => quizStore.lock();
const next = () => quizStore.next();
const replay = () => {
  quizStore.reset();
  name1.value = "";
  name2.value = "";
};

onUnmounted(() => quizStore.reset());
</script>

<template>
  <Header />
  <main class="flex-1">
    <section class="mx-auto max-w-2xl px-6 pt-12 pb-20">
      <RouterLink
        to="/"
        class="mono text-[11px] uppercase tracking-[0.22em] text-ink-300 hover:text-emerald-400 transition-colors inline-flex items-center"
      >
        ← {{ t("nav.back") }}
      </RouterLink>
      <h1
        class="mt-4 text-3xl md:text-5xl font-semibold tracking-[-0.025em] text-ink-50"
      >
        {{ t("meta.title") }}
      </h1>
      <p class="mt-3 text-base text-ink-300">{{ t("meta.tagline") }}</p>

      <!-- INTRO -->
      <div
        v-if="phase === 'intro'"
        key="quiz-intro"
        class="mt-10 rounded-2xl border border-ink-800 bg-ink-900 p-7 slide-in"
      >
        <h2 class="text-lg font-semibold text-ink-50">
          {{ t("setup.heading") }}
        </h2>
        <p class="mt-2 text-sm text-ink-300">{{ t("setup.blurb") }}</p>
        <div class="mt-6 grid sm:grid-cols-2 gap-4">
          <label class="block">
            <span
              class="mono text-[10px] uppercase tracking-[0.18em] text-ink-300"
            >
              {{ t("setup.player1.label") }}
            </span>
            <input
              v-model="name1"
              type="text"
              :placeholder="t('setup.player1.default')"
              class="mt-2 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50 placeholder:text-ink-500 focus-visible:border-emerald-400"
            />
          </label>
          <label class="block">
            <span
              class="mono text-[10px] uppercase tracking-[0.18em] text-ink-300"
            >
              {{ t("setup.player2.label") }}
            </span>
            <input
              v-model="name2"
              type="text"
              :placeholder="t('setup.player2.default')"
              class="mt-2 w-full rounded-lg border border-ink-700 bg-ink-950 px-3 py-2 text-ink-50 placeholder:text-ink-500 focus-visible:border-emerald-400"
            />
          </label>
        </div>
        <button
          type="button"
          class="mt-7 w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-ink-950 font-semibold py-3 transition-colors"
          @click="startMatch"
        >
          {{ t("setup.start") }}
        </button>
      </div>

      <!-- PLAYING / REVEAL -->
      <div
        v-else-if="phase === 'playing' || phase === 'reveal'"
        :key="`quiz-play-${index}`"
        class="mt-10"
      >
        <div class="flex items-center justify-between gap-4">
          <span
            class="mono text-[11px] uppercase tracking-[0.18em] text-ink-300"
          >
            {{
              t("hud.question", {
                values: { current: index + 1, total: TOTAL },
              })
            }}
          </span>
          <div class="flex items-center gap-4 mono text-xs">
            <span
              :class="
                quizStore.currentPlayer() === 0
                  ? 'text-emerald-400'
                  : 'text-ink-300'
              "
            >
              {{
                t("hud.score", {
                  values: { name: displayName(0), score: scores[0] },
                })
              }}
            </span>
            <span
              :class="
                quizStore.currentPlayer() === 1
                  ? 'text-emerald-400'
                  : 'text-ink-300'
              "
            >
              {{
                t("hud.score", {
                  values: { name: displayName(1), score: scores[1] },
                })
              }}
            </span>
          </div>
        </div>

        <div class="mt-3 h-1 rounded-full bg-ink-800 overflow-hidden">
          <div
            class="h-full bg-emerald-500 transition-all duration-300"
            :style="{ width: `${((index + 1) / TOTAL) * 100}%` }"
          />
        </div>

        <p
          class="mt-6 mono text-[11px] uppercase tracking-[0.2em] text-emerald-400"
        >
          {{ t("hud.turn", { values: { name: currentName } }) }}
        </p>

        <div
          class="mt-4 rounded-2xl border border-ink-800 bg-ink-900 p-7 slide-in"
        >
          <div class="flex items-start gap-3">
            <h2
              class="flex-1 text-xl md:text-2xl font-semibold text-ink-50 leading-snug"
            >
              {{ promptText }}
            </h2>
            <button
              type="button"
              class="shrink-0 mono text-[10px] uppercase tracking-[0.18em] px-2.5 py-1.5 rounded-md border border-ink-700 text-ink-300 hover:border-emerald-400 hover:text-emerald-400 transition-colors"
              @click="openFeedback()"
            >
              ✦ {{ t("action.rate") }}
            </button>
          </div>

          <ul class="mt-6 grid gap-3">
            <li v-for="o in OPTION_NUMS" :key="o">
              <button
                type="button"
                :disabled="phase === 'reveal'"
                :class="[
                  'w-full text-left rounded-lg border px-4 py-3 transition-colors flex items-center gap-3',
                  phase === 'reveal' && o === correct
                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300'
                    : phase === 'reveal' &&
                        o === selected &&
                        o !== correct
                      ? 'border-amber bg-amber-soft text-amber-bright'
                      : selected === o
                        ? 'border-emerald-400 bg-emerald-500/10 text-ink-50'
                        : 'border-ink-700 bg-ink-950 text-ink-100 hover:border-ink-500',
                ]"
                @click="pick(o)"
              >
                <span
                  class="mono text-[11px] uppercase tracking-[0.18em] text-ink-300"
                >
                  {{ o }}
                </span>
                <span>{{ optionText(o) }}</span>
              </button>
            </li>
          </ul>

          <div v-if="phase === 'playing'" class="mt-6">
            <button
              type="button"
              :disabled="selected == null"
              class="w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:hover:bg-emerald-500 text-ink-950 font-semibold py-3 transition-colors"
              @click="lock"
            >
              {{ index >= TOTAL - 1 ? t("action.finish") : t("action.next") }}
            </button>
          </div>

          <div v-else class="mt-6 slide-in">
            <p
              :class="[
                'text-sm font-medium',
                isCorrectAnswer ? 'text-emerald-400' : 'text-amber-bright',
              ]"
            >
              {{
                isCorrectAnswer
                  ? t("feedback.correct")
                  : t("feedback.wrong", {
                      values: { answer: optionText(correct ?? 0) },
                    })
              }}
            </p>
            <button
              type="button"
              class="mt-5 w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-ink-950 font-semibold py-3 transition-colors"
              @click="next"
            >
              {{ index >= TOTAL - 1 ? t("action.finish") : t("action.next") }}
            </button>
          </div>
        </div>
      </div>

      <!-- RESULT -->
      <div
        v-else
        key="quiz-result"
        class="mt-10 rounded-2xl border border-ink-800 bg-ink-900 p-8 text-center slide-in"
      >
        <p class="mono text-[11px] uppercase tracking-[0.2em] text-ink-300">
          {{ t("result.heading") }}
        </p>
        <p class="mt-4 text-lg text-emerald-400 font-medium">
          {{ winnerLabel }}
        </p>
        <div class="mt-5 space-y-1 text-ink-100 tabular-nums">
          <p>{{ scoreline(0) }}</p>
          <p>{{ scoreline(1) }}</p>
        </div>
        <div class="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <button
            type="button"
            class="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-ink-950 font-semibold px-6 py-3 transition-colors"
            @click="replay"
          >
            {{ t("result.again") }}
          </button>
          <RouterLink
            to="/"
            class="rounded-lg border border-ink-700 hover:border-ink-500 text-ink-100 font-medium px-6 py-3 transition-colors"
          >
            {{ t("nav.back") }}
          </RouterLink>
        </div>
      </div>
    </section>
  </main>
  <Footer />
</template>
