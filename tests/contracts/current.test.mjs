import assert from "node:assert/strict";
import test from "node:test";
import { readFile, readdir } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
const root = new URL("../../", import.meta.url);
const read = async (p) => JSON.parse(await readFile(new URL(p, root), "utf8"));
const ajv = new Ajv2020({ strict: true, allErrors: true });
addFormats(ajv);
for (const name of await readdir(
  new URL("packages/protocol/schemas/current/", root),
))
  ajv.addSchema(await read("packages/protocol/schemas/current/" + name));
const kinds = {
  "character-instance": "character",
  "character-template": "character",
  "environment-profile": "environment",
  "context-report": "context",
  "memory-event": "memory",
  "working-context": "memory",
  "memory-episode": "memory",
  "memory-fact": "memory",
  "memory-relationship": "memory",
  "intent-checkpoint": "memory",
  "archive-manifest": "archive",
  "provider-capabilities": "model-provider",
  "model-request": "model-provider",
  "model-response": "model-provider",
  "model-error": "model-provider",
};
for (const folder of [
  "specs/current/examples/",
  "specs/current/model-provider/examples/",
])
  for (const name of await readdir(new URL(folder, root))) {
    const bytes = await readFile(new URL(folder + name, root), "utf8");
    const docs = name.endsWith(".jsonl")
      ? bytes.trim().split("\n").map(JSON.parse)
      : [JSON.parse(bytes)];
    for (const [i, doc] of docs.entries())
      test(`current ${name}:${i}`, () => {
        const family =
          kinds[doc.kind] ??
          (doc.kind.startsWith("conversation-") ? "conversation" : "planning");
        const check = ajv.getSchema("urn:ifsoul:protocol:0.3.0:" + family);
        assert(check(doc), JSON.stringify(check.errors));
        assert.equal(check({ ...doc, schemaVersion: "0.9.0" }), false);
        assert.equal(check({ ...doc, kind: "wrong-family" }), false);
      });
  }
