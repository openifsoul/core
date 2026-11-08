import type { ProviderBudgetPolicy } from "./types.js";
import {
  bounded,
  fetchJSON,
  object,
  parseContent,
  ProviderFailure,
  requestBody,
  validateGeneration,
  validateContextBudget,
  emitProviderUsage,
} from "./bounded.js";
import type { FetchLike, OllamaClient, ProviderLimits } from "./types.js";
export const DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434";
function loopbackBase(value: string): string {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new ProviderFailure("configuration");
  }
  if (
    url.protocol !== "http:" ||
    !["127.0.0.1", "[::1]", "localhost"].includes(url.hostname) ||
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  )
    throw new ProviderFailure("configuration");
  return url.origin;
}
const localModel = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,127}$/.test(value) &&
  !value.endsWith(":cloud") &&
  !/(?:^|[/:_-])(?:embed(?:ding)?s?|nomic|bge)(?:[/:_-]|$)/i.test(value);
export function createOllamaProvider(
  options: {
    baseUrl?: string;
    fetch?: FetchLike;
    limits?: Partial<ProviderLimits>;
    budgetPolicy?: ProviderBudgetPolicy;
  } = {},
): OllamaClient {
  const fetcher = options.fetch ?? fetch;
  const discover = async (
    signal: AbortSignal,
    limits: ProviderLimits,
  ): Promise<string[]> => {
    const base = loopbackBase(options.baseUrl ?? DEFAULT_OLLAMA_URL);
    const raw = object(
      await fetchJSON(
        fetcher,
        `${base}/api/tags`,
        { method: "GET" },
        signal,
        limits,
      ),
    );
    if (!Array.isArray(raw.models) || raw.models.length > 1000)
      throw new ProviderFailure("invalid-response");
    return [
      ...new Set(
        raw.models
          .map(object)
          .filter((item) => !item.remote_host && !item.remote_model)
          .map((item) => item.name)
          .filter(localModel),
      ),
    ].sort();
  };
  return {
    id: "ollama",
    listModels: (signal) =>
      bounded(options.limits, signal, discover, options.budgetPolicy),
    generate: (input) =>
      bounded(
        options.limits,
        input.signal,
        async (signal, limits) => {
          validateGeneration(input);
          const contextBudget = validateContextBudget(
            input,
            limits,
            options.budgetPolicy,
          );
          if (
            !localModel(input.model) ||
            !(await discover(signal, limits)).includes(input.model)
          )
            throw new ProviderFailure("unsupported-model");
          const base = loopbackBase(options.baseUrl ?? DEFAULT_OLLAMA_URL);
          const body = requestBody(
            {
              model: input.model,
              stream: false,
              // Original Qwen3 supports an on/off thinking switch. Do not send
              // unsupported controls to other installed model families.
              ...(/^qwen3(?::|$)/.test(input.model) ? { think: false } : {}),
              messages: [
                { role: "system", content: input.system },
                { role: "user", content: input.prompt },
              ],
              format: input.schema,
              options: {
                num_predict: limits.maxOutputTokens,
                ...(contextBudget
                  ? { num_ctx: contextBudget.windowTokens }
                  : {}),
              },
            },
            limits,
          );
          const raw = object(
            await fetchJSON(
              fetcher,
              `${base}/api/chat`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body,
              },
              signal,
              limits,
            ),
          );
          if (
            raw.done !== true ||
            (raw.done_reason !== undefined && raw.done_reason !== "stop")
          )
            throw new ProviderFailure("invalid-response");
          emitProviderUsage(options.budgetPolicy, input.model, {
            inputTokens: raw.prompt_eval_count,
            outputTokens: raw.eval_count,
            prefillMs:
              typeof raw.prompt_eval_duration === "number"
                ? raw.prompt_eval_duration / 1e6
                : undefined,
            decodeMs:
              typeof raw.eval_duration === "number"
                ? raw.eval_duration / 1e6
                : undefined,
          });
          return parseContent(object(raw.message).content, limits);
        },
        options.budgetPolicy,
      ),
  };
}
