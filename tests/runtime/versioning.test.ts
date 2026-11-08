import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  IFSOUL_VERSION,
  upgradeDocument,
  validateDocument,
  validateModelProviderDocument,
} from "../../packages/protocol/src/index.js";
import type { CharacterInstance } from "../../packages/protocol/src/types.js";
test("current and legacy validation dispatch and typed copy adapter preserve original evidence", () => {
  const legacy = JSON.parse(
    readFileSync(
      new URL(
        "../../specs/v0.2/examples/character-instance.json",
        import.meta.url,
      ),
      "utf8",
    ),
  ) as CharacterInstance;
  const bytes = JSON.stringify(legacy);
  assert(validateDocument(legacy));
  const current = upgradeDocument(legacy);
  assert.equal(current.schemaVersion, IFSOUL_VERSION);
  assert(validateDocument(current));
  assert.equal(JSON.stringify(legacy), bytes);
  assert(!validateDocument({ ...current, schemaVersion: "0.4.0" }));
  assert.throws(() =>
    upgradeDocument({
      ...legacy,
      schemaVersion: "draft-0.1.0",
    } as unknown as CharacterInstance),
  );
});
test("current provider spec validation is separate from callable clients", () => {
  const doc = JSON.parse(
    readFileSync(
      new URL(
        "../../specs/current/model-provider/examples/request.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert(validateModelProviderDocument(doc));
  assert(!validateDocument(doc));
  assert(
    !validateModelProviderDocument({ ...doc, schemaVersion: "draft-0.1.0" }),
  );
});
