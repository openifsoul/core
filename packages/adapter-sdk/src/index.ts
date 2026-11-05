import { BRIDGE_VERSION } from "./port.js";
import type {
  BridgeRequest,
  BridgeResponse,
  BridgeHistory,
  BridgeTransport,
} from "./port.js";
import type { GameBridge, GameCharacter } from "./game-host.js";
export * from "./port.js";
export type * from "./game-host.js";
const id = (v: unknown): v is string =>
  typeof v === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(v);
const bounded = (v: unknown, max: number): v is string =>
  typeof v === "string" && v.length > 0 && v.length <= max;
export function validBridgeRequest(value: unknown): value is BridgeRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = value as BridgeRequest;
  if (
    Object.keys(r).some(
      (k) =>
        ![
          "version",
          "hostId",
          "character",
          "requestId",
          "operation",
          "context",
          "choices",
          "fallbackChoiceId",
          "history",
        ].includes(k),
    )
  )
    return false;
  return (
    r.version === BRIDGE_VERSION &&
    id(r.hostId) &&
    id(r.requestId) &&
    ["decide", "speak", "chat"].includes(r.operation) &&
    bounded(r.context, 1200) &&
    !!r.character &&
    Object.keys(r.character).every((k) =>
      ["id", "name", "temperament"].includes(k),
    ) &&
    id(r.character.id) &&
    bounded(r.character.name, 80) &&
    ["careful", "bold", "curious"].includes(r.character.temperament) &&
    Array.isArray(r.choices) &&
    r.choices.length <= 8 &&
    r.choices.every(
      (c) =>
        c &&
        Object.keys(c).every((k) => ["id", "label"].includes(k)) &&
        id(c.id) &&
        bounded(c.label, 160),
    ) &&
    new Set(r.choices.map((c) => c.id)).size === r.choices.length &&
    (r.operation === "decide"
      ? r.choices.length > 0 &&
        r.choices.some((c) => c.id === r.fallbackChoiceId)
      : r.choices.length === 0 && r.fallbackChoiceId === "") &&
    Array.isArray(r.history) &&
    r.history.length <= 12 &&
    r.history.every(
      (h) =>
        h &&
        Object.keys(h).every((k) =>
          ["id", "hostId", "summary", "kind"].includes(k),
        ) &&
        id(h.id) &&
        id(h.hostId) &&
        bounded(h.summary, 300) &&
        ["observation", "user", "agent"].includes(h.kind),
    ) &&
    new TextEncoder().encode(JSON.stringify(r)).length <= 8000
  );
}
export function validBridgeResponse(
  value: unknown,
  request: BridgeRequest,
): value is BridgeResponse {
  if (!value || typeof value !== "object") return false;
  const r = value as BridgeResponse;
  return (
    Object.keys(r).every((k) => ["choiceId", "speech", "source"].includes(k)) &&
    typeof r.speech === "string" &&
    r.speech.length <= 600 &&
    ["scenario", "llm", "fallback"].includes(r.source) &&
    (request.operation === "decide"
      ? request.choices.some((c) => c.id === r.choiceId)
      : r.choiceId === "")
  );
}
export function scenarioResponse(
  request: BridgeRequest,
  source: BridgeResponse["source"] = "scenario",
): BridgeResponse {
  const character = request.character;
  const phrases = {
    careful: "Let's take this carefully, one step at a time.",
    bold: "I'm ready. Let's give this a go!",
    curious: "I wonder what we'll discover next.",
  };
  const recent = [...request.history]
    .reverse()
    .find((h) => h.kind === "observation");
  // Deterministic and visibly labeled: no claim that this canned text came from an LLM.
  return {
    choiceId: request.fallbackChoiceId,
    source,
    speech:
      request.operation === "chat" && recent
        ? `${phrases[character.temperament]} The host reported: ${recent.summary}`
        : request.operation === "speak"
          ? `${phrases[character.temperament]} ${recent ? `The host reported: ${recent.summary}` : "Let’s see what this world brings."}`
          : phrases[character.temperament],
  };
}
export function createGameBridge(options: {
  hostId: string;
  character: GameCharacter;
  transport: BridgeTransport;
  history: () => BridgeHistory[];
  onObservation: (event: BridgeHistory) => void;
  onSpeech: (response: BridgeResponse, request: BridgeRequest) => void;
  signal: AbortSignal;
}): GameBridge & {
  chat(message: string): Promise<BridgeResponse>;
  dispose(): void;
} {
  const controller = new AbortController();
  const signal = AbortSignal.any([controller.signal, options.signal]);
  let sequence = 0;
  const connectionId = crypto.randomUUID();
  const requestIds = new Map<string, string>();
  const seen = new Set<string>();
  async function call(
    operation: BridgeRequest["operation"],
    request: {
      requestId: string;
      context: string;
      choices?: BridgeRequest["choices"];
      fallbackChoiceId?: string;
    },
  ) {
    if (signal.aborted)
      throw new DOMException("Bridge disconnected", "AbortError");
    if (!id(request.requestId)) throw Error("Invalid host request identifier");
    if (!requestIds.has(request.requestId)) {
      if (requestIds.size >= 128)
        throw Error("Bridge session request limit reached");
      requestIds.set(request.requestId, `${connectionId}-${++sequence}`);
    }
    const input: BridgeRequest = {
      version: BRIDGE_VERSION,
      hostId: options.hostId,
      character: {
        id: options.character.id,
        name: options.character.name,
        temperament: options.character.temperament,
      },
      requestId: requestIds.get(request.requestId)!,
      operation,
      context: request.context,
      choices: request.choices ?? [],
      fallbackChoiceId: request.fallbackChoiceId ?? "",
      history: options
        .history()
        .slice(-8)
        .map((h) => ({
          id: h.id,
          hostId: h.hostId,
          kind: h.kind,
          summary: h.summary.slice(0, 240),
        })),
    };
    if (!validBridgeRequest(input))
      throw Error("Unsupported or oversized bridge request");
    const deadline = AbortSignal.any([signal, AbortSignal.timeout(18000)]);
    let response: BridgeResponse;
    let abort: () => void = () => {};
    try {
      response = await Promise.race([
        options.transport(structuredClone(input), deadline),
        new Promise<never>((_, reject) => {
          abort = () =>
            reject(
              new DOMException("Bridge cancelled or timed out", "AbortError"),
            );
          deadline.addEventListener("abort", abort, { once: true });
          if (deadline.aborted) abort();
        }),
      ]);
      if (!validBridgeResponse(response, input))
        throw Error("Invalid agent proposal");
    } catch (error) {
      if (signal.aborted) throw error;
      response = scenarioResponse(input, "fallback");
    } finally {
      deadline.removeEventListener("abort", abort);
    }
    if (signal.aborted)
      throw new DOMException("Bridge disconnected", "AbortError");
    options.onSpeech(response, input);
    return response;
  }
  return {
    decide: (request) => call("decide", request),
    speak: (request) => call("speak", request),
    chat: (message) =>
      call("chat", {
        requestId: `chat-${++sequence}-${crypto.randomUUID()}`,
        context: message,
      }),
    report(event) {
      if (
        signal.aborted ||
        !id(event.id) ||
        !bounded(event.summary, 600) ||
        seen.has(event.id) ||
        seen.size >= 128
      )
        return;
      seen.add(event.id);
      options.onObservation({
        id: event.id,
        hostId: options.hostId,
        kind: "observation",
        summary: event.summary.slice(0, 300),
      });
    },
    dispose() {
      controller.abort();
      seen.clear();
      requestIds.clear();
    },
  };
}
/** Same-origin browser transport; invitations stay in an HttpOnly cookie. */
export function createHTTPTransport(
  endpoint: string,
  fetcher: typeof fetch = fetch,
): BridgeTransport {
  return async (request, signal) => {
    const response = await fetcher(endpoint, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal,
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw Error("Bridge request unavailable");
    }
    const length = Number(response.headers.get("content-length"));
    if (length > 8192) {
      await response.body?.cancel();
      throw Error("Oversized bridge reply");
    }
    const reader = response.body?.getReader();
    if (!reader) throw Error("Missing bridge reply");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.byteLength;
        if (size > 8192) throw Error("Oversized bridge reply");
        chunks.push(part.value);
      }
    } finally {
      await reader.cancel();
      reader.releaseLock();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const result: unknown = JSON.parse(new TextDecoder().decode(bytes));
    if (!validBridgeResponse(result, request))
      throw Error("Invalid bridge reply");
    return result;
  };
}
