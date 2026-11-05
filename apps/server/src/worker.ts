import { DurableObject } from "cloudflare:workers";
import {
  createSQLMemory,
  MEMORY_SCHEMA,
} from "../../../packages/memory/src/sql.js";
import {
  createLabService,
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
interface Secrets {
  LAB_PASSWORD: string;
  ENCRYPTION_KEY: string;
}
type ServerEnv = Env & Secrets;
export class Laboratory extends DurableObject<ServerEnv> {
  private readonly api: (request: Request) => Promise<Response>;
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
    const providers = async (): Promise<ProviderOption[]> => [
      {
        id: "cloudflare",
        label: "Cloudflare Workers AI",
        available: true,
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
    const service = createLabService({
      memory,
      controllerFor: (selection) => async (input, signal) => {
        if (selection.provider === "scenario")
          return createScenarioController()(input, signal);
        if (selection.provider === "cloudflare")
          return createModelController({
            model: selection.model,
            client: createCloudflareProvider({
              invoke: (model, payload) => this.env.AI.run(model, payload),
            }),
          })(input, signal);
        if (selection.provider === "openai") {
          const apiKey = await readOpenAIKey(store, this.env.ENCRYPTION_KEY);
          if (!apiKey) throw Error("Provider unavailable");
          return createModelController({
            model: selection.model,
            client: createOpenAIProvider({ apiKey }),
          })(input, signal);
        }
        throw Error("Provider unavailable");
      },
    });
    this.api = createAPI({
      mode: "cloud",
      password: this.env.LAB_PASSWORD,
      encryptionKey: this.env.ENCRYPTION_KEY,
      store,
      service,
      providers,
    });
  }
  async handle(request: Request): Promise<Response> {
    return this.api(request);
  }
}
export default {
  async fetch(request: Request, env: ServerEnv): Promise<Response> {
    if (new URL(request.url).pathname.startsWith("/api/"))
      return env.LAB.getByName("owner-laboratory").handle(request);
    return secured(await env.ASSETS.fetch(request));
  },
} satisfies ExportedHandler<ServerEnv>;
