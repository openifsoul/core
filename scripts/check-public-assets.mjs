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
    "CLERK_JWT_KEY",
    "CLERK_SECRET_KEY",
    "node:sqlite",
    "api.openai.com/v1/responses",
  ])
    assert(
      !source.includes(forbidden),
      `Server implementation leaked into browser bundle: ${forbidden}`,
    );
  assert(
    !/\bsk_(?:test|live)_[A-Za-z0-9]{16,}\b/.test(source),
    "Clerk secret-like value in browser bundle",
  );
  assert(
    !/\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/.test(source),
    "Credential-like value in browser bundle",
  );
}
console.log(
  "Browser bundles contain no server secret bindings, provider endpoint or credential-like values.",
);
