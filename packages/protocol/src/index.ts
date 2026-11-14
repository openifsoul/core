import validators from "./generated/validators.cjs";
export type * from "./types.js";

const kinds: Record<string, string> = {
  "character-instance": "character",
  "character-template": "character",
  "environment-profile": "environment",
  "context-report": "context",
  "plan-proposal": "planning",
  "plan-decision": "planning",
  "task-report": "planning",
  "plan-cancel-request": "planning",
  "plan-cancel-result": "planning",
  "conversation-request": "conversation",
  "conversation-response": "conversation",
  "conversation-delivery": "conversation",
  "memory-event": "memory",
  "working-context": "memory",
  "memory-episode": "memory",
  "memory-fact": "memory",
  "memory-relationship": "memory",
  "intent-checkpoint": "memory",
  "archive-manifest": "archive",
};
/** Pure, synchronous structural validation; no coercion, mutation, IO or schema fetching. */
export function validateDocument(
  value: unknown,
  expectedKind?: string,
): boolean {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const kind = (value as { kind?: unknown }).kind;
  if (
    typeof kind !== "string" ||
    (expectedKind && expectedKind !== kind) ||
    !Object.hasOwn(kinds, kind)
  )
    return false;
  const version = (value as { schemaVersion?: unknown }).schemaVersion;
  if (version !== "0.4.0") return false;
  return validators["current_" + kinds[kind]]!(value) === true;
}

/** Canonical local equality for JSON documents; not a signature or authentication proof. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map(
        (key) =>
          `${JSON.stringify(key)}:${canonical((value as Record<string, unknown>)[key])}`,
      )
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

export {
  resolveResourceLimits,
  BUFFERED_JSON_MAX_BYTES,
  MAX_TIMER_MS,
} from "./resource-policy.js";
export type { BudgetReport } from "./resource-policy.js";

/** Current train identifier; wire families require exact kind/version validation. */
export const IFSOUL_VERSION = "0.6.0" as const;
/** Structural current ModelProvider spec validation; not a provider wire transport. */
export function validateModelProviderDocument(value: unknown): boolean {
  return validators.current_provider(value) === true;
}
