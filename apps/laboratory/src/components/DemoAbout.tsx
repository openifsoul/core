import { GitHubIcon } from "./GitHubIcon";
import { ArrowUpRight } from "lucide-react";

export function DemoAbout() {
  return (
    <footer className="demo-about" aria-labelledby="demo-about-title">
      <h2 id="demo-about-title">How IfSoul connects games and memory</h2>
      <p className="demo-about-intro">
        A companion can belong to more than one world. This playground uses
        three small, independent games to demonstrate how the same character can
        move between environments and conversation with a shared trail of
        context and memories.
      </p>
      <div className="demo-about-grid">
        <div className="demo-about-explanation">
          <p>
            Each game provides an API through a bridge: it shares the current
            situation, reports what actually happened and exposes the choices or
            dialogue it can accept. The game owns its rules, movement, combat,
            visuals and speech bubbles, and decides how to apply a response.
          </p>
          <p>
            IfSoul is the intermediary between that bridge, the character’s
            memory and an AI model. It brings relevant context into a request
            and returns bounded decisions or speech to the game. Switching
            worlds changes the companion’s role and appearance while the
            conversation and recent events can inform the next interaction.
          </p>
        </div>
        <nav
          className="demo-example-links"
          aria-label="Game source code on GitHub"
        >
          <h3>Explore the example bridges</h3>
          <a
            href="https://github.com/openifsoul/example-garden"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>
              <strong>
                Garden <span className="demo-example-engine">· PixiJS</span>
              </strong>
              <small>An autonomous gardener you can watch and talk to.</small>
            </span>
            <span className="demo-source-icons" aria-hidden="true">
              <GitHubIcon />
              <ArrowUpRight size={18} />
            </span>
          </a>
          <a
            href="https://github.com/openifsoul/example-friendly-21"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>
              <strong>
                Friendly 21{" "}
                <span className="demo-example-engine">
                  · HTML / CSS / JavaScript
                </span>
              </strong>
              <small>A card-table opponent with bounded turn choices.</small>
            </span>
            <span className="demo-source-icons" aria-hidden="true">
              <GitHubIcon />
              <ArrowUpRight size={18} />
            </span>
          </a>
          <a
            href="https://github.com/openifsoul/example-dungeon"
            target="_blank"
            rel="noopener noreferrer"
          >
            <span>
              <strong>
                Dungeon <span className="demo-example-engine">· Phaser</span>
              </strong>
              <small>
                A tank or healer companion in a game-owned simulation.
              </small>
            </span>
            <span className="demo-source-icons" aria-hidden="true">
              <GitHubIcon />
              <ArrowUpRight size={18} />
            </span>
          </a>
        </nav>
      </div>
      <p className="demo-about-note">
        Free scenario uses scripted replies without model calls. Model mode
        sends the current context and a bounded history to this server’s
        provider; unavailable calls are marked as fallback. This demo keeps the
        latest 48 entries per companion in this browser tab, rather than a
        permanent memory archive. Reset visit clears the selected companion’s
        demo history and progress, but does not restore the model allowance.
        Example source links open GitHub in a new tab.
      </p>
    </footer>
  );
}
