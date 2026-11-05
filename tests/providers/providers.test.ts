import assert from "node:assert/strict";
import test from "node:test";
import {
  createCloudflareProvider,
  createOllamaProvider,
  createOpenAIProvider,
  CLOUDFLARE_MODELS,
  OPENAI_MODELS,
} from "../../packages/model-providers/src/index.js";
import type {
  FetchLike,
  GenerationInput,
  ProviderResult,
} from "../../packages/model-providers/src/index.js";
const input = (model = OPENAI_MODELS[0]): GenerationInput => ({
  model,
  system: "Return only bounded JSON.",
  prompt: "Original synthetic prompt.",
  schema: {
    type: "object",
    properties: { content: { type: "string" } },
    required: ["content"],
    additionalProperties: false,
  },
});
const rawOpenAI = (
  content: unknown = { content: "Model-generated original reply." },
) => ({
  status: "completed",
  output: [
    {
      type: "message",
      content: [{ type: "output_text", text: JSON.stringify(content) }],
    },
  ],
});
const unwrap = <T>(result: ProviderResult<T>): T => {
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) throw new Error("assertion");
  return result.value;
};
const rejects = (result: ProviderResult<unknown>, code: string) => {
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, code);
};

test("OpenAI Responses sends real structured request and confines credential to header", async () => {
  let requested = false;
  const client = createOpenAIProvider({
    apiKey: "synthetic-secret-key",
    fetch: async (url, init) => {
      requested = true;
      assert.equal(url, "https://api.openai.com/v1/responses");
      assert.equal(init?.redirect, "manual");
      const headers = new Headers(init?.headers);
      assert.equal(headers.get("Authorization"), "Bearer synthetic-secret-key");
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "gpt-4.1-mini");
      assert.equal(body.store, false);
      assert.equal(body.stream, false);
      assert.equal(body.text.format.type, "json_schema");
      assert.equal(body.text.format.strict, true);
      assert.equal(String(init?.body).includes("synthetic-secret-key"), false);
      return Response.json(rawOpenAI());
    },
  });
  assert.deepEqual(unwrap(await client.generate(input())), {
    content: "Model-generated original reply.",
  });
  assert.equal(requested, true);
  assert.ok(OPENAI_MODELS.includes("gpt-4.1"));
});

test("OpenAI safe errors distinguish credential/rate/backend failures without raw payloads", async () => {
  for (const [status, code] of [
    [401, "unauthorized"],
    [403, "unauthorized"],
    [429, "rate-limited"],
    [500, "unavailable"],
    [400, "invalid-response"],
  ] as const) {
    const client = createOpenAIProvider({
      apiKey: "test-secret-key",
      fetch: async () =>
        new Response("private upstream prompt and key", { status }),
    });
    const result = await client.generate(input());
    rejects(result, code);
    assert.equal(JSON.stringify(result).includes("private upstream"), false);
  }
});

test("OpenAI rejects refusal, incomplete, malformed or oversized response", async () => {
  const responses = [
    Response.json({ ...rawOpenAI(), status: "incomplete" }),
    Response.json({
      status: "completed",
      output: [
        {
          type: "message",
          content: [{ type: "refusal", refusal: "private-text" }],
        },
      ],
    }),
    Response.json({
      status: "completed",
      output: [
        {
          type: "message",
          content: [{ type: "output_text", text: "not json" }],
        },
      ],
    }),
    new Response("not json"),
  ];
  for (const response of responses)
    rejects(
      await createOpenAIProvider({
        apiKey: "test-secret-key",
        fetch: async () => response,
      }).generate(input()),
      "invalid-response",
    );
  rejects(
    await createOpenAIProvider({
      apiKey: "test-secret-key",
      limits: { maxResponseBytes: 32 },
      fetch: async () => Response.json(rawOpenAI()),
    }).generate(input()),
    "budget-exceeded",
  );
});

