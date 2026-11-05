import type {
  FetchLike,
  GenerationInput,
  ProviderErrorCode,
  ProviderLimits,
  ProviderResult,
} from "./types.js";
export const DEFAULT_LIMITS: ProviderLimits = {
  timeoutMs: 45_000,
  maxRequestBytes: 200_000,
  maxResponseBytes: 100_000,
  maxOutputTokens: 2000,
};
export class ProviderFailure extends Error {
  constructor(readonly code: ProviderErrorCode) {
    super(code);
  }
}
const messages: Record<ProviderErrorCode, string> = {
  configuration: "Provider configuration is unavailable or invalid.",
  "unsupported-model": "The selected model is not supported or installed.",
  timeout: "The model request exceeded its time limit.",
  cancelled: "The model request was cancelled.",
  unauthorized: "The provider rejected its configured credential.",
  "rate-limited": "The provider rate limit was reached.",
  unavailable: "The model provider is unavailable.",
  "invalid-response": "The provider returned unusable or incomplete output.",
  "budget-exceeded": "The model request exceeded a configured resource limit.",
};
export const providerFailure = <T = never>(
  code: ProviderErrorCode,
): ProviderResult<T> => ({
  ok: false,
  error: { code, message: messages[code] },
});
export const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export const byteSize = (value: string): number =>
  new TextEncoder().encode(value).byteLength;
export function limitsFor(partial?: Partial<ProviderLimits>): ProviderLimits {
  const limits = { ...DEFAULT_LIMITS, ...partial };
  if (
    !Object.values(limits).every((v) => Number.isSafeInteger(v) && v > 0) ||
    limits.timeoutMs > 60_000 ||
    limits.maxRequestBytes > 1_000_000 ||
    limits.maxResponseBytes > 1_000_000 ||
    limits.maxOutputTokens > 4096
  )
    throw new ProviderFailure("configuration");
  return limits;
}
/** Covers fetch AND body reading, even if injected transport ignores cancellation. */
export async function bounded<T>(
  partial: Partial<ProviderLimits> | undefined,
  parent: AbortSignal | undefined,
  operation: (signal: AbortSignal, limits: ProviderLimits) => Promise<T>,
): Promise<ProviderResult<T>> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let listener: (() => void) | undefined;
  const abort = new AbortController();
  try {
    const limits = limitsFor(partial);
    if (parent?.aborted) return providerFailure("cancelled");
    const cancelled = new Promise<never>((_resolve, reject) => {
      listener = () => {
        abort.abort();
        reject(new ProviderFailure("cancelled"));
      };
      parent?.addEventListener("abort", listener, { once: true });
      timer = setTimeout(() => {
        abort.abort();
        reject(new ProviderFailure("timeout"));
      }, limits.timeoutMs);
    });
    const value = await Promise.race([
      Promise.resolve().then(() => operation(abort.signal, limits)),
      cancelled,
    ]);
    return { ok: true, value };
  } catch (error) {
    return providerFailure(
      error instanceof ProviderFailure ? error.code : "unavailable",
    );
  } finally {
    if (timer) clearTimeout(timer);
    if (listener) parent?.removeEventListener("abort", listener);
    abort.abort();
  }
}
export function requestBody(input: unknown, limits: ProviderLimits): string {
  const body = JSON.stringify(input);
  if (byteSize(body) > limits.maxRequestBytes)
    throw new ProviderFailure("budget-exceeded");
  return body;
}
export function validateGeneration(input: GenerationInput): void {
  if (
    typeof input.model !== "string" ||
    input.model.length > 128 ||
    typeof input.system !== "string" ||
    !input.system ||
    typeof input.prompt !== "string" ||
    !input.prompt ||
    !input.schema ||
    typeof input.schema !== "object"
  )
    throw new ProviderFailure("configuration");
}
export async function fetchJSON(
  fetcher: FetchLike,
  url: string,
  init: RequestInit,
  signal: AbortSignal,
  limits: ProviderLimits,
): Promise<unknown> {
  const response = await fetcher(url, { ...init, signal, redirect: "manual" });
  if (!response.ok) {
    void response.body?.cancel().catch(() => {});
    throw new ProviderFailure(
      response.status === 401 || response.status === 403
        ? "unauthorized"
        : response.status === 429
          ? "rate-limited"
          : response.status >= 500
            ? "unavailable"
            : "invalid-response",
    );
  }
  const length = response.headers.get("content-length");
  if (length && Number(length) > limits.maxResponseBytes) {
    void response.body?.cancel().catch(() => {});
    throw new ProviderFailure("budget-exceeded");
  }
  if (!response.body) throw new ProviderFailure("invalid-response");
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytes = 0,
    text = "";
  const cancel = () => {
    void reader.cancel().catch(() => {});
  };
  signal.addEventListener("abort", cancel, { once: true });
  try {
    for (;;) {
      if (signal.aborted) throw new ProviderFailure("cancelled");
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > limits.maxResponseBytes)
        throw new ProviderFailure("budget-exceeded");
      text += decoder.decode(chunk.value, { stream: true });
    }
    text += decoder.decode();
    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new ProviderFailure("invalid-response");
    }
  } finally {
    signal.removeEventListener("abort", cancel);
    cancel();
    reader.releaseLock();
  }
}
export function parseContent(value: unknown, limits: ProviderLimits): unknown {
  try {
    const serialized =
      typeof value === "string" ? value : JSON.stringify(value);
    if (!serialized || byteSize(serialized) > limits.maxResponseBytes)
      throw new ProviderFailure("budget-exceeded");
    const parsed: unknown = JSON.parse(serialized);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      throw new ProviderFailure("invalid-response");
    return parsed;
  } catch (error) {
    if (error instanceof ProviderFailure) throw error;
    throw new ProviderFailure("invalid-response");
  }
}
