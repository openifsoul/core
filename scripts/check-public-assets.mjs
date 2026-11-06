// Check the browser bundle boundary, not just type-only source imports.
import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
const directory = new URL("../dist/web/assets/", import.meta.url);
for (const name of await readdir(directory)) {
  if (!name.endsWith(".js")) continue;
  const source = await readFile(new URL(name, directory), "utf8");
  for (const forbidden of [
    "ENCRYPTION_KEY",
    "LAB_PASSWORD",
    "CLERK_JWT_KEY",
    "CLERK_SECRET_KEY",
    "node:sqlite",
    "api.openai.com/v1/responses",
  ])
    assert(
      !source.includes(forbidden),
      `Server implementation leaked into browser bundle: ${forbidden}`,
    );
  assert(
    !/\bsk_(?:test|live)_[A-Za-z0-9]{16,}\b/.test(source),
    "Clerk secret-like value in browser bundle",
  );
  assert(
    !/\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/.test(source),
    "Credential-like value in browser bundle",
  );
}
console.log(
  "Browser bundles contain no server secret bindings, provider endpoint or credential-like values.",
);

const publicRoot = new URL("../dist/web/", import.meta.url);
for (const [file, heading] of [
  ["index.html", "A character’s story"],
  ["public-pages/demo-garden.html", "Garden — an IfSoul bridge example"],
  ["public-pages/demo-cards.html", "Friendly 21 — an IfSoul bridge example"],
  ["public-pages/demo-dungeon.html", "Dungeon — an IfSoul bridge example"],
]) {
  const html = await readFile(new URL(file, publicRoot), "utf8");
  assert(html.includes(heading), `Missing no-JavaScript content in ${file}`);
  assert(html.includes('rel="canonical"'), `Missing canonical URL in ${file}`);
  assert(
    !html.includes('<div id="root"></div>'),
    `Empty public shell in ${file}`,
  );
  assert(!html.includes("<canvas"), `Prerender must not run games: ${file}`);
}
const app = await readFile(
  new URL("public-pages/app.html", publicRoot),
  "utf8",
);
assert(
  app.includes('content="noindex, nofollow"'),
  "Private App shell must not be indexed",
);
for (const [name, marker] of [
  ["robots.txt", "Sitemap:"],
  ["sitemap.xml", "<urlset"],
  ["llms.txt", "# IfSoul"],
])
  assert(
    (await readFile(new URL(name, publicRoot), "utf8")).includes(marker),
    `Missing discovery asset ${name}`,
  );
console.log(
  "Public HTML contains indexable project/game information; private App is noindex.",
);
