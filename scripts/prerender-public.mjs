// Build-only HTML for public readers. No game, auth, provider or private data is rendered.
import { createServer } from "vite";
import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
const publicURL = new URL(
  process.env.IFSOUL_PUBLIC_ORIGIN ?? "https://ifsoul.h3lpkey.com",
);
if (
  !["http:", "https:"].includes(publicURL.protocol) ||
  publicURL.username ||
  publicURL.password ||
  publicURL.pathname !== "/" ||
  publicURL.search ||
  publicURL.hash
)
  throw Error(
    "IFSOUL_PUBLIC_ORIGIN must be an HTTP(S) origin without credentials, path, query or fragment",
  );
const origin = publicURL.origin;
const directory = new URL("../dist/web/", import.meta.url);
const server = await createServer({
  configFile: "apps/laboratory/vite.config.ts",
  server: { middlewareMode: true },
  appType: "custom",
});
try {
  const { renderPublicPage } = await server.ssrLoadModule(
    "/src/public-pages.tsx",
  );
  const template = await readFile(new URL("index.html", directory), "utf8");
  const files = await readdir(new URL("assets/", directory));
  const demoCSS = files
    .filter((name) => name.startsWith("Demo-") && name.endsWith(".css"))
    .map((name) => `<link rel="stylesheet" href="/assets/${name}">`)
    .join("");
  const escape = (value) =>
    value.replace(
      /[&<>"']/g,
      (char) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[char],
    );
  await mkdir(new URL("public-pages/", directory), { recursive: true });
  for (const key of [
    "landing",
    "overview",
    "garden",
    "cards",
    "dungeon",
    "chat",
    "privacy",
    "terms",
  ]) {
    const page = renderPublicPage(key);
    const canonical = `${origin}${page.path}`;
    let html = template
      .replace(
        /<title>[\s\S]*?<\/title>/,
        `<title>${escape(page.title)}</title>`,
      )
      .replace(
        /<meta\s+name="description"\s+content="[^"]*"\s*\/?\s*>/,
        `<meta name="description" content="${escape(page.description)}">`,
      )
      .replace(
        '<div id="root"></div>',
        () => `<div id="root">${page.html}</div>`,
      )
      .replace(
        "</head>",
        `<link rel="canonical" href="${escape(canonical)}"><meta property="og:title" content="${escape(page.title)}"><meta property="og:description" content="${escape(page.description)}"><meta property="og:url" content="${escape(canonical)}"><meta property="og:type" content="website">${["landing", "privacy", "terms"].includes(key) ? "" : demoCSS}</head>`,
      );
    const output =
      key === "landing"
        ? "index.html"
        : ["privacy", "terms"].includes(key)
          ? `public-pages/${key}.html`
          : `public-pages/demo-${key}.html`;
    await writeFile(new URL(output, directory), html);
  }
  await writeFile(
    new URL("public-pages/app.html", directory),
    template.replace(
      "</head>",
      '<meta name="robots" content="noindex, nofollow"></head>',
    ),
  );
  for (const name of ["robots.txt", "sitemap.xml", "llms.txt"]) {
    const path = new URL(name, directory);
    await writeFile(
      path,
      (await readFile(path, "utf8")).replaceAll(
        "https://ifsoul.h3lpkey.com",
        origin,
      ),
    );
  }
  console.log(
    "Prerendered landing, policies and five public demo descriptions without running games.",
  );
} finally {
  await server.close();
}
