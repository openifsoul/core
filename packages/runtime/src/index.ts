import {
  resolveResourceLimits,
  BUFFERED_JSON_MAX_BYTES,
  MAX_TIMER_MS,
} from "../../protocol/src/resource-policy.js";
import { createHash } from "node:crypto";
import type {
  CharacterInstance,
  ContextReport,
  ConversationDelivery,
  ConversationRequest,
  ConversationResponse,
  EnvironmentProfile,
  MemoryEvent,
  PlanDecision,
  PlanProposal,
  TaskReport,
} from "../../protocol/src/index.js";
import { failure, success } from "../../memory/src/port.js";
import type {
  ErrorCode,
  ExchangeRecord,
  Result,
} from "../../memory/src/port.js";
import {
  decisionValid,
  documentView,
  fresh,
  planValid,
  requestValid,
  responseValid,
  same,
  sessionValid,
  supported,
} from "./semantics.js";
import type {
  Runtime,
  RuntimeLimits,
  RuntimeOptions,
  TrustedSession,
} from "./types.js";
export type * from "./types.js";
export type { Result, ErrorCode } from "../../memory/src/port.js";

const defaults: RuntimeLimits = {
  controllerTimeoutMs: 1000,
  maxCalls: 20,
  maxDocumentBytes: 65_536,
  maxMemoryRecords: 64,
  maxMemoryBytes: 65_536,
  maxContextAgeMs: 86_400_000,
};
const safeMessages: Partial<Record<ErrorCode, string>> = {
  timeout: "Controller deadline exceeded.",
  "controller-failed": "Controller failed to produce a usable result.",
  "stale-context": "Trusted session changed during controller work.",
  "budget-exceeded": "Controller call budget exhausted.",
};

export const RUNTIME_LEGACY_CEILINGS: RuntimeLimits = {
  controllerTimeoutMs: 60_000,
  maxCalls: 10_000,
  maxDocumentBytes: 1_000_000,
  maxMemoryRecords: 1000,
  maxMemoryBytes: 1_000_000,
  maxContextAgeMs: Number.MAX_SAFE_INTEGER,
};
export function resolveRuntimeLimits(
  requested?: Partial<RuntimeLimits>,
  ceilings?: Partial<RuntimeLimits>,
) {
  return resolveResourceLimits({
    layer: "runtime",
    defaults,
    legacyCeilings: RUNTIME_LEGACY_CEILINGS,
    requested,
    ceilings,
    implementationCeilings: {
      controllerTimeoutMs: MAX_TIMER_MS,
      maxDocumentBytes: BUFFERED_JSON_MAX_BYTES,
      maxMemoryBytes: BUFFERED_JSON_MAX_BYTES,
    },
  });
}

/** Collision-free local storage identity, including IDs that contain colons. */
export const exchangeKey = (
  characterId: string,
  category: string,
  id: string,
): string => JSON.stringify([characterId, category, id]);

