import { createRouter, createWebHashHistory } from "vue-router";
import Home from "./views/Home.vue";
import Demo from "./views/Demo.vue";
import Quiz from "./views/Quiz.vue";

export const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", name: "home", component: Home },
    { path: "/demo", name: "demo", component: Demo },
    { path: "/quiz", name: "quiz", component: Quiz },
  ],
});

// §0e: no per-route reset — the rendered-key registry is mount-tracked +
// ref-counted in @verbumia/vue-i18n (keys drop when their view unmounts;
// persistent strings survive navigation).
