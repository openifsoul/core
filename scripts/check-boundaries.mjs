// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { checkSourceGraph, checkGitIndex } from "./boundary-analysis.mjs";
import { root, sourceFiles } from "./files.mjs";

const files = await sourceFiles();
const manifest = JSON.parse(
  await readFile(path.join(root, "package.json"), "utf8"),
);
assert.equal(
  manifest.private,
  true,
  "Experimental local package must not be published",
);
assert(
  !manifest.exports && !manifest.main && !manifest.bin,
  "No fake runtime entrypoints",
);
assert(
  !manifest.dependencies,
  "Source-run local prototype currently installs development dependencies only",
);
for (const name of Object.keys(manifest.scripts)) {
  assert(
    !/^(?:deploy|release|publish|build)(?::|$)/.test(name) ||
      ["build:web", "build:cloud", "deploy:cloud"].includes(name),
    `Unexpected bootstrap command: ${name}`,
  );
}

const allowedSourceRoots = [
  "scripts/",
  "tests/",
  "packages/protocol/src/",
  "packages/runtime/src/",
  "packages/memory/src/",
  "packages/testing/src/",
  "apps/simulator/src/",
  "apps/runtime-host/src/",
  "apps/server/src/",
  "apps/laboratory/",
  "packages/model-providers/src/",
  "worker-configuration.d.ts",
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

  const secretPatterns = [
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
    /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
    /\bgithub_pat_[A-Za-z0-9_]{40,}\b/,
    /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/,
  ];
  assert(
    !secretPatterns.some((pattern) => pattern.test(text)),
    `Potential secret in ${relative}; inspect locally without printing it`,
  );
  inspected += 1;
}
console.log(
  `Local slice boundaries: ${inspected} text files checked; authorized source roots/imports, no child packages or workflows. Secret scan covers known patterns only.`,
);
