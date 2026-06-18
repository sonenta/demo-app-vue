import { reactive } from "vue";
import type { MissingKeyEvent } from "@sonenta/vue-i18n";

// The official @sonenta/vue-i18n MissingKeyEvent ({ key, namespace,
// language_code, source_value?, sdk_meta? }) carries no client timestamp,
// so the in-app inspector stamps each event on receipt for display/ordering.
export type InspectorEvent = MissingKeyEvent & { ts: number };

type State = {
  events: InspectorEvent[];
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
    const ts = Date.now();
    const stamped: InspectorEvent[] = batch.map((ev) => ({ ...ev, ts }));
    state.events = [...stamped, ...state.events].slice(0, 50);
    state.flushed += batch.length;
    state.lastBatchAt = ts;
  },
  clear() {
    state.events = [];
    state.flushed = 0;
    state.lastBatchAt = null;
  },
};
