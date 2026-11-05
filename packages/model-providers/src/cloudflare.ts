import {
  bounded,
  object,
  parseContent,
  ProviderFailure,
  requestBody,
  validateGeneration,
} from "./bounded.js";
import type { CloudflareInvoke, ModelClient, ProviderLimits } from "./types.js";
export const CLOUDFLARE_MODELS = [
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/meta/llama-3.1-8b-instruct-fp8",
] as const;
export const DEFAULT_CLOUDFLARE_MODEL = CLOUDFLARE_MODELS[0];
/** The composition root supplies env.AI.run; this package reads no Worker binding or key. */
export function createCloudflareProvider(options: {
  invoke: CloudflareInvoke;
  limits?: Partial<ProviderLimits>;
}): ModelClient {
  return {
    id: "cloudflare",
    generate: (input) =>
      bounded(options.limits, input.signal, async (signal, limits) => {
        validateGeneration(input);
        if (
          !CLOUDFLARE_MODELS.includes(
            input.model as (typeof CLOUDFLARE_MODELS)[number],
          )
        )
          throw new ProviderFailure("unsupported-model");
        const payload = {
          messages: [
            { role: "system", content: input.system },
            { role: "user", content: input.prompt },
          ],
          stream: false,
          max_tokens: limits.maxOutputTokens,
          response_format: { type: "json_schema", json_schema: input.schema },
        };
        requestBody(payload, limits);
        const raw = object(await options.invoke(input.model, payload, signal));
        return parseContent(raw.response, limits);
      }),
  };
}
