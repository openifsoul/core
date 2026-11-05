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
  close(): Result<void>;
}
