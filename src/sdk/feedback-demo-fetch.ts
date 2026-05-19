/**
 * Canned `fetchImpl` for the DEFAULT (static) demo mode.
 *
 * The deployable showcase (Vercel) must work with zero backend: this
 * mock answers the @verbumia/feedback wire endpoints (c8e86de1) locally
 * and instantly, so the panel shows a real server-style sessionId, a
 * working rate/suggest flow, and the §3 getStrings hash path — all
 * offline. Opt into the genuine live loop with VITE_FEEDBACK_LIVE=1
 * (local dev only), which swaps this for the global fetch.
 */

/** deterministic stand-in for the server `translation_hash` (djb2 over
 * ns:key) — stable per key so rate/suggest targets stay consistent. */
const translationHash = (value: string): string => {
  let h = 5381;
  for (let i = 0; i < value.length; i++) {
    h = ((h << 5) + h) ^ value.charCodeAt(i);
  }
  return `th_${(h >>> 0).toString(36)}`;
};

// one stable server-style session id per page load (mimics the
// server-minted, JWT-bound grouping_key — the client never makes it up).
const SESSION_ID = `sess_demo_${Math.random().toString(36).slice(2, 10)}`;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const tokenBundle = () => ({
  access_token: `demo_at_${Math.random().toString(36).slice(2, 12)}`,
  token_type: "Bearer",
  expires_in: 3600,
  refresh_token: `demo_rt_${Math.random().toString(36).slice(2, 12)}`,
  refresh_expires_in: 86400,
  end_user_id: null,
  tos_version: "2026-05-18",
  grouping_key: SESSION_ID,
});

export const demoFetch: typeof fetch = async (input, init) => {
  const url = new URL(
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : input.url,
    "http://demo.local",
  );
  const path = url.pathname;
  const method = (init?.method ?? "GET").toUpperCase();

  if (path === "/v1/feedback/tos" && method === "POST")
    return json(tokenBundle());

  if (path === "/v1/feedback/token/refresh" && method === "POST")
    return json(tokenBundle());

  if (path === "/v1/feedback/strings" && method === "GET") {
    const language = url.searchParams.get("language") ?? "en";
    const keys = (url.searchParams.get("keys") ?? "")
      .split(",")
      .filter(Boolean);
    const strings = keys.map((nsKey) => {
      const [namespace, ...rest] = nsKey.split(":");
      const key = rest.join(":");
      return {
        namespace,
        key,
        // canonical server hash — intentionally derived from ns:key so it
        // differs from the client's value-fallback, proving prefetch wins.
        translation_hash: translationHash(`${namespace}:${key}`),
        value: "",
        avg_stars: null,
        ratings_count: 0,
        my_rating: null,
      };
    });
    return json({ project_id: "demo", language, strings });
  }

  if (path === "/v1/feedback/ratings" && method === "POST") {
    const body = JSON.parse(String(init?.body ?? "{}"));
    const n = body.ratings?.length ?? 0;
    return json({ accepted: n, rejected: 0, items: [] });
  }

  if (path === "/v1/feedback/suggestions" && method === "POST") {
    const body = JSON.parse(String(init?.body ?? "{}"));
    const items = (body.suggestions ?? []).map((_: unknown, i: number) => ({
      suggestion_id: `sug_demo_${Date.now()}_${i}`,
    }));
    return json({ accepted: items.length, rejected: 0, items });
  }

  return json({ code: "not_found" }, 404);
};
