export type ProviderId = "cloudflare" | "openai" | "ollama" | "scenario";
export interface ProviderSelection {
  provider: ProviderId;
  model: string;
}
export type ProviderErrorCode =
  | "configuration"
  | "unsupported-model"
  | "timeout"
  | "cancelled"
  | "unauthorized"
  | "rate-limited"
  | "unavailable"
  | "invalid-response"
  | "budget-exceeded"
  | "unsupported-policy";
export type ProviderResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: { code: ProviderErrorCode; message: string } };
export interface GenerationInput {
  model: string;
  system: string;
  prompt: string;
  schema: Record<string, unknown>;
  signal?: AbortSignal;
}
export interface ProviderLimits {
  timeoutMs: number;
  maxRequestBytes: number;
  maxResponseBytes: number;
  maxOutputTokens: number;
}
export interface ModelClient {
  readonly id: Exclude<ProviderId, "scenario">;
  generate(input: GenerationInput): Promise<ProviderResult<unknown>>;
}
export interface OllamaClient extends ModelClient {
  readonly id: "ollama";
  listModels(signal?: AbortSignal): Promise<ProviderResult<string[]>>;
}
export type FetchLike = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;
export type CloudflareInvoke = (
  model: string,
  input: Record<string, unknown>,
  signal: AbortSignal,
) => Promise<unknown>;

/** Trusted composition configuration; never inferred from a prompt or request body. */
export interface ModelContextBudget {
  windowTokens: number;
  modelMaxTokens?: number;
  source: "operator" | "provider";
  countInputTokens?: (input: GenerationInput) => {
    tokens: number;
    kind: "exact" | "estimate";
    method?: string;
  };
}
export interface ProviderBudgetPolicy {
  ceilings?: Partial<ProviderLimits>;
  contexts?: Record<string, ModelContextBudget>;
  onBudget?: (
    report: import("../../protocol/src/resource-policy.js").BudgetReport<ProviderLimits> & {
      context?: {
        windowTokens?: number;
        modelMaxTokens?: number;
        source: "unknown" | "operator" | "provider";
        inputTokens?: number;
        accounting: "unknown" | "exact" | "estimate";
        method?: string;
      };
    },
  ) => void;
  onUsage?: (usage: {
    model: string;
    inputTokens?: number;
    outputTokens?: number;
    prefillMs?: number;
    decodeMs?: number;
  }) => void;
}
