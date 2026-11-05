// Check the browser bundle boundary, not just type-only source imports.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
const directory = new URL("../dist/web/assets/", import.meta.url);
for (const name of await readdir(directory)) {
  if (!name.endsWith(".js")) continue;
  const source = await readFile(new URL(name, directory), "utf8");
  for (const forbidden of [
    "ENCRYPTION_KEY",
    "LAB_PASSWORD",
    "node:sqlite",
    "api.openai.com/v1/responses",
  ])
    assert(
      !source.includes(forbidden),
      `Server implementation leaked into browser bundle: ${forbidden}`,
    );
  assert(
    !/\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/.test(source),
    "Credential-like value in browser bundle",
  );
}
console.log(
  "Browser bundles contain no server secret bindings, provider endpoint or credential-like values.",
);
