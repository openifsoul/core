import { useEffect, useRef, useState } from "react";
import { Link2, RotateCcw, Send, Moon, Sun } from "lucide-react";
import {
  createGameBridge,
  createHTTPTransport,
  scenarioResponse,
} from "@ifsoul/adapter-sdk";
import type {
  BridgeHistory,
  BridgeResponse,
  BridgeTransport,
  MountedGame,
} from "@ifsoul/adapter-sdk";
import { DEMO_CHARACTERS, DEMO_GAMES } from "../../../demo-games/src/catalog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Message, MessageContent } from "@/components/ui/message";
import { BrandMark } from "./BrandMark";
import { useTheme } from "@/lib/theme";
import { api, authenticatedFetch } from "@/lib/api";
import { useRuntimeAuth } from "@/lib/runtime-auth";
import "./demo.css";
interface DemoStatus {
  available: boolean;
  authenticated: boolean;
  remaining: number;
}
type Row = BridgeHistory & { source?: BridgeResponse["source"] };
type Histories = Record<string, Row[]>;
function readHistory(userId: string): Histories {
  try {
    const data = JSON.parse(
      sessionStorage.getItem(`ifsoul-demo-history:${userId}`) ?? "{}",
    );
    const output: Histories = {};
    for (const c of DEMO_CHARACTERS) {
      const rows = data[c.id];
      output[c.id] = Array.isArray(rows)
        ? rows
            .filter(
              (r: Row) =>
                r &&
                typeof r.id === "string" &&
                r.id.length <= 128 &&
                typeof r.hostId === "string" &&
                r.hostId.length <= 128 &&
                typeof r.summary === "string" &&
                r.summary.length <= 600 &&
                ["agent", "user", "observation"].includes(r.kind) &&
                (!r.source ||
                  ["scenario", "llm", "fallback"].includes(r.source)),
            )
            .slice(-48)
        : [];
    }
    return output;
  } catch {
    return {};
  }
}
export function Demo() {
  const auth = useRuntimeAuth();
  return <DemoWorkspace key={auth.userId} />;
}
function DemoWorkspace() {
  const auth = useRuntimeAuth();
  const { theme, toggleTheme } = useTheme();
  const [characterId, setCharacter] = useState("mira"),
    [tab, setTab] = useState(() => {
      const value = new URLSearchParams(location.search).get("game");
      return DEMO_GAMES.some((g) => g.id === value) ? value! : "garden";
    }),
    [epoch, setEpoch] = useState(0);
  const [histories, setHistories] = useState<Histories>(() =>
      readHistory(auth.userId),
    ),
    [status, setStatus] = useState<DemoStatus | null>(null);
  const [mode, setMode] = useState<"scenario" | "llm">("scenario"),
    [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false),
    [error, setError] = useState<string | null>(null),
    [resetConfirm, setResetConfirm] = useState(false);
  const [gameError, setGameError] = useState<string | null>(null),
    [loading, setLoading] = useState(false);
  const elements = useRef<Record<string, HTMLDivElement | null>>({});
  const mounting = useRef(new Set<string>());
  const mounted = useRef(new Map<string, MountedGame>());
  const bridges = useRef(
    new Map<string, ReturnType<typeof createGameBridge>>(),
  );
  const lifetimes = useRef(new Map<string, AbortController>());
  const activeTab = useRef(tab);
  activeTab.current = tab;
  const historyRef = useRef(histories);
  historyRef.current = histories;
  const identityRef = useRef(characterId);
  identityRef.current = characterId;
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const character = DEMO_CHARACTERS.find((c) => c.id === characterId)!;
  const rows = histories[characterId] ?? [];
  const remote = useRef(
    createHTTPTransport("/api/demo/bridge", authenticatedFetch),
  );
  async function refresh() {
    try {
      setStatus(await api<DemoStatus>("demo/status"));
    } catch {
      setStatus(null);
    }
  }
  useEffect(() => {
    document.title = "IfSoul · Play across worlds";
    void refresh();
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(
        `ifsoul-demo-history:${auth.userId}`,
        JSON.stringify(histories),
      );
    } catch {
      /* Session remains usable without browser storage. */
    }
  }, [histories]);
  function append(row: Row, id = characterId) {
    setHistories((old) => {
      const next = {
        ...old,
        [id]: [...(old[id] ?? []).filter((r) => r.id !== row.id), row].slice(
          -48,
        ),
      };
      historyRef.current = next;
      return next;
    });
  }
  function dispose() {
    for (const controller of lifetimes.current.values()) controller.abort();
    for (const host of mounted.current.values()) host.destroy();
    for (const b of bridges.current.values()) b.dispose();
    lifetimes.current.clear();
    mounted.current.clear();
    bridges.current.clear();
    mounting.current.clear();
  }
  useEffect(() => {
    return () => dispose();
  }, [characterId, epoch]);
  function bridge(hostId: string) {
    let existing = bridges.current.get(hostId);
    if (existing) return existing;
    const controller = new AbortController();
    lifetimes.current.set(hostId, controller);
    const selectedId = characterId;
    const transport: BridgeTransport = async (request, signal) => {
      if (modeRef.current === "scenario") return scenarioResponse(request);
      try {
        return await remote.current(request, signal);
      } finally {
        void refresh();
      }
    };
    const nonce = crypto.randomUUID();
    let count = 0;
    existing = createGameBridge({
      hostId,
      character,
      signal: controller.signal,
      transport,
      history: () => historyRef.current[selectedId] ?? [],
      onObservation: (event) =>
        append(
          { ...event, id: `${nonce}-${event.id}`.slice(0, 128) },
          selectedId,
        ),
      onSpeech: (response, request) =>
        append(
          {
            id: `${nonce}-${++count}`,
            hostId,
            kind: "agent",
            summary: response.speech || "I have chosen the next task.",
            source: response.source,
          },
          selectedId,
        ),
    });
    bridges.current.set(hostId, existing);
    return existing;
  }
  useEffect(() => {
    setGameError(null);
    for (const [id, game] of mounted.current)
      id === tab ? game.resume() : game.pause();
    if (tab === "chat") {
      setLoading(false);
      return;
    }
    const game = DEMO_GAMES.find((g) => g.id === tab),
      element = elements.current[tab];
    if (!game || !element) return;
    if (mounted.current.has(tab)) {
      setLoading(false);
      return;
    }
    if (mounting.current.has(tab)) return;
    mounting.current.add(tab);
    setLoading(true);
    const selected = characterId,
      selectedEpoch = epoch;
    const b = bridge(tab);
    const controller = lifetimes.current.get(tab)!;
    void game
      .load()
      .then((module) =>
        module.mount(element, {
          bridge: b,
          character,
          signal: controller.signal,
        }),
      )
      .then((host) => {
        if (controller.signal.aborted || identityRef.current !== selected) {
          host.destroy();
          return;
        }
        mounting.current.delete(game.id);
        mounted.current.set(game.id, host);
        if (activeTab.current !== game.id) host.pause();
        else host.resume();
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted && selectedEpoch === epoch) {
          mounting.current.delete(game.id);
          setGameError(
            "This game could not load. Reload the page to get the latest version; your demo history stays in this tab.",
          );
          setLoading(false);
        }
      });
    // Mounts survive tab switches; lifecycle cleanup belongs to identity/reset/unmount.
  }, [tab, characterId, epoch]);
  async function send() {
    if (pending || !draft.trim()) return;
    const text = draft.trim(),
      selected = characterId;
    setPending(true);
    setError(null);
    const b = bridge(tab);
    append({
      id: crypto.randomUUID(),
      hostId: tab,
      kind: "user",
      summary: text,
    });
    try {
      await b.chat(text);
      if (identityRef.current === selected) setDraft("");
    } catch {
      setError("The conversation was interrupted. Your draft is still here.");
    } finally {
      setPending(false);
    }
  }
  function reset() {
    dispose();
    setHistories((old) => ({ ...old, [characterId]: [] }));
    historyRef.current = { ...historyRef.current, [characterId]: [] };
    setDraft("");
    setEpoch((v) => v + 1);
    setResetConfirm(false);
    setPending(false);
    setError(null);
  }
  return (
    <div className="demo-shell">
      <header className="workspace-header">
        <a href="/" className="wordmark">
          <BrandMark size={36} />
          <span>
            IfSoul <strong>/ playground</strong>
          </span>
        </a>
        <div className="header-actions">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Toggle theme"
            onClick={toggleTheme}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
          <a href="/app">IfSoul App</a>
        </div>
      </header>
      <main className="demo-main">
        <div className="demo-intro">
          <div>
            <div className="eyebrow">ONE COMPANION · THREE WORLDS</div>
            <h1>Play together. Remember together.</h1>
            <p>
              Three short games. Switch worlds or just talk; the selected
              companion keeps a small shared history.
            </p>
          </div>
          <Badge variant="outline">
            {mode === "scenario"
              ? "Scenario · no LLM cost"
              : `Model mode · ${status?.remaining ?? 0} requests left`}
          </Badge>
        </div>
        <section className="demo-controls" aria-label="Companion and inference">
          <div className="demo-personas">
            {DEMO_CHARACTERS.map((c) => (
              <Button
                key={c.id}
                variant={characterId === c.id ? "default" : "outline"}
                aria-pressed={characterId === c.id}
                disabled={pending}
                onClick={() => {
                  if (c.id !== characterId) {
                    dispose();
                    setCharacter(c.id);
                    setDraft("");
                    setResetConfirm(false);
                  }
                }}
              >
                {c.name} · {c.temperament}
              </Button>
            ))}
          </div>
          <p>{character.description}</p>
          <div className="demo-mode">
            <Button
              variant={mode === "scenario" ? "default" : "outline"}
              onClick={() => setMode("scenario")}
            >
              Free scenario
            </Button>
            <Button
              variant={mode === "llm" ? "default" : "outline"}
              disabled={
                !status?.authenticated ||
                !status.available ||
                status.remaining < 1
              }
              onClick={() => setMode("llm")}
            >
              Use model
            </Button>
            <Button variant="outline" onClick={() => setResetConfirm(true)}>
              <RotateCcw size={16} />
              Reset visit
            </Button>
          </div>
          {resetConfirm && (
            <div role="alert" className="demo-reset">
              <p>
                Reset this companion’s game progress and demo history? Other
                companions and your server quota stay unchanged.
              </p>
              <Button onClick={reset}>Reset this visit</Button>
              <Button variant="ghost" onClick={() => setResetConfirm(false)}>
                Keep playing
              </Button>
            </div>
          )}
          {auth.config.mode === "cloud" && !auth.signedIn && (
            <div className="demo-invite">
              <p>
                Sign in with Google or email to use the model allowance. Free
                scenario mode needs no account.
              </p>
              <Button variant="outline" onClick={auth.signIn}>
                Sign in for model mode
              </Button>
            </div>
          )}
          {auth.config.mode === "cloud" && auth.signedIn && (
            <div className="demo-invite">
              <span>Connected as {auth.userName}</span>
              {auth.accountView}
            </div>
          )}
          <p className="text-sm text-muted-foreground">
            Scenario replies are deterministic, not model-generated. Model mode
            sends the current briefing and a bounded history to this server’s
            provider. Quotas remain after reset; unavailable calls fall back
            visibly.
          </p>
          {error && (
            <p role="alert" className="text-destructive">
              {error}
            </p>
          )}
        </section>
        <div className="demo-workspace">
          <section className="demo-playfield">
            <Tabs value={tab} onValueChange={setTab}>
              <TabsList className="demo-tabs">
                {DEMO_GAMES.map((g) => (
                  <TabsTrigger key={g.id} value={g.id}>
                    {g.name}
                  </TabsTrigger>
                ))}
                <TabsTrigger value="chat">Just chat</TabsTrigger>
              </TabsList>
            </Tabs>
            {loading && <p role="status">Opening this world…</p>}
            {gameError && (
              <div role="alert">
                <p>{gameError}</p>
                <Button variant="outline" onClick={() => location.reload()}>
                  Reload playground
                </Button>
              </div>
            )}
            {DEMO_GAMES.map((g) => (
              <div key={g.id} hidden={tab !== g.id}>
                <div className="demo-game-heading">
                  <h2>{g.name}</h2>
                  <Badge variant="secondary">{g.engine}</Badge>
                </div>
                <p>{g.description}</p>
                <div className="demo-stage">
                  <div
                    className="demo-game-root"
                    ref={(element) => {
                      elements.current[g.id] = element;
                    }}
                  />
                  <p className="demo-game-speech" aria-live="polite">
                    {[...rows]
                      .reverse()
                      .find((r) => r.hostId === g.id && r.kind === "agent")
                      ?.summary ?? `${character.name} is ready for this world.`}
                  </p>
                </div>
              </div>
            ))}
            {tab === "chat" && (
              <Card>
                <CardHeader>
                  <CardTitle>A quiet moment with {character.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p>
                    The games are paused. Ask about what happened, or choose
                    another world whenever you like.
                  </p>
                  <p className="text-muted-foreground">
                    Only the last 48 entries are kept per companion in this
                    browser tab. This demo is not a permanent memory archive.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
          <aside className="demo-sidebar">
            <Card>
              <CardHeader>
                <CardTitle>Talk with {character.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className="demo-chat"
                  role="log"
                  aria-label="Demo conversation"
                  aria-live="polite"
                >
                  {rows
                    .filter((r) => r.kind !== "observation")
                    .map((r) => (
                      <Message
                        key={r.id}
                        from={r.kind === "user" ? "user" : "assistant"}
                      >
                        <MessageContent>
                          <div className="demo-message-meta">
                            {r.kind === "user" ? "You" : character.name} ·{" "}
                            {r.hostId}
                            {r.source && (
                              <Badge variant="outline">{r.source}</Badge>
                            )}
                          </div>
                          <p>{r.summary}</p>
                        </MessageContent>
                      </Message>
                    ))}
                  {!rows.some((r) => r.kind !== "observation") && (
                    <p className="text-muted-foreground">
                      Say hello, or watch your companion respond to the game.
                    </p>
                  )}
                </div>
                <form
                  className="demo-chat-form"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send();
                  }}
                >
                  <Label htmlFor="demo-chat">Message your companion</Label>
                  <Input
                    id="demo-chat"
                    value={draft}
                    maxLength={600}
                    disabled={pending}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                  <Button type="submit" disabled={pending || !draft.trim()}>
                    <Send size={16} />
                    {pending ? "Waiting…" : "Send"}
                  </Button>
                </form>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Memory · {rows.length}/48</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">
                  Browser host reports and conversation, not independently
                  verified world facts. Oldest entries expire.
                </p>
                <div className="demo-memory" aria-label="Demo memory">
                  {[...rows].reverse().map((r) => (
                    <article key={r.id}>
                      <Badge variant="secondary">
                        {r.hostId} · {r.kind}
                      </Badge>
                      <p>{r.summary}</p>
                    </article>
                  ))}
                  {rows.length === 0 && <p>Your shared story starts here.</p>}
                </div>
              </CardContent>
            </Card>
          </aside>
        </div>
        <footer className="demo-footer">
          <p>
            Each host owns movement, combat and rules. IfSoul supplies bounded
            decisions and requested dialogue.
          </p>
          <a href="https://github.com/openifsoul/core/tree/main/apps/demo-games">
            Playground integration and example documentation
          </a>
        </footer>
      </main>
    </div>
  );
}
