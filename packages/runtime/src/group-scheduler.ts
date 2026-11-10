import {
  behaviorPermissions,
  behaviorRevision,
  behaviorEvidenceVisible,
  effectiveBehavior,
} from "./behavior.js";
import type {
  BehaviorOperatorPolicy,
  BehaviorPermissions,
  BehaviorGoal,
  BehaviorPermission,
} from "./behavior-types.js";
import {
  resolveResourceLimits,
  BUFFERED_JSON_MAX_BYTES,
} from "../../protocol/src/resource-policy.js";
import { SessionError } from "./participants.js";
import type {
  AddressedEvent,
  ParticipantSession,
  ParticipantState,
  ParticipantStore,
  SessionAccess,
} from "./participants.js";

export interface PlanningActor {
  participantId: string;
  roleId: string;
  capabilities: string[];
}
export interface PlanningIntent {
  intentId: string;
  roleIds: string[];
  requiredCapabilities: string[];
}
export interface GroupPlanningSpec {
  sessionId: string;
  sessionRevision: number;
  groupId?: string;
  actors: PlanningActor[];
  intents: PlanningIntent[];
  objective: string;
  channelId: string;
  sharedEventIds: string[];
  goalId?: string;
}
export interface GroupAssignment {
  assignmentId: string;
  actorId: string;
  intentId: string;
  dependsOn: string[];
}
/** Proposal only. No speech, mechanics or successful effects may be returned here. */
export interface GroupPlan {
  objective: string;
  assignments: GroupAssignment[];
}
export interface PlanningClock {
  wallTimeMs: number;
  worldTicks: Record<string, number>;
}
export interface PlanSchedule {
  scheduleId: string;
  revision: number;
  state: "running" | "paused" | "cancelled";
  spec: GroupPlanningSpec;
  clock: "wall" | "world";
  interval: number;
  nextDue: number;
  maxRuns: number;
}
export type PlanningTrigger =
  | { kind: "due" }
  | { kind: "manual"; triggerId: string }
  | { kind: "event"; eventId: string };
export interface PlanningClaim {
  claimId: string;
  fence: number;
  behaviorRevision?: number;
  workerId: string;
  scheduleId: string;
  scheduleRevision: number;
  sessionRevision: number;
  leaseUntil: number;
  triggerKey: string;
  actorIds: string[];
  groupKey: string;
  status:
    "active" | "proposed" | "unknown" | "resolved" | "failed" | "superseded";
  plan?: GroupPlan;
  adoptedIds?: string[];
}
export interface PlanningInput {
  claim: PlanningClaim;
  spec: GroupPlanningSpec;
  sharedEvents: AddressedEvent[];
  behavior?: {
    configRevision: number;
    policy: BehaviorPermissions;
    goals: BehaviorGoal[];
  };
}
export interface PlanHostReport {
  reportId: string;
  claimId: string;
  status: "adopted" | "rejected" | "completed" | "failed" | "unknown";
  assignmentIds: string[];
  summary: string;
}
export interface PlanningState {
  format: "ifsoul-group-scheduler/0.4.0";
  schedules: PlanSchedule[];
  claims: PlanningClaim[];
  reports: PlanHostReport[];
  cursors: {
    scheduleId: string;
    lastClock?: number;
    lastStarted?: number;
    runs: number;
    triggerKeys: string[];
  }[];
  lastWallTime: number;
  calls: number;
  npcCalls: Record<string, number>;
  groupCalls: Record<string, number>;
}
export interface PlanningBudgets {
  principalCalls: number;
  npcCalls: number;
  groupCalls: number;
  concurrentPlans: number;
  schedules: number;
  claims: number;
  reports: number;
  runsPerSchedule: number;
  actorsPerPlan: number;
  assignmentsPerPlan: number;
  assignmentsPerActor: number;
  sharedEvents: number;
  contextBytes: number;
}
export const DEFAULT_PLANNING_LIMITS: Readonly<PlanningBudgets> = Object.freeze(
  {
    principalCalls: 64,
    npcCalls: 32,
    groupCalls: 32,
    concurrentPlans: 1,
    schedules: 32,
    claims: 256,
    reports: 1024,
    runsPerSchedule: 32,
    actorsPerPlan: 8,
    assignmentsPerPlan: 16,
    assignmentsPerActor: 4,
    sharedEvents: 32,
    contextBytes: 32768,
  },
);
export function resolvePlanningLimits(
  requested: Partial<PlanningBudgets> = {},
  ceilings: Partial<PlanningBudgets> = {},
) {
  return resolveResourceLimits({
    layer: "group-scheduler",
    defaults: { ...DEFAULT_PLANNING_LIMITS },
    legacyCeilings: { ...DEFAULT_PLANNING_LIMITS },
    requested,
    ceilings,
    implementationCeilings: {
      actorsPerPlan: 64,
      assignmentsPerPlan: 1024,
      contextBytes: BUFFERED_JSON_MAX_BYTES,
    },
  });
}
const fail = (code: SessionError["code"]): never => {
  throw new SessionError(code);
};
const id = (x: unknown): x is string =>
  typeof x === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(x);
