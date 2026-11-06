import assert from "node:assert/strict";
import test from "node:test";
import { publicPageAsset } from "../../apps/server/src/public-pages.js";

test("public descriptions select only allowlisted assets, independent of identity", () => {
  for (const game of ["garden", "cards", "dungeon", "chat"])
    assert.equal(
      publicPageAsset(new URL(`https://example.test/demo?game=${game}`)),
      `/public-pages/demo-${game}.html`,
    );
  for (const query of [
    "",
    "?game=../../secrets",
    "?game=unknown",
    "?game=%3Cscript%3E",
  ])
    assert.equal(
      publicPageAsset(new URL(`https://example.test/demo${query}`)),
      "/public-pages/demo-overview.html",
    );
  assert.equal(
    publicPageAsset(new URL("https://example.test/")),
    "/index.html",
  );
  assert.equal(
    publicPageAsset(new URL("https://example.test/privacy")),
    "/public-pages/privacy.html",
  );
  assert.equal(
    publicPageAsset(new URL("https://example.test/app/chat")),
    "/public-pages/app.html",
  );
  assert.equal(
    publicPageAsset(new URL("https://example.test/api/characters")),
    undefined,
  );
});
