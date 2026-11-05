// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { root, sourceFiles } from "./files.mjs";

const required = [
  "docs/versioning.md",
  "CHANGELOG.md",
  "apps/laboratory/README.md",
  "apps/server/README.md",
  ...[
    "clean-implementation",
    "architecture-review",
    "public-api-review",
    "documentation-sync",
  ].map((name) => `.agents/skills/${name}/SKILL.md`),
  "README.md",
  "AGENTS.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "LICENSE",
  "LICENSES/CC-BY-4.0.txt",
  "LICENSES/CC0-1.0.txt",
  "docs/architecture.md",
  "docs/boundaries.md",
  "docs/security.md",
  "docs/compatibility.md",
  "docs/development.md",
  "docs/deployment.md",
  "docs/licensing.md",
  "docs/roadmap.md",
  "docs/product.md",
  "docs/runtime-profiles.md",
  "docs/bridge-authoring.md",
  "docs/execution-modes.md",
  "docs/runtime-api.md",
  "docs/laboratory.md",
  "docs/web-laboratory.md",
  "docs/providers.md",
  "docs/public-private-boundary.md",
  "specs/v0.2/README.md",
  "docs/decisions/README.md",
  ...[
    "protocol",
    "memory",
    "runtime",
    "adapter-sdk",
    "model-providers",
    "permissions",
    "testing",
  ].map((name) => `packages/${name}/README.md`),
  "apps/character-manager/README.md",
  "apps/simulator/README.md",
  "apps/runtime-host/README.md",
  "examples/characters/README.md",
  "examples/minimal-world/README.md",
];

for (const file of required) {
  assert(
    (await stat(path.join(root, file))).isFile(),
    `Required file: ${file}`,
  );
}

let links = 0;
const documents = (await sourceFiles()).filter((file) => file.endsWith(".md"));
for (const file of documents) {
  // Deliberately small: validate inline local links outside fenced examples.
  // It does not crawl external URLs or validate heading fragments.
  const text = (await readFile(file, "utf8")).replace(
    /^```[^\n]*\n[\s\S]*?^```\s*$/gm,
    "",
  );
  for (const match of text.matchAll(
    /\[[^\]\n]+\]\(([^\s)]+)(?:\s+"[^"]*")?\)/g,
  )) {
    const target = match[1].replace(/^<|>$/g, "");
    if (/^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith("#")) continue;
    assert(!target.startsWith("/"), `Nonportable link in ${file}: ${target}`);
    const pathname = decodeURIComponent(target.split(/[?#]/)[0]);
    const resolved = path.resolve(path.dirname(file), pathname);
    const relative = path.relative(root, resolved);
    assert(
      relative !== ".." &&
        !relative.startsWith(`..${path.sep}`) &&
        !path.isAbsolute(relative),
      `Link escapes repository in ${file}: ${target}`,
    );
    try {
      await stat(resolved);
    } catch {
      throw new Error(
        `Broken local link in ${path.relative(root, file)}: ${target}`,
      );
    }
    links += 1;
  }
}
console.log(
  `Documentation: ${required.length} required files; ${documents.length} Markdown files; ${links} local link targets checked.`,
);

// The implementation matrix has one machine-readable owner; prose cannot drift.
const rules = JSON.parse(
  await readFile(path.join(root, "scripts/boundary-rules.json"), "utf8"),
);
const architecture = await readFile(
  path.join(root, "docs/architecture.md"),
  "utf8",
);
const matrix = architecture
  .split("<!-- BOUNDARY_MATRIX_START -->")[1]
  ?.split("<!-- BOUNDARY_MATRIX_END -->")[0];
assert(matrix, "Architecture matrix markers missing");
const rows = matrix.split("\n").filter((line) => /^\|\s*`/.test(line));
assert.equal(
  rows.length,
  Object.keys(rules).length,
  "Architecture matrix inventory drift",
);
for (const row of rows) {
  const cells = row.split("|");
  const component = cells[1].trim().replaceAll("`", "");
  const targets = [...cells[2].matchAll(/`([^`]+)`/g)].map((match) => match[1]);
  assert.deepEqual(
    targets,
    rules[component],
    `Architecture matrix drift: ${component}`,
  );
}
