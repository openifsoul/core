import assert from "node:assert/strict";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { MEMORY_SCHEMA } from "../../packages/memory/src/sql.js";
import { openSQLiteMemory } from "../../packages/memory/src/sqlite.js";
test("persisted obsolete character fails explicitly across reopen without rewriting bytes", () => {
  const dir = mkdtempSync(join(tmpdir(), "ifsoul-old-format-"));
  const file = join(dir, "synthetic.sqlite");
  const current = JSON.parse(
    readFileSync(
      new URL(
        "../../specs/current/examples/character-instance.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const old = { ...current, schemaVersion: "0.3.0" };
  const bytes = JSON.stringify(old);
  try {
    const db = new DatabaseSync(file);
    db.exec(MEMORY_SCHEMA);
    db.prepare("INSERT INTO characters(id,document) VALUES(?,?)").run(
      old.characterId,
      bytes,
    );
    db.close();
    for (let i = 0; i < 2; i++) {
      const opened = openSQLiteMemory(file);
      assert(opened.ok);
      if (!opened.ok) throw Error();
      const memory = opened.value;
      for (const result of [
        memory.getCharacter(old.characterId),
        memory.listCharacters(10),
        memory.putCharacter(current),
      ]) {
        assert.equal(result.ok, false);
        if (!result.ok) {
          assert.equal(result.error.code, "unsupported");
          assert.match(result.error.message, /no migration or reset/);
        }
      }
      memory.close();
      const verify = new DatabaseSync(file);
      assert.equal(
        verify
          .prepare("SELECT document FROM characters WHERE id=?")
          .get(old.characterId)?.document,
        bytes,
      );
      assert.equal(
        verify.prepare("SELECT count(*) AS n FROM characters").get()?.n,
        1,
      );
      verify.close();
    }
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
test("nested product journals reject unsupported versions but unrelated versioned JSON remains opaque", () => {
  const dir = mkdtempSync(join(tmpdir(), "ifsoul-journal-format-"));
  const file = join(dir, "synthetic.sqlite");
  const current = JSON.parse(
    readFileSync(
      new URL(
        "../../specs/current/examples/character-instance.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  const versions = [
    "draft-0.1.0",
    "draft-0.2.0",
    "0.3.0",
    "0.5.0",
    "ifsoul-bridge/0.4.0",
  ];
  try {
    const db = new DatabaseSync(file);
    db.exec(MEMORY_SCHEMA);
    db.prepare("INSERT INTO characters(id,document) VALUES(?,?)").run(
      current.characterId,
      JSON.stringify(current),
    );
    const records = versions.map((schemaVersion, index) => ({
      id: `old-${index}`,
      characterId: current.characterId,
      category: "synthetic",
      input: { nested: { ...current, schemaVersion } },
      result: {},
    }));
    const opaque = {
      id: "opaque",
      characterId: current.characterId,
      category: "synthetic",
      input: { kind: "external-game-save", schemaVersion: "0.3.0" },
      result: { schemaVersion: 17 },
    };
    for (const record of [...records, opaque])
      db.prepare(
        "INSERT INTO exchanges(id,character_id,document) VALUES(?,?,?)",
      ).run(record.id, record.characterId, JSON.stringify(record));
    db.close();
    const opened = openSQLiteMemory(file);
    assert(opened.ok);
    if (!opened.ok) throw Error();
    for (const record of records) {
      const result = opened.value.getExchange(record.id);
      assert.equal(result.ok, false);
      if (!result.ok) assert.equal(result.error.code, "unsupported");
    }
    assert.deepEqual(opened.value.getExchange(opaque.id), {
      ok: true,
      value: opaque,
    });
    opened.value.close();
    const verify = new DatabaseSync(file);
    for (const record of [...records, opaque])
      assert.equal(
        verify
          .prepare("SELECT document FROM exchanges WHERE id=?")
          .get(record.id)?.document,
        JSON.stringify(record),
      );
    verify.close();
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
