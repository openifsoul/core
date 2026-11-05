import { canonical, validateDocument } from "../../protocol/src/index.js";
import type {
  CharacterInstance,
  MemoryEvent,
  Scope,
} from "../../protocol/src/index.js";
import { failure, success } from "./port.js";
import type {
  ErrorCode,
  ExchangeRecord,
  MemoryPort,
  RecallQuery,
  Result,
} from "./port.js";
export interface SQLDriver {
  prepare(sql: string): {
    get(...args: (string | number)[]): Record<string, unknown> | undefined;
    all(...args: (string | number)[]): Record<string, unknown>[];
    run(...args: (string | number)[]): unknown;
  };
  transaction<T>(work: () => T): T;
}
class CommitFailure extends Error {
  constructor(
    readonly code: ErrorCode,
    message: string,
  ) {
    super(message);
  }
}
export const MEMORY_SCHEMA = `CREATE TABLE IF NOT EXISTS characters (id TEXT PRIMARY KEY, document TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS exchanges (id TEXT PRIMARY KEY, character_id TEXT NOT NULL REFERENCES characters(id), document TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS events (sequence INTEGER PRIMARY KEY, id TEXT UNIQUE NOT NULL, character_id TEXT NOT NULL REFERENCES characters(id), environment_id TEXT NOT NULL, document TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS event_scope ON events(character_id, environment_id, sequence);`;
export function validScope(scope: Scope): boolean {
  return (
    new Set(scope.participantIds).size === scope.participantIds.length &&
    (scope.audience === "public"
      ? scope.participantIds.length === 0
      : scope.audience === "private"
        ? scope.participantIds.length === 1
        : scope.participantIds.length > 0)
  );
}

