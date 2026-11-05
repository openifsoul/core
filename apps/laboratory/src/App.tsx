import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  CircleHelp,
  Fingerprint,
  LoaderCircle,
  LogOut,
  Moon,
  RefreshCw,
  Sparkles,
  Sun,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings } from "@/components/Settings";
import { ChatPanel, EvidencePanel, PlanPanel } from "@/components/Workspace";
import {
  api,
  ApiError,
  friendlyError,
  type LabRunResponse,
  type LabSnapshot,
  type LabStatus,
  type ProviderId,
} from "@/lib/api";

type PendingOperation = "plan" | "chat" | null;
const readDraft = () => {
  try {
    return sessionStorage.getItem("ifsoul-lab-draft") ?? "";
  } catch {
    return "";
  }
};

export function App() {
  const [status, setStatus] = useState<LabStatus | null>(null);
  const [snapshot, setSnapshot] = useState<LabSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [provider, setProvider] = useState<ProviderId>("scenario");
  const [model, setModel] = useState("");
  const [pending, setPending] = useState<PendingOperation>(null);
  const [slow, setSlow] = useState(false);
  const [draft, setDraft] = useState(readDraft);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("ifsoul-lab-theme") ?? "dark";
    } catch {
      return "dark";
    }
  });
  const active = useRef(false);
  const retry = useRef<{ fingerprint: string; requestId: string } | null>(null);

  const refresh = useCallback(async (signal?: AbortSignal) => {
    const next = await api<LabStatus>("status", { signal });
    const nextSnapshot = next.authenticated
      ? (next.snapshot ?? (await api<LabSnapshot>("snapshot", { signal })))
      : null;
    setStatus(next);
    setSnapshot(nextSnapshot);
    setError(null);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal)
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(friendlyError(reason));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    try {
      localStorage.setItem("ifsoul-lab-theme", theme);
    } catch {
      /* Storage is optional. */
    }
  }, [theme]);
  useEffect(() => {
    try {
      sessionStorage.setItem("ifsoul-lab-draft", draft);
    } catch {
      /* The in-memory draft remains available. */
    }
  }, [draft]);
  useEffect(() => {
    if (!pending) {
      setSlow(false);
      return;
    }
    const timer = setTimeout(() => setSlow(true), 12_000);
    return () => clearTimeout(timer);
  }, [pending]);

  const selectedProvider = status?.providers.find(
    (item) => item.id === provider,
  );
  const selectedModel = selectedProvider?.models.some(
    (item) => item.id === model,
  )
    ? model
    : (selectedProvider?.models[0]?.id ?? "");
  const ready = Boolean(
    selectedProvider?.available && selectedModel && !pending,
  );

  async function run(operation: "plan" | "chat") {
    if (active.current || !ready || (operation === "chat" && !draft.trim()))
      return;
    active.current = true;
    setPending(operation);
    setOperationError(null);
    const message = operation === "chat" ? draft.trim() : undefined;
    const fingerprint = JSON.stringify({
      operation,
      provider,
      model: selectedModel,
      message,
    });
    if (retry.current?.fingerprint !== fingerprint)
      retry.current = { fingerprint, requestId: `web-${crypto.randomUUID()}` };
    try {
      const result = await api<LabRunResponse>("run", {
        method: "POST",
        body: {
          operation,
          requestId: retry.current.requestId,
          provider,
          model: selectedModel,
          ...(message ? { message } : {}),
        },
      });
      setSnapshot({
        character: result.character,
        memories: result.memories,
        runs: result.runs,
      });
      if (result.result.type === "failure") {
        retry.current = null; // A recorded failure is resolved; the next explicit attempt gets a new ID.
        throw new ApiError(result.result.error.code);
      }
      retry.current = null;
      if (operation === "chat") setDraft("");
    } catch (reason) {
      setOperationError(friendlyError(reason));
      if (reason instanceof ApiError && reason.code === "unauthorized")
        setStatus((old) => (old ? { ...old, authenticated: false } : old));
    } finally {
      setPending(null);
      active.current = false;
    }
  }

  async function reload() {
    setLoading(true);
    try {
      await refresh();
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    if (active.current) return;
    active.current = true;
    try {
      await api("logout", { method: "POST" });
      setStatus((old) => (old ? { ...old, authenticated: false } : old));
      setSnapshot(null);
    } catch (reason) {
      setError(friendlyError(reason));
    } finally {
      active.current = false;
    }
  }

  return (
    <div className="app-shell">
      <header className="workspace-header">
        <a className="wordmark" href="/" aria-label="IfSoul laboratory home">
          <span className="brand-mark">
            <Fingerprint size={22} />
          </span>
          <span>
            IfSoul<span className="wordmark-divider">/</span>
            <strong>laboratory</strong>
          </span>
        </a>
        <div className="header-actions">
          <span className="header-caption">
            A character, beyond one session.
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="touch-target"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          >
            {theme === "dark" ? <Sun /> : <Moon />}
          </Button>
          {status?.authenticated && (
            <Button
              variant="ghost"
              size="icon"
              className="touch-target"
              aria-label="Sign out"
              disabled={Boolean(pending)}
              onClick={() => void logout()}
            >
              <LogOut />
            </Button>
          )}
        </div>
      </header>
      {loading && !status ? (
        <main className="connection-state" aria-live="polite">
          <LoaderCircle className="animate-spin" />
          <h1>Opening the laboratory</h1>
          <p>Connecting to this runtime and its memory store.</p>
        </main>
      ) : !status || !status.authenticated ? (
        <SignIn
          mode={status?.mode}
          error={error}
          onRetry={reload}
          onSuccess={refresh}
        />
      ) : (
        <main className="workspace">
          <section className="workspace-intro">
            <div>
              <div className="eyebrow">
                <span className="status-dot" /> CHARACTER WORKSPACE
              </div>
              <h1>
                One character. <span>A continuous story.</span>
              </h1>
              <p>Talk, propose a plan, and see what becomes memory.</p>
            </div>
            <div className="workspace-badges">
              <Badge variant="outline">
                <span className="status-dot" />
                {status.mode === "cloud" ? "Cloud runtime" : "Local runtime"}
              </Badge>
              <Badge variant="secondary">Experimental</Badge>
            </div>
          </section>
          {error && (
            <div className="feedback error" role="alert">
              <span>{error}</span>
              <Button
                variant="outline"
                onClick={() => void reload()}
                disabled={loading}
              >
                <RefreshCw className={loading ? "animate-spin" : ""} /> Refresh
              </Button>
            </div>
          )}
          <div className="workspace-grid">
            <aside className="settings-column">
              <Settings
                status={status}
                provider={provider}
                model={selectedModel}
                busy={Boolean(pending)}
                onProvider={(value) => {
                  setProvider(value);
                  setModel("");
                  setOperationError(null);
                }}
                onModel={setModel}
                onRefresh={refresh}
              />
              <Card className="boundary-card">
                <CardContent>
                  <CircleHelp size={17} />
                  <h3>The host has the final say</h3>
                  <p>
                    A proposed plan is an intention. Only host-reported outcomes
                    can become completed work.
                  </p>
                  <a href="#evidence">
                    Follow the evidence <ArrowUpRight size={14} />
                  </a>
                </CardContent>
              </Card>
            </aside>
            <section className="main-column" aria-label="Character laboratory">
              <div className="character-bar">
                <div className="character-avatar" aria-hidden="true">
                  {snapshot?.character.profile.name
                    .split(" ")
                    .map((word) => word[0])
                    .slice(0, 2)
                    .join("") ?? "IF"}
                  <span />
                </div>
                <div>
                  <h2>
                    {snapshot?.character.profile.name ?? "Your character"}
                  </h2>
                  <p>Same identity · separate game and chat bindings</p>
                </div>
                <Badge variant="outline" className="character-state">
                  <Check size={12} /> Memory connected
                </Badge>
              </div>
              {!selectedProvider?.available && (
                <div className="feedback notice" role="status">
                  {provider === "openai"
                    ? "Connect your OpenAI key in settings, or select the synthetic controller."
                    : "This provider is unavailable on this runtime. Choose an available provider in settings."}
                </div>
              )}
              {operationError && (
                <div className="feedback error" role="alert">
                  <span>{operationError}</span>
                  <Button
                    variant="outline"
                    disabled={Boolean(pending)}
                    onClick={() =>
                      void run(
                        retry.current?.fingerprint.includes(
                          '"operation":"plan"',
                        )
                          ? "plan"
                          : "chat",
                      )
                    }
                  >
                    Retry request
                  </Button>
                </div>
              )}
              {slow && (
                <div className="feedback notice" role="status">
                  <LoaderCircle className="animate-spin" /> Still waiting for
                  the provider. The request is bounded to one minute; your draft
                  stays here.
                </div>
              )}
              <div className="interaction-grid">
                <ChatPanel
                  snapshot={snapshot}
                  draft={draft}
                  setDraft={setDraft}
                  pending={pending}
                  ready={ready}
                  provider={selectedProvider?.label ?? "Provider"}
                  model={selectedModel}
                  onSend={() => void run("chat")}
                />
                <PlanPanel
                  snapshot={snapshot}
                  pending={pending}
                  ready={ready}
                  onPlan={() => void run("plan")}
                />
              </div>
              <EvidencePanel snapshot={snapshot} />
            </section>
          </div>
          <footer className="workspace-footer">
            <span>
              <span className="status-dot muted" /> IfSoul experimental
              workspace
            </span>
            <span>Plans are proposals. Memory follows evidence.</span>
          </footer>
        </main>
      )}
    </div>
  );
}

