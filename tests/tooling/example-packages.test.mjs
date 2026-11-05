import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, copyFile, writeFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { allowedDistributions } from "../../scripts/distribution-analysis.mjs";
const root = fileURLToPath(new URL("../../", import.meta.url));
test("curated archives install and their public ESM declarations work in a clean NodeNext consumer", async () => {
  const directory = await mkdtemp(
    path.join(tmpdir(), "ifsoul-examples-consumer-"),
  );
  try {
    await mkdir(path.join(directory, "vendor"));
    const dependencies = {};
    for (const [archive, name] of allowedDistributions) {
      const basename = path.basename(archive);
      await copyFile(
        path.join(root, archive),
        path.join(directory, "vendor", basename),
      );
      dependencies[name] = `file:vendor/${basename}`;
    }
    await writeFile(
      path.join(directory, "package.json"),
      JSON.stringify({ private: true, type: "module", dependencies }),
    );
    execFileSync("pnpm", ["install", "--offline", "--ignore-scripts"], {
      cwd: directory,
      stdio: "pipe",
    });
    const code = `import type {MountGame} from '@ifsoul/adapter-sdk';\nimport type {mount as GardenMount} from '@ifsoul/example-garden';\nimport type {mount as CardsMount} from '@ifsoul/example-friendly-21';\nimport type {mount as DungeonMount} from '@ifsoul/example-dungeon';\nimport {GardenSimulation} from '@ifsoul/example-garden/simulation';\nimport {handValue} from '@ifsoul/example-friendly-21/simulation';\nimport {createDungeon} from '@ifsoul/example-dungeon/simulation';\nimport {createExampleSession as garden} from '@ifsoul/example-garden/adapter';\nimport {createExampleSession as cards} from '@ifsoul/example-friendly-21/adapter';\nimport {createExampleSession as dungeon} from '@ifsoul/example-dungeon/adapter';\nconst exports:[typeof garden,typeof cards,typeof dungeon]=[garden,cards,dungeon];\nconst mounts:[typeof GardenMount,typeof CardsMount,typeof DungeonMount]=[] as unknown as [MountGame,MountGame,MountGame];\nif(typeof new GardenSimulation().step!=='function'||typeof handValue([])!=='number'||typeof createDungeon().phase!=='string'||exports.length!==3)throw Error('Invalid package exports');\nvoid mounts;`;
    await writeFile(path.join(directory, "consumer.ts"), code);
    await writeFile(
      path.join(directory, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          lib: ["ES2022", "DOM"],
          types: [],
          outDir: "out",
        },
        include: ["consumer.ts"],
      }),
    );
    try {
      execFileSync(
        process.execPath,
        [
          path.join(root, "node_modules/typescript/bin/tsc"),
          "--project",
          path.join(directory, "tsconfig.json"),
        ],
        { cwd: directory, stdio: "pipe" },
      );
    } catch (error) {
      assert.fail(error.stdout?.toString() || error.message);
    }
    execFileSync(process.execPath, ["out/consumer.js"], {
      cwd: directory,
      stdio: "pipe",
    });
    const result = execFileSync(
      "pnpm",
      ["install", "--offline", "--frozen-lockfile", "--ignore-scripts"],
      { cwd: directory, encoding: "utf8" },
    );
    assert.match(result, /Lockfile|up to date|Already up to date/);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
