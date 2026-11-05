import assert from "node:assert/strict";
import test from "node:test";
import { generateKeyPairSync, sign } from "node:crypto";
import {
  createCloudRouter,
  verifyCloudPrincipal,
  trustedLocalRequest,
  type CloudAuthConfig,
} from "../../apps/server/src/app-auth.js";
import { createAPI, type PrivateStore } from "../../apps/server/src/api.js";
import { createCharacterWorkspace } from "../../apps/runtime-host/src/characters.js";
import {
  createScenarioController,
  SCENARIO_MODEL,
} from "../../apps/runtime-host/src/service.js";
import { openSQLiteMemory } from "../../packages/memory/src/sqlite.js";
const origin = "https://app.example";
const { publicKey, privateKey } = generateKeyPairSync("rsa", {
  modulusLength: 2048,
});
const config: CloudAuthConfig = {
  APP_ORIGIN: origin,
  CLERK_ISSUER: "https://synthetic.clerk.accounts.dev",
  CLERK_PUBLISHABLE_KEY: "pk_test_synthetic",
  CLERK_JWT_KEY: publicKey.export({ type: "spki", format: "pem" }).toString(),
};
function token(subject = "user_one", extra: Record<string, unknown> = {}) {
  const encoded = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");
  const input = `${encoded({ alg: "RS256", typ: "JWT", kid: "synthetic" })}.${encoded({ sub: subject, sid: "sess_synthetic", iss: config.CLERK_ISSUER, azp: origin, iat: Math.floor(Date.now() / 1000) - 5, nbf: Math.floor(Date.now() / 1000) - 5, exp: Math.floor(Date.now() / 1000) + 60, ...extra })}`;
  return `${input}.${sign("RSA-SHA256", Buffer.from(input), privateKey).toString("base64url")}`;
}
function req(
  path: string,
  subject = "user_one",
  method = "GET",
  body?: unknown,
) {
  return new Request(origin + path, {
    method,
    headers: {
      authorization: `Bearer ${token(subject)}`,
      origin,
      ...(body ? { "content-type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}
test("official Clerk verifier rejects wrong, expired, wrong-party and wrong-issuer session tokens", async () => {
  assert.deepEqual(await verifyCloudPrincipal(req("/api/status"), config), {
    id: "user_one",
  });
  for (const extra of [
    { exp: 1 },
    { azp: "https://evil.example" },
    { iss: "https://wrong.example" },
    { sub: "not-a-user" },
    { sid: "" },
    { sts: "pending" },
  ]) {
    const request = new Request(origin + "/api/status", {
      headers: { authorization: `Bearer ${token("user_one", extra)}` },
    });
    assert.equal(await verifyCloudPrincipal(request, config), undefined);
  }
  const valid = token();
  assert.equal(
    await verifyCloudPrincipal(
      new Request(origin, {
        headers: { authorization: `Bearer ${valid.slice(0, -10)}aaaaaaaaaa` },
      }),
      config,
    ),
    undefined,
  );
  assert.equal(
    await verifyCloudPrincipal(
      new Request(origin, { headers: { "x-user-id": "user_one" } }),
      config,
    ),
    undefined,
  );
  assert.equal(await verifyCloudPrincipal(req("/api/status"), {}), undefined);
});
test("cloud router isolates character memory and credentials by verified subject and denies laboratory", async () => {
  const owned = new Map<
    string,
    {
      api: (request: Request) => Promise<Response>;
      store: Map<string, string>;
      close: () => void;
    }
  >();
  function workspace(subject: string) {
    const existing = owned.get(subject);
    if (existing) return existing;
    const opened = openSQLiteMemory(":memory:");
    assert.ok(opened.ok);
    const memory = opened.value;
    const settings = new Map<string, string>();
    const store: PrivateStore = {
      get: (k) => settings.get(k),
      set: (k, v) => {
        settings.set(k, v);
      },
      delete: (k) => {
        settings.delete(k);
      },
    };
    const api = createAPI({
      mode: "cloud",
      access: { kind: "principal", id: subject },
      password: "",
      encryptionKey: "synthetic-test-encryption-key",
      store,
      service: createCharacterWorkspace({
        memory,
        chatEnvironment: "app",
        controllerFor: () => createScenarioController(),
      }),
      providers: async () => [
        {
          id: "scenario",
          label: "Scenario",
          available: true,
          models: [{ id: SCENARIO_MODEL, label: "Scenario" }],
        },
      ],
    });
    const result = {
      api,
      store: settings,
      close: () => {
        memory.close();
      },
    };
    owned.set(subject, result);
    return result;
  }
  const route = createCloudRouter({
    config,
    user: async (principal, request) => workspace(principal.id).api(request),
    demo: async () => new Response("demo"),
    assets: async () => new Response("assets"),
  });
  try {
    assert.equal(
      (
        await route(
          req("/api/characters", "user_one", "POST", {
            requestId: "create-one",
            name: "Only One",
            description: "Original synthetic character.",
            speechStyle: "Brief and calm.",
            biography: "Authored fiction.",
          }),
        )
      ).status,
      200,
    );
    const first = await (
      await route(req("/api/characters", "user_one"))
    ).text();
    const second = await (
      await route(req("/api/characters", "user_two"))
    ).text();
    assert.match(first, /Only One/);
    assert.doesNotMatch(second, /Only One/);
    const secret = "synthetic-private-key-only-user-one";
    assert.equal(
      (
        await route(
          req("/api/credentials/openai", "user_one", "POST", { key: secret }),
        )
      ).status,
      200,
    );
    assert.ok(workspace("user_one").store.has("openai-key"));
    assert.equal(workspace("user_two").store.has("openai-key"), false);
    assert.doesNotMatch(
      await (await route(req("/api/status", "user_one"))).text(),
      new RegExp(secret),
    );
    for (const path of ["/api/lab/run", "/api/lab/snapshot", "/api/run"])
      assert.equal(
        (await route(req(path, "user_one", "POST", {}))).status,
        403,
      );
    assert.equal(
      (await route(req("/api/chat", "user_one", "POST", { operation: "plan" })))
        .status,
      403,
    );
    const missing = new Request(origin + "/api/characters", {
      headers: { "x-user-id": "user_one" },
    });
    assert.equal((await route(missing)).status, 401);
    const closed = createCloudRouter({
      config: {},
      user: async () => {
        throw Error("must not reach user");
      },
      demo: async () => new Response(),
      assets: async () => new Response(),
    });
    assert.equal((await closed(req("/api/characters"))).status, 503);
  } finally {
    for (const item of owned.values()) item.close();
  }
});
test("local app allows loopback without password and rejects cross-origin reads and rebinding hosts", async () => {
  const local = "http://127.0.0.1:8788";
  const request = (
    path: string,
    headers: Record<string, string> = {},
    method = "GET",
    body?: unknown,
  ) =>
    new Request(local + path, {
      method,
      headers: {
        host: "127.0.0.1:8788",
        ...(method === "POST"
          ? { origin: local, "content-type": "application/json" }
          : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
  assert.equal(trustedLocalRequest(request("/api/status"), local), true);
  const rejectedHeaders: Record<string, string>[] = [
    { origin: "https://evil.example" },
    { host: "attacker.example:8788" },
    { "sec-fetch-site": "cross-site" },
    { origin: "null" },
  ];
  for (const headers of rejectedHeaders)
    assert.equal(
      trustedLocalRequest(request("/api/snapshot", headers), local),
      false,
    );
  const opened = openSQLiteMemory(":memory:");
  assert.ok(opened.ok);
  const memory = opened.value;
  const data = new Map<string, string>();
  const api = createAPI({
    mode: "local",
    access: { kind: "local", origin: local },
    password: "",
    encryptionKey: "synthetic-local-encryption",
    store: {
      get: (k) => data.get(k),
      set: (k, v) => {
        data.set(k, v);
      },
      delete: (k) => {
        data.delete(k);
      },
    },
    service: createCharacterWorkspace({
      memory,
      chatEnvironment: "app",
      controllerFor: () => createScenarioController(),
    }),
    providers: async () => [
      {
        id: "scenario",
        label: "Scenario",
        available: true,
        models: [{ id: SCENARIO_MODEL, label: "Scenario" }],
      },
    ],
  });
  try {
    assert.equal((await api(request("/api/characters"))).status, 200);
    const config = await (await api(request("/api/config"))).json();
    assert.deepEqual(config, {
      mode: "local",
      auth: "local",
      laboratory: true,
    });
    assert.equal(
      (
        await api(
          request("/api/lab/run", {}, "POST", {
            operation: "plan",
            provider: "scenario",
            model: SCENARIO_MODEL,
            requestId: "local-plan",
          }),
        )
      ).status,
      200,
    );
    assert.equal(
      (
        await api(
          request("/api/characters", { "sec-fetch-site": "cross-site" }),
        )
      ).status,
      403,
    );
  } finally {
    memory.close();
  }
});
