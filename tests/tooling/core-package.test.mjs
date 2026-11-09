import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, writeFile, rm, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../../", import.meta.url));
test("built Core installs outside the repository and exports runnable validation/runtime/storage", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "ifsoul-core-consumer-"));
  const run = (cmd, args, cwd = root) =>
    execFileSync(cmd, args, { cwd, stdio: "pipe", timeout: 120_000 });
  try {
    run("pnpm", ["pack:core"]);
    const archive = path.join(root, ".local/packages/ifsoul-core-0.4.0.tgz");
    await writeFile(
      path.join(directory, "package.json"),
      JSON.stringify({
        private: true,
        type: "module",
        dependencies: { "@ifsoul/core": `file:${archive}` },
      }),
    );
    run("pnpm", ["install", "--ignore-scripts"], directory);
    const fixture = JSON.parse(
      await readFile(
        path.join(root, "specs/current/examples/character-instance.json"),
        "utf8",
      ),
    );
    await writeFile(
      path.join(directory, "consumer.mjs"),
      `import {validateDocument} from '@ifsoul/core/protocol';\nimport {createRuntime} from '@ifsoul/core/runtime';\nimport {openSQLiteMemory} from '@ifsoul/core/memory/sqlite';\nimport {createOpenAIProvider} from '@ifsoul/core/model-providers';\nif(!validateDocument(${JSON.stringify(fixture)},'character-instance')||validateDocument({kind:'character-instance'}))throw Error('validator boundary');\nif(typeof createRuntime!=='function'||typeof createOpenAIProvider!=='function')throw Error('missing exports');\nconst memory=openSQLiteMemory(':memory:');if(!memory.ok)throw Error('storage');memory.value.close();\ntry{await import('@ifsoul/core/runtime/semantics');throw Error('internal export leaked')}catch(e){if(e.code!=='ERR_PACKAGE_PATH_NOT_EXPORTED')throw e}\n`,
    );
    run(process.execPath, ["consumer.mjs"], directory);
    const manifest = JSON.parse(
      await readFile(
        path.join(directory, "node_modules/@ifsoul/core/package.json"),
        "utf8",
      ),
    );
    assert(
      !Object.keys(manifest.dependencies).some((name) =>
        /react|clerk|ifsoul/.test(name),
      ),
    );
    run(
      "pnpm",
      ["install", "--offline", "--frozen-lockfile", "--ignore-scripts"],
      directory,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