function SignIn({
  mode,
  error,
  onRetry,
  onSuccess,
}: {
  mode?: "cloud" | "local";
  error: string | null;
  onRetry: () => Promise<void>;
  onSuccess: () => Promise<void>;
}) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  async function submit(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setFailure(null);
    try {
      await api("login", { method: "POST", body: { password } });
      setPassword("");
      await onSuccess();
    } catch (reason) {
      setFailure(
        reason instanceof ApiError && reason.code === "unauthorized"
          ? "That password did not match. Check it and try again."
          : friendlyError(reason),
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="sign-in-layout">
      <section className="sign-in-story">
        <div className="eyebrow">
          <span className="status-dot" /> THE IFSOUL LABORATORY
        </div>
        <h1>
          A character
          <br />
          with <em>continuity.</em>
        </h1>
        <p>
          One identity, across conversations and worlds.
          <br />
          Explore what it proposes, what happens, and what it remembers.
        </p>
        <div className="story-cycle">
          <span>
            <span>01</span>Context
          </span>
          <ArrowRight />
          <span>
            <span>02</span>Intention
          </span>
          <ArrowRight />
          <span>
            <span>03</span>Memory
          </span>
        </div>
        <div className="story-note">
          <Sparkles size={17} />
          <span>
            Bring your own model.
            <br />
            Keep the character's story.
          </span>
        </div>
      </section>
      <Card className="sign-in-card">
        <CardContent>
          <div className="eyebrow">PRIVATE WORKSPACE</div>
          <h2>Open your laboratory</h2>
          <p>
            Enter this{" "}
            {mode === "cloud"
              ? "cloud"
              : mode === "local"
                ? "local"
                : "runtime's"}{" "}
            workspace password to continue.
          </p>
          <form onSubmit={(event) => void submit(event)}>
            <Label htmlFor="workspace-password">
              Workspace password <span aria-hidden="true">*</span>
            </Label>
            <Input
              id="workspace-password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoFocus
              disabled={busy}
              aria-describedby={failure ? "login-error" : "login-note"}
            />
            {(failure || error) && (
              <p className="field-error" id="login-error" role="alert">
                {failure ?? error}
              </p>
            )}
            <Button type="submit" className="wide" disabled={!password || busy}>
              {busy ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <ArrowRight />
              )}{" "}
              {busy ? "Opening workspace…" : "Enter laboratory"}
            </Button>
          </form>
          <p className="sign-in-note" id="login-note">
            Your session stays on this runtime. Provider keys are configured
            after sign-in.
          </p>
          {error && (
            <Button variant="ghost" onClick={() => void onRetry()}>
              <RefreshCw /> Reconnect
            </Button>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
