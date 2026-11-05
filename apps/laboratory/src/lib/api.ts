import type {
  LabSnapshot,
  LabRunResponse,
  ProviderId,
} from "../../../runtime-host/src/service-types";

export interface ProviderOption {
  id: ProviderId;
  label: string;
  available: boolean;
  models: { id: string; label: string }[];
  reason?: string;
}

export interface LabStatus {
  authenticated: boolean;
  mode: "cloud" | "local";
  providers: ProviderOption[];
  snapshot?: LabSnapshot;
}

export class ApiError extends Error {
  constructor(readonly code: string) {
    super(code);
  }
}

/** Same-origin only. Credentials never enter URLs, logs or browser storage. */
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const timeout = AbortSignal.timeout(60_000);
  try {
    const response = await fetch(`/api/${path}`, {
      method: options.method ?? "GET",
      credentials: "same-origin",
      headers:
        options.body === undefined
          ? undefined
          : { "Content-Type": "application/json" },
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal
        ? AbortSignal.any([timeout, options.signal])
        : timeout,
    });
    const data: unknown = await response.json();
    if (typeof data !== "object" || data === null)
      throw new ApiError("unavailable");
    const result = data as {
      ok?: boolean;
      error?: { code?: string };
      value?: unknown;
    };
    if (!response.ok || result.ok === false)
      throw new ApiError(
        result.error?.code ??
          (response.status === 401 ? "unauthorized" : "unavailable"),
      );
    return (result.ok === true && "value" in result ? result.value : data) as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (options.signal?.aborted) throw error;
    throw new ApiError(timeout.aborted ? "timeout" : "network");
  }
}

export function friendlyError(error: unknown): string {
  const code = error instanceof ApiError ? error.code : "unavailable";
  const messages: Record<string, string> = {
    unauthorized: "Your session has ended. Sign in again to continue.",
    "invalid-password": "That password did not match. Check it and try again.",
    "rate-limited": "Too many attempts. Wait a moment, then try again.",
    network:
      "Could not reach this runtime. Check the connection and try again.",
    timeout:
      "This is taking longer than expected. Your draft is safe. Retry to check the same request.",
    "controller-failed":
      "The selected provider could not complete this request. Your draft is safe; try again.",
    "provider-unavailable":
      "This provider is not connected. Check its settings or choose another provider.",
    "missing-credential": "Connect an OpenAI key before using this provider.",
    "invalid-key": "The key could not be saved. Check it and try again.",
    "stale-context":
      "The context changed during this request. Refresh the workspace and try again.",
    conflict:
      "This request no longer matches the saved attempt. Refresh the workspace before retrying.",
    "database-owned":
      "Another local session is using this memory store. Close it and try again.",
    "budget-exceeded":
      "This request exceeded the workspace limit. Shorten the message or try another provider.",
  };
  return (
    messages[code] ??
    "The request could not be completed. Your work is safe. Please try again."
  );
}

export type { LabSnapshot, LabRunResponse, ProviderId };
