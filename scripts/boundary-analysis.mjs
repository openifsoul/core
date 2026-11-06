// SPDX-License-Identifier: Apache-2.0
// Parser supplied by the existing pinned Prettier dependency; no second linter.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { existsSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { isBuiltin } from "node:module";
import { execFileSync } from "node:child_process";
import { hasPotentialSecret } from "./secret-scan.mjs";
import { parsers } from "prettier/plugins/typescript";

export const rules = JSON.parse(
  await readFile(new URL("./boundary-rules.json", import.meta.url), "utf8"),
);
const componentOf = (file) =>
  /^(packages|apps)\//.test(file)
    ? file.split("/").slice(0, 2).join("/")
    : undefined;

const ports = {
  "packages/memory": ["packages/memory/src/port.ts"],
  "packages/model-providers": ["packages/model-providers/src/types.ts"],
};

export async function dependencies(text, filename) {
  const ast = await parsers.typescript.parse(text, { filepath: filename });
  const result = [];
  function add(source, typeOnly = false) {
    assert(
      source?.type === "Literal" && typeof source.value === "string",
      `Computed module load in ${filename}`,
    );
    result.push({ specifier: source.value, typeOnly });
  }
  function walk(node) {
    if (!node || typeof node !== "object") return;
    if (node.type === "ImportDeclaration")
      add(
        node.source,
        node.importKind === "type" ||
          (node.specifiers.length > 0 &&
            node.specifiers.every((s) => s.importKind === "type")),
      );
    if (
      ["ExportNamedDeclaration", "ExportAllDeclaration"].includes(node.type) &&
      node.source
    )
      add(
        node.source,
        node.exportKind === "type" ||
          (node.specifiers?.length > 0 &&
            node.specifiers.every((s) => s.exportKind === "type")),
      );
    if (node.type === "ImportExpression") add(node.source);
    if (
      node.type === "TSImportEqualsDeclaration" &&
      node.moduleReference.type === "TSExternalModuleReference"
    )
      add(node.moduleReference.expression, node.importKind === "type");
    if (node.type === "TSImportType")
      add(node.argument?.literal ?? node.argument, true);
    if (
      node.type === "CallExpression" &&
      (node.callee.name === "require" ||
        (node.callee.type === "MemberExpression" &&
          node.callee.object.name === "module" &&
          node.callee.property.name === "require"))
    )
      add(node.arguments[0]);
    if (node.type === "Identifier" && ["eval", "Function"].includes(node.name))
      throw Error(`Dynamic code evaluation in ${filename}`);
    for (const [key, value] of Object.entries(node)) {
      if (["loc", "range", "comments", "tokens"].includes(key)) continue;
      if (Array.isArray(value)) value.forEach(walk);
      else if (value && typeof value === "object") walk(value);
    }
  }
  walk(ast);
  return result;
}

export function assertAcyclic(graph) {
  const done = new Set(),
    active = new Set();
  function visit(node) {
    assert(!active.has(node), `Dependency cycle through ${node}`);
    if (done.has(node)) return;
    active.add(node);
    for (const next of graph.get(node) ?? []) visit(next);
    active.delete(node);
    done.add(node);
  }
  for (const node of graph.keys()) visit(node);
}

export function resolveLocal(root, from, specifier, paths = {}) {
  let target;
  for (const [alias, values] of Object.entries(paths)) {
    const [prefix, suffix = ""] = alias.split("*");
    const match = alias.includes("*")
      ? specifier.startsWith(prefix) && specifier.endsWith(suffix)
      : specifier === alias;
    if (match) {
      assert(values.length === 1, `Ambiguous alias ${alias}`);
      const wildcard = specifier.slice(
        prefix.length,
        suffix ? -suffix.length : undefined,
      );
      target = path.resolve(root, values[0].replace("*", wildcard));
      break;
    }
  }
  if (!target && (specifier.startsWith(".") || path.isAbsolute(specifier)))
    target = path.resolve(root, path.dirname(from), specifier);
  if (!target) return undefined;
  const relative = path.relative(root, target);
  assert(
    relative !== ".." &&
      !relative.startsWith("../") &&
      !path.isAbsolute(relative),
    `Cross-repository import in ${from}`,
  );
  const candidates = [target];
  if (/\.[cm]?jsx?$/.test(target))
    candidates.unshift(
      target.replace(/\.[cm]?jsx?$/, ".ts"),
      target.replace(/\.[cm]?jsx?$/, ".tsx"),
    );
  if (!path.extname(target))
    candidates.push(
      ...[".ts", ".tsx", ".js", "/index.ts", "/index.tsx", "/index.js"].map(
        (s) => target + s,
      ),
    );
  const resolved = candidates.find(
    (f) => existsSync(f) && statSync(f).isFile(),
  );
  assert(resolved, `Unresolved local dependency ${specifier} in ${from}`);
  const real = path
    .relative(realpathSync(root), realpathSync(resolved))
    .split(path.sep)
    .join("/");
  assert(
    !real.startsWith("../"),
    `Symlink import escapes repository in ${from}`,
  );
  return real;
}

