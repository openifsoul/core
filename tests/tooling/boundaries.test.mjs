import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import {
  dependencies,
  checkEdge,
  resolveLocal,
  assertAcyclic,
  assertIndexPath,
  checkGitIndex,
} from "../../scripts/boundary-analysis.mjs";

test("parser sees imports, reexports, dynamic imports, require and TS type imports", async () => {
  const deps = await dependencies(
    'import {type A} from "./a"; export type {B} from "./b"; export * from "./c"; import("./d"); require("./e"); type X=import("./f").X;',
    "x.ts",
  );
  assert.deepEqual(
    deps.map((d) => d.specifier),
    ["./a", "./b", "./c", "./d", "./e", "./f"],
  );
  assert.deepEqual(
    deps.map((d) => d.typeOnly),
    [true, true, false, false, false, true],
  );
});
test("comments and strings do not become dependencies", async () =>
  assert.deepEqual(
    await dependencies(
      '// import x from "bad"\nconst x="require(bad)";',
      "x.ts",
    ),
    [],
  ));
test("computed imports and loaders are rejected", async () => {
  for (const s of ["import(name)", "require(name)", "module.require(name)"])
    await assert.rejects(dependencies(s, "x.ts"), /Computed module/);
});
test("runtime imports ports but not implementations", () => {
  checkEdge(
    "packages/runtime/src/index.ts",
    "packages/memory/src/port.ts",
    false,
  );
  assert.throws(
    () =>
      checkEdge(
        "packages/runtime/src/index.ts",
        "packages/memory/src/sqlite.ts",
        false,
      ),
    /port only/,
  );
  assert.throws(
    () =>
      checkEdge(
        "packages/runtime/src/index.ts",
        "packages/model-providers/src/openai.ts",
        true,
      ),
    /port only/,
  );
});
test("UI reexports and imports are type-only across components", () => {
  checkEdge(
    "apps/laboratory/src/App.tsx",
    "apps/runtime-host/src/service-types.ts",
    true,
  );
  assert.throws(
    () =>
      checkEdge(
        "apps/laboratory/src/App.tsx",
        "apps/runtime-host/src/service.ts",
        false,
      ),
    /server types/,
  );
});
test("protocol cannot import a higher layer", () =>
  assert.throws(
    () =>
      checkEdge(
        "packages/protocol/src/index.ts",
        "packages/runtime/src/index.ts",
        true,
      ),
    /Forbidden/,
  ));
test("component cycle is rejected including type dependencies", () => {
  assertAcyclic(new Map([["a", new Set(["b"])]]));
  assert.throws(
    () =>
      assertAcyclic(
        new Map([
          ["a", new Set(["b"])],
          ["b", new Set(["a"])],
        ]),
      ),
    /cycle/,
  );
});
test("aliases resolve to real components and escaping paths reject", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ifsoul-boundary-"));
  try {
    await mkdir(path.join(root, "packages/memory/src"), { recursive: true });
    await writeFile(path.join(root, "packages/memory/src/sqlite.ts"), "");
    const target = resolveLocal(
      root,
      "packages/runtime/src/index.ts",
      "@store/sqlite.js",
      { "@store/*": ["packages/memory/src/*"] },
    );
    assert.equal(target, "packages/memory/src/sqlite.ts");
    assert.throws(
      () => checkEdge("packages/runtime/src/index.ts", target, false),
      /port only/,
    );
    assert.throws(
      () => resolveLocal(root, "x.ts", "../outside.ts"),
      /Cross-repository/,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
test("private files are rejected even when gitignored", () => {
  for (const name of [
    ".env",
    ".env.production",
    ".dev.vars",
    ".local/a",
    "output/a",
    "data/a",
    "x.sqlite",
    "x.sqlite-wal",
    "x.zip",
  ])
    assert.throws(() => assertIndexPath(name));
  assertIndexPath("docs/security.md");
});
test("actual Git index rejects force-added private files and scans staged bytes", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ifsoul-index-"));
  const git = (...args) =>
    execFileSync("git", args, { cwd: root, stdio: "pipe" });
  try {
    git("init");
    await writeFile(path.join(root, ".gitignore"), ".env\n");
    await writeFile(path.join(root, ".env"), "synthetic");
    git("add", "-f", ".env");
    await assert.rejects(checkGitIndex(root), /Private/);
    git("rm", "--cached", ".env");
    const marker = "sk-" + "a".repeat(40);
    await writeFile(path.join(root, "fixture.txt"), marker);
    git("add", "fixture.txt");
    await writeFile(path.join(root, "fixture.txt"), "clean working tree");
    await assert.rejects(checkGitIndex(root), /Potential secret/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
