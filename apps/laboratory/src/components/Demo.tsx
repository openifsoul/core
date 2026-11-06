import { useEffect, useRef, useState } from "react";
import {
  RotateCcw,
  Send,
  Moon,
  Sun,
  Sprout,
  Spade,
  Castle,
  MessageCircle,
  Brain,
} from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Message,
  MessageAvatar,
  MessageContent,
} from "@/components/ui/message";
import { GitHubIcon } from "./GitHubIcon";
import { DemoAbout } from "./DemoAbout";
import { BrandMark } from "./BrandMark";
import { useTheme } from "@/lib/theme";
import { api, ApiError, authenticatedFetch } from "@/lib/api";
import { useRuntimeAuth } from "@/lib/runtime-auth";
import "./demo.css";
function CompanionAvatar({
  id,
  name,
  className = "demo-persona-avatar",
}: {
  id: string;
  name: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  return (
    <span className={className} data-character={id} aria-hidden="true">
      {failed ? (
        name[0]
      ) : (
        <img
          src={`/companions/${id}.webp`}
          alt=""
          width={128}
          height={128}
          onError={() => setFailed(true)}
        />
      )}
    </span>
  );
}
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
      return value === "chat" || DEMO_GAMES.some((g) => g.id === value)
        ? value!
        : "garden";
    }),
    [epoch, setEpoch] = useState(0);
  const [histories, setHistories] = useState<Histories>(() =>
      readHistory(auth.userId),
    ),
    [status, setStatus] = useState<DemoStatus | null>(null);
  const [mode, setMode] = useState<"scenario" | "llm">("scenario"),
    [draft, setDraft] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [conversationTab, setConversationTab] = useState("conversation");
  const chatLog = useRef<HTMLDivElement>(null);
  const followChat = useRef(true);
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
  const authPrompted = useRef(false);
  const remote = useRef(
    createHTTPTransport("/api/demo/bridge", async (input, init) => {
      const response = await authenticatedFetch(input, init);
      if (init?.signal?.aborted) return response;
      if (response.status === 401) {
        modeRef.current = "scenario";
        setMode("scenario");
        setConnectionError(
          "Your session has ended. Sign in to reconnect to the model.",
        );
        if (!authPrompted.current) {
          authPrompted.current = true;
          auth.signIn();
        }
      } else if (response.status === 429) {
        modeRef.current = "scenario";
        setMode("scenario");
        setConnectionError(
          "Your model allowance is used up or the service is busy. Try again later, or keep playing in Free scenario.",
        );
      }
      return response;
    }),
  );
  useEffect(() => {
    const url = new URL(location.href);
    url.searchParams.set("game", tab);
    history.replaceState(null, "", url);
  }, [tab]);
  useEffect(() => {
    const log = chatLog.current;
    if (log && followChat.current) log.scrollTop = log.scrollHeight;
  }, [rows, conversationTab]);
  async function refresh() {
    try {
      const next = await api<DemoStatus>("demo/status", {
        signal: AbortSignal.timeout(8000),
      });
      setStatus(next);
      return next;
    } catch (cause) {
      setStatus(null);
      if (cause instanceof ApiError && cause.code === "unauthorized")
        return { available: false, authenticated: false, remaining: 0 };
      return null;
    }
  }
  async function connectModel() {
    if (connecting) return;
    setConnectionError(null);
    if (auth.config.mode === "cloud" && !auth.signedIn) {
      auth.signIn();
      return;
    }
    setConnecting(true);
    try {
      const next = await refresh();
      if (
        !next ||
        !next.authenticated ||
        !next.available ||
        next.remaining < 1
      ) {
        modeRef.current = "scenario";
        setMode("scenario");
      }
      if (!next) {
        setConnectionError(
          "Could not check the model connection. Try Use model again.",
        );
      } else if (!next.authenticated) {
        setMode("scenario");
        setConnectionError("Sign in to connect to the model.");
        auth.signIn();
      } else if (!next.available) {
        setConnectionError(
          auth.config.mode === "local"
            ? "The local model is offline. Start Ollama with the demo model installed, then try Use model again."
            : "The model is currently unavailable. Try Use model again shortly.",
        );
      } else if (next.remaining < 1) {
        setConnectionError(
          "Your model allowance is used up. Keep playing in Free scenario and try again tomorrow.",
        );
      } else {
        authPrompted.current = false;
        setConnectionError(null);
        setMode("llm");
        setError(null);
      }
    } finally {
      setConnecting(false);
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
      onSpeech: (response, request) => {
        if (!response.speech.trim()) return;
        if (request.operation === "chat")
          mounted.current.get(hostId)?.say?.(response.speech);
        append(
          {
            id: `${nonce}-${++count}`,
            hostId,
            kind: "agent",
            summary: response.speech || "I have chosen the next task.",
            source: response.source,
          },
          selectedId,
        );
      },
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
      const reply = await b.chat(text);
      if (identityRef.current === selected) {
        if (reply.source === "fallback") {
          setError(
            modeRef.current === "scenario"
              ? "Your draft is kept. Reconnect to the model, then send it again."
              : "The model is unavailable. A scripted reply is shown; your draft is kept so you can try again.",
          );
        } else setDraft("");
      }
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
          <Button variant="ghost" size="icon" asChild>
            <a
              href="https://github.com/openifsoul"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="OpenIfSoul on GitHub (opens in a new tab)"
              title="OpenIfSoul on GitHub"
            >
              <GitHubIcon />
            </a>
          </Button>
          <a href="/app">IfSoul App</a>
        </div>
      </header>
      <main className="playground-main">
        <div className="demo-intro">
          <div>
            <h1>Try one NPC in different worlds</h1>
          </div>
          {mode === "llm" && (
            <Badge variant="outline">
              {`Model mode · ${status?.remaining ?? 0} requests left`}
            </Badge>
          )}
        </div>
        <section className="demo-controls" aria-label="Companion and inference">
          <div className="demo-personas" aria-label="Choose a companion">
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
                <CompanionAvatar key={c.id} id={c.id} name={c.name} />
                <span>
                  {c.name}
                  <small>{c.temperament}</small>
                </span>
              </Button>
            ))}
          </div>
          <div className="demo-mode">
            <Button
              variant={mode === "scenario" ? "default" : "outline"}
              onClick={() => {
                setMode("scenario");
                setConnectionError(null);
              }}
            >
              Free scenario
            </Button>
            <Button
              variant={mode === "llm" ? "default" : "outline"}
              disabled={connecting}
              aria-busy={connecting}
              onClick={() => void connectModel()}
            >
              {connecting ? "Connecting…" : "Use model"}
            </Button>
            <AlertDialog open={resetConfirm} onOpenChange={setResetConfirm}>
              <AlertDialogTrigger asChild>
                <Button variant="outline">
                  <RotateCcw size={16} />
                  Reset visit
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent tone="destructive">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Reset {character.name}’s visit?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    This clears this companion’s game progress and demo history
                    in this tab. Other companions and your model allowance stay
                    unchanged.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="min-h-11">
                    Keep playing
                  </AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    className="min-h-11"
                    onClick={reset}
                  >
                    Reset this visit
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          {connectionError && (
            <p className="demo-invite" role="alert">
              {connectionError}
            </p>
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
        </section>
        <Tabs value={tab} onValueChange={setTab} className="demo-worlds">
          <TabsList className="demo-tabs" aria-label="Choose a world">
            {DEMO_GAMES.map((g) => {
              const Icon =
                g.id === "garden" ? Sprout : g.id === "cards" ? Spade : Castle;
              return (
                <TabsTrigger key={g.id} value={g.id}>
                  <Icon aria-hidden="true" />
                  {g.name}
                </TabsTrigger>
              );
            })}
            <TabsTrigger value="chat">
              <MessageCircle aria-hidden="true" />
              Just chat
            </TabsTrigger>
          </TabsList>
          <div
            className={`playground-workspace${tab === "chat" ? " playground-workspace-chat" : ""}`}
          >
            <section
              className="demo-playfield"
              hidden={tab === "chat"}
              aria-label="Game world"
            >
              {loading && <p role="status">Opening this world…</p>}
              {gameError && (
                <div role="alert" className="demo-reset">
                  <p>{gameError}</p>
                  <Button variant="outline" onClick={() => location.reload()}>
                    Reload playground
                  </Button>
                </div>
              )}
              {DEMO_GAMES.map((g) => (
                <TabsContent
                  key={g.id}
                  value={g.id}
                  forceMount
                  hidden={tab !== g.id}
                >
                  <div className="demo-stage">
                    <div
                      className="demo-game-root"
                      ref={(element) => {
                        elements.current[g.id] = element;
                      }}
                    />
                  </div>
                </TabsContent>
              ))}
            </section>
            <TabsContent value="chat" className="sr-only">
              Games paused. Chat and memory are expanded below.
            </TabsContent>
            <aside
              className="playground-companion"
              aria-label="Companion chat and memory"
            >
              <Card className="demo-companion-panel">
                <CardHeader className="demo-companion-heading">
                  <CompanionAvatar
                    key={character.id}
                    id={character.id}
                    name={character.name}
                  />
                  <div>
                    <CardTitle>{character.name}</CardTitle>
                    <p>Same companion. Every world.</p>
                  </div>
                  <Badge variant="outline">
                    {mode === "scenario" ? "Scenario" : "Model"}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <Tabs
                    value={conversationTab}
                    onValueChange={setConversationTab}
                  >
                    <TabsList
                      className="demo-conversation-tabs"
                      aria-label="Companion panel"
                    >
                      <TabsTrigger value="conversation">
                        <MessageCircle aria-hidden="true" />
                        Chat
                      </TabsTrigger>
                      <TabsTrigger value="memory">
                        <Brain aria-hidden="true" />
                        Memory <span className="demo-count">{rows.length}</span>
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent
                      value="conversation"
                      forceMount
                      hidden={conversationTab !== "conversation"}
                    >
                      <div
                        className="demo-chat"
                        ref={chatLog}
                        role="log"
                        aria-label="Demo conversation"
                        aria-live="polite"
                        onScroll={(e) => {
                          const el = e.currentTarget;
                          followChat.current =
                            el.scrollHeight - el.scrollTop - el.clientHeight <
                            64;
                        }}
                      >
                        {rows
                          .filter((r) => r.kind !== "observation")
                          .map((r) => (
                            <Message
                              key={r.id}
                              from={r.kind === "user" ? "user" : "assistant"}
                            >
                              {r.kind !== "user" && (
                                <MessageAvatar>
                                  <CompanionAvatar
                                    key={character.id}
                                    id={character.id}
                                    name={character.name}
                                    className="demo-message-avatar"
                                  />
                                </MessageAvatar>
                              )}
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
                          <div className="demo-empty">
                            <MessageCircle aria-hidden="true" />
                            <h3>A story starts with hello</h3>
                            <p>
                              Talk to {character.name}, or watch a world unfold.
                              Your conversation travels with you.
                            </p>
                          </div>
                        )}
                        {pending && (
                          <p role="status" className="demo-pending">
                            {character.name} is replying…
                          </p>
                        )}
                      </div>
                      <form
                        className="demo-chat-form"
                        onSubmit={(e) => {
                          e.preventDefault();
                          followChat.current = true;
                          void send();
                        }}
                      >
                        <Label htmlFor="demo-chat">
                          Message {character.name}
                        </Label>
                        <div className="demo-composer">
                          <Input
                            id="demo-chat"
                            value={draft}
                            maxLength={600}
                            disabled={pending}
                            placeholder="Ask about this world…"
                            onChange={(e) => setDraft(e.target.value)}
                          />
                          <Button
                            type="submit"
                            size="icon"
                            aria-label={
                              pending ? "Waiting for reply" : "Send message"
                            }
                            disabled={pending || !draft.trim()}
                          >
                            <Send size={18} />
                          </Button>
                        </div>
                        {error && (
                          <p role="alert" className="text-destructive">
                            {error}
                          </p>
                        )}
                        <span className="demo-composer-hint">
                          {mode === "scenario"
                            ? "Scripted replies · no model calls"
                            : "Model replies · bounded shared history"}
                          <span>{draft.length}/600</span>
                        </span>
                      </form>
                    </TabsContent>
                    <TabsContent
                      value="memory"
                      forceMount
                      hidden={conversationTab !== "memory"}
                    >
                      <p className="demo-memory-note">
                        A shared trail across worlds · {rows.length}/48 entries.
                        <br />
                        Browser host reports and conversation; oldest entries
                        expire.
                      </p>
                      <div className="demo-memory" aria-label="Demo memory">
                        {[...rows].reverse().map((r) => (
                          <article key={r.id}>
                            <div className="demo-message-meta">
                              <Badge variant="secondary">{r.hostId}</Badge>
                              <span>
                                {r.kind === "observation"
                                  ? "World event"
                                  : r.kind === "user"
                                    ? "You said"
                                    : character.name + " said"}
                              </span>
                            </div>
                            <p>{r.summary}</p>
                          </article>
                        ))}
                        {rows.length === 0 && (
                          <div className="demo-empty">
                            <Brain aria-hidden="true" />
                            <h3>Your shared story starts here</h3>
                            <p>
                              Open a world or send a message. Those moments will
                              appear here.
                            </p>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            </aside>
          </div>
        </Tabs>

        <DemoAbout />
      </main>
    </div>
  );
}
