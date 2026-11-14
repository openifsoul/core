import type {
  CharacterInstance,
  MemoryEvent,
} from "../../protocol/src/index.js";

export type ErrorCode =
  | "invalid-document"
  | "unauthorized"
  | "stale-context"
  | "expired"
  | "unsupported"
  | "invalid-plan"
  | "invalid-conversation"
  | "correlation"
  | "conflict"
  | "timeout"
  | "controller-failed"
  | "budget-exceeded"
  | "storage"
  | "database-owned"
  | "closed"
  | "no-session";
export type Result<T> =
  | { ok: true; value: T; reused?: boolean }
  | { ok: false; error: { code: ErrorCode; message: string } };
export const success = <T>(value: T, reused = false): Result<T> => ({
  ok: true,
  value,
  ...(reused ? { reused: true } : {}),
});
export const failure = <T = never>(
  code: ErrorCode,
  message: string,
): Result<T> => ({ ok: false, error: { code, message } });
export interface ExchangeRecord {
  id: string;
  characterId: string;
  category: string;
  input: unknown;
  result: unknown;
}
export interface RecallQuery {
  characterId: string;
  audienceParticipantIds: string[];
  environmentIds: string[];
  limit: number;
  maxBytes: number;
  publicOnly?: boolean;
}
export interface MemoryScanQuery {
  characterId: string;
  /** Trusted owner-visible identities. Every participant on a non-public row must be listed. */
  visibleParticipantIds: string[];
  /** Exact full-text phrase over retained canonical event documents. */
  text?: string;
  /** Skip the candidate count when iterating an anchored projection. */
  includeTotal?: boolean;
  after?: number;
  through?: number;
  anchor?: string;
  /** A reset excludes earlier entries in this environment, including after cursor creation. */
  reset?: { environmentId: string; eventType: string };
  limit: number;
}
export interface MemoryScanPage {
  entries: { sequence: number; event: MemoryEvent }[];
  through: number;
  anchor: string;
  next?: number;
  /** Authorized event count within the current search anchor. */
  total?: number;
}
/** Trusted local storage port; do not expose unrestricted methods to controllers or hosts. */
export interface MemoryPort {
  putCharacter(character: CharacterInstance): Result<CharacterInstance>;
  /** Trusted owner catalog only; never expose to model/bridge. */
  listCharacters(limit: number): Result<CharacterInstance[]>;
  getCharacter(characterId: string): Result<CharacterInstance | undefined>;
  getExchange(id: string): Result<ExchangeRecord | undefined>;
  /** All exchanges/events succeed together, or none are inserted. Existing identical IDs are idempotent. */
  commit(batch: {
    characters?: CharacterInstance[];
    exchanges: ExchangeRecord[];
    events: MemoryEvent[];
  }): Result<void>;
  recall(query: RecallQuery): Result<MemoryEvent[]>;
  /** Trusted owner inspection only. Bounds retained events; exchange journals are excluded. */
  scan?(query: MemoryScanQuery): Result<MemoryScanPage>;
  /** Trusted owner-only atomic retention. Exact source IDs must still exist in the
   * nominated character/environment/scope. Replacements validate before pruning.
   * Optional for older adapters; callers must reject unsupported retention. */
  compact?(batch: {
    characterId: string;
    environmentId: string;
    scope: MemoryEvent["scope"];
    eventIds: string[];
    exchangeIds: string[];
    events: MemoryEvent[];
    exchanges: ExchangeRecord[];
  }): Result<void>;
  close(): Result<void>;
}
