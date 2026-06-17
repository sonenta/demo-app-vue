/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** "1" → opt into the real live feedback loop (local dev only).
   * Unset/anything else → static canned demo transport (Vercel-safe). */
  readonly VITE_FEEDBACK_LIVE?: string;
  /** @sonenta/feedback API base — used only in live mode. */
  readonly VITE_FEEDBACK_API_BASE?: string;
  /** provisioned demo project uuid — used only in live mode. */
  readonly VITE_FEEDBACK_PROJECT_ID?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "*.vue" {
  import type { DefineComponent } from "vue";
  const component: DefineComponent<object, object, unknown>;
  export default component;
}
