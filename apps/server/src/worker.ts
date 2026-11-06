import { publicPageAsset } from "./public-pages.js";
import {
  createCloudRouter,
  verifyCloudPrincipal,
  type CloudAuthConfig,
} from "./app-auth.js";
import { createHash } from "node:crypto";
import { createDemoAPI, createPaidBudgetGate } from "./demo.js";
import { createCharacterWorkspace } from "../../runtime-host/src/characters.js";
import { DurableObject } from "cloudflare:workers";
import {
  createSQLMemory,
  MEMORY_SCHEMA,
} from "../../../packages/memory/src/sql.js";
import {
  createModelController,
  createScenarioController,
  SCENARIO_MODEL,
} from "../../runtime-host/src/service.js";
import {
  createCloudflareProvider,
  createOpenAIProvider,
  CLOUDFLARE_MODELS,
  OPENAI_MODELS,
} from "../../../packages/model-providers/src/index.js";
import {
  createAPI,
  readOpenAIKey,
  type PrivateStore,
  type ProviderOption,
} from "./api.js";
import { secured } from "./security.js";
interface Secrets extends CloudAuthConfig {
  LAB_PASSWORD?: string;
  ENCRYPTION_KEY: string;
}
type ServerEnv = Env & Secrets;
export class Laboratory extends DurableObject<ServerEnv> {
  private readonly api: (request: Request) => Promise<Response>;
  private readonly demoAPI: (request: Request) => Promise<Response>;
  private readonly budget: ReturnType<typeof createPaidBudgetGate>;
  private readonly store: PrivateStore;
  constructor(ctx: DurableObjectState, env: ServerEnv) {
    super(ctx, env);
    this.ctx.storage.sql.exec(MEMORY_SCHEMA);
    this.ctx.storage.sql.exec(
      "CREATE TABLE IF NOT EXISTS private_settings (key TEXT PRIMARY KEY,value TEXT NOT NULL)",
    );
    const sql = this.ctx.storage.sql;
    const memory = createSQLMemory({
      prepare: (query) => ({
        get: (...args) => sql.exec(query, ...args).toArray()[0],
        all: (...args) => sql.exec(query, ...args).toArray(),
        run: (...args) => sql.exec(query, ...args).toArray(),
      }),
      transaction: (work) => this.ctx.storage.transactionSync(work),
    });
    const store: PrivateStore = {
      get: (key) =>
        sql
          .exec<{ value: string }>(
            "SELECT value FROM private_settings WHERE key=?",
            key,
          )
          .toArray()[0]?.value,
      set: (key, value) => {
        sql.exec(
          "INSERT OR REPLACE INTO private_settings(key,value) VALUES(?,?)",
          key,
          value,
        );
      },
      delete: (key) => {
        sql.exec("DELETE FROM private_settings WHERE key=?", key);
      },
    };
    this.store = store;
    this.budget = createPaidBudgetGate({ store });
    const providers = async (): Promise<ProviderOption[]> => [
      {
        id: "cloudflare",
        label: "Cloudflare Workers AI",
        available: !!this.env.AI,
        ...(!this.env.AI
          ? { reason: "Workers AI is not configured in this runtime." }
          : {}),
        models: CLOUDFLARE_MODELS.map((id) => ({
          id,
          label: id.split("/").pop()!,
        })),
      },
      {
        id: "openai",
        label: "OpenAI · your key",
        available: !!store.get("openai-key"),
        models: OPENAI_MODELS.map((id) => ({ id, label: id })),
        ...(!store.get("openai-key")
          ? { reason: "Add your OpenAI API key." }
          : {}),
      },
      {
        id: "ollama",
        label: "Ollama · local",
        available: false,
        models: [],
        reason: "Open the local laboratory to use Ollama.",
      },
      {
        id: "scenario",
        label: "Synthetic scenario · no LLM",
        available: true,
        models: [{ id: SCENARIO_MODEL, label: "Deterministic scenario" }],
      },
    ];
    const clientFor = async (
      selection: import("../../../packages/model-providers/src/types.js").ProviderSelection,
    ) => {
      if (selection.provider === "cloudflare")
        return createCloudflareProvider({
          limits: {
            timeoutMs: 15000,
            maxRequestBytes: 22000,
            maxOutputTokens: 384,
            maxResponseBytes: 8192,
          },
          invoke: async (model, payload) => {
            const principal = store.get("app-principal");
            if (!principal) throw Error("Unbound user store");
            const reservation = await this.env.LAB.getByName(
              "owner-laboratory",
            ).reserveAppInference(principal, `app-${crypto.randomUUID()}`);
            if (!reservation.ok)
              throw Error("Shared inference budget unavailable");
            return this.env.AI.run(model, payload);
          },
        });
      if (selection.provider === "openai") {
        const apiKey = await readOpenAIKey(store, this.env.ENCRYPTION_KEY);
        if (apiKey) return createOpenAIProvider({ apiKey });
      }
      throw Error("Provider unavailable");
    };
    const service = createCharacterWorkspace({
      memory,
      chatEnvironment: "app",
      clientFor,
      controllerFor: (selection) => async (input, signal) =>
        selection.provider === "scenario"
          ? createScenarioController()(input, signal)
          : createModelController({
              client: await clientFor(selection),
              model: selection.model,
            })(input, signal),
    });
    this.demoAPI = createDemoAPI({
      store,
      authenticate: (request) => verifyCloudPrincipal(request, this.env),
      budget: this.budget,
      ...(this.env.AI
        ? {
            client: async () => ({
              client: createCloudflareProvider({
                invoke: (model, payload) => this.env.AI.run(model, payload),
                limits: {
                  timeoutMs: 15000,
                  maxRequestBytes: 22000,
                  maxOutputTokens: 384,
                  maxResponseBytes: 8192,
                },
              }),
              model: CLOUDFLARE_MODELS[0]!,
            }),
          }
        : {}),
    });
    this.api = createAPI({
      access: { kind: "principal", id: "verified-cloud-user" },
      mode: "cloud",
      password: "",
      encryptionKey: this.env.ENCRYPTION_KEY,
      store,
      service,
      providers,
    });
  }
  async handleUser(request: Request, subject: string): Promise<Response> {
    if (!/^user_[A-Za-z0-9_-]{1,120}$/.test(subject))
      return new Response(null, { status: 403 });
    const bound = this.store.get("app-principal");
    if (bound && bound !== subject) return new Response(null, { status: 403 });
    if (!bound) this.store.set("app-principal", subject);
    return this.api(request);
  }
  async handleDemo(request: Request): Promise<Response> {
    return secured(await this.demoAPI(request));
  }
  async reserveAppInference(subject: string, requestId: string) {
    return this.budget.reservePaid(subject, requestId);
  }
}
export default {
  async fetch(request: Request, env: ServerEnv): Promise<Response> {
    return createCloudRouter({
      config: env,
      user: (principal, req) => {
        const identity = createHash("sha256")
          .update(principal.id)
          .digest("hex");
        return env.LAB.getByName(`app-user:${identity}`).handleUser(
          req,
          principal.id,
        );
      },
      demo: (req) => env.LAB.getByName("owner-laboratory").handleDemo(req),
      assets: async (req) => {
        const url = new URL(req.url);
        const page = publicPageAsset(url);
        if (page)
          url.pathname =
            page === "/index.html" ? "/" : page.replace(/\.html$/, "");
        return secured(
          await env.ASSETS.fetch(page ? new Request(url, req) : req),
          env.CLERK_ISSUER,
        );
      },
    })(request);
  },
} satisfies ExportedHandler<ServerEnv>;
