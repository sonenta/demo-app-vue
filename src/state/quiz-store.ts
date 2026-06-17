/**
 * Quiz store — 2-player local hot-seat trivia.
 *
 * Keys + strings are the CANONICAL shared set seeded on the live
 * demo-public project (artifact 48318529, sha 3e456aba) so all three
 * demos (React / Vue / Svelte) rate the same strings and the
 * client-admin dashboard aggregates feedback consistently.
 *
 * 10 questions, 5 options each (`quiz.q.<n>.prompt` /
 * `quiz.q.<n>.a.<1..5>`). Players alternate by question; 1 point per
 * correct answer; highest score after 10 wins. Only question numbers +
 * the correct option live here; every visible string resolves through
 * @sonenta/vue-i18n.
 */
import { reactive } from "vue";

export type Question = { n: number; correct: number };

/** correct option (1..5) per question — answers to the i18n trivia. */
export const QUESTIONS: readonly Question[] = [
  { n: 1, correct: 1 }, // i18n = Internationalization
  { n: 2, correct: 2 }, // most native speakers = Mandarin Chinese
  { n: 3, correct: 3 }, // RTL script = Arabic
  { n: 4, correct: 2 }, // locale + Region
  { n: 5, correct: 3 }, // ISO 639-1
  { n: 6, correct: 3 }, // UTF-8
  { n: 7, correct: 3 }, // "Hola, mundo" = Spanish
  { n: 8, correct: 3 }, // CLDR plural categories = Six
  { n: 9, correct: 1 }, // pt-BR = Brazilian Portuguese
  { n: 10, correct: 3 }, // CJK = Japanese
] as const;

export const OPTION_NUMS = [1, 2, 3, 4, 5] as const;
export const TOTAL = QUESTIONS.length;

// ns=quiz (spec v3): the `quiz.` prefix is stripped — keys are resolved
// via useTranslation("quiz").
export const promptKey = (n: number) => `q.${n}.prompt`;
export const optionKey = (n: number, o: number) => `q.${n}.a.${o}`;

export type Phase = "intro" | "playing" | "reveal" | "result";

type State = {
  phase: Phase;
  index: number;
  selected: number | null;
  scores: [number, number];
  names: [string, string];
};

const state = reactive<State>({
  phase: "intro",
  index: 0,
  selected: null,
  scores: [0, 0],
  names: ["", ""],
});

/** 0-based player whose turn it is — even question → P0, odd → P1. */
const currentPlayer = (): 0 | 1 => (state.index % 2 === 0 ? 0 : 1);

const currentQuestion = (): Question | undefined => QUESTIONS[state.index];

export const quizStore = {
  state,
  currentPlayer,
  currentQuestion,
  start(name1: string, name2: string) {
    state.names = [name1, name2];
    state.scores = [0, 0];
    state.index = 0;
    state.selected = null;
    state.phase = "playing";
  },
  select(opt: number) {
    if (state.phase !== "playing") return;
    state.selected = opt;
  },
  lock() {
    if (state.phase !== "playing" || state.selected == null) return;
    const q = currentQuestion();
    if (q && state.selected === q.correct) {
      state.scores[currentPlayer()] += 1;
    }
    state.phase = "reveal";
  },
  next() {
    if (state.phase !== "reveal") return;
    if (state.index >= TOTAL - 1) {
      state.phase = "result";
      return;
    }
    state.index += 1;
    state.selected = null;
    state.phase = "playing";
  },
  reset() {
    state.phase = "intro";
    state.index = 0;
    state.selected = null;
    state.scores = [0, 0];
  },
};
