/** Public HTML is selected by URL, never by user agent or authentication. */
export function publicPageAsset(url: URL): string | undefined {
  if (url.pathname === "/") return "/index.html";
  if (url.pathname === "/privacy" || url.pathname === "/terms")
    return `/public-pages/${url.pathname.slice(1)}.html`;
  if (url.pathname === "/demo") {
    const game = url.searchParams.get("game");
    return `/public-pages/demo-${game && ["garden", "cards", "dungeon", "chat"].includes(game) ? game : "overview"}.html`;
  }
  if (
    url.pathname === "/app" ||
    url.pathname.startsWith("/app/") ||
    url.pathname === "/lab"
  )
    return "/public-pages/app.html";
  return undefined;
}