test("unconfigured/unsupported/over-budget requests fail before network", async () => {
  let calls = 0;
  const fetcher: FetchLike = async () => {
    calls++;
    return Response.json(rawOpenAI());
  };
  rejects(
    await createOpenAIProvider({ apiKey: "", fetch: fetcher }).generate(
      input(),
    ),
    "configuration",
  );
  rejects(
    await createOpenAIProvider({
      apiKey: "test-secret-key",
      fetch: fetcher,
    }).generate(input("unsupported-model" as (typeof OPENAI_MODELS)[0])),
    "unsupported-model",
  );
  rejects(
    await createOpenAIProvider({
      apiKey: "test-secret-key",
      fetch: fetcher,
      limits: { maxRequestBytes: 10 },
    }).generate(input()),
    "budget-exceeded",
  );
  rejects(
    await createOpenAIProvider({
      apiKey: "test-secret-key",
      fetch: fetcher,
      limits: { timeoutMs: 0 },
    }).generate(input()),
    "configuration",
  );
  assert.equal(calls, 0);
});

test("provider timeout and caller cancellation are bounded even when transport ignores abort", async () => {
  let aborted = false;
  const client = createOpenAIProvider({
    apiKey: "test-secret-key",
    limits: { timeoutMs: 10 },
    fetch: async (_url, init) => {
      init?.signal?.addEventListener("abort", () => {
        aborted = true;
      });
      return await new Promise<Response>(() => {});
    },
  });
  const started = Date.now();
  rejects(await client.generate(input()), "timeout");
  assert.ok(Date.now() - started < 1000);
  assert.equal(aborted, true);
  const abort = new AbortController();
  abort.abort();
  rejects(
    await client.generate({ ...input(), signal: abort.signal }),
    "cancelled",
  );
  const pendingAbort = new AbortController();
  const pending = createOpenAIProvider({
    apiKey: "test-secret-key",
    fetch: async () => await new Promise<Response>(() => {}),
  }).generate({ ...input(), signal: pendingAbort.signal });
  pendingAbort.abort();
  rejects(await pending, "cancelled");
});

test("response body waits are covered by timeout and resource bounds", async () => {
  const hanging = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("{"));
    },
  });
  rejects(
    await createOpenAIProvider({
      apiKey: "test-secret-key",
      limits: { timeoutMs: 10 },
      fetch: async () => new Response(hanging),
    }).generate(input()),
    "timeout",
  );
  const chunked = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode("x".repeat(100)));
      controller.close();
    },
  });
  rejects(
    await createOpenAIProvider({
      apiKey: "test-secret-key",
      limits: { maxResponseBytes: 20 },
      fetch: async () => new Response(chunked),
    }).generate(input()),
    "budget-exceeded",
  );
});

test("Cloudflare uses injected binding with allowlisted model and JSON format", async () => {
  let called = false;
  const client = createCloudflareProvider({
    invoke: async (model, body, signal) => {
      called = true;
      assert.equal(model, CLOUDFLARE_MODELS[0]);
      assert.equal(signal.aborted, false);
      assert.equal(body.stream, false);
      assert.equal(
        (body.response_format as Record<string, unknown>).type,
        "json_schema",
      );
      return { response: { content: "A binding-generated reply." } };
    },
  });
  assert.deepEqual(
    unwrap(
      await client.generate(
        input(CLOUDFLARE_MODELS[0] as (typeof OPENAI_MODELS)[0]),
      ),
    ),
    { content: "A binding-generated reply." },
  );
  assert.equal(called, true);
  assert.equal(CLOUDFLARE_MODELS.length >= 2, true);
  rejects(
    await client.generate(
      input("arbitrary-worker-model" as (typeof OPENAI_MODELS)[0]),
    ),
    "unsupported-model",
  );
});

test("Cloudflare ignored cancellation times out safely and never echoes binding errors", async () => {
  rejects(
    await createCloudflareProvider({
      limits: { timeoutMs: 10 },
      invoke: async () => await new Promise(() => {}),
    }).generate(input(CLOUDFLARE_MODELS[0] as (typeof OPENAI_MODELS)[0])),
    "timeout",
  );
  const result = await createCloudflareProvider({
    invoke: async () => {
      throw new Error("sensitive-binding-details");
    },
  }).generate(input(CLOUDFLARE_MODELS[0] as (typeof OPENAI_MODELS)[0]));
  rejects(result, "unavailable");
  assert.equal(JSON.stringify(result).includes("sensitive-binding"), false);
});

