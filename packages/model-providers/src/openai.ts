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
import type { FetchLike, ModelClient, ProviderLimits } from "./types.js";
export const OPENAI_MODELS = [
  "gpt-4.1-mini",
  "gpt-4.1",
  "gpt-4.1-mini-2025-04-14",
] as const;
export const DEFAULT_OPENAI_MODEL = OPENAI_MODELS[0];
/** Credential is confined to this client's closure and Authorization header. */
export function createOpenAIProvider(options: {
  apiKey: string;
  fetch?: FetchLike;
  limits?: Partial<ProviderLimits>;
  budgetPolicy?: ProviderBudgetPolicy;
}): ModelClient {
  return {
    id: "openai",
    generate: (input) =>
      bounded(
        options.limits,
        input.signal,
        async (signal, limits) => {
          validateGeneration(input);
          validateContextBudget(input, limits, options.budgetPolicy);
          if (
            !OPENAI_MODELS.includes(
              input.model as (typeof OPENAI_MODELS)[number],
            )
          )
            throw new ProviderFailure("unsupported-model");
          if (
            typeof options.apiKey !== "string" ||
            options.apiKey.length < 8 ||
            options.apiKey.length > 512 ||
            /\s/.test(options.apiKey)
          )
            throw new ProviderFailure("configuration");
          const body = requestBody(
            {
              model: input.model,
              instructions: input.system,
              input: [{ role: "user", content: input.prompt }],
              store: false,
              stream: false,
              max_output_tokens: limits.maxOutputTokens,
              text: {
                format: {
                  type: "json_schema",
                  name: "ifsoul_content",
                  strict: true,
                  schema: input.schema,
                },
              },
            },
            limits,
          );
          const raw = object(
            await fetchJSON(
              options.fetch ?? fetch,
              "https://api.openai.com/v1/responses",
              {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${options.apiKey}`,
                },
                body,
              },
              signal,
              limits,
            ),
          );
          if (raw.status !== "completed" || !Array.isArray(raw.output))
            throw new ProviderFailure("invalid-response");
          const chunks: string[] = [];
          for (const item of raw.output) {
            const message = object(item);
            if (message.type !== "message" || !Array.isArray(message.content))
              continue;
            for (const part of message.content) {
              const content = object(part);
              if (content.type === "refusal")
                throw new ProviderFailure("invalid-response");
              if (
                content.type === "output_text" &&
                typeof content.text === "string"
              )
                chunks.push(content.text);
            }
          }
          emitProviderUsage(options.budgetPolicy, input.model, {
            inputTokens: object(raw.usage).input_tokens,
            outputTokens: object(raw.usage).output_tokens,
          });
          return parseContent(chunks.join(""), limits);
        },
        options.budgetPolicy,
      ),
  };
}