/** A bounded local orchestrator. No keys, provider construction, host execution or SQLite dependency. */
export function createRuntime(options: RuntimeOptions): Runtime {
  const { memory, controller } = options;
  const budget = resolveRuntimeLimits(options.limits, options.ceilings);
  const limits = budget.effective;
  const configurationValid = budget.status === "accepted";
  try {
    options.onBudget?.(structuredClone(budget));
  } catch {
    /* Diagnostic observers cannot widen authority. */
  }
  let session: TrustedSession | undefined;
  let generation = 0,
    calls = 0;
  const inFlight = new Map<
    string,
    {
      input: unknown;
      work: Promise<Result<PlanProposal | ConversationResponse>>;
    }
  >();
  const time = () => (options.now?.() ?? new Date()).getTime();
  const trace = (
    entry: Parameters<NonNullable<RuntimeOptions["trace"]>>[0],
  ) => {
    try {
      options.trace?.(entry);
    } catch {
      /* diagnostics never control state */
    }
  };
  const key = (s: TrustedSession, category: string, id: string) =>
    exchangeKey(s.character.characterId, category, id);
  const exchange = (
    s: TrustedSession,
    category: string,
    id: string,
    input: unknown,
    result: unknown,
  ): ExchangeRecord => ({
    id: key(s, category, id),
    characterId: s.character.characterId,
    category,
    input,
    result,
  });
  const event = (
    s: TrustedSession,
    payload: object,
    category: string,
    id: string,
    recordedAt: string,
    sourceType: MemoryEvent["provenance"]["sources"][number]["sourceType"],
  ): MemoryEvent => ({
    schemaVersion: "0.3.0",
    kind: "memory-event",
    memoryId: `event-${createHash("sha256")
      .update(key(s, category, id))
      .digest("hex")
      .slice(0, 48)}`,
    characterId: s.character.characterId,
    recordedAt,
    scope: structuredClone(s.access.memoryScope),
    provenance: { sources: [{ sourceType, sourceId: id }] },
    eventType: category,
    participantIds: [...s.access.memoryScope.participantIds],
    environmentId: s.profile.binding.environmentId,
    sessionId: s.profile.binding.sessionId,
    recordedPayload: structuredClone(payload) as Record<string, unknown>,
  });
  const get = <T>(
    s: TrustedSession,
    category: string,
    id: string,
  ): Result<T | undefined> => {
    const result = memory.getExchange(key(s, category, id));
    return result.ok ? success(result.value?.result as T | undefined) : result;
  };
  const sessionNow = (): Result<TrustedSession> => {
    if (!configurationValid)
      return failure(
        budget.status === "unsupported" ? "unsupported" : "budget-exceeded",
        budget.status === "unsupported"
          ? "The runtime policy exceeds the supported buffered implementation capacity."
          : "Runtime limits must be positive integers within trusted ceilings.",
      );
    if (!session)
      return failure("no-session", "A trusted local session must be selected.");
    const freshness = fresh(session, time(), limits.maxContextAgeMs);
    return freshness.ok ? success(session) : freshness;
  };
  const safe = <T>(action: () => Result<T>): Result<T> => {
    try {
      return action();
    } catch {
      return failure("storage", "Local runtime operation failed.");
    }
  };
  const remember = (
    s: TrustedSession,
    document: PlanDecision | TaskReport | ConversationDelivery,
    category: string,
    id: string,
    sourceType: MemoryEvent["provenance"]["sources"][number]["sourceType"],
    extras: ExchangeRecord[] = [],
  ): Result<void> => {
    const stored = memory.getExchange(key(s, category, id));
    if (!stored.ok) return stored;
    if (stored.value)
      return same(stored.value.input, document)
        ? success(undefined, true)
        : failure("conflict", "Message ID already has different content.");
    const result = memory.commit({
      exchanges: [exchange(s, category, id, document, document), ...extras],
      events: [
        event(s, document, category, id, document.recordedAt, sourceType),
      ],
    });
    if (result.ok)
      trace({ stage: "memory", operation: category, status: "recorded" });
    return result;
  };
  const history = (
    s: TrustedSession,
    audience: string[],
    limit: number,
    maxBytes: number,
    publicOnly = false,
  ): Result<MemoryEvent[]> => {
    if (
      !audience.length ||
      audience.some((id) => !s.access.verifiedParticipantIds.includes(id))
    )
      return failure(
        "unauthorized",
        "Recall audience must be explicitly verified.",
      );
    if (limit > limits.maxMemoryRecords || maxBytes > limits.maxMemoryBytes)
      return failure(
        "budget-exceeded",
        "Recall exceeds configured memory bounds.",
      );
    return memory.recall({
      characterId: s.character.characterId,
      audienceParticipantIds: audience,
      environmentIds: s.access.recallEnvironmentIds,
      limit,
      maxBytes,
      publicOnly,
    });
  };
  async function generate(
    operation: "plan" | "conversation",
    requestValue?: unknown,
  ): Promise<Result<PlanProposal | ConversationResponse>> {
    try {
      const current = sessionNow();
      if (!current.ok) return current;
      const s = current.value;
      let request:
        NonNullable<ContextReport["planningRequest"]> | ConversationRequest;
      let deadline: number;
      if (operation === "plan") {
        if (!s.context.planningRequest)
          return failure(
            "unsupported",
            "Current context contains no planning request.",
          );
        const planningFresh = fresh(s, time(), limits.maxContextAgeMs, true);
        if (!planningFresh.ok) return planningFresh;
        request = s.context.planningRequest;
        deadline =
          request.horizon.basis === "utc"
            ? Date.parse(request.horizon.endAt)
            : time() + limits.controllerTimeoutMs;
      } else {
        const view = documentView<ConversationRequest>(
          requestValue,
          "conversation-request",
          limits.maxDocumentBytes,
        );
        if (!view.ok) return view;
        const valid = requestValid(view.value, s, time());
        if (!valid.ok) return valid;
        request = view.value;
        deadline = Date.parse(view.value.deadlineAt);
      }
      const id = request.requestId;
      const requestKey = key(s, `${operation}-request`, id);
      const input = {
        character: s.character,
        profile: s.profile,
        context: s.context,
        access: s.access,
        request,
      };
      const cached = memory.getExchange(requestKey);
      if (!cached.ok) return cached;
      if (cached.value) {
        if (!same(cached.value.input, input))
          return failure(
            "conflict",
            "Request ID already has different trusted input.",
          );
        trace({ stage: "reuse", operation, requestId: id, status: "recorded" });
        const previous = structuredClone(
          cached.value.result as Result<PlanProposal | ConversationResponse>,
        );
        if (previous.ok && previous.value.kind === "plan-proposal") {
          const valid = planValid(previous.value, s, time());
          if (!valid.ok) return valid;
        }
        if (previous.ok && previous.value.kind === "conversation-response") {
          const valid = responseValid(
            previous.value,
            request as ConversationRequest,
            s,
            time(),
          );
          if (!valid.ok) return valid;
        }
        return previous.ok ? success(previous.value, true) : previous;
      }
      const running = inFlight.get(requestKey);
      if (running)
        return same(running.input, input)
          ? structuredClone(await running.work)
          : failure(
              "conflict",
              "Request ID is already active with different input.",
            );
      // Reserve before invoking external code. After a crash an unfinished claim
      // requires reconciliation instead of silently repeating controller work.
      const claim = memory.getExchange(key(s, `${operation}-claim`, id));
      if (!claim.ok) return claim;
      if (claim.value)
        return failure(
          "conflict",
          same(claim.value.input, input)
            ? "Request has an unfinished durable claim; explicit reconciliation is required."
            : "Request ID was claimed with different trusted input.",
        );
      const claimed = memory.commit({
        exchanges: [
          exchange(s, `${operation}-claim`, id, input, { status: "started" }),
        ],
        events: [],
      });
      if (!claimed.ok) return claimed;
      const version = generation;
      const work = (async (): Promise<
        Result<PlanProposal | ConversationResponse>
      > => {
        // Include the eventual recorded output audience as well as direct recipients;
        // a derived response cannot broaden the scope of selected evidence.
        const audience =
          operation === "conversation"
            ? [
                ...new Set([
                  s.character.participantId,
                  ...(request as ConversationRequest).recipientParticipantIds,
                  ...s.access.memoryScope.participantIds,
                ]),
              ]
            : s.access.verifiedParticipantIds;
        const selection = history(
          s,
          audience,
          limits.maxMemoryRecords,
          limits.maxMemoryBytes,
          s.access.memoryScope.audience === "public",
        );
        if (!selection.ok) return selection;
        trace({
          stage: "selected-memory",
          operation,
          requestId: id,
          memoryIds: selection.value.map((m) => m.memoryId),
        });
        let result: Result<PlanProposal | ConversationResponse>;
        if (calls >= limits.maxCalls)
          result = failure("budget-exceeded", safeMessages["budget-exceeded"]!);
        else {
          calls++;
          const abort = new AbortController();
          let timer: ReturnType<typeof setTimeout> | undefined;
          try {
            trace({
              stage: "controller",
              operation,
              requestId: id,
              status: "started",
            });
            const output = await Promise.race([
              Promise.resolve()
                .then(() =>
                  controller(
                    structuredClone({
                      operation,
                      character: s.character,
                      profile: s.profile,
                      context: s.context,
                      request,
                      memories: selection.value,
                    }),
                    abort.signal,
                  ),
                )
                .then(
                  (value) => ({ type: "value" as const, value }),
                  () => ({ type: "failure" as const }),
                ),
              new Promise<{ type: "timeout" }>((resolve) => {
                timer = setTimeout(
                  () => {
                    abort.abort();
                    resolve({ type: "timeout" });
                  },
                  Math.max(
                    1,
                    Math.min(limits.controllerTimeoutMs, deadline - time()),
                  ),
                );
              }),
            ]);
            if (output.type !== "value")
              result = failure(
                output.type === "timeout" ? "timeout" : "controller-failed",
                safeMessages[
                  output.type === "timeout" ? "timeout" : "controller-failed"
                ]!,
              );
            else if (generation !== version)
              result = failure("stale-context", safeMessages["stale-context"]!);
            else {
              const currentFresh = fresh(
                s,
                time(),
                limits.maxContextAgeMs,
                operation === "plan",
              );
              if (!currentFresh.ok) result = currentFresh;
              else if (operation === "plan") {
                const view = documentView<PlanProposal>(
                  output.value,
                  "plan-proposal",
                  limits.maxDocumentBytes,
                );
                const validation = view.ok
                  ? planValid(view.value, s, time())
                  : view;
                result =
                  view.ok && validation.ok
                    ? success(view.value)
                    : (validation as Result<PlanProposal>);
              } else {
                const view = documentView<ConversationResponse>(
                  output.value,
                  "conversation-response",
                  limits.maxDocumentBytes,
                );
                const requestCheck = requestValid(
                  request as ConversationRequest,
                  s,
                  time(),
                );
                const validation = !requestCheck.ok
                  ? requestCheck
                  : view.ok
                    ? responseValid(
                        view.value,
                        request as ConversationRequest,
                        s,
                        time(),
                      )
                    : view;
                result =
                  view.ok && validation.ok
                    ? success(view.value)
                    : (validation as Result<ConversationResponse>);
              }
            }
          } finally {
            if (timer) clearTimeout(timer);
            abort.abort();
          }
        }
        const exchanges = [
          exchange(s, `${operation}-request`, id, input, result),
        ];
        const events: MemoryEvent[] = [];
        if (operation === "conversation")
          events.push(
            event(
              s,
              request,
              "conversation-request",
              id,
              (request as ConversationRequest).receivedAt,
              "conversation",
            ),
          );
        if (result.ok) {
          const value = result.value;
          if (value.kind === "plan-proposal") {
            exchanges.push(
              exchange(s, "plan-proposal", value.planId, value, value),
            );
            events.push(
              event(
                s,
                value,
                "plan-proposal",
                value.planId,
                value.createdAt,
                "plan-proposal",
              ),
            );
          } else {
            exchanges.push(
              exchange(
                s,
                "conversation-response",
                value.responseId,
                value,
                value,
              ),
            );
            events.push(
              event(
                s,
                value,
                "conversation-response",
                value.responseId,
                value.createdAt,
                "conversation",
              ),
            );
          }
        }
        const saved = memory.commit({ exchanges, events });
        if (!saved.ok) return saved;
        trace({
          stage: result.ok ? "proposal" : "rejected",
          operation,
          requestId: id,
          status: result.ok ? "validated" : result.error.code,
        });
        return result;
      })();
      inFlight.set(requestKey, { input, work });
      try {
        return await work;
      } finally {
        inFlight.delete(requestKey);
      }
    } catch {
      return failure("storage", "Local runtime operation failed.");
    }
  }
  return {
    setSession: (input) =>
      safe(() => {
        if (!configurationValid)
          return failure(
            "budget-exceeded",
            budget.status === "unsupported"
              ? "The runtime policy exceeds the supported buffered implementation capacity."
              : "Runtime limits must be positive integers within trusted ceilings.",
          );
        if (!input || typeof input !== "object")
          return failure("invalid-document", "A trusted session is required.");
        const raw = input as Record<string, unknown>;
        const character = documentView<CharacterInstance>(
          raw.character,
          "character-instance",
          limits.maxDocumentBytes,
        );
        const profile = documentView<EnvironmentProfile>(
          raw.profile,
          "environment-profile",
          limits.maxDocumentBytes,
        );
        const context = documentView<ContextReport>(
          raw.context,
          "context-report",
          limits.maxDocumentBytes,
        );
        if (!character.ok) return character;
        if (!profile.ok) return profile;
        if (!context.ok) return context;
        const s = {
          character: character.value,
          profile: profile.value,
          context: context.value,
          access: structuredClone(raw.access),
        } as TrustedSession;
        const valid = sessionValid(s);
        if (!valid.ok) return valid;
        const freshness = fresh(s, time(), limits.maxContextAgeMs);
        if (!freshness.ok) return freshness;
        const saved = memory.commit({
          characters: [s.character],
          exchanges: [
            exchange(
              s,
              "context-report",
              s.context.reportId,
              { context: s.context, profile: s.profile, access: s.access },
              s.context,
            ),
          ],
          events: [
            event(
              s,
              s.context,
              "context-report",
              s.context.reportId,
              s.context.recordedAt,
              "host-report",
            ),
          ],
        });
        if (!saved.ok) return saved;
        session = s;
        generation++;
        trace({ stage: "context", status: "selected" });
        return success(undefined);
      }),
    plan: () => generate("plan") as Promise<Result<PlanProposal>>,
    conversation: (request) =>
      generate("conversation", request) as Promise<
        Result<ConversationResponse>
      >,
    recordDecision: (input) =>
      safe(() => {
        const current = sessionNow();
        if (!current.ok) return current;
        const s = current.value;
        const view = documentView<PlanDecision>(
          input,
          "plan-decision",
          limits.maxDocumentBytes,
        );
        if (!view.ok) return view;
        const d = view.value;
        const plan = get<PlanProposal>(s, "plan-proposal", d.planId);
        if (!plan.ok) return plan;
        if (!plan.value || !same(d.binding, s.profile.binding))
          return failure(
            "correlation",
            "No matching proposal in the trusted binding.",
          );
        const valid = decisionValid(d, plan.value);
        if (!valid.ok) return valid;
        const currentProposal = planValid(plan.value, s, time());
        if (!currentProposal.ok) return currentProposal;
        if (
          Date.parse(d.recordedAt) < Date.parse(plan.value.createdAt) ||
          Date.parse(d.recordedAt) >= Date.parse(plan.value.expiresAt) ||
          Date.parse(d.recordedAt) > time()
        )
          return failure("expired", "Decision is outside proposal validity.");
        return remember(s, d, "plan-decision", d.decisionId, "plan-decision", [
          exchange(s, "plan-adoption", d.planId, d, d),
        ]);
      }),
    recordReport: (input) =>
      safe(() => {
        const current = sessionNow();
        if (!current.ok) return current;
        const s = current.value;
        const view = documentView<TaskReport>(
          input,
          "task-report",
          limits.maxDocumentBytes,
        );
        if (!view.ok) return view;
        const r = view.value;
        const plan = get<PlanProposal>(s, "plan-proposal", r.planId);
        if (!plan.ok) return plan;
        const adoption = get<PlanDecision>(s, "plan-adoption", r.planId);
        if (!adoption.ok) return adoption;
        if (
          !plan.value ||
          !adoption.value ||
          !same(r.binding, s.profile.binding) ||
          !same(r.binding, plan.value.binding) ||
          r.correlationId !== plan.value.correlationId ||
          !supported(r) ||
          !adoption.value.taskDecisions.some(
            (t) => t.taskId === r.taskId && t.decision === "accepted",
          )
        )
          return failure(
            "correlation",
            "Host report must reference an accepted task in this trusted binding.",
          );
        if (
          Date.parse(r.recordedAt) < Date.parse(adoption.value.recordedAt) ||
          Date.parse(r.recordedAt) > time()
        )
          return failure(
            "correlation",
            "Host report time is inconsistent with adoption.",
          );
        return remember(s, r, "task-report", r.reportId, "host-report");
      }),
    recordDelivery: (input) =>
      safe(() => {
        const current = sessionNow();
        if (!current.ok) return current;
        const s = current.value;
        const view = documentView<ConversationDelivery>(
          input,
          "conversation-delivery",
          limits.maxDocumentBytes,
        );
        if (!view.ok) return view;
        const d = view.value;
        const response = get<ConversationResponse>(
          s,
          "conversation-response",
          d.responseId,
        );
        if (!response.ok) return response;
        const r = response.value;
        if (
          !r ||
          !same(d.binding, r.binding) ||
          !same(d.binding, s.profile.binding) ||
          d.requestId !== r.requestId ||
          d.correlationId !== r.correlationId ||
          d.channelId !== r.channelId ||
          !s.access.authorizedChannelIds.includes(d.channelId) ||
          !s.profile.communication.channelIds.includes(d.channelId) ||
          !supported(d) ||
          (r.output.type === "no-output" &&
            d.status !== "rejected" &&
            d.status !== "unknown")
        )
          return failure(
            "correlation",
            "Delivery must reference an authorized response in this binding.",
          );
        if (
          Date.parse(d.recordedAt) < Date.parse(r.createdAt) ||
          Date.parse(d.recordedAt) > time() ||
          ((d.status === "accepted" || d.status === "delivered") &&
            Date.parse(d.recordedAt) >= Date.parse(r.expiresAt))
        )
          return failure(
            "expired",
            "Delivery time is outside response validity.",
          );
        return remember(
          s,
          d,
          "conversation-delivery",
          d.deliveryId,
          "conversation",
        );
      }),
    history: (query = {}) =>
      safe(() => {
        const current = sessionNow();
        if (!current.ok) return current;
        return history(
          current.value,
          query.audienceParticipantIds ?? [
            current.value.character.participantId,
          ],
          query.limit ?? limits.maxMemoryRecords,
          query.maxBytes ?? limits.maxMemoryBytes,
        );
      }),
  };
}
