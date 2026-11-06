// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { checkSourceGraph, checkGitIndex } from "./boundary-analysis.mjs";
import { hasPotentialSecret } from "./secret-scan.mjs";
import { root, sourceFiles } from "./files.mjs";

const files = await sourceFiles();
const manifest = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);
assert.equal(manifest.name, "@ifsoul/core");
assert.equal(manifest.private, false);
assert(
  manifest.exports && manifest.scripts.build,
  "Built explicit package exports required",
);
const allowedDependencies = new Set([
  "ajv",
  "ajv-formats",
  "@types/node",
  "prettier",
  "tsx",
  "typescript",
]);
for (const name of Object.keys({
  ...manifest.dependencies,
  ...manifest.devDependencies,
}))
  assert(allowedDependencies.has(name), `Non-Core dependency: ${name}`);
for (const name of Object.keys(manifest.scripts))
  assert(
    !/^(?:deploy|release|publish)(?::|$)/.test(name),
    `Core has no deployment/publication command: ${name}`,
  );
const allowedSourceRoots = [
  "scripts/",
  "tests/",
  "packages/protocol/src/",
  "packages/runtime/src/",
  "packages/memory/src/",
  "packages/model-providers/src/",
];
await checkSourceGraph(root, files);
await checkGitIndex(root);

let inspected = 0;
for (const file of files) {
  const relative = path.relative(root, file).split(path.sep).join("/");
  assert(
    !relative.startsWith(".github/workflows/"),
    "Remote workflows are not authorized",
  );
  assert(
    !/(?:^|\/)(?:package\.json|pnpm-workspace\.yaml)$/.test(relative) ||
      relative === "package.json",
    `Unexpected child package/workspace manifest: ${relative}`,
  );
  assert(
    !/(?:^|\/)\.env(?:\.|$)/.test(relative),
    `Environment file in source tree: ${relative}`,
  );
  assert(
    !/\.(?:sqlite3?|db|zip|tgz)(?:-|$)/.test(relative),
    `Data/archive file in source tree: ${relative}`,
  );
  const isCode = /\.(?:[cm]?[jt]sx?|py|rs|lua)$/.test(relative);
  if (isCode) {
    assert(
      allowedSourceRoots.some((prefix) => relative.startsWith(prefix)),
      `Implementation outside authorized slice: ${relative}`,
    );
  }
  if (relative === "LICENSE" || relative.startsWith("LICENSES/")) continue;
  const text = await readFile(file, "utf8");

  assert(
    !hasPotentialSecret(text),
    `Potential secret in ${relative}; inspect locally without printing it`,
  );
  inspected += 1;
}
console.log(
  `Core boundaries: ${inspected} text files; explicit package/source/import boundaries, no workflows; known-pattern secret scan.`,
);
