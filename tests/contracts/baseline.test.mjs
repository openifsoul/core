import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { root, sourceFiles } from "../../scripts/files.mjs";

test("accepted contract baseline retains exact inventory and bytes", async () => {
  const baseline = JSON.parse(
    await readFile(
      new URL("./fixtures/baseline.json", import.meta.url),
      "utf8",
    ),
  );
  const actual = {};
  for (const file of await sourceFiles()) {
    const relative = path.relative(root, file).split(path.sep).join("/");
    if (
      (relative.startsWith("packages/protocol/schemas/") ||
        relative.startsWith("specs/")) &&
      !relative.startsWith("packages/protocol/schemas/current/") &&
      !relative.startsWith("specs/current/") &&
      /\.(json|jsonl)$/.test(relative)
    )
      actual[relative] = createHash("sha256")
        .update(await readFile(file))
        .digest("hex");
  }
  assert.deepEqual(
    actual,
    baseline,
    "Contract baseline changed: review compatibility and version before updating the accepted inventory",
  );
});
