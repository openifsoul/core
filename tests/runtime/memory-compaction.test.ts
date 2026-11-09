import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { openSQLiteMemory } from "../../packages/memory/src/sqlite.js";
import type { MemoryPort, Result } from "../../packages/memory/src/port.js";
import type {
  CharacterInstance,
  MemoryEvent,
} from "../../packages/protocol/src/index.js";

function unwrap<T>(result: Result<T>): T {
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) throw Error("Synthetic fixture failed");
  return result.value;
}
const fixture = <T>(name: string): T =>
  JSON.parse(
    readFileSync(
      new URL(`../../specs/current/examples/${name}.json`, import.meta.url),
      "utf8",
    ),
  );
function event(id: string, overrides: Partial<MemoryEvent> = {}): MemoryEvent {
  return {
    ...fixture<MemoryEvent>("memory-event-observed"),
    memoryId: id,
    ...overrides,
  };
}
const exchange = (id: string, characterId = "character-mira") => ({
  id,
  characterId,
  category: "synthetic-journal",
  input: { id },
  result: { recorded: true },
});
function recall(memory: MemoryPort, characterId = "character-mira") {
  return unwrap(
    memory.recall({
      characterId,
      audienceParticipantIds: ["participant-mira"],
      environmentIds: ["garden", "other-world"],
      limit: 100,
      maxBytes: 100000,
    }),
  );
}
function setup(path = ":memory:") {
  const memory = unwrap(openSQLiteMemory(path));
  const character = fixture<CharacterInstance>("character-instance");
  unwrap(memory.putCharacter(character));
  unwrap(memory.putCharacter({ ...character, characterId: "character-other" }));
  const original = event("source-one");
  const unrelated = event("unrelated-same-partition");
  const otherEnvironment = event("other-environment", {
    environmentId: "other-world",
  });
  const otherScope = event("other-scope", {
    scope: { ...original.scope, export: "forbidden" },
  });
  const otherCharacter = event("other-character", {
    characterId: "character-other",
  });
  unwrap(
    memory.commit({
      events: [
        original,
        unrelated,
        otherEnvironment,
        otherScope,
        otherCharacter,
      ],
      exchanges: [
        exchange("source-exchange"),
        exchange("runtime-unrelated"),
        exchange("foreign-exchange", "character-other"),
      ],
    }),
  );
  const replacement = event("derived-one", {
    eventType: "synthetic-derived",
    recordedPayload: { sourceId: original.memoryId },
  });
  const batch = {
    characterId: original.characterId,
    environmentId: original.environmentId!,
    scope: original.scope,
    eventIds: [original.memoryId],
    exchangeIds: ["source-exchange"],
    events: [replacement],
    exchanges: [exchange("derived-exchange")],
  };
  return { memory, original, replacement, batch };
}

test("atomic retention removes only explicit sources and an identical repeat is reused", () => {
  const { memory, batch, replacement } = setup();
  try {
    unwrap(memory.compact!(batch));
    assert.deepEqual(
      recall(memory)
        .map((e) => e.memoryId)
        .sort(),
      [
        "derived-one",
        "other-environment",
        "other-scope",
        "unrelated-same-partition",
      ].sort(),
    );
    assert.deepEqual(
      recall(memory, "character-other").map((e) => e.memoryId),
      ["other-character"],
    );
    assert.equal(unwrap(memory.getExchange("source-exchange")), undefined);
    for (const id of [
      "runtime-unrelated",
      "foreign-exchange",
      "derived-exchange",
    ])
      assert.ok(unwrap(memory.getExchange(id)));
    assert.deepEqual(
      recall(memory).find((e) => e.memoryId === replacement.memoryId),
      replacement,
    );
    const repeated = memory.compact!(batch);
    unwrap(repeated);
    assert.equal(repeated.ok && repeated.reused, true);
  } finally {
    memory.close();
  }
});

test("retention rejects foreign character, environment, scope and exchange references without mutations", () => {
  const { memory, batch } = setup();
  try {
    const before = recall(memory),
      foreignBefore = recall(memory, "character-other");
    for (const change of [
      { eventIds: ["other-character"] },
      { eventIds: ["other-environment"] },
      { eventIds: ["other-scope"] },
      { exchangeIds: ["foreign-exchange"] },
      { eventIds: ["missing-source"] },
      {
        events: [
          event("invalid-replacement", {
            schemaVersion: "invalid" as MemoryEvent["schemaVersion"],
          }),
        ],
      },
    ]) {
      const result = memory.compact!({ ...batch, ...change });
      assert.equal(result.ok, false);
      assert.deepEqual(recall(memory), before);
      assert.deepEqual(recall(memory, "character-other"), foreignBefore);
      assert.ok(unwrap(memory.getExchange("source-exchange")));
      assert.equal(unwrap(memory.getExchange("derived-exchange")), undefined);
    }
  } finally {
    memory.close();
  }
});

test("replacement write failure rolls source deletion back and survives SQLite reopen", () => {
  const directory = mkdtempSync(join(tmpdir(), "ifsoul-retention-"));
  const path = join(directory, "memory.sqlite");
  let { memory, batch } = setup(path);
  const db = new DatabaseSync(path);
  try {
    const before = recall(memory);
    db.exec(
      "CREATE TRIGGER synthetic_write_failure BEFORE INSERT ON events WHEN NEW.id='derived-one' BEGIN SELECT RAISE(ABORT,'synthetic failure'); END;",
    );
    const result = memory.compact!(batch);
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, "storage");
    assert.deepEqual(recall(memory), before);
    assert.ok(unwrap(memory.getExchange("source-exchange")));
    assert.equal(unwrap(memory.getExchange("derived-exchange")), undefined);
    db.exec("DROP TRIGGER synthetic_write_failure");
    unwrap(memory.close());
    memory = unwrap(openSQLiteMemory(path));
    assert.deepEqual(recall(memory), before);
    unwrap(memory.compact!(batch));
    assert.ok(recall(memory).some((e) => e.memoryId === "derived-one"));
  } finally {
    db.close();
    memory.close();
    rmSync(directory, { recursive: true, force: true });
  }
});
