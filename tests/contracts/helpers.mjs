import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

export const root = new URL("../../", import.meta.url);
export const prefix = "urn:ifsoul:protocol:draft-0.1.0:";
export const kindSchemas = {
  "character-template": "character-template",
  "character-instance": "character-instance",
  "archive-manifest": "archive-manifest",
  "memory-event": "memory-event",
  "derived-memory": "derived-memory",
  "capability-set": "capability",
  perception: "perception",
  action: "action",
  "action-result": "action-result",
  "world-event": "world-event",
  "permission-policy": "permission-policy",
  "permission-decision": "permission-policy",
  "provider-capabilities": "model-provider",
  "model-request": "model-provider",
  "model-response": "model-provider",
  "model-error": "model-provider",
};

export async function json(path) {
  return JSON.parse(await readFile(new URL(path, root), "utf8"));
}

export async function jsonFiles(path) {
  const directory = new URL(path.endsWith("/") ? path : `${path}/`, root);
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.isDirectory())
      files.push(...(await jsonFiles(`${path}/${entry.name}`)));
    else if (entry.isFile() && entry.name.endsWith(".json"))
      files.push(`${path}/${entry.name}`);
  }
  return files;
}

export function visit(value, callback) {
  if (!value || typeof value !== "object") return;
  callback(value);
  for (const child of Object.values(value)) visit(child, callback);
}

export async function registry() {
  const ajv = new Ajv2020({
    strict: true,
    allErrors: true,
    validateFormats: true,
    coerceTypes: false,
    useDefaults: false,
    removeAdditional: false,
  });
  addFormats(ajv);
  // No compileAsync/loadSchema: all protocol references must resolve locally.
  // v0.1 is retained verbatim; newer version directories have their own registry.
  const files = (await jsonFiles("packages/protocol/schemas")).filter(
    (file) => !file.slice("packages/protocol/schemas/".length).includes("/"),
  );
  const schemas = await Promise.all(files.map(json));
  const ids = new Set(schemas.map((schema) => schema.$id));
  assert.equal(ids.size, schemas.length, "schema IDs must be unique");
  for (const schema of schemas) {
    assert.ok(schema.$id.startsWith(prefix), schema.$id);
    visit(schema, (node) => {
      for (const key of ["$ref", "$dynamicRef"]) {
        if (typeof node[key] !== "string") continue;
        const [id] = node[key].split("#");
        assert.ok(
          !id || ids.has(id),
          `nonlocal/unregistered ${key}: ${node[key]}`,
        );
      }
    });
    ajv.addSchema(schema);
  }
  for (const schema of schemas)
    assert.equal(typeof ajv.getSchema(schema.$id), "function");
  return { ajv, files, schemas };
}

export function validateUnchanged(ajv, schema, document) {
  const before = structuredClone(document);
  const validator = ajv.getSchema(`${prefix}${schema}`);
  assert.ok(validator, `missing schema ${schema}`);
  const valid = validator(document);
  const errors = structuredClone(validator.errors ?? []);
  assert.deepEqual(document, before, "validation must not modify the input");
  return { valid, errors };
}

export function assertDocument(ajv, document, label) {
  const schema = kindSchemas[document.kind];
  assert.ok(schema, `${label}: unsupported kind ${document.kind}`);
  const result = validateUnchanged(ajv, schema, document);
  assert.equal(
    result.valid,
    true,
    `${label}: ${JSON.stringify(result.errors)}`,
  );
}

// Fixture construction only; this is deliberately not a protocol patch API.
export async function materialize(fixture) {
  const document = await json(fixture.base);
  for (const [pointer, value] of Object.entries(fixture.set ?? {})) {
    const keys = pointer.split("/").slice(1);
    assert.ok(keys.length && keys.every((key) => key && !/[~]/.test(key)));
    const parent = keys
      .slice(0, -1)
      .reduce((object, key) => object[key], document);
    parent[keys.at(-1)] = structuredClone(value);
  }
  for (const pointer of fixture.remove ?? []) {
    const keys = pointer.split("/").slice(1);
    const parent = keys
      .slice(0, -1)
      .reduce((object, key) => object[key], document);
    delete parent[keys.at(-1)];
  }
  return document;
}

export function localPath(path) {
  return fileURLToPath(new URL(path, root));
}