test("Ollama discovers installed local text models then calls only api/chat", async () => {
  const urls: string[] = [];
  const client = createOllamaProvider({
    fetch: async (url, init) => {
      urls.push(String(url));
      if (String(url).endsWith("/api/tags"))
        return Response.json({
          models: [
            { name: "qwen3:8b" },
            { name: "llama3.2:latest" },
            { name: "nomic-embed-text:latest" },
            { name: "qwen3:cloud" },
            { name: "remote-model", remote_host: "example.invalid" },
          ],
        });
      const body = JSON.parse(String(init?.body));
      assert.equal(body.model, "qwen3:8b");
      assert.equal(body.stream, false);
      assert.ok(body.format);
      assert.ok(body.options.num_predict);
      assert.equal(body.think, false);
      return Response.json({
        done: true,
        done_reason: "stop",
        message: {
          role: "assistant",
          content: JSON.stringify({ content: "Local model reply." }),
        },
      });
    },
  });
  assert.deepEqual(unwrap(await client.listModels()), [
    "llama3.2:latest",
    "qwen3:8b",
  ]);
  assert.deepEqual(
    unwrap(
      await client.generate(input("qwen3:8b" as (typeof OPENAI_MODELS)[0])),
    ),
    { content: "Local model reply." },
  );
  assert.deepEqual(urls, [
    "http://127.0.0.1:11434/api/tags",
    "http://127.0.0.1:11434/api/tags",
    "http://127.0.0.1:11434/api/chat",
  ]);
});

test("Ollama rejects non-loopback, credential, path and redirect configurations", async () => {
  let calls = 0;
  for (const baseUrl of [
    "https://127.0.0.1:11434",
    "http://remote.invalid:11434",
    "http://127.0.0.1:11434/path",
    "http://user:pass@localhost:11434",
    "http://localhost:11434?x=1",
  ]) {
    rejects(
      await createOllamaProvider({
        baseUrl,
        fetch: async () => {
          calls++;
          return Response.json({ models: [] });
        },
      }).listModels(),
      "configuration",
    );
  }
  assert.equal(calls, 0);
  rejects(
    await createOllamaProvider({
      fetch: async () =>
        new Response(null, {
          status: 302,
          headers: { Location: "https://remote.invalid" },
        }),
    }).listModels(),
    "invalid-response",
  );
});

test("Ollama never pulls unavailable models or returns incomplete content", async () => {
  let chats = 0;
  const client = createOllamaProvider({
    fetch: async (url) =>
      String(url).endsWith("/api/tags")
        ? Response.json({ models: [{ name: "qwen3:8b" }] })
        : (chats++,
          Response.json({
            done: false,
            message: { content: '{"content":"partial"}' },
          })),
  });
  rejects(
    await client.generate(input("missing:latest" as (typeof OPENAI_MODELS)[0])),
    "unsupported-model",
  );
  assert.equal(chats, 0);
  rejects(
    await client.generate(input("qwen3:8b" as (typeof OPENAI_MODELS)[0])),
    "invalid-response",
  );
  assert.equal(chats, 1);
});

test("Ollama does not send Qwen thinking controls to Llama models", async () => {
  const client = createOllamaProvider({
    fetch: async (url, init) => {
      if (String(url).endsWith("/api/tags"))
        return Response.json({ models: [{ name: "llama3.2:latest" }] });
      const body = JSON.parse(String(init?.body));
      assert.equal(Object.hasOwn(body, "think"), false);
      return Response.json({
        done: true,
        done_reason: "stop",
        message: { content: '{"content":"A local Llama reply."}' },
      });
    },
  });
  assert.deepEqual(
    unwrap(await client.generate({ ...input(), model: "llama3.2:latest" })),
    { content: "A local Llama reply." },
  );
});
