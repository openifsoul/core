import { BrandMark } from "@/components/BrandMark";
import { useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  BookOpen,
  Check,
  ChevronRight,
  Database,
  Fingerprint,
  FlaskConical,
  GitBranch,
  Code2,
  Globe2,
  MessageCircle,
  Moon,
  ShieldCheck,
  Sparkles,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/message";
import { useTheme } from "@/lib/theme";

const repository = "https://github.com/openifsoul/core";
const examples = [
  {
    name: "Conversation",
    icon: MessageCircle,
    question: "What matters to you this morning?",
    answer:
      "There are two things I want to do: check the greenhouse beds, then help refill the water supply.",
    note: "A reply is generated from selected, permitted context.",
  },
  {
    name: "Plan",
    icon: GitBranch,
    question: "What would you do next?",
    answer:
      "First, inspect the two beds. Then collect water if the host confirms it is possible.",
    note: "A proposal goes to the host. The host decides what happens.",
  },
  {
    name: "Memory",
    icon: Database,
    question: "What do you know happened?",
    answer:
      "I can remember a completed task when the host reports its outcome. A proposed task is still only an intention.",
    note: "Authored biography and reported experience stay distinct.",
  },
];

export function Landing() {
  const { theme, toggleTheme } = useTheme();
  const [example, setExample] = useState(0);
  const current = examples[example];
  return (
    <div className="landing">
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <header className="landing-header">
        <a href="/" className="wordmark" aria-label="IfSoul home">
          <BrandMark size={36} />
          <span>IfSoul</span>
          <Badge variant="secondary">Experimental</Badge>
        </a>
        <nav aria-label="Main navigation">
          <a href="#how-it-works" className="landing-nav-link">
            How it works
          </a>
          <a href={`${repository}/tree/main/docs`} className="landing-nav-link">
            Documentation <ArrowUpRight size={13} />
          </a>
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
          <Button asChild>
            <a href="/app">
              Open IfSoul App <ArrowRight />
            </a>
          </Button>
        </nav>
      </header>
      <main id="main">
        <section className="landing-hero">
          <a
            className="hero-announcement"
            href={`${repository}/blob/main/docs/roadmap.md`}
          >
            <span className="status-dot" /> An open experiment in character
            continuity <ChevronRight size={14} />
          </a>
          <h1>
            A character’s story
            <br />
            should keep going<span>.</span>
          </h1>
          <p>
            Give a character a history beyond one conversation.
            <br className="desktop-break" /> Explore persistent identity,
            bounded plans, and memory
            <br className="desktop-break" /> that follows what actually
            happened.
          </p>
          <div className="hero-actions">
            <Button asChild>
              <a href="/app">
                Open IfSoul App <ArrowRight size={16} />
              </a>
            </Button>
            <Button asChild variant="outline">
              <a href="/demo">
                Play the demo <ArrowRight size={14} />
              </a>
            </Button>
          </div>
          <div className="hero-footnote">
            <span>Open source</span>
            <span>Bring your own model</span>
            <span>Local or self-hosted</span>
          </div>
        </section>

        <section className="landing-demo" aria-labelledby="demo-title">
          <aside className="demo-sidebar">
            <div className="demo-workspace">
              <BrandMark size={23} /> A character workspace
            </div>
            <div className="demo-section-label">EXPLORE THE CYCLE</div>
            <div className="demo-navigation" aria-label="Example views">
              {examples.map((item, index) => (
                <button
                  key={item.name}
                  aria-pressed={index === example}
                  onClick={() => setExample(index)}
                >
                  <item.icon size={16} />
                  {item.name}
                  {index === example && <ChevronRight size={14} />}
                </button>
              ))}
            </div>
            <div className="demo-sidebar-note">
              <ShieldCheck size={17} />
              <p>
                The host owns the world.
                <br />
                The character carries the story.
              </p>
            </div>
          </aside>
          <div className="demo-main">
            <div className="demo-topline">
              <span>
                <FlaskConical size={14} /> Laboratory preview
              </span>
              <Badge variant="outline">Illustrative · no model call</Badge>
            </div>
            <div className="demo-character">
              <div className="demo-avatar">L</div>
              <div>
                <h2 id="demo-title">Lumen</h2>
                <p>An original synthetic character</p>
              </div>
              <span className="demo-identity">
                <Fingerprint size={14} /> One identity
              </span>
            </div>
            <div className="demo-messages" key={example}>
              <Message from="user">
                <MessageContent>
                  <p>{current.question}</p>
                </MessageContent>
              </Message>
              <Message from="assistant">
                <MessageAvatar>L</MessageAvatar>
                <MessageContent>
                  <span className="demo-speaker">Lumen</span>
                  <p>{current.answer}</p>
                  <span className="demo-message-note">
                    <Database size={12} /> Selected context · illustrative
                    response
                  </span>
                </MessageContent>
              </Message>
            </div>
            <div className="demo-evidence">
              <Check size={16} />
              <p>{current.note}</p>
            </div>
            <a href="/demo" className="demo-open">
              Try the interactive playground <ArrowRight size={15} />
            </a>
          </div>
        </section>

        <section
          className="landing-principles"
          id="play"
          aria-labelledby="play-title"
        >
          <div className="section-heading">
            <div className="eyebrow">PLAY THE ARCHITECTURE</div>
            <h2 id="play-title">One companion. Three different hosts.</h2>
            <p>
              Two to four minutes per game. Keep the conversation and a small
              shared memory as you switch worlds.
            </p>
          </div>
          <div className="principles-grid">
            {[
              [
                "garden",
                "Garden",
                "PixiJS",
                "Watch your companion fetch water, tend every plant and gather the fruit. The agent chooses priorities; the host does the work.",
              ],
              [
                "cards",
                "Friendly 21",
                "HTML / CSS / JavaScript",
                "Play five rounds. Your companion chooses hit or stand, then reacts to the result without seeing your hidden cards.",
              ],
              [
                "dungeon",
                "Dungeon",
                "Phaser",
                "Tank or healer? Clear three rooms and a boss together. Combat stays in the game; your companion reflects between rooms.",
              ],
            ].map(([id, title, engine, description]) => (
              <article key={id} className="principle-card">
                <Badge variant="outline">{engine}</Badge>
                <h3>{title}</h3>
                <p>{description}</p>
                <Button asChild variant="outline">
                  <a href={`/demo?game=${id}`}>
                    Play {title}
                    <ArrowRight size={16} />
                  </a>
                </Button>
              </article>
            ))}
          </div>
          <p className="hero-footnote">
            Free scenario mode needs no account. Cloud model calls require
            Google or email sign-in and use a limited daily allowance.
          </p>
        </section>

        <section
          className="landing-principles"
          id="how-it-works"
          aria-labelledby="principles-title"
        >
          <div className="section-heading">
            <span className="landing-kicker">CONTINUITY, WITH BOUNDARIES</span>
            <h2 id="principles-title">
              A little more history.
              <br />A lot more clarity.
            </h2>
            <p>
              Follow the whole cycle, from context to intention
              <br className="desktop-break" /> to a reported outcome that can
              become memory.
            </p>
          </div>
          <div className="principle-grid">
            <article>
              <Fingerprint />
              <span className="principle-number">01 / IDENTITY</span>
              <h3>One character, beyond a model.</h3>
              <p>
                Keep supported character data and history when changing models.
                Continuity is a design goal, not a promise of identical
                behavior.
              </p>
            </article>
            <article>
              <GitBranch />
              <span className="principle-number">02 / INTENTION</span>
              <h3>Propose. Observe. Remember.</h3>
              <p>
                Characters suggest high-level plans and dialogue. Hosts decide
                what to adopt and report what actually happened.
              </p>
            </article>
            <article>
              <Globe2 />
              <span className="principle-number">03 / OWNERSHIP</span>
              <h3>Choose where the story lives.</h3>
              <p>
                Run locally or self-host on Cloudflare. Choose a supported
                provider separately. Each runtime keeps its own memory store.
              </p>
            </article>
          </div>
        </section>

        <section className="landing-start" aria-labelledby="start-title">
          <div>
            <span className="landing-kicker">START WITH THE EXPERIMENT</span>
            <h2 id="start-title">
              Meet the character.
              <br />
              Inspect the evidence.
            </h2>
            <p>
              IfSoul App brings characters, conversations and memory into one
              workspace. Local runs need no account; cloud access uses Google or
              email. Original demo games are available, while external game
              bridges remain future work.
            </p>
          </div>
          <div className="start-actions">
            <Button asChild>
              <a href="/app">
                <Sparkles size={16} /> Open IfSoul App <ArrowRight size={16} />
              </a>
            </Button>
            <a href={`${repository}/blob/main/docs/web-laboratory.md`}>
              <BookOpen size={15} /> Read the setup guide{" "}
              <ArrowUpRight size={13} />
            </a>
            <span>Local without an account · Cloud with Google or email</span>
          </div>
        </section>
      </main>
      <footer className="landing-footer">
        <a href="/" className="wordmark">
          <BrandMark size={30} />
          <span>IfSoul</span>
        </a>
        <span>An open experiment. A continuing story.</span>
        <div>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="mailto:willekb@gmail.com">Support</a>
          <a href={repository}>
            GitHub <ArrowUpRight size={12} />
          </a>
          <a href={`${repository}/blob/main/LICENSE`}>
            Apache-2.0 <ArrowUpRight size={12} />
          </a>
        </div>
      </footer>
    </div>
  );
}
