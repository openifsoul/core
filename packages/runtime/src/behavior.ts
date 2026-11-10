import { SessionError } from "./participants.js";
import type {
  ParticipantState,
  ParticipantStore,
  SessionAccess,
} from "./participants.js";
import type {
  BehaviorConfiguration,
  BehaviorOperatorPolicy,
  BehaviorPermissions,
  BehaviorPermission,
  BehaviorSettings,
  BehaviorState,
  BehaviorInspection,
  BehaviorProposal,
  BehaviorEventKind,
  BehaviorOverride,
  ParameterDefinition,
  BehaviorParameterValue,
  BehaviorEditorSnapshot,
} from "./behavior-types.js";
import { canonical } from "../../protocol/src/index.js";
import { resolveResourceLimits } from "../../protocol/src/resource-policy.js";
export type * from "./behavior-types.js";
const permissions: BehaviorPermission[] = [
  "observe",
  "remember",
  "updateRelationship",
  "speak",
  "requestAction",
];
export const DEFAULT_BEHAVIOR_OPERATOR: Readonly<BehaviorOperatorPolicy> =
  Object.freeze({
    canEditConfig: false,
    lockedParameterIds: [],
    deniedPermissions: [],
    lockedPolicy: false,
    lockedGoals: false,
  });
export interface BehaviorLimits {
  parameters: number;
  overrides: number;
  values: number;
  history: number;
  observations: number;
  proposals: number;
  changesPerProposal: number;
  evidencePerChange: number;
}
export const DEFAULT_BEHAVIOR_LIMITS: Readonly<BehaviorLimits> = Object.freeze({
  parameters: 32,
  overrides: 128,
  values: 4096,
  history: 8192,
  observations: 4096,
  proposals: 2048,
  changesPerProposal: 8,
  evidencePerChange: 16,
});
const failure = (code: SessionError["code"]): never => {
  throw new SessionError(code);
};
const id = (value: unknown): value is string =>
  typeof value === "string" &&
  /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
const finite = (value: unknown): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  Math.abs(value) <= Number.MAX_SAFE_INTEGER;
const obj = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const keys = (value: unknown, allowed: string[]) =>
  obj(value) && Object.keys(value).every((k) => allowed.includes(k));
const same = (a: unknown, b: unknown) => canonical(a) === canonical(b);
const unique = (values: unknown, maximum: number): values is string[] =>
  Array.isArray(values) &&
  values.length <= maximum &&
  values.every(id) &&
  new Set(values).size === values.length;
const revision = (state: BehaviorState, npcId: string) =>
  Object.hasOwn(state.stateRevisions, npcId) ? state.stateRevisions[npcId] : 0;
