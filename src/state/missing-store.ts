import { reactive } from "vue";
import type { MissingKeyEvent } from "@local/vue-i18n";

type State = {
  events: MissingKeyEvent[];
  flushed: number;
  lastBatchAt: number | null;
};

const state = reactive<State>({
  events: [],
  flushed: 0,
  lastBatchAt: null,
});

export const missingStore = {
  state,
  pushBatch(batch: MissingKeyEvent[]) {
    state.events = [...batch, ...state.events].slice(0, 50);
    state.flushed += batch.length;
    state.lastBatchAt = Date.now();
  },
  clear() {
    state.events = [];
    state.flushed = 0;
    state.lastBatchAt = null;
  },
};
