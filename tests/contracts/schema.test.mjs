import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import {
  assertDocument,
  json,
  jsonFiles,
  localPath,
  materialize,
  prefix,
  registry,
  validateUnchanged,
} from "./helpers.mjs";

const { ajv, schemas } = await registry();

test("all 13 frozen schemas compile strictly with only local URN references", () => {
  assert.equal(schemas.length, 13);
  const common = validateUnchanged(ajv, "common", {});
  assert.equal(
    common.valid,
    false,
    "common is definitions only, not an envelope",
  );
});

const normative = (await jsonFiles("specs")).filter(
  (file) => !file.startsWith("specs/v0.2/"),
);
test("the frozen normative example inventory contains 17 documents", () => {
  assert.equal(normative.length, 17);
});
for (const path of normative) {
  test(`normative example: ${path}`, async () => {
    assertDocument(ajv, await json(path), path);
  });
}

const catalog = await jsonFiles("examples/characters");
test("the original character catalog is nonempty", () => {
  assert.ok(catalog.length > 0);
});
for (const path of catalog) {
  test(`catalog template: ${path}`, async () => {
    const document = await json(path);
    assert.equal(document.kind, "character-template");
    assertDocument(ajv, document, path);
  });
}

const fixtures = await json("tests/contracts/fixtures/cases.json");
test("fixture names are unique and positive/negative cases are both present", () => {
  assert.equal(
    new Set(fixtures.map((fixture) => fixture.name)).size,
    fixtures.length,
  );
  assert.ok(fixtures.some((fixture) => fixture.valid));
  assert.ok(fixtures.some((fixture) => !fixture.valid));
});
for (const fixture of fixtures) {
  test(`${fixture.valid ? "accept" : "reject"}: ${fixture.name}`, async () => {
    const document = await materialize(fixture);
    const result = validateUnchanged(ajv, fixture.schema, document);
    const explanation = `${fixture.reason}; ${JSON.stringify(result.errors)}`;
    assert.equal(result.valid, fixture.valid, explanation);
    if (!fixture.valid) {
      assert.ok(
        fixture.failure?.keyword &&
          typeof fixture.failure.instancePath === "string",
      );
      assert.ok(
        result.errors.some(
          (error) =>
            error.keyword === fixture.failure.keyword &&
            error.instancePath === fixture.failure.instancePath,
        ),
        `expected ${JSON.stringify(fixture.failure)}; ${explanation}`,
      );
    }
  });
}

test("static normative manifest matches exact sibling bytes, hashes and role/schema pairs", async () => {
  const manifest = await json("specs/character/examples/archive-manifest.json");
  const allowed = new Map([
    [
      "character-template.json",
      { role: "template", schema: "character-template" },
    ],
    [
      "character-instance.json",
      { role: "instance", schema: "character-instance" },
    ],
  ]);
  assert.equal(manifest.files.length, allowed.size);
  assert.equal(
    new Set(manifest.files.map((entry) => entry.path)).size,
    allowed.size,
  );
  for (const entry of manifest.files) {
    // Hard-coded allowlist: never resolve a path taken from an arbitrary manifest.
    assert.ok(
      allowed.has(entry.path),
      "this test only reads two known static siblings",
    );
    const expected = allowed.get(entry.path);
    assert.equal(entry.role, expected.role);
    assert.equal(entry.schemaId, `${prefix}${expected.schema}`);
    const bytes = await readFile(
      localPath(`specs/character/examples/${entry.path}`),
    );
    assert.equal(entry.sizeBytes, bytes.length, entry.path);
    assert.equal(
      entry.sha256,
      createHash("sha256").update(bytes).digest("hex"),
      entry.path,
    );
  }
});
