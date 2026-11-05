import assert from "node:assert/strict";
import test from "node:test";
import { gzipSync } from "node:zlib";
import {
  archiveFiles,
  inspectDistribution,
  sha256,
} from "../../scripts/distribution-analysis.mjs";
import { hasPotentialSecret } from "../../scripts/secret-scan.mjs";
function archive(items) {
  const blocks = [];
  for (const [name, content, type = "0"] of items) {
    const data = Buffer.from(content);
    const header = Buffer.alloc(512);
    header.write(name, 0, 100);
    header.write("0000644\0", 100);
    header.write("0000000\0", 108);
    header.write("0000000\0", 116);
    header.write(data.length.toString(8).padStart(11, "0") + "\0", 124);
    header.write("00000000000\0", 136);
    header.fill(32, 148, 156);
    header.write(type, 156);
    header.write("ustar\0", 257);
    header.write("00", 263);
    let checksum = 0;
    for (const byte of header) checksum += byte;
    header.write(checksum.toString(8).padStart(6, "0") + "\0 ", 148);
    blocks.push(header, data, Buffer.alloc((512 - (data.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
}
const entry = (bytes) => ({
  path: "vendor/sdk/ifsoul-adapter-sdk-0.1.0-alpha.1.tgz",
  name: "@ifsoul/adapter-sdk",
  version: "0.1.0-alpha.1",
  sha256: sha256(bytes),
  source: { repository: "openifsoul/core", sha256: "a".repeat(64) },
});
const files = () => [
  [
    "package/package.json",
    JSON.stringify({
      name: "@ifsoul/adapter-sdk",
      version: "0.1.0-alpha.1",
      type: "module",
      exports: { ".": { import: "./dist/index.js" } },
    }),
  ],
  ["package/LICENSE", "Synthetic license fixture"],
  ["package/README.md", "Synthetic SDK fixture"],
  ["package/dist/index.js", "export const value=1;"],
];
test("distribution archives enforce paths, regular files, uniqueness and tar checksums", () => {
  assert.equal(archiveFiles(archive(files())).size, 4);
  for (const path of [
    "package/../escape",
    "/absolute",
    "package/./entry",
    "package/back\\slash",
  ])
    assert.throws(() => archiveFiles(archive([[path, "bad"]])));
  assert.throws(
    () => archiveFiles(archive([["package/link", "target", "2"]])),
    /regular/,
  );
  assert.throws(
    () =>
      archiveFiles(
        archive([
          ["package/a", "one"],
          ["package/a", "two"],
        ]),
      ),
    /Duplicate/,
  );
});
test("distribution inspection rejects unlisted payloads, wrong hashes and credentials", () => {
  const safe = archive(files());
  assert.equal(inspectDistribution(safe, entry(safe)).size, 4);
  assert.throws(
    () => inspectDistribution(safe, { ...entry(safe), sha256: "0".repeat(64) }),
    /checksum/,
  );
  const privateFile = archive([
    ...files(),
    ["package/.env", "not a real secret"],
  ]);
  assert.throws(
    () => inspectDistribution(privateFile, entry(privateFile)),
    /Unapproved/,
  );
  const secret = archive([
    ...files().filter(([name]) => !name.endsWith("index.js")),
    [
      "package/dist/index.js",
      'export const key="' + "sk_live_" + "x".repeat(40) + '";',
    ],
  ]);
  assert.throws(
    () => inspectDistribution(secret, entry(secret)),
    /Potential secret/,
  );
});
test("shared source/index/archive secret scan catches Clerk keys without flagging short synthetic labels", () => {
  assert.equal(hasPotentialSecret("sk_test_" + "a".repeat(32)), true);
  assert.equal(hasPotentialSecret("sk_live_" + "b".repeat(32)), true);
  assert.equal(hasPotentialSecret("synthetic sk_test_demo"), false);
});

test("release scanner covers Google OAuth, bearer and unprefixed credential assignments", () => {
  assert.equal(hasPotentialSecret("GOCSPX-" + "g".repeat(28)), true);
  assert.equal(hasPotentialSecret("Bearer " + "x".repeat(48)), true);
  for (const name of [
    "CLOUDFLARE_API_TOKEN",
    "ENCRYPTION_KEY",
    "password",
    "apiKey",
  ])
    assert.equal(hasPotentialSecret(`${name} = "${"a".repeat(40)}"`), true);
  assert.equal(
    hasPotentialSecret('password = "synthetic-owner-password-for-tests"'),
    false,
  );
});