export function defaultBehaviorConfiguration(): BehaviorConfiguration {
  const general = {
    observe: true,
    remember: true,
    updateRelationship: true,
    speak: true,
    requestAction: true,
  };
  return {
    version: "ifsoul-behavior/0.4.0",
    revision: 0,
    parameters: ["trust", "cooperation", "caution"].map((parameterId) => ({
      parameterId,
      label: parameterId[0].toUpperCase() + parameterId.slice(1),
      kind: "relationship",
      scope: "portable",
      initial: 50,
      min: 0,
      max: 100,
      maxDelta: 5,
    })),
    defaults: {
      policy: {
        general,
        provocation: { ...general, speak: false, requestAction: false },
      },
      goals: [],
    },
    overrides: [],
  };
}
const base = (s: ParticipantState): BehaviorConfiguration => {
  if (s.behavior && s.behavior.format !== "ifsoul-behavior/0.4.0")
    return failure("invalid");
  return s.behavior?.config ?? defaultBehaviorConfiguration();
};
const requireState = (s: ParticipantState, create = false): BehaviorState => {
  if (s.behavior) {
    if (s.behavior.format !== "ifsoul-behavior/0.4.0")
      return failure("invalid");
    return s.behavior;
  }
  if (!create) return failure("invalid");
  return (s.behavior = {
    format: "ifsoul-behavior/0.4.0",
    config: defaultBehaviorConfiguration(),
    observations: [],
    values: [],
    history: [],
    proposals: [],
    stateRevisions: {},
  });
};
function sessionFor(
  s: ParticipantState,
  a: SessionAccess,
  sessionId: string,
  npcId: string,
) {
  const session = s.sessions.find(
    (x) => x.sessionId === sessionId && x.hostId === a.hostId,
  );
  if (
    !session ||
    !session.members.some((m) => m.participantId === npcId && m.role === "npc")
  )
    return failure("unauthorized");
  return session;
}
/** World -> matching groups in lexicographic ID order -> NPC -> immutable operator denies. */
export function effectiveBehavior(
  s: ParticipantState,
  access: SessionAccess,
  npcId: string,
  sessionId: string,
  operator: BehaviorOperatorPolicy = DEFAULT_BEHAVIOR_OPERATOR,
) {
  const session = sessionFor(s, access, sessionId, npcId);
  const config = base(s),
    effective: BehaviorSettings & { initialValues: Record<string, number> } =
      structuredClone({ ...config.defaults, initialValues: {} });
  const groups = session.groups
    .filter((g) => g.participantIds.includes(npcId))
    .map((g) => g.groupId)
    .sort();
  const scopes = [
    { kind: "world", id: session.worldId },
    ...groups.map((id) => ({ kind: "group", id })),
    { kind: "npc", id: npcId },
  ];
  for (const scope of scopes) {
    const override = config.overrides.find(
      (x) => x.scope.kind === scope.kind && x.scope.id === scope.id,
    );
    if (!override) continue;
    for (const category of ["general", "provocation"] as const)
      Object.assign(effective.policy[category], override.policy?.[category]);
    if (override.goals) effective.goals = structuredClone(override.goals);
    if (override.initialValues)
      Object.assign(effective.initialValues, override.initialValues);
  }
  for (const flag of operator.deniedPermissions)
    for (const category of ["general", "provocation"] as const)
      effective.policy[category][flag] = false;
  return effective;
}
export function behaviorPermissions(
  s: ParticipantState,
  access: SessionAccess,
  npcId: string,
  sessionId: string,
  eventId?: string,
  operator: BehaviorOperatorPolicy = DEFAULT_BEHAVIOR_OPERATOR,
): BehaviorPermissions {
  const effective = effectiveBehavior(s, access, npcId, sessionId, operator);
  const kind = s.behavior?.observations.find(
    (x) => x.npcId === npcId && x.eventId === eventId,
  )?.kind;
  return effective.policy[kind === "provocation" ? "provocation" : "general"];
}
export const behaviorRevision = (s: ParticipantState) =>
  s.behavior?.config.revision ?? 0;
/** Previously unobserved/unremembered evidence never becomes implicit model context. */
export function behaviorEvidenceVisible(
  s: ParticipantState,
  access: SessionAccess,
  npcId: string,
  sessionId: string,
  eventId: string,
  operator: BehaviorOperatorPolicy = DEFAULT_BEHAVIOR_OPERATOR,
): boolean {
  sessionFor(s, access, sessionId, npcId);
  const event = s.events.find((e) => e.eventId === eventId);
  if (
    !event ||
    !s.sessions.some(
      (source) =>
        source.sessionId === event.sessionId && source.hostId === access.hostId,
    )
  )
    return false;
  if (!s.behavior) return true;
  const observation = s.behavior.observations.find(
    (x) => x.npcId === npcId && x.eventId === eventId,
  );
  const current = behaviorPermissions(
    s,
    access,
    npcId,
    sessionId,
    eventId,
    operator,
  );
  return (
    !!observation &&
    observation.permissions.observe &&
    observation.permissions.remember &&
    current.observe &&
    current.remember
  );
}
function validGoals(value: unknown): boolean {
  return (
    Array.isArray(value) &&
    value.length <= 16 &&
    unique(
      value.map((g) => g?.goalId),
      16,
    ) &&
    value.every(
      (g) =>
        keys(g, ["goalId", "objective", "priority", "enabled"]) &&
        typeof g.objective === "string" &&
        g.objective.length > 0 &&
        g.objective.length <= 512 &&
        Number.isInteger(g.priority) &&
        g.priority >= 0 &&
        g.priority <= 100 &&
        typeof g.enabled === "boolean",
    )
  );
}
const flags = (value: unknown, partial = false): boolean =>
  keys(value, permissions) &&
  Object.values(value as object).every((x) => typeof x === "boolean") &&
  (partial || Object.keys(value as object).length === permissions.length);
