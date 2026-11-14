import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import {
  validateDocument,
  validateModelProviderDocument,
} from "../../packages/protocol/src/index.js";
const fixture = (path: string) =>
  JSON.parse(
    readFileSync(
      new URL("../../specs/current/" + path, import.meta.url),
      "utf8",
    ),
  );
test("only current exact product families validate without rewriting", () => {
  const doc = fixture("examples/character-instance.json");
  const bytes = JSON.stringify(doc);
  assert(validateDocument(doc));
  for (const schemaVersion of [
    "draft-0.1.0",
    "draft-0.2.0",
    "0.3.0",
    "0.6.0",
    "ifsoul-bridge/0.4.0",
  ]) {
    const old = { ...doc, schemaVersion };
    const before = JSON.stringify(old);
    assert(!validateDocument(old));
    assert.equal(JSON.stringify(old), before);
  }
  assert.equal(JSON.stringify(doc), bytes);
});
test("provider specification is distinct from protocol and callable clients", () => {
  const doc = fixture("model-provider/examples/request.json");
  assert(validateModelProviderDocument(doc));
  assert(!validateDocument(doc));
  for (const schemaVersion of ["draft-0.1.0", "0.3.0", "ifsoul-bridge/0.4.0"])
    assert(!validateModelProviderDocument({ ...doc, schemaVersion }));
});
