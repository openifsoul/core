import { canonical, validateDocument } from "../../protocol/src/index.js";
import type {
  ContextReport,
  ConversationRequest,
  ConversationResponse,
  EnvironmentProfile,
  Period,
  PlanDecision,
  PlanProposal,
  Scope,
} from "../../protocol/src/index.js";
import { failure, success } from "../../memory/src/port.js";
import type { Result } from "../../memory/src/port.js";
import type { TrustedSession } from "./types.js";

export const same = (a: unknown, b: unknown): boolean =>
  canonical(a) === canonical(b);
export const unique = (values: string[]): boolean =>
  new Set(values).size === values.length;
export const sameParticipants = (a: string[], b: string[]): boolean =>
  same([...a].sort(), [...b].sort());
export const supported = (value: { requiredExtensions?: string[] }): boolean =>
  !value.requiredExtensions?.length;
export function validScope(scope: Scope): boolean {
  return (
    unique(scope.participantIds) &&
    (scope.audience === "public"
      ? !scope.participantIds.length
      : scope.audience === "private"
        ? scope.participantIds.length === 1
        : scope.participantIds.length > 0)
  );
}
export function validPeriod(period: Period): boolean {
  return period.basis === "utc"
    ? Date.parse(period.startAt) <= Date.parse(period.endAt)
    : period.fromTick <= period.toTick;
}
function catalogValid(profile: EnvironmentProfile): boolean {
  return (
    unique(profile.hostIntents.map((i) => i.intentId)) &&
    profile.hostIntents.every(
      (intent) =>
        unique(intent.parameters.map((p) => p.name)) &&
        intent.parameters.every((p) => {
          if (p.type === "quantity")
            return (
              !!p.unit &&
              !p.choices &&
              (p.minimum === undefined ||
                p.maximum === undefined ||
                p.minimum <= p.maximum)
            );
          if (p.type === "choice")
            return (
              !!p.choices?.length &&
              !p.unit &&
              p.minimum === undefined &&
              p.maximum === undefined
            );
          return (
            !p.choices &&
            !p.unit &&
            p.minimum === undefined &&
            p.maximum === undefined
          );
        }),
    )
  );
}
export function sessionValid(s: TrustedSession): Result<void> {
  const { character: ch, profile: p, context: c, access: a } = s;
  if (
    !a ||
    !Array.isArray(a.verifiedParticipantIds) ||
    !Array.isArray(a.authorizedChannelIds) ||
    !Array.isArray(a.recallEnvironmentIds) ||
    !Array.isArray(a.visibleEntityIds) ||
    !a.memoryScope ||
    !Array.isArray(a.memoryScope.participantIds)
  )
    return failure("unauthorized", "Trusted local access mapping is required.");
  if (
    ![
      a.verifiedParticipantIds,
      a.authorizedChannelIds,
      a.recallEnvironmentIds,
      a.visibleEntityIds,
      a.memoryScope.participantIds,
    ].every(
      (ids) =>
        ids.every(
          (id) =>
            typeof id === "string" &&
            /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(id),
        ) && unique(ids),
    ) ||
    a.verifiedParticipantIds.length > 32 ||
    a.recallEnvironmentIds.length > 64 ||
    !["private", "participants", "public"].includes(a.memoryScope.audience) ||
    !["allowed", "consent-required", "forbidden"].includes(
      a.memoryScope.export,
    ) ||
    !validScope(a.memoryScope)
  )
    return failure(
      "unauthorized",
      "Trusted access mapping has invalid bounds or scope.",
    );
  if (
    p.binding.characterId !== ch.characterId ||
    !same(p.binding, c.binding) ||
    p.revision !== c.environmentRevision
  )
    return failure(
      "stale-context",
      "Profile and context binding or revision differs.",
    );
  if (
    a.hostId !== p.hostId ||
    a.characterParticipantId !== ch.participantId ||
    !a.verifiedParticipantIds.includes(ch.participantId) ||
    !a.recallEnvironmentIds.includes(p.binding.environmentId) ||
    (a.memoryScope.audience !== "public" &&
      !a.memoryScope.participantIds.includes(ch.participantId)) ||
    a.memoryScope.participantIds.some(
      (id) => !a.verifiedParticipantIds.includes(id),
    )
  )
    return failure(
      "unauthorized",
      "Local identity, source or scope mapping is not authorized.",
    );
  const characterLink = p.participantLinks.find(
    (link) =>
      link.participantId === ch.participantId &&
      link.environmentSubjectId === p.binding.embodimentId &&
      link.issuerId === a.hostId,
  );
  if (
    !characterLink ||
    !unique(p.participantLinks.map((link) => link.claimId)) ||
    !catalogValid(p) ||
    !validPeriod(c.period)
  )
    return failure(
      "invalid-document",
      "Invalid profile catalog, participant mapping or context period.",
    );
  const pr = c.planningRequest;
  if (
    pr &&
    (!validPeriod(pr.horizon) ||
      pr.cadence !== p.planning.cadence ||
      pr.allowedIntentIds.some(
        (id) => !p.hostIntents.some((intent) => intent.intentId === id),
      ))
  )
    return failure(
      "invalid-plan",
      "Planning request does not match the current profile catalog.",
    );
  if (![ch, p, c].every(supported))
    return failure(
      "unsupported",
      "Required extensions are unsupported by this runtime slice.",
    );
  return success(undefined);
}
export function fresh(
  s: TrustedSession,
  now: number,
  maxAge: number,
  planning = false,
): Result<void> {
  const age = now - Date.parse(s.context.recordedAt);
  if (!Number.isFinite(now) || age < 0 || age > maxAge)
    return failure(
      "stale-context",
      "Context is outside the authorized freshness window.",
    );
  const horizon = planning ? s.context.planningRequest?.horizon : undefined;
  if (horizon?.basis === "utc" && Date.parse(horizon.endAt) <= now)
    return failure("expired", "Planning horizon expired.");
  if (
    horizon?.basis === "world-ticks" &&
    (!s.profile.worldTime ||
      horizon.timelineId !== s.profile.worldTime.timelineId ||
      s.profile.worldTime.tick < horizon.fromTick ||
      s.profile.worldTime.tick >= horizon.toTick)
  )
    return failure(
      "expired",
      "Planning horizon is outside current trusted world time.",
    );
  return success(undefined);
}
export function planValid(
  plan: PlanProposal,
  s: TrustedSession,
  now: number,
): Result<void> {
  const { context: c, profile: p, access: a } = s;
  const request = c.planningRequest;
  if (
    !request ||
    !same(plan.binding, p.binding) ||
    plan.requestId !== request.requestId ||
    plan.correlationId !== c.correlationId ||
    plan.contextReportId !== c.reportId ||
    plan.contextRevision !== c.contextRevision ||
    plan.environmentRevision !== p.revision
  )
    return failure(
      "correlation",
      "Plan does not correlate with its trusted request.",
    );
  if (!supported(plan))
    return failure("unsupported", "Required plan extensions are unsupported.");
  if (
    Date.parse(plan.createdAt) > now ||
    Date.parse(plan.createdAt) < Date.parse(c.recordedAt) ||
    Date.parse(plan.expiresAt) <= now ||
    Date.parse(plan.createdAt) >= Date.parse(plan.expiresAt)
  )
    return failure("expired", "Plan creation or expiry time is invalid.");
  if (
    !same(plan.horizon, request.horizon) ||
    !validPeriod(plan.horizon) ||
    (plan.horizon.basis === "utc" &&
      Date.parse(plan.expiresAt) > Date.parse(plan.horizon.endAt))
  )
    return failure(
      "invalid-plan",
      "Plan horizon differs from the authorized request.",
    );
  if (
    plan.tasks.length > Math.min(16, p.planning.maxTasks, request.maxTasks) ||
    !unique(plan.tasks.map((t) => t.taskId))
  )
    return failure("invalid-plan", "Task count or uniqueness is invalid.");
  for (const task of plan.tasks) {
    const intent = p.hostIntents.find((i) => i.intentId === task.intentId);
    if (!intent || !request.allowedIntentIds.includes(task.intentId))
      return failure(
        "unsupported",
        "Plan contains an unsupported host intent.",
      );
    if (
      Object.keys(task.arguments).some(
        (name) => !intent.parameters.some((param) => param.name === name),
      )
    )
      return failure(
        "invalid-plan",
        "Task contains an unadvertised parameter.",
      );
    for (const param of intent.parameters) {
      const value = Object.hasOwn(task.arguments, param.name)
        ? task.arguments[param.name]
        : undefined;
      if (!value) {
        if (param.required)
          return failure(
            "invalid-plan",
            "Task is missing a required parameter.",
          );
        continue;
      }
      if (
        value.type !== param.type ||
        (value.type === "entity-ref" &&
          !a.visibleEntityIds.includes(value.entityId)) ||
        (value.type === "choice" && !param.choices?.includes(value.value)) ||
        (value.type === "quantity" &&
          (value.unit !== param.unit ||
            (param.minimum !== undefined && value.value < param.minimum) ||
            (param.maximum !== undefined && value.value > param.maximum)))
      )
        return failure(
          "invalid-plan",
          "Task argument does not match its authorized descriptor.",
        );
    }
  }
  const tasks = new Map(plan.tasks.map((t) => [t.taskId, t]));
  const visiting = new Set<string>(),
    visited = new Set<string>();
  const walk = (id: string): boolean => {
    if (visiting.has(id) || !tasks.has(id)) return false;
    if (visited.has(id)) return true;
    visiting.add(id);
    if (!tasks.get(id)!.dependsOnTaskIds.every(walk)) return false;
    visiting.delete(id);
    visited.add(id);
    return true;
  };
  return plan.tasks.every((t) => walk(t.taskId))
    ? success(undefined)
    : failure("invalid-plan", "Task dependencies must resolve and be acyclic.");
}
export function requestValid(
  r: ConversationRequest,
  s: TrustedSession,
  now: number,
): Result<void> {
  const { profile: p, context: c, access: a } = s;
  if (
    !same(r.binding, p.binding) ||
    r.environmentRevision !== p.revision ||
    r.contextRevision !== c.contextRevision
  )
    return failure(
      "stale-context",
      "Conversation binding or revision is stale.",
    );
  if (!supported(r))
    return failure(
      "unsupported",
      "Required conversation extensions are unsupported.",
    );
  if (!p.embodiment.modalities.includes(r.requestedModality))
    return failure(
      "unsupported",
      "Requested modality is unavailable in the bound embodiment.",
    );
  if (
    Date.parse(r.receivedAt) > now ||
    Date.parse(r.deadlineAt) <= now ||
    Date.parse(r.receivedAt) >= Date.parse(r.deadlineAt)
  )
    return failure("expired", "Conversation request is outside its deadline.");
  if (
    r.mode !== p.communication.mode ||
    !p.communication.channelIds.includes(r.channelId) ||
    !a.authorizedChannelIds.includes(r.channelId) ||
    r.speakerParticipantId !== a.characterParticipantId ||
    r.recipientParticipantIds.some(
      (id) => !a.verifiedParticipantIds.includes(id),
    ) ||
    r.messages.some(
      (m) =>
        !a.verifiedParticipantIds.includes(m.participantId) ||
        ![r.speakerParticipantId, ...r.recipientParticipantIds].includes(
          m.participantId,
        ),
    )
  )
    return failure(
      "unauthorized",
      "Conversation participants, channel or mode are not authorized.",
    );
  if (
    !unique(r.messages.map((m) => m.messageId)) ||
    (r.trigger === "incoming-message" &&
      !r.messages.some((m) =>
        r.recipientParticipantIds.includes(m.participantId),
      )) ||
    (r.trigger === "presence-event" &&
      (!p.communication.allowUnrequestedMessages || !a.allowPresenceTrigger))
  )
    return failure("unauthorized", "Conversation trigger is not authorized.");
  return success(undefined);
}
export function responseValid(
  r: ConversationResponse,
  request: ConversationRequest,
  s: TrustedSession,
  now: number,
): Result<void> {
  if (
    !same(r.binding, request.binding) ||
    r.requestId !== request.requestId ||
    r.correlationId !== request.correlationId ||
    r.channelId !== request.channelId ||
    r.speakerParticipantId !== request.speakerParticipantId ||
    !sameParticipants(
      r.recipientParticipantIds,
      request.recipientParticipantIds,
    )
  )
    return failure(
      "correlation",
      "Conversation response does not match its request.",
    );
  if (!supported(r))
    return failure(
      "unsupported",
      "Required response extensions are unsupported.",
    );
  if (
    Date.parse(r.createdAt) < Date.parse(request.receivedAt) ||
    Date.parse(r.createdAt) > now ||
    Date.parse(r.expiresAt) <= now ||
    Date.parse(r.expiresAt) > Date.parse(request.deadlineAt) ||
    Date.parse(r.createdAt) >= Date.parse(r.expiresAt)
  )
    return failure("expired", "Conversation response is outside its deadline.");
  if (
    r.output.type === "utterance" &&
    (r.output.modality !== request.requestedModality ||
      !s.profile.embodiment.modalities.includes(r.output.modality))
  )
    return failure(
      "invalid-conversation",
      "Response modality is not supported by the bound embodiment.",
    );
  return success(undefined);
}
export function decisionValid(
  d: PlanDecision,
  plan: PlanProposal,
): Result<void> {
  if (
    !same(d.binding, plan.binding) ||
    d.correlationId !== plan.correlationId ||
    d.requestId !== plan.requestId ||
    d.contextRevision !== plan.contextRevision ||
    !supported(d)
  )
    return failure("correlation", "Host decision does not match the proposal.");
  const byId = new Map(d.taskDecisions.map((t) => [t.taskId, t.decision]));
  if (
    byId.size !== d.taskDecisions.length ||
    byId.size !== plan.tasks.length ||
    plan.tasks.some((t) => !byId.has(t.taskId))
  )
    return failure(
      "invalid-plan",
      "Decision must uniquely cover every proposed task.",
    );
  const count = [...byId.values()].filter((v) => v === "accepted").length;
  const status =
    count === plan.tasks.length
      ? "accepted"
      : count === 0
        ? "rejected"
        : "partially-accepted";
  if (
    d.status !== status ||
    plan.tasks.some(
      (t) =>
        byId.get(t.taskId) === "accepted" &&
        t.dependsOnTaskIds.some((id) => byId.get(id) !== "accepted"),
    )
  )
    return failure(
      "invalid-plan",
      "Decision status or accepted dependencies are inconsistent.",
    );
  return success(undefined);
}

/** JSON cloning rejects non-JSON and over-budget input before recursive validation. */
export function documentView<T>(
  value: unknown,
  kind: string,
  maxBytes: number,
): Result<T> {
  try {
    const serialized = JSON.stringify(value);
    if (
      !serialized ||
      new TextEncoder().encode(serialized).byteLength > maxBytes
    )
      return failure(
        "budget-exceeded",
        "Document exceeds the configured byte budget.",
      );
    const cloned: unknown = JSON.parse(serialized);
    if (!validateDocument(cloned, kind))
      return failure(
        "invalid-document",
        "Document does not match the supported v0.2 schema.",
      );
    return success(cloned as T);
  } catch {
    return failure("invalid-document", "Document must be bounded JSON.");
  }
}
