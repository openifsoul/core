import assert from "node:assert/strict";
import { gunzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { hasPotentialSecret } from "./secret-scan.mjs";
export const allowedDistributions = new Map([
  ["vendor/sdk/ifsoul-adapter-sdk-0.1.0-alpha.1.tgz", "@ifsoul/adapter-sdk"],
  [
    "vendor/examples/ifsoul-example-garden-0.1.0-alpha.1.tgz",
    "@ifsoul/example-garden",
  ],
  [
    "vendor/examples/ifsoul-example-friendly-21-0.1.0-alpha.1.tgz",
    "@ifsoul/example-friendly-21",
  ],
  [
    "vendor/examples/ifsoul-example-dungeon-0.1.0-alpha.1.tgz",
    "@ifsoul/example-dungeon",
  ],
]);
export const sha256 = (bytes) =>
  createHash("sha256").update(bytes).digest("hex");
export function archiveFiles(compressed) {
  assert(
    compressed.length <= 8 * 1024 * 1024,
    "Oversized distribution archive",
  );
  const tar = gunzipSync(compressed, { maxOutputLength: 32 * 1024 * 1024 });
  const files = new Map();
  let offset = 0,
    members = 0,
    terminated = false;
  const text = (header, start, length) =>
    header
      .subarray(start, start + length)
      .toString("utf8")
      .split("\0")[0];
  const octal = (value) => {
    assert(/^[0-7 ]*$/.test(value), "Unsupported tar numeric field");
    return parseInt(value.trim() || "0", 8);
  };
  while (offset + 512 <= tar.length) {
    const header = tar.subarray(offset, offset + 512);
    offset += 512;
    if (header.every((byte) => byte === 0)) {
      assert(
        tar.subarray(offset).every((byte) => byte === 0),
        "Trailing tar data",
      );
      terminated = true;
      break;
    }
    assert(++members <= 600, "Too many archive members");
    const name = [text(header, 345, 155), text(header, 0, 100)]
      .filter(Boolean)
      .join("/");
    assert(
      name.startsWith("package/") &&
        !name.startsWith("/") &&
        !name.includes("\\") &&
        !name
          .split("/")
          .some((part) => part === ".." || part === "." || part === ""),
      "Unsafe tar member path",
    );
    assert(/^[A-Za-z0-9@._/-]+$/.test(name), "Unsupported tar member name");
    const stored = octal(text(header, 148, 8));
    let checksum = 0;
    for (let i = 0; i < 512; i++)
      checksum += i >= 148 && i < 156 ? 32 : header[i];
    assert.equal(checksum, stored, "Invalid tar header checksum");
    const size = octal(text(header, 124, 12));
    const type = text(header, 156, 1);
    assert(
      type === "" || type === "0",
      "Only regular package files are allowed; links and special members reject",
    );
    assert(
      size <= 4 * 1024 * 1024 && offset + size <= tar.length,
      "Invalid archive member size",
    );
    assert(!files.has(name), "Duplicate archive member");
    files.set(name, tar.subarray(offset, offset + size));
    offset += Math.ceil(size / 512) * 512;
  }
  assert(
    terminated && files.size > 0 && offset <= tar.length,
    "Empty or truncated archive",
  );
  return files;
}
const sdkMember =
  /^(?:package\.json|README\.md|LICENSE|dist\/[A-Za-z0-9._/-]+\.(?:js|d\.ts))$/;
const gameMember =
  /^(?:package\.json|README\.md|LICENSE|LICENSES\/(?:shadcn|pixi|phaser)-MIT\.txt|dist\/[A-Za-z0-9._/-]+\.(?:js|d\.ts|css))$/;
export function inspectDistribution(bytes, entry, sdkFiles) {
  assert(allowedDistributions.has(entry.path), "Unapproved distribution path");
  assert.equal(
    entry.name,
    allowedDistributions.get(entry.path),
    "Distribution name differs from allowlist",
  );
  assert.equal(
    entry.version,
    "0.1.0-alpha.1",
    "Unreviewed distribution version",
  );
  assert.equal(
    sha256(bytes),
    entry.sha256,
    "Distribution archive checksum mismatch",
  );
  assert(
    /^[a-f0-9]{64}$/.test(entry.source?.sha256 ?? ""),
    "Missing source provenance hash",
  );
  assert(
    typeof entry.source?.repository === "string" &&
      !path.isAbsolute(entry.source.repository) &&
      !entry.source.repository.includes(".."),
    "Invalid source repository provenance",
  );
  const files = archiveFiles(bytes);
  const sdk = entry.name === "@ifsoul/adapter-sdk";
  let bundled = 0;
  for (const [name, content] of files) {
    const relative = name.slice("package/".length);
    if (relative.startsWith("LICENSES/")) {
      const notices =
        entry.name === "@ifsoul/example-garden"
          ? ["LICENSES/shadcn-MIT.txt", "LICENSES/pixi-MIT.txt"]
          : entry.name === "@ifsoul/example-dungeon"
            ? ["LICENSES/shadcn-MIT.txt", "LICENSES/phaser-MIT.txt"]
            : ["LICENSES/shadcn-MIT.txt"];
      assert(
        notices.includes(relative),
        "Unreviewed distribution license notice",
      );
    }
    const prefix = "node_modules/@ifsoul/adapter-sdk/";
    if (relative.startsWith(prefix)) {
      assert(
        !sdk && sdkMember.test(relative.slice(prefix.length)),
        "Unexpected bundled SDK file",
      );
      assert(
        sdkFiles?.has(`package/${relative.slice(prefix.length)}`),
        "Bundled SDK file is not in reviewed SDK archive",
      );
      assert(
        content.equals(
          sdkFiles.get(`package/${relative.slice(prefix.length)}`),
        ),
        "Bundled SDK bytes differ from reviewed SDK",
      );
      bundled++;
    } else
      assert(
        (sdk ? sdkMember : gameMember).test(relative),
        `Unapproved distribution member: ${name}`,
      );
    assert(
      !hasPotentialSecret(content.toString("utf8")),
      `Potential secret in distribution member ${name}; inspect without printing`,
    );
    assert(
      !/\/Users\/[^\s"']+|[A-Za-z]:\\Users\\/.test(content.toString("utf8")),
      `Machine-local path in distribution member ${name}`,
    );
  }
  const manifest = JSON.parse(
    files.get("package/package.json")?.toString("utf8") ?? "null",
  );
  assert.equal(manifest?.name, entry.name);
  assert.equal(manifest?.version, entry.version);
  assert.equal(manifest?.type, "module");
  assert(manifest.exports?.["."], "Package has no public root export");
  assert(
    files.has("package/LICENSE") && files.has("package/README.md"),
    "Missing package license/readme",
  );
  if (!sdk) {
    assert(bundled === sdkFiles.size, "Missing or partial bundled SDK");
    assert.deepEqual(
      manifest.bundledDependencies,
      ["@ifsoul/adapter-sdk"],
      "Unexpected bundled dependency",
    );
  }
  return files;
}
export async function checkDistributions(
  root,
  read = (relative) => readFile(path.join(root, relative)),
) {
  const inventory = JSON.parse(
    (await read("vendor/distributions.json")).toString("utf8"),
  );
  assert.equal(inventory.format, "ifsoul-local-distributions/0.1");
  assert.deepEqual(
    inventory.packages.map((entry) => entry.path).sort(),
    [...allowedDistributions.keys()].sort(),
    "Distribution inventory must exactly match reviewed allowlist",
  );
  let sdkFiles;
  let inspected = 0;
  const sdkEntry = inventory.packages.find(
    (entry) => entry.name === "@ifsoul/adapter-sdk",
  );
  const sdkSourcePaths = [
    "LICENSE",
    "README.md",
    "package.json",
    "src/game-host.ts",
    "src/index.ts",
    "src/port.ts",
    "tsconfig.build.json",
  ];
  const sourceHash = createHash("sha256");
  for (const relative of sdkSourcePaths)
    sourceHash
      .update(relative)
      .update("\0")
      .update(await read(`packages/adapter-sdk/${relative}`))
      .update("\0");
  assert.equal(
    sourceHash.digest("hex"),
    sdkEntry.source.sha256,
    "SDK source provenance differs; rebuild/review the versioned distribution",
  );
  const ordered = [...inventory.packages].sort((a, b) =>
    a.name === "@ifsoul/adapter-sdk"
      ? -1
      : b.name === "@ifsoul/adapter-sdk"
        ? 1
        : a.name.localeCompare(b.name),
  );
  for (const entry of ordered) {
    const files = inspectDistribution(await read(entry.path), entry, sdkFiles);
    if (entry.name === "@ifsoul/adapter-sdk") sdkFiles = files;
    inspected += files.size;
  }
  return inspected;
}
