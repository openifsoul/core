import { mkdir, copyFile } from "node:fs/promises";
const target = "dist/packages/protocol/src/generated";
await mkdir(target, { recursive: true });
await copyFile(
  "packages/protocol/src/generated/validators.cjs",
  `${target}/validators.cjs`,
);
