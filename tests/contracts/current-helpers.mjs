import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const root = new URL("../../", import.meta.url);
export const prefix = "urn:ifsoul:protocol:0.4.0:";
export const kinds = {
  "character-template": "character",
  "character-instance": "character",
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

export async function readJson(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

export async function readBytes(path) {
  return readFile(new URL(path, root));
}

export async function jsonPaths(path, suffixes = [".json"]) {
  const entries = await readdir(new URL(`${path}/`, root), {
    withFileTypes: true,
  });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory())
      files.push(...(await jsonPaths(`${path}/${entry.name}`, suffixes)));
    else if (
      entry.isFile() &&
      suffixes.some((suffix) => entry.name.endsWith(suffix))
    )
      files.push(`${path}/${entry.name}`);
  }
  return files;
}

function visit(value, callback) {
  if (!value || typeof value !== "object") return;
  callback(value);
  for (const child of Object.values(value)) visit(child, callback);
}

export async function createRegistry() {
  const paths = await jsonPaths("packages/protocol/schemas/current");
  assert.equal(
    paths.length,
    10,
    "current registry includes protocol and provider schemas",
  );
  const schemas = await Promise.all(paths.map(readJson));
  const ids = new Set(schemas.map((schema) => schema.$id));
  assert.equal(ids.size, schemas.length);
  const ajv = new Ajv2020({
    strict: true,
    allErrors: true,
    validateFormats: true,
    coerceTypes: false,
    removeAdditional: false,
    useDefaults: false,
  });
  addFormats(ajv);
  for (const schema of schemas) {
    assert.ok(schema.$id.startsWith(prefix));
    visit(schema, (node) => {
      for (const field of ["$ref", "$dynamicRef"]) {
        if (typeof node[field] !== "string") continue;
        const [id] = node[field].split("#");
        assert.ok(
          !id || ids.has(id),
          `nonlocal current reference: ${node[field]}`,
        );
      }
    });
    ajv.addSchema(schema);
  }
  // Synchronous local compilation only; no remote schema loader is installed.
  for (const schema of schemas)
    assert.equal(typeof ajv.getSchema(schema.$id), "function");
  return ajv;
}

export function check(ajv, document, stem = kinds[document.kind]) {
  assert.ok(stem, `unsupported current kind ${document.kind}`);
  const validator = ajv.getSchema(`${prefix}${stem}`);
  assert.ok(validator, `missing current schema ${stem}`);
  const before = structuredClone(document);
  const valid = validator(document);
  const errors = structuredClone(validator.errors ?? []);
  assert.deepEqual(
    document,
    before,
    "validation must preserve valid and invalid inputs",
  );
  return { valid, errors };
}

export function accepts(ajv, document) {
  const result = check(ajv, document);
  assert.equal(result.valid, true, JSON.stringify(result.errors));
}

export function rejects(ajv, document, keyword, instancePath) {
  const result = check(ajv, document);
  assert.equal(result.valid, false, "the negative fixture must be rejected");
  assert.ok(
    result.errors.some(
      (error) =>
        error.keyword === keyword && error.instancePath === instancePath,
    ),
    `expected ${keyword} at ${instancePath}: ${JSON.stringify(result.errors)}`,
  );
}