const policy = (value: unknown, partial = false): boolean =>
  keys(value, ["general", "provocation"]) &&
  (partial || Object.keys(value as object).length === 2) &&
  Object.values(value as object).every((x) => flags(x, partial));
function definition(value: ParameterDefinition): boolean {
  return (
    keys(value, [
      "parameterId",
      "label",
      "kind",
      "scope",
      "initial",
      "min",
      "max",
      "maxDelta",
      "decay",
    ]) &&
    id(value.parameterId) &&
    typeof value.label === "string" &&
    value.label.length > 0 &&
    value.label.length <= 80 &&
    ["trait", "state", "relationship"].includes(value.kind) &&
    ["portable", "world"].includes(value.scope) &&
    [value.initial, value.min, value.max, value.maxDelta].every(finite) &&
    value.min < value.max &&
    value.initial >= value.min &&
    value.initial <= value.max &&
    value.maxDelta > 0 &&
    value.maxDelta <= value.max - value.min &&
    !(value.kind === "trait" && (value.scope !== "portable" || value.decay)) &&
    (value.decay === undefined ||
      (keys(value.decay, ["perHour", "toward"]) &&
        finite(value.decay.perHour) &&
        value.decay.perHour > 0 &&
        finite(value.decay.toward) &&
        value.decay.toward >= value.min &&
        value.decay.toward <= value.max))
  );
}
const valueKey = (
  value: Pick<
    BehaviorParameterValue,
    "npcId" | "parameterId" | "targetParticipantId" | "worldId"
  >,
) =>
  JSON.stringify([
    value.npcId,
    value.parameterId,
    value.targetParticipantId ?? null,
    value.worldId ?? null,
  ]);
