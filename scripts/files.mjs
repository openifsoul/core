// SPDX-License-Identifier: Apache-2.0
import { readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

export const root = fileURLToPath(new URL("../", import.meta.url));
const excluded = new Set([
  ".git",
  "node_modules",
  ".local",
  ".DS_Store",
  "dist",
  ".wrangler",
  ".playwright-cli",
  "output",
]);

export async function sourceFiles(directory = root) {
  const result = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (
      excluded.has(entry.name) ||
      entry.name.startsWith(".dev.vars") ||
      entry.name.startsWith(".env")
    )
      continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isSymbolicLink())
      throw new Error(`Unexpected symlink: ${fullPath}`);
    if (entry.isDirectory()) result.push(...(await sourceFiles(fullPath)));
    else result.push(fullPath);
  }
  return result.sort();
}