export function createSQLMemory(
  db: SQLDriver,
  closeOwner: () => void = () => {},
): MemoryPort {
  let closed = false;
  const guarded = <T>(action: () => Result<T>): Result<T> => {
    if (closed) return failure("closed", "Memory store is closed.");
    try {
      return action();
    } catch {
      return failure("storage", "Memory operation failed.");
    }
  };
  const read = <T>(
    table: "characters" | "exchanges",
    id: string,
  ): T | undefined => {
    const row = db.prepare(`SELECT document FROM ${table} WHERE id=?`).get(id);
    return row ? (JSON.parse(row.document as string) as T) : undefined;
  };
  const port: MemoryPort = {
    putCharacter: (character) =>
      guarded(() => {
        if (
          !validateDocument(character, "character-instance") ||
          character.requiredExtensions?.length
        )
          return failure("invalid-document", "Unsupported character document.");
        const existing = read<CharacterInstance>(
          "characters",
          character.characterId,
        );
        if (existing)
          return canonical(existing) === canonical(character)
            ? success(existing, true)
            : failure(
                "conflict",
                "Character ID already has different content.",
              );
        db.prepare("INSERT INTO characters(id,document) VALUES (?,?)").run(
          character.characterId,
          canonical(character),
        );
        return success(structuredClone(character));
      }),
    listCharacters: (limit) =>
      guarded(() => {
        if (!Number.isInteger(limit) || limit < 1 || limit > 100)
          return failure("budget-exceeded", "Invalid character list limit.");
        return success(
          db
            .prepare("SELECT document FROM characters ORDER BY id LIMIT ?")
            .all(limit)
            .map(
              (row) => JSON.parse(row.document as string) as CharacterInstance,
            ),
        );
      }),
    getCharacter: (id) =>
      guarded(() => success(read<CharacterInstance>("characters", id))),
    getExchange: (id) =>
      guarded(() => success(read<ExchangeRecord>("exchanges", id))),
    commit: (batch) =>
      guarded(() => {
        for (const character of batch.characters ?? []) {
          if (
            !validateDocument(character, "character-instance") ||
            character.requiredExtensions?.length
          )
            return failure(
              "invalid-document",
              "Unsupported character document.",
            );
        }
        const events = new Map<string, MemoryEvent>();
        const exchanges = new Map<string, ExchangeRecord>();
        for (const event of batch.events) {
          if (
            !validateDocument(event, "memory-event") ||
            event.requiredExtensions?.length ||
            !validScope(event.scope) ||
            !event.environmentId
          )
            return failure("invalid-document", "Invalid scoped memory event.");
          const old = events.get(event.memoryId);
          if (old && canonical(old) !== canonical(event))
            return failure(
              "conflict",
              "Repeated memory ID has different content.",
            );
          events.set(event.memoryId, event);
        }
        for (const exchange of batch.exchanges) {
          const old = exchanges.get(exchange.id);
          if (old && canonical(old) !== canonical(exchange))
            return failure(
              "conflict",
              "Repeated exchange ID has different content.",
            );
          exchanges.set(exchange.id, exchange);
        }
        try {
          return db.transaction(() => {
            for (const character of batch.characters ?? []) {
              const old = read<CharacterInstance>(
                "characters",
                character.characterId,
              );
              if (old && canonical(old) !== canonical(character)) {
                throw new CommitFailure(
                  "conflict",
                  "Character ID already has different content.",
                );
              }
              if (!old)
                db.prepare(
                  "INSERT INTO characters(id,document) VALUES (?,?)",
                ).run(character.characterId, canonical(character));
            }
            for (const exchange of exchanges.values()) {
              const old = read<ExchangeRecord>("exchanges", exchange.id);
              if (old && canonical(old) !== canonical(exchange)) {
                throw new CommitFailure(
                  "conflict",
                  "Exchange ID already has different content.",
                );
              }
              if (!old)
                db.prepare(
                  "INSERT INTO exchanges(id,character_id,document) VALUES (?,?,?)",
                ).run(exchange.id, exchange.characterId, canonical(exchange));
            }
            for (const event of events.values()) {
              const old = db
                .prepare("SELECT document FROM events WHERE id=?")
                .get(event.memoryId);
              if (old && old.document !== canonical(event)) {
                throw new CommitFailure(
                  "conflict",
                  "Memory ID already has different content.",
                );
              }
              if (!old)
                db.prepare(
                  "INSERT INTO events(id,character_id,environment_id,document) VALUES (?,?,?,?)",
                ).run(
                  event.memoryId,
                  event.characterId,
                  event.environmentId!,
                  canonical(event),
                );
            }
            return success(undefined);
          });
        } catch (error) {
          return error instanceof CommitFailure
            ? failure(error.code, error.message)
            : failure("storage", "Atomic memory write failed.");
        }
      }),
    recall: (query: RecallQuery) =>
      guarded(() => {
        if (
          !query.audienceParticipantIds.length ||
          query.audienceParticipantIds.length > 32 ||
          !query.environmentIds.length ||
          query.environmentIds.length > 64 ||
          !Number.isInteger(query.limit) ||
          query.limit < 1 ||
          query.limit > 1000 ||
          !Number.isInteger(query.maxBytes) ||
          query.maxBytes < 1 ||
          query.maxBytes > 1_000_000
        )
          return failure("budget-exceeded", "Recall bounds are invalid.");
        const rows = db
          .prepare(
            `SELECT document FROM events WHERE character_id=? AND environment_id IN (${query.environmentIds.map(() => "?").join(",")})
          AND (?=0 OR json_extract(document,'$.scope.audience')='public')
          AND (json_extract(document,'$.scope.audience')='public' OR NOT EXISTS (
            SELECT 1 FROM json_each(?) AS intended WHERE NOT EXISTS (
              SELECT 1 FROM json_each(events.document,'$.scope.participantIds') AS allowed WHERE allowed.value=intended.value)))
          ORDER BY sequence DESC LIMIT ?`,
          )
          .all(
            query.characterId,
            ...query.environmentIds,
            query.publicOnly ? 1 : 0,
            JSON.stringify(query.audienceParticipantIds),
            query.limit,
          );
        const selected: MemoryEvent[] = [];
        let size = 0;
        for (const row of rows) {
          const bytes = new TextEncoder().encode(
            row.document as string,
          ).byteLength;
          if (size + bytes > query.maxBytes) continue;
          size += bytes;
          selected.push(JSON.parse(row.document as string) as MemoryEvent);
        }
        return success(selected.reverse());
      }),
    close: () => {
      try {
        closeOwner();
        closed = true;
        return success(undefined);
      } catch {
        return failure("storage", "Memory close failed.");
      }
    },
  };
  return port;
}