export function createBehaviorRuntime(
  store: ParticipantStore,
  options: {
    operator?: BehaviorOperatorPolicy;
    limits?: Partial<BehaviorLimits>;
    ceilings?: Partial<BehaviorLimits>;
  } = {},
) {
  const operator = structuredClone(
    options.operator ?? DEFAULT_BEHAVIOR_OPERATOR,
  );
  if (
    !keys(operator, [
      "canEditConfig",
      "lockedParameterIds",
      "deniedPermissions",
      "lockedPolicy",
      "lockedGoals",
    ]) ||
    typeof operator.canEditConfig !== "boolean" ||
    !unique(operator.lockedParameterIds, 128) ||
    !Array.isArray(operator.deniedPermissions) ||
    operator.deniedPermissions.some((x) => !permissions.includes(x)) ||
    typeof operator.lockedPolicy !== "boolean" ||
    typeof operator.lockedGoals !== "boolean"
  )
    throw new RangeError("Invalid behavior operator policy");
  const report = resolveResourceLimits({
    layer: "behavior",
    defaults: { ...DEFAULT_BEHAVIOR_LIMITS },
    legacyCeilings: { ...DEFAULT_BEHAVIOR_LIMITS },
    requested: options.limits,
    ceilings: options.ceilings,
  });
  if (report.status !== "accepted")
    throw new RangeError("Unsupported behavior limit");
  const limits = report.effective;
  const run = <T>(a: SessionAccess, work: (s: ParticipantState) => T): T => {
    if (!a || !id(a.principalId) || !id(a.hostId))
      return failure("unauthorized");
    return store.transact(a.principalId, (s) => {
      if (
        s.format !== "ifsoul-participants/0.4.0" ||
        (s.behavior && s.behavior.format !== "ifsoul-behavior/0.4.0")
      )
        return failure("invalid");
      return structuredClone(work(s));
    });
  };
  const inspect = (
    s: ParticipantState,
    a: SessionAccess,
    sessionId: string,
    npcId: string,
  ): BehaviorInspection => {
    const session = sessionFor(s, a, sessionId, npcId),
      b = s.behavior,
      config = base(s);
    return {
      npcId,
      sessionId,
      configRevision: config.revision,
      stateRevision: b ? revision(b, npcId) : 0,
      effective: effectiveBehavior(s, a, npcId, sessionId, operator),
      parameters: config.parameters,
      values: (b?.values ?? []).filter(
        (v) =>
          v.npcId === npcId && (!v.worldId || v.worldId === session.worldId),
      ),
      history: (b?.history ?? []).filter(
        (v) =>
          v.npcId === npcId && (!v.worldId || v.worldId === session.worldId),
      ),
    };
  };
  return {
    read(a: SessionAccess): BehaviorEditorSnapshot {
      if (!operator.canEditConfig) return failure("unauthorized");
      return run(a, (s) => ({
        config: base(s),
        operator,
        catalog: {
          npcs: s.participants
            .filter(
              (p) =>
                p.kind === "npc" &&
                s.sessions.some((session) =>
                  session.members.some(
                    (m) =>
                      m.participantId === p.participantId && m.role === "npc",
                  ),
                ),
            )
            .map((p) => ({ npcId: p.participantId, label: p.participantId })),
          sessions: s.sessions.map((x) => ({
            sessionId: x.sessionId,
            worldId: x.worldId,
            npcIds: x.members
              .filter((m) => m.role === "npc")
              .map((m) => m.participantId),
          })),
          groups: s.sessions.flatMap((x) =>
            x.groups.map((g) => ({
              groupId: g.groupId,
              npcIds: g.participantIds.filter((id) =>
                s.participants.some(
                  (p) => p.participantId === id && p.kind === "npc",
                ),
              ),
            })),
          ),
          worlds: [...new Set(s.sessions.map((x) => x.worldId))],
        },
      }));
    },
    update(
      a: SessionAccess,
      expectedRevision: number,
      config: BehaviorConfiguration,
    ) {
      return run(a, (s) => {
        if (!operator.canEditConfig) return failure("unauthorized");
        const prior = base(s);
        if (
          !keys(config, [
            "version",
            "revision",
            "parameters",
            "defaults",
            "overrides",
          ]) ||
          config.version !== "ifsoul-behavior/0.4.0" ||
          !Number.isSafeInteger(expectedRevision) ||
          expectedRevision < 0 ||
          config.revision !== expectedRevision + 1 ||
          !Array.isArray(config.parameters) ||
          !config.parameters.length ||
          !unique(
            config.parameters.map((p) => p?.parameterId),
            limits.parameters,
          ) ||
          !config.parameters.every(definition) ||
          !keys(config.defaults, ["policy", "goals"]) ||
          !policy(config.defaults.policy) ||
          !validGoals(config.defaults.goals) ||
          !Array.isArray(config.overrides) ||
          config.overrides.length > limits.overrides
        )
          return failure("invalid");
        if (prior.revision !== expectedRevision) return failure("conflict");
        const scopeKeys = new Set<string>();
        for (const o of config.overrides) {
          if (
            !keys(o, ["scope", "policy", "goals", "initialValues"]) ||
            !keys(o.scope, ["kind", "id"]) ||
            !["npc", "group", "world"].includes(o.scope.kind) ||
            !id(o.scope.id) ||
            (o.policy !== undefined && !policy(o.policy, true)) ||
            (o.goals !== undefined && !validGoals(o.goals)) ||
            (o.initialValues !== undefined &&
              (!obj(o.initialValues) ||
                Object.entries(o.initialValues).some(([id, value]) => {
                  const d = config.parameters.find((p) => p.parameterId === id);
                  return !d || !finite(value) || value < d.min || value > d.max;
                })))
          )
            return failure("invalid");
          const key = JSON.stringify(o.scope);
          if (scopeKeys.has(key)) return failure("conflict");
          scopeKeys.add(key);
          if (
            (o.scope.kind === "npc" &&
              !s.participants.some(
                (p) => p.participantId === o.scope.id && p.kind === "npc",
              )) ||
            (o.scope.kind === "world" &&
              !s.sessions.some((x) => x.worldId === o.scope.id)) ||
            (o.scope.kind === "group" &&
              !s.sessions.some((x) =>
                x.groups.some((g) => g.groupId === o.scope.id),
              ))
          )
            return failure("unauthorized");
        }
        for (const locked of operator.lockedParameterIds) {
          if (
            !same(
              prior.parameters.find((p) => p.parameterId === locked),
              config.parameters.find((p) => p.parameterId === locked),
            ) ||
            !same(
              prior.overrides
                .filter(
                  (o) =>
                    o.initialValues && Object.hasOwn(o.initialValues, locked),
                )
                .map((o) => [o.scope, o.initialValues?.[locked]]),
              config.overrides
                .filter(
                  (o) =>
                    o.initialValues && Object.hasOwn(o.initialValues, locked),
                )
                .map((o) => [o.scope, o.initialValues?.[locked]]),
            )
          )
            return failure("unauthorized");
        }
        if (
          operator.lockedPolicy &&
          (!same(prior.defaults.policy, config.defaults.policy) ||
            !same(
              prior.overrides
                .filter((o) => o.policy !== undefined)
                .map((o) => [o.scope, o.policy]),
              config.overrides
                .filter((o) => o.policy !== undefined)
                .map((o) => [o.scope, o.policy]),
            ))
        )
          return failure("unauthorized");
        if (
          operator.lockedGoals &&
          (!same(prior.defaults.goals, config.defaults.goals) ||
            !same(
              prior.overrides
                .filter((o) => o.goals !== undefined)
                .map((o) => [o.scope, o.goals]),
              config.overrides
                .filter((o) => o.goals !== undefined)
                .map((o) => [o.scope, o.goals]),
            ))
        )
          return failure("unauthorized");
        for (const flag of operator.deniedPermissions) {
          const was = (p: unknown) =>
            obj(p) && Object.values(p).some((v) => obj(v) && v[flag] === true);
          if (
            (was(config.defaults.policy) && !was(prior.defaults.policy)) ||
            config.overrides.some(
              (o) =>
                was(o.policy) &&
                !prior.overrides.some(
                  (p) => same(p.scope, o.scope) && was(p.policy),
                ),
            )
          )
            return failure("unauthorized");
        }
        for (const old of prior.parameters) {
          if (
            s.behavior?.values.some((v) => v.parameterId === old.parameterId) ||
            s.behavior?.history.some((v) => v.parameterId === old.parameterId)
          ) {
            const next = config.parameters.find(
              (p) => p.parameterId === old.parameterId,
            );
            if (!next || next.kind !== old.kind || next.scope !== old.scope)
              return failure("invalid");
          }
        }
        for (const v of s.behavior?.values ?? []) {
          const d = config.parameters.find(
            (p) => p.parameterId === v.parameterId,
          );
          if (d && (v.value < d.min || v.value > d.max))
            return failure("invalid");
        }
        const b = requireState(s, true);
        b.config = structuredClone(config);
        return config;
      });
    },
    adminInspect(a: SessionAccess, sessionId: string, npcId: string) {
      if (!operator.canEditConfig) return failure("unauthorized");
      return run(a, (s) => {
        const session = s.sessions.find((x) => x.sessionId === sessionId);
        if (!session) return failure("unauthorized");
        return inspect(s, { ...a, hostId: session.hostId }, sessionId, npcId);
      });
    },
    inspect(a: SessionAccess, sessionId: string, npcId: string) {
      return run(a, (s) => inspect(s, a, sessionId, npcId));
    },
    observe(
      a: SessionAccess,
      sessionId: string,
      npcId: string,
      eventId: string,
      kind: BehaviorEventKind,
    ) {
      return run(a, (s) => {
        sessionFor(s, a, sessionId, npcId);
        if (!["provocation", "helpful", "observation"].includes(kind))
          return failure("invalid");
        const e = s.events.find(
          (e) => e.eventId === eventId && e.sessionId === sessionId,
        );
        if (
          !e ||
          ![e.senderId, ...e.recipientIds, ...e.observerIds].includes(npcId)
        )
          return failure("unauthorized");
        const b = requireState(s, true),
          prior = b.observations.find(
            (o) => o.eventId === eventId && o.npcId === npcId,
          );
        if (prior) {
          if (prior.kind !== kind) return failure("conflict");
          return { observation: prior, fresh: false };
        }
        if (b.observations.length >= limits.observations)
          return failure("limit");
        const effective = effectiveBehavior(s, a, npcId, sessionId, operator)
          .policy[kind === "provocation" ? "provocation" : "general"];
        const observation = {
          eventId,
          npcId,
          kind,
          configRevision: b.config.revision,
          permissions: effective,
        };
        b.observations.push(observation);
        return { observation, fresh: true };
      });
    },
    apply(a: SessionAccess, proposal: BehaviorProposal, nowMs: number) {
      return run(a, (s) => {
        if (
          !keys(proposal, [
            "proposalId",
            "npcId",
            "sessionId",
            "configRevision",
            "expectedStateRevision",
            "changes",
          ]) ||
          !id(proposal.proposalId) ||
          !finite(nowMs) ||
          nowMs < 0 ||
          !Array.isArray(proposal.changes) ||
          !proposal.changes.length ||
          proposal.changes.length > limits.changesPerProposal
        )
          return failure("invalid");
        const session = sessionFor(s, a, proposal.sessionId, proposal.npcId),
          b = requireState(s, true);
        const prior = b.proposals.find(
          (p) => p.proposal.proposalId === proposal.proposalId,
        );
        if (prior) {
          if (!same(prior.proposal, proposal)) return failure("conflict");
          return inspect(s, a, proposal.sessionId, proposal.npcId);
        }
        if (
          b.config.revision !== proposal.configRevision ||
          revision(b, proposal.npcId) !== proposal.expectedStateRevision
        )
          return failure("stale");
        if (
          b.proposals.length >= limits.proposals ||
          b.history.length + proposal.changes.length > limits.history
        )
          return failure("limit");
        const nextRevision = proposal.expectedStateRevision + 1,
          changedKeys = new Set<string>();
        for (const change of proposal.changes) {
          if (
            !keys(change, [
              "parameterId",
              "targetParticipantId",
              "delta",
              "confidence",
              "evidenceEventIds",
              "reason",
            ]) ||
            !id(change.parameterId) ||
            !finite(change.delta) ||
            !finite(change.confidence) ||
            change.confidence < 0 ||
            change.confidence > 1 ||
            !unique(change.evidenceEventIds, limits.evidencePerChange) ||
            !change.evidenceEventIds.length ||
            typeof change.reason !== "string" ||
            !change.reason.length ||
            change.reason.length > 512
          )
            return failure("invalid");
          const d = b.config.parameters.find(
            (p) => p.parameterId === change.parameterId,
          );
          if (!d || d.kind === "trait" || Math.abs(change.delta) > d.maxDelta)
            return failure("invalid");
          if (
            (d.kind === "relationship" &&
              (!id(change.targetParticipantId) ||
                change.targetParticipantId === proposal.npcId ||
                !s.participants.some(
                  (p) => p.participantId === change.targetParticipantId,
                ))) ||
            (d.kind !== "relationship" &&
              change.targetParticipantId !== undefined)
          )
            return failure("unauthorized");
          for (const eventId of change.evidenceEventIds) {
            const e = s.events.find((e) => e.eventId === eventId),
              sourceSession =
                e && s.sessions.find((x) => x.sessionId === e.sessionId),
              observed = b.observations.find(
                (o) => o.eventId === eventId && o.npcId === proposal.npcId,
              );
            if (
              !e ||
              !sourceSession ||
              sourceSession.hostId !== a.hostId ||
              !session.recallWorldIds.includes(sourceSession.worldId) ||
              (d.scope === "world" &&
                sourceSession.worldId !== session.worldId) ||
              !observed?.permissions.observe ||
              ![e.senderId, ...e.recipientIds, ...e.observerIds].includes(
                proposal.npcId,
              )
            )
              return failure("unauthorized");
            const current = behaviorPermissions(
              s,
              a,
              proposal.npcId,
              proposal.sessionId,
              eventId,
              operator,
            );
            if (
              !current.observe ||
              (d.kind === "relationship" &&
                (!current.updateRelationship ||
                  !observed.permissions.updateRelationship))
            )
              return failure("unauthorized");
            if (
              d.kind === "relationship" &&
              !(
                e.senderId === change.targetParticipantId ||
                (e.senderId === proposal.npcId &&
                  e.recipientIds.includes(change.targetParticipantId!))
              )
            )
              return failure("unauthorized");
          }
          const keyData = {
              npcId: proposal.npcId,
              parameterId: d.parameterId,
              ...(change.targetParticipantId
                ? { targetParticipantId: change.targetParticipantId }
                : {}),
              ...(d.scope === "world" ? { worldId: session.worldId } : {}),
            },
            key = valueKey(keyData);
          if (
            changedKeys.has(key) ||
            b.history.some(
              (h) =>
                valueKey(h) === key &&
                h.evidenceEventIds.some((e) =>
                  change.evidenceEventIds.includes(e),
                ),
            )
          )
            return failure("conflict");
          changedKeys.add(key);
          const initialValues = effectiveBehavior(
            s,
            a,
            proposal.npcId,
            proposal.sessionId,
            operator,
          ).initialValues;
          const old = b.values.find((v) => valueKey(v) === key),
            initial = Object.hasOwn(initialValues, d.parameterId)
              ? initialValues[d.parameterId]
              : d.initial,
            before = old?.value ?? initial,
            after = Number((before + change.delta).toFixed(6));
          if (after < d.min || after > d.max || (old && nowMs < old.updatedAt))
            return failure("invalid");
          const value = {
            ...keyData,
            value: after,
            confidence: change.confidence,
            revision: nextRevision,
            updatedAt: nowMs,
          };
          if (old) b.values[b.values.indexOf(old)] = value;
          else {
            if (b.values.length >= limits.values) return failure("limit");
            b.values.push(value);
          }
          b.history.push({
            ...keyData,
            changeId: `${proposal.proposalId}:${d.parameterId}`,
            before,
            after,
            confidence: change.confidence,
            revision: nextRevision,
            configRevision: b.config.revision,
            evidenceEventIds: [...change.evidenceEventIds],
            reason: change.reason,
            kind: "evidence",
            recordedAt: nowMs,
          });
        }
        b.stateRevisions[proposal.npcId] = nextRevision;
        b.proposals.push({
          proposal: structuredClone(proposal),
          revision: nextRevision,
        });
        return inspect(s, a, proposal.sessionId, proposal.npcId);
      });
    },
    decay(a: SessionAccess, sessionId: string, npcId: string, nowMs: number) {
      return run(a, (s) => {
        const session = sessionFor(s, a, sessionId, npcId),
          b = requireState(s, true);
        if (!finite(nowMs) || nowMs < 0) return failure("invalid");
        let changed = false;
        const nextRevision = revision(b, npcId) + 1;
        for (const v of b.values.filter(
          (v) =>
            v.npcId === npcId && (!v.worldId || v.worldId === session.worldId),
        )) {
          const d = b.config.parameters.find(
            (p) => p.parameterId === v.parameterId,
          );
          if (!d?.decay || d.kind === "trait") continue;
          if (nowMs < v.updatedAt) return failure("stale");
          const step = Math.min(
            d.maxDelta,
            (d.decay.perHour * (nowMs - v.updatedAt)) / 3600000,
            Math.abs(d.decay.toward - v.value),
          );
          if (step <= 0) continue;
          if (b.history.length >= limits.history) return failure("limit");
          const before = v.value,
            after = Number(
              (before + Math.sign(d.decay.toward - before) * step).toFixed(6),
            );
          if (after === before) continue;
          v.value = after;
          v.revision = nextRevision;
          v.updatedAt = nowMs;
          b.history.push({
            ...v,
            changeId: `decay:${npcId}:${b.history.length + 1}`,
            before,
            after,
            configRevision: b.config.revision,
            evidenceEventIds: [],
            reason: "Configured explicit-time decay",
            kind: "decay",
            recordedAt: nowMs,
          });
          changed = true;
        }
        if (changed) b.stateRevisions[npcId] = nextRevision;
        return inspect(s, a, sessionId, npcId);
      });
    },
  };
}
