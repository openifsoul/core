import { renderToStaticMarkup } from "react-dom/server";
import { Landing } from "./components/Landing";
import { ServicePolicies } from "./components/ServicePolicies";
import { DemoAbout } from "./components/DemoAbout";

const games = {
  garden: {
    name: "Garden",
    engine: "PixiJS",
    description:
      "Watch an autonomous gardener fetch water, tend eight beds with limited compost, and harvest fruit. Talk to the companion while the game owns movement and outcomes.",
    repository: "example-garden",
  },
  cards: {
    name: "Friendly 21",
    engine: "HTML, CSS and JavaScript",
    description:
      "Play five rounds of an original friendly card game. The companion chooses from bounded hit or stand options; the game owns the deck, scoring and rules.",
    repository: "example-friendly-21",
  },
  dungeon: {
    name: "Dungeon",
    engine: "Phaser",
    description:
      "Choose a tank or healer role and explore a dungeon with a companion. The host owns combat, enemy behavior and movement; IfSoul supplies requested dialogue.",
    repository: "example-dungeon",
  },
};
export function renderPublicPage(key: string) {
  if (key === "landing")
    return {
      title: "IfSoul · A continuing story",
      description:
        "An open-source experiment in persistent AI characters, bounded plans, and observable memory across games and conversation.",
      path: "/",
      html: renderToStaticMarkup(<Landing />),
    };
  if (key === "privacy" || key === "terms")
    return {
      title: `${key === "privacy" ? "Privacy notice" : "Terms of use"} · IfSoul`,
      description: "Hosted IfSoul App policies, data boundaries and support.",
      path: `/${key}`,
      html: renderToStaticMarkup(<ServicePolicies page={key} />),
    };
  const game = games[key as keyof typeof games];
  return {
    title: game
      ? `${game.name} · ${game.engine} · IfSoul example`
      : "IfSoul Playground · One companion across games",
    description:
      game?.description ??
      "Explore three independent open-source games and see how their bridges connect a companion with context, memory and an AI model.",
    path: game
      ? `/demo?game=${key}`
      : key === "chat"
        ? "/demo?game=chat"
        : "/demo",
    html: renderToStaticMarkup(
      <div className="demo-shell">
        <header className="workspace-header">
          <a href="/" className="wordmark">
            IfSoul
          </a>
          <a href="https://github.com/openifsoul">GitHub organization</a>
        </header>
        <main className="playground-main">
          <h1>
            {game
              ? `${game.name} — an IfSoul bridge example`
              : "Try one NPC in different worlds"}
          </h1>
          {game && (
            <>
              <p>{game.description}</p>
              <p>
                Built with {game.engine}.{" "}
                <a href={`https://github.com/openifsoul/${game.repository}`}>
                  Source code and bridge integration on GitHub
                </a>
                .
              </p>
            </>
          )}
          <p>
            This page describes the demonstration without starting a game.
            Enable JavaScript to open the interactive playground; reading this
            information requires no account or model call.
          </p>
          <nav aria-label="Explore the games">
            {Object.entries(games).map(([id, entry]) => (
              <p key={id}>
                <a href={`/demo?game=${id}`}>
                  {entry.name} · {entry.engine}
                </a>{" "}
                — {entry.description}
              </p>
            ))}
          </nav>
          <DemoAbout />
        </main>
      </div>,
    ),
  };
}
