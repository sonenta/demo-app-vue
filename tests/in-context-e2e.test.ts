/**
 * THE FULL IN-CONTEXT FLOW, END TO END, IN VUE — HEADLESS.
 *
 * Master's ask: "Register the plugin, open a session, push an edit from the
 * dashboard side, and watch the string change in the Vue app. Not that the
 * symbol imports. Not that the types resolve. That the text on screen changes."
 *
 * This drives the SHIPPED client code path, whole:
 *
 *   inContextPlugin registered on the real i18n provider  (plugins: [...])
 *     -> controller.pair(token)   -> real InContextClient.pair() over HTTP
 *     -> real WebSocket connect   -> real Centrifugo JSON handshake
 *     -> subscribe to the channel -> the SDK's own frames, not mine
 *     -> server PUSHES an `edit`  -> the SDK parses it (parseEvent)
 *     -> applies it               -> Vue REPAINTS
 *
 * WHAT IS REAL: the plugin, the client, the pair call, the WebSocket, the
 * Centrifugo frame protocol, the event parse, the override write, the repaint.
 * Every line of that is @sonenta code, unmocked.
 *
 * WHAT IS SUBSTITUTED: the BACKEND. `fetchImpl` answers POST /v1/in-context/pair
 * (no prod credential — master refused one, correctly), and `rtUrl` points at a
 * local WebSocket server speaking the same Centrifugo protocol the real one
 * does. `rtUrl` is an official option, documented "for self-hosted Centrifugo /
 * tests" — this is the seam the SDK provides, not a hole I cut.
 *
 * SO THIS IS NOT A PROOF THAT THE SONENTA BACKEND WORKS. It is a proof that the
 * Vue in-context CLIENT works end to end against a correct server. Those are
 * different claims and I will not let them be merged.
 *
 * NO BROWSER. jsdom only — the founder is working on this machine.
 */
import { describe, it, expect, afterEach } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { createSonentaI18n, useTranslation } from "@sonenta/vue-i18n";
import { inContextPlugin, type InContextController } from "@sonenta/in-context/vue";
import { WebSocketServer, WebSocket as NodeWebSocket, type WebSocket as WS } from "ws";

// jsdom's WebSocket does not interoperate with a `ws` server (Event realm
// clash). Give the SDK a Node WebSocket client; the DOM stays jsdom's, which is
// all Vue needs. The SDK calls `new WebSocket(url)` off the global — this is the
// same code path, just a conformant socket implementation under it.
(globalThis as unknown as { WebSocket: unknown }).WebSocket = NodeWebSocket;
import { testI18nConfig, staticCdnFetch, waitFor } from "./sdk-harness";

const CHANNEL = "in-context:session_test";
const EDITED_KEY = "hero.title.line1";

/** A local server that speaks the Centrifugo JSON protocol the SDK expects. */
const startFakeCentrifugo = async () => {
  const wss = new WebSocketServer({ port: 0 });
  await new Promise((r) => wss.once("listening", r));
  const port = (wss.address() as { port: number }).port;
  const sockets: WS[] = [];
  let subscribed = false;

  wss.on("connection", (ws) => {
    sockets.push(ws);
    ws.on("message", (raw) => {
      const msg = JSON.parse(String(raw));
      // 1. the SDK sends {id, connect:{token}} -> we ack with a connect reply
      if (msg.connect) ws.send(JSON.stringify({ id: msg.id, connect: { client: "c1" } }));
      // 2. the SDK then sends {id, subscribe:{channel}} -> ack it
      if (msg.subscribe) {
        subscribed = true;
        ws.send(JSON.stringify({ id: msg.id, subscribe: {} }));
      }
    });
  });

  return {
    rtUrl: `ws://127.0.0.1:${port}`,
    isSubscribed: () => subscribed,
    /** What the dashboard does when someone types a new value. */
    pushEdit: (value: string) => {
      const pub = {
        push: {
          channel: CHANNEL,
          pub: {
            data: {
              type: "edit",
              namespace: "common",
              key: EDITED_KEY,
              languageCode: "en",
              value,
            },
          },
        },
      };
      for (const ws of sockets) ws.send(JSON.stringify(pub));
    },
    close: async () => {
      for (const ws of sockets) { try { ws.terminate(); } catch { /* ignore */ } }
      await new Promise((r) => wss.close(() => r(null)));
    },
  };
};

let server: Awaited<ReturnType<typeof startFakeCentrifugo>> | null = null;
afterEach(async () => {
  await server?.close();
  server = null;
});

const Hero = defineComponent({
  setup() {
    const { t, ready } = useTranslation();
    return () => h("h1", { "data-ready": String(ready.value) }, t(EDITED_KEY));
  },
});

describe("in-context END TO END in Vue (plugin -> pair -> websocket -> edit -> repaint)", () => {
  it("repaints the Vue screen when the dashboard pushes an edit", async () => {
    server = await startFakeCentrifugo();
    const rt = server;

    // The backend's pair response. No prod credential: fetchImpl answers it.
    const pairFetch: typeof fetch = async (input, init) => {
      const url = typeof input === "string" ? input : String(input);
      if (url.includes("/v1/in-context/pair")) {
        return new Response(
          JSON.stringify({
            token: "sub-token",
            channel: CHANNEL,
            rtUrl: rt.rtUrl,
            expiresAt: Date.now() + 900_000,
            sessionId: "sess_test",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url.includes("/v1/in-context/")) return new Response("{}", { status: 200 });
      return staticCdnFetch(input, init);
    };

    let controller: InContextController | null = null;

    // THE REGISTRATION: the real in-context plugin, on the real i18n provider.
    const plugin = createSonentaI18n({
      ...testI18nConfig,
      fetchImpl: pairFetch,
      plugins: [
        inContextPlugin({
          fetchImpl: pairFetch,
          onReady: (c) => (controller = c),
        }),
      ],
    });

    const wrapper = mount(Hero, { attachTo: document.body, global: { plugins: [plugin] } });
    await waitFor(() => wrapper.find("h1").attributes("data-ready") === "true");

    const before = wrapper.find("h1").text();
    expect(before).toBe("Ship in every language."); // the real bundle value
    const node = wrapper.find("h1").element;

    // THE SESSION: pair, exactly as a host's pairing UI would.
    await waitFor(() => controller !== null, 3000);
    await controller!.pair("pairing-token-from-the-dashboard");

    // THE SDK's own WebSocket must connect and subscribe on its own.
    await waitFor(() => rt.isSubscribed(), 5000);

    // THE EDIT: pushed from the dashboard side, over the wire.
    rt.pushEdit("Edited from the dashboard.");

    // THE CLAIM: the text on screen changes.
    await waitFor(() => wrapper.find("h1").text() !== before, 5000);

    expect(wrapper.find("h1").text()).toBe("Edited from the dashboard.");
    expect(wrapper.find("h1").element).toBe(node); // patched in place, not remounted
    expect(node.isConnected).toBe(true);
  }, 20000);
});
