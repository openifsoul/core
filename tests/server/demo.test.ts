import assert from "node:assert/strict";
import test from "node:test";
import {
  createDemoAPI,
  createPaidBudgetGate,
  DEMO_LIMITS,
} from "../../apps/server/src/demo.js";
import type { PrivateStore } from "../../apps/server/src/api.js";
import {
  BRIDGE_VERSION,
  type BridgeRequest,
} from "../../packages/adapter-sdk/src/index.js";
import type { ModelClient } from "../../packages/model-providers/src/types.js";
const origin = "https://demo.example";
const payload = (requestId = "request-1"): BridgeRequest => ({
  version: BRIDGE_VERSION,
  hostId: "garden",
  character: { id: "seed", name: "Seed", temperament: "curious" },
  requestId,
  operation: "speak",
  context: "Greet this synthetic visitor.",
  choices: [],
  fallbackChoiceId: "",
  history: [],
});
function setup() {
  const map = new Map<string, string>();
  let failStore = false,
    now = Date.UTC(2026, 10, 5, 12),
    calls = 0,
    fail = false,
    active = true;
  const store: PrivateStore = {
    get: (k) => map.get(k),
    set: (k, v) => {
      if (failStore) throw Error("storage failure");
      map.set(k, v);
    },
    delete: (k) => {
      map.delete(k);
    },
  };
  let gate: Promise<void> | undefined, entered: (() => void) | undefined;
  const client: ModelClient = {
    id: "cloudflare",
    async generate() {
      calls++;
      entered?.();
      await gate;
      return fail
        ? {
            ok: false,
            error: { code: "unavailable", message: "synthetic-secret" },
          }
        : { ok: true, value: { content: "Hello from the orchard." } };
    },
  };
  const budget = createPaidBudgetGate({ store, now: () => now });
  const authenticate = async (r: Request) =>
    active &&
    ["Bearer verified-a", "Bearer verified-b"].includes(
      r.headers.get("authorization") ?? "",
    )
      ? {
          id:
            r.headers.get("authorization") === "Bearer verified-a"
              ? "clerk-user-a"
              : "clerk-user-b",
        }
      : undefined;
  const api = createDemoAPI({
    store,
    budget,
    authenticate,
    client: async () => ({ client, model: "test-model" }),
    now: () => now,
  });
  const request = (
    path = "/api/demo/bridge",
    body: unknown = payload(),
    token = "verified-a",
    from: string | null = origin,
  ) =>
    new Request(origin + path, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        ...(from ? { origin: from } : {}),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  return {
    map,
    store,
    budget,
    api,
    request,
    authenticate,
    calls: () => calls,
    fail: () => {
      fail = true;
    },
    failStore: () => {
      failStore = true;
    },
    advance: () => {
      now += 86400000;
    },
    revoke: () => {
      active = false;
    },
    block: () => {
      let release!: () => void;
      gate = new Promise((r) => {
        release = r;
      });
      const started = new Promise<void>((r) => {
        entered = r;
      });
      return { started, release };
    },
  };
}

test("unauthenticated/forged identity and wrong origin cannot infer; obsolete invitation endpoints are absent", async () => {
  const h = setup();
  for (const token of ["", "forged"])
    assert.equal(
      (
        await h.api(
          h.request(undefined, { ...payload(), userId: "clerk-user-a" }, token),
        )
      ).status,
      401,
    );
  assert.equal(
    (
      await h.api(
        h.request(undefined, payload(), "verified-a", "https://evil.example"),
      )
    ).status,
    403,
  );
  assert.equal(
    (await h.api(h.request(undefined, payload(), "verified-a", null))).status,
    403,
  );
  for (const path of ["/api/demo/login", "/api/demo/admin", "/api/demo/logout"])
    assert.equal((await h.api(h.request(path, {}))).status, 404);
  assert.equal(h.calls(), 0);
  assert.equal(h.map.size, 0);
});

test("trusted users receive separate quotas and status never returns identity or secrets", async () => {
  const h = setup();
  const status = async (token: string) =>
    (await (
      await h.api(
        new Request(origin + "/api/demo/status", {
          headers: token ? { authorization: `Bearer ${token}` } : {},
        }),
      )
    ).json()) as { authenticated: boolean; remaining: number };
  const initial = (await status("verified-a")).remaining;
  const result = await h.api(h.request());
  assert.equal(result.status, 200);
  assert.equal(((await result.json()) as { source: string }).source, "llm");
  assert.equal((await status("verified-a")).remaining, initial - 1);
  assert.equal((await status("verified-b")).remaining, initial);
  assert.equal((await status("")).authenticated, false);
  const text = JSON.stringify(await status("verified-a"));
  for (const secret of ["clerk-user-a", "verified-a", "synthetic-secret"])
    assert.ok(!text.includes(secret));
  assert.equal(
    (
      await h.api(
        h.request(undefined, { ...payload("forged"), userId: "clerk-user-b" }),
      )
    ).status,
    400,
  );
});

test("reservations survive failed models, API recreation and local reset attempts", async () => {
  const h = setup();
  h.fail();
  assert.equal(
    ((await (await h.api(h.request())).json()) as { source: string }).source,
    "fallback",
  );
  const stored = h.map.get("demo-budget-v2")!;
  assert.equal(JSON.parse(stored).global.tokens, DEMO_LIMITS.reservedTokens);
  assert.equal((await h.api(h.request("/api/demo/reset", {}))).status, 404);
  assert.equal(h.map.get("demo-budget-v2"), stored);
  const restarted = createDemoAPI({
    store: h.store,
    authenticate: h.authenticate,
    client: async () => {
      throw Error("must not reach");
    },
    now: () => Date.UTC(2026, 10, 5, 12),
  });
  assert.equal((await restarted(h.request())).status, 409);
  assert.equal(h.map.get("demo-budget-v2"), stored);
  assert.equal(h.calls(), 1);
});

test("single writer rejects overlapping model work before another reservation", async () => {
  const h = setup(),
    barrier = h.block();
  const first = h.api(h.request());
  await barrier.started;
  try {
    assert.equal(
      (await h.api(h.request(undefined, payload("second"), "verified-b")))
        .status,
      409,
    );
    assert.equal(JSON.parse(h.map.get("demo-budget-v2")!).global.calls, 1);
  } finally {
    barrier.release();
  }
  assert.equal((await first).status, 200);
  assert.equal(h.calls(), 1);
});

test("global paid gate is shared across App and demo and enforces user/global daily caps", async () => {
  const h = setup();
  for (let i = 0; i < 15; i++)
    assert.deepEqual(await h.budget.reservePaid("clerk-user-a", `app-${i}`), {
      ok: true,
    });
  assert.equal((await h.api(h.request())).status, 429);
  assert.deepEqual(await h.budget.reservePaid("clerk-user-b", "app-other"), {
    ok: true,
  });
  assert.equal(
    (await h.api(h.request(undefined, payload("b-demo"), "verified-b"))).status,
    200,
  );
  let successes = 17;
  for (let i = 0; i < 100; i++) {
    const r = await h.budget.reservePaid(`other-user-${i}`, `app-global-${i}`);
    if (r.ok) successes++;
    else {
      assert.equal(r.code, "budget-exceeded");
      break;
    }
  }
  assert.equal(
    successes,
    Math.floor(DEMO_LIMITS.globalTokens / DEMO_LIMITS.reservedTokens),
  );
  assert.equal(
    (await h.api(h.request(undefined, payload("over-global"), "verified-b")))
      .status,
    429,
  );
  h.advance();
  assert.deepEqual(await h.budget.reservePaid("clerk-user-a", "next-day"), {
    ok: true,
  });
});

test("corrupt storage and failed atomic write fail closed without a provider call", async () => {
  for (const corrupt of [
    "not-json",
    "{}",
    JSON.stringify({
      day: "2026-11-05",
      global: { calls: -1, tokens: 0 },
      users: {},
      claims: [],
    }),
  ]) {
    const h = setup();
    h.map.set("demo-budget-v2", corrupt);
    assert.equal((await h.api(h.request())).status, 503);
    assert.equal(h.calls(), 0);
  }
  const h = setup();
  h.failStore();
  assert.equal((await h.api(h.request())).status, 503);
  assert.equal(h.calls(), 0);
});

test("trusted authentication is rechecked after a delayed body, without consuming it", async () => {
  const h = setup();
  let bodyController!: ReadableStreamDefaultController<Uint8Array>,
    reading!: () => void;
  const started = new Promise<void>((r) => {
    reading = r;
  });
  const body = new ReadableStream<Uint8Array>(
    {
      start(c) {
        bodyController = c;
      },
      pull() {
        reading();
      },
    },
    { highWaterMark: 0 },
  );
  const pending = h.api(
    new Request(origin + "/api/demo/bridge", {
      method: "POST",
      headers: {
        origin,
        authorization: "Bearer verified-a",
        "content-type": "application/json",
      },
      body,
      duplex: "half",
    } as RequestInit & { duplex: string }),
  );
  await started;
  h.revoke();
  bodyController.enqueue(new TextEncoder().encode(JSON.stringify(payload())));
  bodyController.close();
  assert.equal((await pending).status, 401);
  assert.equal(h.calls(), 0);
  assert.equal(h.map.size, 0);
});

test("retired invitation accounting remains charged against the shared global day", async () => {
  const h = setup();
  h.map.set(
    "demo-global",
    JSON.stringify({
      day: "2026-11-05",
      calls: 50,
      tokens: DEMO_LIMITS.globalTokens,
    }),
  );
  assert.equal((await h.api(h.request())).status, 429);
  assert.equal(h.calls(), 0);
});

test("demo replay is rejected the same UTC day but becomes a new reservation after rollover", async () => {
  const h = setup();
  assert.equal((await h.api(h.request())).status, 200);
  assert.equal((await h.api(h.request())).status, 409);
  assert.equal(h.calls(), 1);
  h.advance();
  assert.equal((await h.api(h.request())).status, 200);
  assert.equal(h.calls(), 2);
  assert.equal(JSON.parse(h.map.get("demo-budget-v2")!).global.calls, 1);
});

test("demo readiness follows local provider health without calling inference or spending quota", async () => {
  const h = setup();
  let ready = false;
  const api = createDemoAPI({
    store: h.store,
    authenticate: async () => ({ id: "local-owner" }),
    client: async () => {
      throw Error("Status must not create an inference client");
    },
    available: async () => ready,
  });
  const status = async () =>
    (await api(new Request(origin + "/api/demo/status"))).json() as Promise<{
      available: boolean;
      remaining: number;
    }>;
  const offline = await status();
  assert.equal(offline.available, false);
  ready = true;
  const online = await status();
  assert.equal(online.available, true);
  assert.equal(online.remaining, offline.remaining);
  assert.equal(h.calls(), 0);
  assert.equal(h.map.size, 0);
});