export function checkEdge(from, to, typeOnly) {
  const source = componentOf(from),
    target = componentOf(to);
  if (source === target) return;
  assert(
    target && rules[source]?.includes(target),
    `Forbidden dependency ${source} -> ${target ?? to}`,
  );
  if (source === "packages/runtime" && ports[target])
    assert(
      ports[target].includes(to),
      `Runtime may import port only: ${target}`,
    );
  if (source === "packages/runtime" && target === "packages/model-providers")
    assert(typeOnly, "Runtime may only import provider types");
}

export async function checkSourceGraph(root, files) {
  const config = JSON.parse(
    await readFile(path.join(root, "tsconfig.json"), "utf8"),
  );
  assert(
    !config.compilerOptions.baseUrl,
    "baseUrl needs explicit resolver support",
  );
  const manifest = JSON.parse(
    await readFile(path.join(root, "package.json"), "utf8"),
  );
  const external = new Set(
    Object.keys({ ...manifest.dependencies, ...manifest.devDependencies }),
  );
  const graph = new Map();
  for (const full of files) {
    const file = path.relative(root, full).split(path.sep).join("/");
    const component = componentOf(file);
    if (!component || !/\.[cm]?[jt]sx?$/.test(file)) continue;
    const text = await readFile(full, "utf8");
    const deps = await dependencies(text, file);
    const edges = graph.get(component) ?? new Set();
    graph.set(component, edges);
    for (const { specifier, typeOnly } of deps) {
      const target = resolveLocal(
        root,
        file,
        specifier,
        config.compilerOptions.paths,
      );
      if (target) {
        checkEdge(file, target, typeOnly);
        if (componentOf(target) !== component) edges.add(componentOf(target));
      } else {
        const builtin = isBuiltin(specifier);
        const packageName = specifier.startsWith("@")
          ? specifier.split("/").slice(0, 2).join("/")
          : specifier.split("/")[0];
        assert(
          builtin ||
            external.has(packageName) ||
            (component === "apps/server" && specifier === "cloudflare:workers"),
          `Undeclared external dependency: ${specifier}`,
        );
        if (packageName.startsWith("@ifsoul/example-"))
          assert(
            component === "apps/demo-games",
            "Only the curated browser catalog may import game packages",
          );
        if (component === "packages/protocol")
          assert(
            !builtin &&
              (/^ajv\/dist\/runtime\//.test(specifier) ||
                specifier === "ajv-formats/dist/formats"),
            `Protocol external dependency: ${specifier}`,
          );
        if (component === "packages/runtime")
          assert(
            specifier === "node:crypto",
            `Runtime external dependency: ${specifier}`,
          );
        if (component === "apps/laboratory" && file.includes("/src/"))
          assert(
            !builtin && !/^(cloudflare:|https?:|file:)/.test(specifier),
            "Browser platform dependency",
          );
      }
    }
    if (["packages/protocol", "packages/runtime"].includes(component)) {
      // These globals grant IO without a module import. This is a guardrail, not a sandbox.
      const ast = await parsers.typescript.parse(text, { filepath: file });
      function check(n) {
        if (!n || typeof n !== "object") return;
        if (n.type === "Identifier")
          assert(
            ![
              "fetch",
              "XMLHttpRequest",
              "WebSocket",
              "process",
              "Deno",
              "Bun",
            ].includes(n.name),
            `Platform IO global in ${file}: ${n.name}`,
          );
        for (const [k, v] of Object.entries(n))
          if (!["loc", "range", "comments", "tokens"].includes(k)) {
            if (Array.isArray(v)) v.forEach(check);
            else if (v && typeof v === "object") check(v);
          }
      }
      check(ast);
    }
  }
  assertAcyclic(graph);
}

export function assertIndexPath(file) {
  assert(
    !/(^|\/)(?:\.env(?:\.|$)|\.dev\.vars|\.local(?:\/|$)|\.wrangler(?:\/|$)|node_modules(?:\/|$)|dist(?:\/|$)|output(?:\/|$)|data(?:\/|$)|backups(?:\/|$))/.test(
      file,
    ),
    `Private/generated file in Git index: ${file}`,
  );
  assert(
    !/\.(?:sqlite3?|db|zip|tgz|log)(?:[.-]|$)/.test(file),
    `Data/archive file in Git index: ${file}`,
  );
}
export async function checkGitIndex(root) {
  if (!existsSync(path.join(root, ".git"))) return; // Source archives can be checked without Git.
  const entries = execFileSync("git", ["ls-files", "--stage", "-z"], {
    cwd: root,
    encoding: "utf8",
  })
    .split("\0")
    .filter(Boolean);
  const indexed = new Map();
  for (const entry of entries) {
    const [meta, file] = entry.split("\t");
    assertIndexPath(file);
    assert(
      meta.startsWith("100644 ") || meta.startsWith("100755 "),
      `Unsupported Git mode: ${file}`,
    );
    const oid = meta.split(" ")[1];
    const content = execFileSync("git", ["cat-file", "blob", oid], {
      cwd: root,
      maxBuffer: 16 * 1024 * 1024,
    });
    indexed.set(file, content);
    assert(
      !hasPotentialSecret(content.toString("utf8")),
      `Potential secret in indexed file ${file}; inspect without printing`,
    );
  }
}