const ids = (x: unknown, maximum = 32): x is string[] =>
  Array.isArray(x) &&
  x.length <= maximum &&
  x.every(id) &&
  new Set(x).size === x.length;
const integer = (x: unknown) => Number.isSafeInteger(x) && Number(x) >= 0;
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const keys = (x: object, allowed: string[]) =>
  Object.keys(x).every((k) => allowed.includes(k));
const initial = (): PlanningState => ({
  format: "ifsoul-group-scheduler/0.4.0",
  schedules: [],
  claims: [],
  reports: [],
  cursors: [],
  lastWallTime: 0,
  calls: 0,
  npcCalls: {},
  groupCalls: {},
});
const count = (values: Record<string, number>, key: string): number =>
  Object.hasOwn(values, key) ? values[key] : 0;
const open = (c: PlanningClaim) =>
  ["active", "proposed", "unknown"].includes(c.status);
function authorizedSession(
  s: ParticipantState,
  access: SessionAccess,
  sessionId: string,
  revision?: number,
): ParticipantSession {
  if (!access || !id(access.principalId) || !id(access.hostId))
    return fail("unauthorized");
  const session = s.sessions.find(
    (x) => x.sessionId === sessionId && x.hostId === access.hostId,
  );
  if (!session) return fail("unauthorized");
  if (revision !== undefined && session.revision !== revision)
    return fail("stale");
  return session;
}
function validateSpec(
  s: ParticipantState,
  access: SessionAccess,
  spec: GroupPlanningSpec,
  limits: PlanningBudgets,
  operator?: BehaviorOperatorPolicy,
) {
  if (
    !spec ||
    !keys(spec, [
      "sessionId",
      "sessionRevision",
      "groupId",
      "actors",
      "intents",
      "objective",
      "channelId",
      "sharedEventIds",
      "goalId",
    ]) ||
    !id(spec.sessionId) ||
    !integer(spec.sessionRevision) ||
    typeof spec.objective !== "string" ||
    spec.objective.length < 1 ||
    spec.objective.length > 512 ||
    !id(spec.channelId) ||
    (spec.goalId !== undefined && !id(spec.goalId)) ||
    !ids(spec.sharedEventIds, limits.sharedEvents) ||
    !Array.isArray(spec.actors) ||
    spec.actors.length < 1 ||
    spec.actors.length > limits.actorsPerPlan ||
    !ids(
      spec.actors.map((x) => x?.participantId),
      limits.actorsPerPlan,
    ) ||
    !Array.isArray(spec.intents) ||
    spec.intents.length < 1 ||
    spec.intents.length > 16 ||
    !ids(spec.intents.map((x) => x?.intentId))
  )
    return fail("invalid");
  const session = authorizedSession(
    s,
    access,
    spec.sessionId,
    spec.sessionRevision,
  );
  const actorIds = spec.actors.map((x) => x?.participantId);
  if (
    spec.goalId !== undefined &&
    actorIds.some(
      (npcId) =>
        !effectiveBehavior(
          s,
          access,
          npcId,
          spec.sessionId,
          operator,
        ).goals.some(
          (g) =>
            g.goalId === spec.goalId &&
            g.enabled &&
            g.objective === spec.objective,
        ),
    )
  )
    return fail("unauthorized");

  if (
    spec.actors.some(
      (x) =>
        !keys(x, ["participantId", "roleId", "capabilities"]) ||
        !id(x.roleId) ||
        !ids(x.capabilities) ||
        !session.members.some(
          (m) => m.participantId === x.participantId && m.role === "npc",
        ),
    )
  )
    return fail("unauthorized");
  if (
    spec.intents.some(
      (x) =>
        !keys(x, ["intentId", "roleIds", "requiredCapabilities"]) ||
        !ids(x.roleIds) ||
        !x.roleIds.length ||
        !ids(x.requiredCapabilities),
    )
  )
    return fail("invalid");
  if (spec.groupId !== undefined) {
    const group = session.groups.find((x) => x.groupId === spec.groupId);
    if (!group || actorIds.some((x) => !group.participantIds.includes(x)))
      return fail("unauthorized");
  } else if (actorIds.length !== 1) return fail("invalid");
  const channel = session.channels.find((x) => x.channelId === spec.channelId);
  if (!channel || actorIds.some((x) => !channel.participantIds.includes(x)))
    return fail("unauthorized");
  const sharedEvents = spec.sharedEventIds.map((eventId) => {
    const event = s.events.find(
      (x) =>
        x.eventId === eventId &&
        x.sessionId === session.sessionId &&
        x.channelId === spec.channelId,
    );
    if (
      !event ||
      (s.behavior &&
        actorIds.some(
          (npcId) =>
            !behaviorEvidenceVisible(s, access, npcId, spec.sessionId, eventId),
        )) ||
      actorIds.some(
        (x) =>
          ![
            event.senderId,
            ...event.recipientIds,
            ...event.observerIds,
          ].includes(x),
      )
    )
      return fail("unauthorized");
    return {
      eventId: event.eventId,
      sessionId: event.sessionId,
      revision: event.revision,
      channelId: event.channelId,
      senderId: event.senderId,
      recipientIds: [...event.recipientIds],
      observerIds: [...event.observerIds],
      text: event.text,
    };
  });
  if (
    new TextEncoder().encode(JSON.stringify({ spec, sharedEvents })).length >
    limits.contextBytes
  )
    return fail("limit");
  return {
    session,
    sharedEvents,
    actorIds,
    groupKey: JSON.stringify([
      session.sessionId,
      spec.groupId === undefined
        ? ["solo", actorIds[0]]
        : ["group", spec.groupId],
    ]),
  };
}
/** Reject the whole proposal. One invalid assignment never grants another action. */
export function validGroupPlan(
  value: unknown,
  spec: GroupPlanningSpec,
  limits: PlanningBudgets = { ...DEFAULT_PLANNING_LIMITS },
): value is GroupPlan {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const plan = value as GroupPlan;
  if (
    !keys(plan, ["objective", "assignments"]) ||
    plan.objective !== spec.objective ||
    !Array.isArray(plan.assignments) ||
    !plan.assignments.length ||
    plan.assignments.length > limits.assignmentsPerPlan ||
    !ids(
      plan.assignments.map((x) => x?.assignmentId),
      limits.assignmentsPerPlan,
    )
  )
    return false;
  if (
    spec.actors.some(
      (actor) =>
        !plan.assignments.some((a) => a.actorId === actor.participantId),
    )
  )
    return false;
  for (const a of plan.assignments) {
    if (
      !a ||
      !keys(a, ["assignmentId", "actorId", "intentId", "dependsOn"]) ||
      !ids(a.dependsOn, limits.assignmentsPerPlan) ||
      a.dependsOn.includes(a.assignmentId) ||
      a.dependsOn.some(
        (d) => !plan.assignments.some((x) => x.assignmentId === d),
      )
    )
      return false;
    const actor = spec.actors.find((x) => x.participantId === a.actorId);
    const intent = spec.intents.find((x) => x.intentId === a.intentId);
    if (
      !actor ||
      !intent ||
      !intent.roleIds.includes(actor.roleId) ||
      intent.requiredCapabilities.some(
        (c) => !actor.capabilities.includes(c),
      ) ||
      plan.assignments.filter((x) => x.actorId === a.actorId).length >
        limits.assignmentsPerActor
    )
      return false;
  }
  const visiting = new Set<string>(),
    done = new Set<string>();
  const visit = (assignmentId: string): boolean => {
    if (visiting.has(assignmentId)) return false;
    if (done.has(assignmentId)) return true;
    visiting.add(assignmentId);
    if (
      !plan.assignments
        .find((x) => x.assignmentId === assignmentId)!
        .dependsOn.every(visit)
    )
      return false;
    visiting.delete(assignmentId);
    done.add(assignmentId);
    return true;
  };
  return plan.assignments.every((x) => visit(x.assignmentId));
}
export function createGroupSchedulerRuntime(
  store: ParticipantStore,
  requestedBudgets: Partial<PlanningBudgets> = {},
  ceilings: Partial<PlanningBudgets> = {},
  behaviorOperator?: BehaviorOperatorPolicy,
) {
  behaviorOperator = behaviorOperator
    ? structuredClone(behaviorOperator)
    : undefined;
  const report = resolvePlanningLimits(requestedBudgets, ceilings);
  if (report.status !== "accepted")
    throw new RangeError(
      `Unsupported planning budget: ${report.failure?.field}`,
    );
  const budgets = report.effective;
  const run = <T>(
    access: SessionAccess,
    work: (s: ParticipantState, p: PlanningState) => T,
  ): T => {
    if (!access || !id(access.principalId) || !id(access.hostId))
      return fail("unauthorized");
    return store.transact(access.principalId, (s) => {
      if (
        !id(access.principalId) ||
        !id(access.hostId) ||
        s.format !== "ifsoul-participants/0.4.0"
      )
        return fail("unauthorized");
      if (!s.planning || s.planning.format !== "ifsoul-group-scheduler/0.4.0")
        return fail("invalid");
      return structuredClone(work(s, s.planning));
    });
  };
  const schedule = (
    s: ParticipantState,
    p: PlanningState,
    access: SessionAccess,
    scheduleId: string,
  ) => {
    const config = p.schedules.find((x) => x.scheduleId === scheduleId);
    if (!config) return fail("unauthorized");
    authorizedSession(s, access, config.spec.sessionId);
    return config;
  };
  const release = (s: ParticipantState, c: PlanningClaim) => {
    for (const t of s.turns)
      if (
        t.ticket.turnId === `${c.claimId}:${t.ticket.npcId}` &&
        c.actorIds.includes(t.ticket.npcId) &&
        t.ticket.eventId === c.claimId
      )
        t.cancelled = true;
  };
  const supersede = (
    s: ParticipantState,
    p: PlanningState,
    scheduleId: string,
  ) => {
    for (const c of p.claims.filter(
      (x) => x.scheduleId === scheduleId && open(x),
    )) {
      c.status =
        c.status === "unknown" || c.adoptedIds?.length
          ? "unknown"
          : "superseded";
      release(s, c);
    }
  };
  const clockValue = (
    config: PlanSchedule,
    session: ParticipantSession,
    clock: PlanningClock,
  ) => {
    const value =
      config.clock === "wall"
        ? clock.wallTimeMs
        : clock.worldTicks[session.worldId];
    if (!integer(clock.wallTimeMs) || !integer(value)) return fail("invalid");
    return value;
  };
  return {
    configure(
      access: SessionAccess,
      expectedRevision: number,
      config: PlanSchedule,
    ) {
      if (!access || !id(access.principalId) || !id(access.hostId))
        return fail("unauthorized");
      // New scheduling state is created only by this explicit trusted configuration operation.
      return store.transact(access.principalId, (s) => {
        if (
          !id(access.principalId) ||
          !id(access.hostId) ||
          s.format !== "ifsoul-participants/0.4.0"
        )
          return fail("unauthorized");
        if (
          !config ||
          !keys(config, [
            "scheduleId",
            "revision",
            "state",
            "spec",
            "clock",
            "interval",
            "nextDue",
            "maxRuns",
          ]) ||
          !id(config.scheduleId) ||
          !integer(expectedRevision) ||
          config.revision !== expectedRevision + 1 ||
          !["running", "paused", "cancelled"].includes(config.state) ||
          !["wall", "world"].includes(config.clock) ||
          !integer(config.interval) ||
          config.interval < 1 ||
          config.interval > 86400000 ||
          !integer(config.nextDue) ||
          !integer(config.maxRuns) ||
          config.maxRuns < 1 ||
          config.maxRuns > budgets.runsPerSchedule
        )
          return fail("invalid");
        validateSpec(s, access, config.spec, budgets, behaviorOperator);
        const p = s.planning ?? initial();
        if (p.format !== "ifsoul-group-scheduler/0.4.0") return fail("invalid");
        const old = p.schedules.find((x) => x.scheduleId === config.scheduleId);
        if (old) {
          authorizedSession(s, access, old.spec.sessionId);
          if (
            old.spec.sessionId !== config.spec.sessionId ||
            old.clock !== config.clock ||
            old.state === "cancelled"
          )
            return fail("conflict");
        }
        if ((old?.revision ?? 0) !== expectedRevision) return fail("stale");
        if (!old && p.schedules.length >= budgets.schedules)
          return fail("limit");
        supersede(s, p, config.scheduleId);
        if (old)
          p.schedules[p.schedules.indexOf(old)] = structuredClone(config);
        else {
          p.schedules.push(structuredClone(config));
          p.cursors.push({
            scheduleId: config.scheduleId,
            runs: 0,
            triggerKeys: [],
          });
        }
        s.planning = p;
        return structuredClone(config);
      });
    },
    control(
      access: SessionAccess,
      scheduleId: string,
      expectedRevision: number,
      action: "pause" | "resume" | "cancel",
    ) {
      return run(access, (s, p) => {
        const config = schedule(s, p, access, scheduleId);
        if (config.revision !== expectedRevision) return fail("stale");
        if (
          config.state === "cancelled" ||
          !["pause", "resume", "cancel"].includes(action)
        )
          return fail("conflict");
        supersede(s, p, scheduleId);
        config.revision++;
        config.state =
          action === "pause"
            ? "paused"
            : action === "resume"
              ? "running"
              : "cancelled";
        return config;
      });
    },
    list(access: SessionAccess) {
      if (!access || !id(access.principalId) || !id(access.hostId))
        return fail("unauthorized");
      return store.transact(access.principalId, (s) => {
        if (!id(access.principalId) || !id(access.hostId))
          return fail("unauthorized");
        if (s.format !== "ifsoul-participants/0.4.0") return fail("invalid");
        if (!s.planning) return [] as PlanSchedule[];
        if (s.planning.format !== "ifsoul-group-scheduler/0.4.0")
          return fail("invalid");
        return structuredClone(
          s.planning.schedules.filter((x) =>
            s.sessions.some(
              (session) =>
                session.sessionId === x.spec.sessionId &&
                session.hostId === access.hostId,
            ),
          ),
        );
      });
    },
    claim(
      access: SessionAccess,
      scheduleId: string,
      trigger: PlanningTrigger,
      clock: PlanningClock,
      workerId: string,
      leaseMs: number,
      hostAvailable: boolean,
    ):
      | PlanningInput
      | {
          status:
            | "not-due"
            | "paused"
            | "host-unavailable"
            | "busy"
            | "budget"
            | "replay"
            | "unknown"
            | "policy-denied";
        } {
      return run(access, (s, p) => {
        const config = schedule(s, p, access, scheduleId);
        const { session, sharedEvents, actorIds, groupKey } = validateSpec(
          s,
          access,
          config.spec,
          budgets,
          behaviorOperator,
        );
        if (
          !id(workerId) ||
          !integer(leaseMs) ||
          leaseMs < 1 ||
          leaseMs > 60000 ||
          !trigger ||
          !["due", "manual", "event"].includes(trigger.kind)
        )
          return fail("invalid");
        const now = clockValue(config, session, clock);
        if (clock.wallTimeMs < p.lastWallTime) return fail("stale");
        p.lastWallTime = clock.wallTimeMs;
        for (const expired of p.claims.filter(
          (c) => c.status === "active" && c.leaseUntil <= clock.wallTimeMs,
        )) {
          expired.status = "unknown";
          release(s, expired);
        }
        if (config.state !== "running") return { status: "paused" as const };
        if (!hostAvailable) return { status: "host-unavailable" as const };
        if (
          actorIds.some((npcId) => {
            const p = behaviorPermissions(
              s,
              access,
              npcId,
              config.spec.sessionId,
              trigger.kind === "event" ? trigger.eventId : undefined,
              behaviorOperator,
            );
            return !p.observe || !p.requestAction;
          })
        )
          return { status: "policy-denied" as const };

        const cursor = p.cursors.find((x) => x.scheduleId === scheduleId)!;
        if (cursor.lastClock !== undefined && now < cursor.lastClock)
          return fail("stale");
        cursor.lastClock = now;
        let triggerKey: string;
        if (trigger.kind === "due") {
          if (now < config.nextDue) return { status: "not-due" as const };
          triggerKey = `due:${config.nextDue}`;
        } else if (trigger.kind === "manual") {
          if (!id(trigger.triggerId)) return fail("invalid");
          triggerKey = `manual:${trigger.triggerId}`;
        } else {
          if (
            !id(trigger.eventId) ||
            !config.spec.sharedEventIds.includes(trigger.eventId)
          )
            return fail("unauthorized");
          triggerKey = `event:${trigger.eventId}`;
        }
        if (cursor.triggerKeys.includes(triggerKey))
          return { status: "replay" as const };
        if (
          p.claims.some(
            (c) =>
              c.status === "unknown" &&
              (c.groupKey === groupKey ||
                c.actorIds.some((id) => actorIds.includes(id))),
          )
        )
          return { status: "unknown" as const };
        // Trusted principal concurrency is bounded independently of per-group and per-NPC ownership.
        if (
          p.claims.filter(open).length >= budgets.concurrentPlans ||
          p.claims.some(
            (c) =>
              open(c) &&
              (c.groupKey === groupKey ||
                c.actorIds.some((id) => actorIds.includes(id))),
          ) ||
          s.turns.some(
            (t) =>
              actorIds.includes(t.ticket.npcId) &&
              !t.output &&
              !t.cancelled &&
              s.sessions.some(
                (x) =>
                  x.sessionId === t.ticket.sessionId &&
                  x.revision === t.ticket.revision,
              ),
          )
        )
          return { status: "busy" as const };
        if (
          cursor.lastStarted !== undefined &&
          now < cursor.lastStarted + config.interval
        )
          return { status: "not-due" as const };
        if (
          p.calls >= budgets.principalCalls ||
          cursor.runs >= config.maxRuns ||
          actorIds.some((x) => count(p.npcCalls, x) >= budgets.npcCalls) ||
          count(p.groupCalls, groupKey) >= budgets.groupCalls ||
          p.claims.length >= budgets.claims ||
          s.turns.length + actorIds.length > 2048
        )
          return { status: "budget" as const };
        if (
          !integer(now + config.interval) ||
          !integer(clock.wallTimeMs + leaseMs)
        )
          return fail("invalid");
        const fence = p.claims.length + 1,
          claimId = `plan-${fence}`;
        if (
          actorIds.some((x) =>
            s.turns.some((t) => t.ticket.turnId === `${claimId}:${x}`),
          )
        )
          return fail("conflict");
        const claim: PlanningClaim = {
          claimId,
          fence,
          behaviorRevision: behaviorRevision(s),
          workerId,
          scheduleId,
          scheduleRevision: config.revision,
          sessionRevision: session.revision,
          leaseUntil: clock.wallTimeMs + leaseMs,
          triggerKey,
          actorIds,
          groupKey,
          status: "active",
        };
        p.claims.push(claim);
        p.calls++;
        cursor.runs++;
        cursor.lastStarted = now;
        cursor.triggerKeys.push(triggerKey);
        // Coalesce missed slots into one current planning request, never offline actions.
        config.nextDue = now + config.interval;
        p.groupCalls[groupKey] = count(p.groupCalls, groupKey) + 1;
        for (const npcId of actorIds) {
          p.npcCalls[npcId] = count(p.npcCalls, npcId) + 1;
          s.turns.push({
            ticket: {
              turnId: `${claimId}:${npcId}`,
              eventId: claimId,
              sessionId: session.sessionId,
              revision: session.revision,
              npcId,
              recipientIds: [],
              observerIds: [],
            },
          });
        }
        const views = actorIds.map((npcId) =>
          effectiveBehavior(
            s,
            access,
            npcId,
            config.spec.sessionId,
            behaviorOperator,
          ),
        );
        const policies = actorIds.map((npcId) =>
          behaviorPermissions(
            s,
            access,
            npcId,
            config.spec.sessionId,
            trigger.kind === "event" ? trigger.eventId : undefined,
            behaviorOperator,
          ),
        );
        const sharedPolicy = Object.fromEntries(
          Object.keys(policies[0]).map((flag) => [
            flag,
            policies.every((p) => p[flag as BehaviorPermission]),
          ]),
        ) as BehaviorPermissions;
        const commonGoals = views[0].goals.filter(
          (goal) =>
            goal.enabled &&
            views.every((view) =>
              view.goals.some(
                (other) =>
                  other.goalId === goal.goalId &&
                  other.objective === goal.objective &&
                  other.enabled,
              ),
            ),
        );
        return {
          claim,
          spec: config.spec,
          sharedEvents,
          ...(s.behavior
            ? {
                behavior: {
                  configRevision: behaviorRevision(s),
                  policy: sharedPolicy,
                  goals: commonGoals,
                },
              }
            : {}),
        };
      });
    },
    complete(
      access: SessionAccess,
      ticket: PlanningClaim,
      output: unknown,
      clock: PlanningClock,
    ) {
      return run(access, (s, p) => {
        const c = p.claims.find((x) => x.claimId === ticket.claimId);
        if (
          !c ||
          c.fence !== ticket.fence ||
          c.workerId !== ticket.workerId ||
          c.status !== "active"
        )
          return fail("stale");
        const config = schedule(s, p, access, c.scheduleId);
        if ((c.behaviorRevision ?? 0) !== behaviorRevision(s))
          return fail("stale");
        authorizedSession(s, access, config.spec.sessionId, c.sessionRevision);
        if (
          config.revision !== c.scheduleRevision ||
          config.state !== "running" ||
          !integer(clock.wallTimeMs) ||
          clock.wallTimeMs < p.lastWallTime ||
          clock.wallTimeMs >= c.leaseUntil
        )
          return fail("stale");
        validateSpec(s, access, config.spec, budgets, behaviorOperator);
        if (!validGroupPlan(output, config.spec, budgets))
          return fail("invalid");
        c.plan = structuredClone(output);
        c.status = "proposed";
        release(s, c);
        return c;
      });
    },
    fail(access: SessionAccess, ticket: PlanningClaim, uncertain: boolean) {
      return run(access, (s, p) => {
        const c = p.claims.find((x) => x.claimId === ticket.claimId);
        if (
          !c ||
          c.fence !== ticket.fence ||
          c.workerId !== ticket.workerId ||
          c.status !== "active"
        )
          return fail("stale");
        schedule(s, p, access, c.scheduleId);
        c.status = uncertain ? "unknown" : "failed";
        release(s, c);
        return c;
      });
    },
    report(access: SessionAccess, report: PlanHostReport) {
      return run(access, (s, p) => {
        if (
          !report ||
          !keys(report, [
            "reportId",
            "claimId",
            "status",
            "assignmentIds",
            "summary",
          ]) ||
          !id(report.reportId) ||
          !ids(report.assignmentIds, budgets.assignmentsPerPlan) ||
          typeof report.summary !== "string" ||
          report.summary.length < 1 ||
          report.summary.length > 1024 ||
          !["adopted", "rejected", "completed", "failed", "unknown"].includes(
            report.status,
          )
        )
          return fail("invalid");
        const c = p.claims.find((x) => x.claimId === report.claimId);
        if (!c) return fail("unauthorized");
        const config = schedule(s, p, access, c.scheduleId);
        const prior = p.reports.find((x) => x.reportId === report.reportId);
        if (prior) {
          if (!equal(prior, report)) return fail("conflict");
          return c;
        }
        if (
          !c.plan ||
          report.assignmentIds.some(
            (x) => !c.plan!.assignments.some((a) => a.assignmentId === x),
          ) ||
          p.reports.length >= budgets.reports
        )
          return fail("invalid");
        if (report.status === "adopted") {
          if ((c.behaviorRevision ?? 0) !== behaviorRevision(s))
            return fail("stale");
          authorizedSession(
            s,
            access,
            config.spec.sessionId,
            c.sessionRevision,
          );
          if (
            config.revision !== c.scheduleRevision ||
            config.state !== "running" ||
            c.status !== "proposed" ||
            c.adoptedIds ||
            !report.assignmentIds.length
          )
            return fail("stale");
          if (
            report.assignmentIds.some((assignmentId) =>
              c
                .plan!.assignments.find((a) => a.assignmentId === assignmentId)!
                .dependsOn.some(
                  (dependency) => !report.assignmentIds.includes(dependency),
                ),
            )
          )
            return fail("invalid");
          c.adoptedIds = [...report.assignmentIds];
        } else if (report.status === "rejected") {
          if (
            report.assignmentIds.length !== 0 ||
            c.adoptedIds?.length ||
            !["proposed", "unknown", "superseded"].includes(c.status)
          )
            return fail("conflict");
          c.status = "resolved";
        } else if (
          report.status === "completed" ||
          report.status === "failed"
        ) {
          if (
            !c.adoptedIds?.length ||
            !equal(
              [...report.assignmentIds].sort(),
              [...c.adoptedIds].sort(),
            ) ||
            c.status === "resolved"
          )
            return fail("conflict");
          c.status = "resolved";
        } else {
          if (!c.adoptedIds?.length || c.status === "resolved")
            return fail("conflict");
          c.status = "unknown";
        }
        p.reports.push(structuredClone(report));
        return c;
      });
    },
    reconcile(access: SessionAccess, claimId: string) {
      return run(access, (s, p) => {
        const c = p.claims.find((x) => x.claimId === claimId);
        if (!c) return fail("unauthorized");
        schedule(s, p, access, c.scheduleId);
        // Only an uncertain model request with no host adoption may be acknowledged here.
        // Adopted work requires correlated host outcome reports instead.
        if (c.status !== "unknown" || c.adoptedIds?.length)
          return fail("conflict");
        c.status = "resolved";
        release(s, c);
        return c;
      });
    },
    inspect(access: SessionAccess, scheduleId: string) {
      return run(access, (s, p) => {
        const config = schedule(s, p, access, scheduleId);
        return {
          config,
          cursor: p.cursors.find((x) => x.scheduleId === scheduleId)!,
          claims: p.claims.filter((x) => x.scheduleId === scheduleId),
          reports: p.reports.filter((r) =>
            p.claims.some(
              (c) => c.claimId === r.claimId && c.scheduleId === scheduleId,
            ),
          ),
          calls: p.calls,
        };
      });
    },
  };
}
