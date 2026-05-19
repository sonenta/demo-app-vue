/**
 * Scenario store — drives the autoplay/loop demo.
 *
 * Triggers a curated sequence of t() calls on intentionally-missing keys,
 * spaced TICK_MS apart. In loop mode, after the last key fires we clear the
 * missing-store and restart, so video captures get a clean reset every cycle.
 *
 * The fire callback is wired by ScenarioRunner.vue once it's mounted (where
 * useTranslation is available).
 */
import { reactive } from "vue";

export type ScenarioMode = "idle" | "playing" | "looping";

export const SCENARIO_KEYS = [
  "legal.gdpr.long_clause",
  "checkout.tax.tooltip",
  "error.payment.declined",
  "landing.coming_soon",
] as const;

export const TICK_MS = 3500;
export const RESET_MS = 1500;

type State = {
  mode: ScenarioMode;
  cursor: number;
  nextFireAt: number | null;
};

const state = reactive<State>({
  mode: "idle",
  cursor: 0,
  nextFireAt: null,
});

let fireFn: ((key: string) => void) | null = null;
let resetFn: (() => void) | null = null;
let timerId: number | null = null;

const cancelTimer = () => {
  if (timerId != null) {
    window.clearTimeout(timerId);
    timerId = null;
  }
};

const tick = () => {
  if (state.mode === "idle") return;
  const key = SCENARIO_KEYS[state.cursor];
  if (key && fireFn) fireFn(key);
  const isLast = state.cursor >= SCENARIO_KEYS.length - 1;
  if (isLast) {
    if (state.mode === "looping") {
      state.cursor = 0;
      state.nextFireAt = Date.now() + RESET_MS + TICK_MS;
      timerId = window.setTimeout(() => {
        if (resetFn) resetFn();
        timerId = window.setTimeout(tick, TICK_MS);
      }, RESET_MS);
    } else {
      state.mode = "idle";
      state.cursor = 0;
      state.nextFireAt = null;
    }
  } else {
    state.cursor += 1;
    state.nextFireAt = Date.now() + TICK_MS;
    timerId = window.setTimeout(tick, TICK_MS);
  }
};

export const scenarioStore = {
  state,
  attach(fire: (key: string) => void, reset: () => void) {
    fireFn = fire;
    resetFn = reset;
  },
  start(mode: Exclude<ScenarioMode, "idle">) {
    cancelTimer();
    state.mode = mode;
    state.cursor = 0;
    state.nextFireAt = Date.now() + 200;
    timerId = window.setTimeout(tick, 200);
  },
  stop() {
    cancelTimer();
    state.mode = "idle";
    state.cursor = 0;
    state.nextFireAt = null;
  },
};
