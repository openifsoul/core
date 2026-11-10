import {
  behaviorPermissions,
  behaviorRevision,
  behaviorEvidenceVisible,
} from "./behavior.js";
import type { BehaviorOperatorPolicy } from "./behavior-types.js";
import type { BehaviorState } from "./behavior-types.js";
import type { PlanningState } from "./group-scheduler.js";
/** Trusted session domain. Roots authenticate callers before constructing this access. */
export interface SessionAccess {
  principalId: string;
  hostId: string;
}
export interface SessionParticipant {
  participantId: string;
  kind: "npc" | "player";
  /** Trusted host subject, never a display name or imported character identifier. */
  subjectId: string;
}
export interface SessionMember {
  participantId: string;
  role: "npc" | "player";
  embodimentId?: string;
}
export interface ParticipantSession {
  sessionId: string;
  revision: number;
  hostId: string;
  worldId: string;
  recallWorldIds: string[];
  members: SessionMember[];
  groups: { groupId: string; participantIds: string[] }[];
  channels: { channelId: string; participantIds: string[] }[];
}
export interface AddressedEvent {
  eventId: string;
  sessionId: string;
  revision: number;
  channelId: string;
  senderId: string;
  recipientIds: string[];
  observerIds: string[];
  text: string;
}
export interface SessionTurn {
  turnId: string;
  sessionId: string;
  revision: number;
  npcId: string;
  eventId: string;
  recipientIds: string[];
  observerIds: string[];
}
export interface ParticipantState {
  format: "ifsoul-participants/0.4.0";
  planning?: PlanningState;
  behavior?: BehaviorState;
  participants: SessionParticipant[];
  sessions: ParticipantSession[];
  events: AddressedEvent[];
  transitions: { transitionId: string; session: ParticipantSession }[];
  turns: {
    ticket: SessionTurn;
    output?: AddressedEvent;
    cancelled?: boolean;
    behaviorRevision?: number;
  }[];
}
/** Must atomically commit the draft only when work succeeds; namespace by verified principal. */
export interface ParticipantStore {
  transact<T>(principalId: string, work: (state: ParticipantState) => T): T;
}
export const emptyParticipantState = (): ParticipantState => ({
  format: "ifsoul-participants/0.4.0",
  participants: [],
  sessions: [],
  events: [],
  transitions: [],
  turns: [],
});
export class SessionError extends Error {
  constructor(
    readonly code:
      "unauthorized" | "invalid" | "stale" | "conflict" | "busy" | "limit",
  ) {
    super(`Session operation rejected: ${code}`);
  }
}
const fail = (code: SessionError["code"]): never => {
  throw new SessionError(code);
};
const id = (x: unknown): x is string =>
  typeof x === "string" && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(x);
const ids = (x: unknown): x is string[] =>
  Array.isArray(x) &&
  x.length <= 64 &&
  x.every(id) &&
  new Set(x).size === x.length;
const equal = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);
const audience = (e: AddressedEvent) => [
  e.senderId,
  ...e.recipientIds,
  ...e.observerIds,
];
/** No account system, model, transport or host mechanics are constructed here. */
export function createParticipantRuntime(
  store: ParticipantStore,
  options: { behaviorOperator?: BehaviorOperatorPolicy } = {},
) {
  const behaviorOperator = options.behaviorOperator
    ? structuredClone(options.behaviorOperator)
    : undefined;
  const run = <T>(
    access: SessionAccess,
    work: (state: ParticipantState) => T,
  ): T => {
    if (!access || !id(access.principalId) || !id(access.hostId))
      fail("unauthorized");
    return store.transact(access.principalId, (state) => {
      if (state.format !== "ifsoul-participants/0.4.0") fail("invalid");
      return structuredClone(work(state));
    });
  };
  const session = (
    s: ParticipantState,
    a: SessionAccess,
    sessionId: string,
    revision?: number,
  ) => {
    const found = s.sessions.find((x) => x.sessionId === sessionId);
    if (!found || found.hostId !== a.hostId) return fail("unauthorized");
    if (revision !== undefined && found.revision !== revision) fail("stale");
    return found;
  };
  const eventValid = (
    s: ParticipantState,
    a: SessionAccess,
    e: AddressedEvent,
  ) => {
    if (
      !e ||
      !id(e.eventId) ||
      !id(e.senderId) ||
      !id(e.channelId) ||
      !ids(e.recipientIds) ||
      !ids(e.observerIds) ||
      typeof e.text !== "string" ||
      !e.text.length ||
      e.text.length > 4096
    )
      fail("invalid");
    const current = session(s, a, e.sessionId, e.revision);
    const channel = current.channels.find((x) => x.channelId === e.channelId);
    if (
      !channel ||
      audience(e).some(
        (p) =>
          !channel.participantIds.includes(p) ||
          !current.members.some((m) => m.participantId === p),
      )
    )
      fail("unauthorized");
    return current;
  };
  return {
    /** Only trusted verified host mappings may call this; imported IDs never register themselves. */
    register(access: SessionAccess, participant: SessionParticipant) {
      return run(access, (s) => {
        if (
          !participant ||
          !id(participant.participantId) ||
          !id(participant.subjectId) ||
          !["npc", "player"].includes(participant.kind)
        )
          fail("invalid");
        const previous = s.participants.find(
          (p) =>
            p.participantId === participant.participantId ||
            (p.subjectId === participant.subjectId &&
              p.kind === participant.kind),
        );
        if (previous && !equal(previous, participant)) fail("conflict");
        if (!previous) {
          if (s.participants.length >= 256) fail("limit");
          s.participants.push(structuredClone(participant));
        }
        return participant;
      });
    },
    /** Full explicit replacement is a trusted transition, including leave/join/group/channel/host handoff. */
    transition(
      access: SessionAccess,
      transitionId: string,
      expectedRevision: number,
      next: ParticipantSession,
    ) {
      return run(access, (s) => {
        if (
          !id(transitionId) ||
          !next ||
          !id(next.sessionId) ||
          !id(next.hostId) ||
          !id(next.worldId) ||
          !ids(next.recallWorldIds) ||
          !next.recallWorldIds.includes(next.worldId) ||
          !Number.isSafeInteger(expectedRevision) ||
          expectedRevision < 0 ||
          next.revision !== expectedRevision + 1
        )
          fail("invalid");
        const old = s.sessions.find((x) => x.sessionId === next.sessionId);
        if (
          (old && old.hostId !== access.hostId) ||
          (!old && next.hostId !== access.hostId)
        )
          fail("unauthorized");
        const receipt = s.transitions.find(
          (x) => x.transitionId === transitionId,
        );
        if (receipt) {
          if (!equal(receipt.session, next)) fail("conflict");
          return receipt.session;
        }
        if ((old?.revision ?? 0) !== expectedRevision) fail("stale");
        if (old && old.worldId !== next.worldId) fail("conflict");
        if (
          !Array.isArray(next.members) ||
          next.members.length > 64 ||
          !ids(next.members.map((m) => m.participantId)) ||
          next.members.some(
            (m) =>
              !s.participants.some(
                (p) => p.participantId === m.participantId && p.kind === m.role,
              ) ||
              (m.embodimentId !== undefined && !id(m.embodimentId)),
          )
        )
          fail("invalid");
        for (const [list, key] of [
          [next.groups, "groupId"],
          [next.channels, "channelId"],
        ] as const) {
          if (
            !Array.isArray(list) ||
            list.length > 64 ||
            !ids(list.map((x) => (x as unknown as Record<string, string>)[key]))
          )
            fail("invalid");
          if (
            list.some(
              (x) =>
                !ids(x.participantIds) ||
                x.participantIds.some(
                  (p) => !next.members.some((m) => m.participantId === p),
                ),
            )
          )
            fail("unauthorized");
        }
        if (s.transitions.length >= 2048 || (!old && s.sessions.length >= 128))
          fail("limit");
        if (old) s.sessions[s.sessions.indexOf(old)] = structuredClone(next);
        else s.sessions.push(structuredClone(next));
        s.transitions.push({ transitionId, session: structuredClone(next) });
        return next;
      });
    },
    append(access: SessionAccess, event: AddressedEvent) {
      return run(access, (s) => {
        eventValid(s, access, event);
        const prior = s.events.find((e) => e.eventId === event.eventId);
        if (prior) {
          if (!equal(prior, event)) fail("conflict");
          return prior;
        }
        if (s.events.length >= 2048) fail("limit");
        s.events.push(structuredClone(event));
        return event;
      });
    },
    /** Owner-private history; never use a group log as a model context. */
    history(access: SessionAccess, sessionId: string, participantId: string) {
      return run(access, (s) => {
        const current = session(s, access, sessionId);
        if (!current.members.some((m) => m.participantId === participantId))
          fail("unauthorized");
        return s.events.filter(
          (e) =>
            e.sessionId === sessionId &&
            audience(e).includes(participantId) &&
            (current.members.find((m) => m.participantId === participantId)
              ?.role !== "npc" ||
              behaviorEvidenceVisible(
                s,
                access,
                participantId,
                sessionId,
                e.eventId,
              )),
        );
      });
    },
    /** Source-grounded relationship evidence, keyed by verified persistent player ID. */
    relationshipEvidence(
      access: SessionAccess,
      sessionId: string,
      npcId: string,
      playerId: string,
    ) {
      return run(access, (s) => {
        const current = session(s, access, sessionId);
        if (
          !current.members.some(
            (m) => m.participantId === npcId && m.role === "npc",
          ) ||
          !s.participants.some(
            (p) => p.participantId === playerId && p.kind === "player",
          )
        )
          return fail("unauthorized");
        return {
          npcId,
          playerId,
          events: s.events.filter(
            (e) =>
              audience(e).includes(npcId) &&
              audience(e).includes(playerId) &&
              s.sessions.some(
                (source) =>
                  source.sessionId === e.sessionId &&
                  source.hostId === access.hostId &&
                  current.recallWorldIds.includes(source.worldId),
              ),
          ),
        };
      });
    },
    begin(access: SessionAccess, ticket: SessionTurn) {
      return run(access, (s) => {
        if (
          !ticket ||
          !id(ticket.turnId) ||
          !id(ticket.npcId) ||
          !ids(ticket.recipientIds) ||
          !ids(ticket.observerIds)
        )
          fail("invalid");
        const current = session(s, access, ticket.sessionId, ticket.revision);
        if (
          !current.members.some(
            (m) => m.participantId === ticket.npcId && m.role === "npc",
          )
        )
          fail("unauthorized");
        const trigger = s.events.find(
          (e) =>
            e.eventId === ticket.eventId &&
            e.sessionId === ticket.sessionId &&
            e.revision === ticket.revision,
        );
        if (
          !trigger ||
          !audience(trigger).includes(ticket.npcId) ||
          [...ticket.recipientIds, ...ticket.observerIds].some(
            (p) => !audience(trigger).includes(p),
          )
        )
          return fail("unauthorized");
        const policy = behaviorPermissions(
          s,
          access,
          ticket.npcId,
          ticket.sessionId,
          ticket.eventId,
          behaviorOperator,
        );
        if (
          !policy.observe ||
          !policy.speak ||
          (s.behavior &&
            !s.behavior.observations.some(
              (o) =>
                o.npcId === ticket.npcId &&
                o.eventId === ticket.eventId &&
                o.permissions.observe,
            ))
        )
          return fail("unauthorized");
        const replay = s.turns.find((t) => t.ticket.turnId === ticket.turnId);
        if (replay) {
          if (!equal(replay.ticket, ticket) || !replay.output)
            return fail("conflict");
          return {
            ticket,
            trigger,
            memories: [] as AddressedEvent[],
            output: replay.output,
          };
        }
        if (
          s.turns.some(
            (t) =>
              t.ticket.npcId === ticket.npcId &&
              !t.output &&
              !t.cancelled &&
              s.sessions.some(
                (x) =>
                  x.sessionId === t.ticket.sessionId &&
                  x.revision === t.ticket.revision,
              ),
          )
        )
          fail("busy");
        if (s.turns.length >= 2048) fail("limit");
        s.turns.push({
          ticket: structuredClone(ticket),
          behaviorRevision: behaviorRevision(s),
        });
        // Recall is NPC-private, with stable player identity across worlds. Sharing is checked at completion.
        const memories = s.events
          .filter(
            (e) =>
              s.sessions.some(
                (source) =>
                  source.sessionId === e.sessionId &&
                  source.hostId === access.hostId &&
                  current.recallWorldIds.includes(source.worldId),
              ) &&
              behaviorEvidenceVisible(
                s,
                access,
                ticket.npcId,
                ticket.sessionId,
                e.eventId,
              ) &&
              [
                ticket.npcId,
                ...ticket.recipientIds,
                ...ticket.observerIds,
              ].every((p) => audience(e).includes(p)),
          )
          .slice(-64);
        if (
          new TextEncoder().encode(
            JSON.stringify({ ticket, trigger, memories }),
          ).length > 65536
        )
          return fail("limit");
        return {
          ticket,
          trigger,
          output: undefined as AddressedEvent | undefined,
          memories,
        };
      });
    },
    cancel(access: SessionAccess, ticket: SessionTurn) {
      return run(access, (s) => {
        session(s, access, ticket.sessionId, ticket.revision);
        const pending = s.turns.find((t) => t.ticket.turnId === ticket.turnId);
        if (!pending || !equal(pending.ticket, ticket) || pending.output)
          return fail("conflict");
        pending.cancelled = true;
      });
    },
    complete(
      access: SessionAccess,
      ticket: SessionTurn,
      output: AddressedEvent,
    ) {
      return run(access, (s) => {
        const pending = s.turns.find((t) => t.ticket.turnId === ticket.turnId);
        if (!pending || pending.cancelled || !equal(pending.ticket, ticket))
          return fail("unauthorized");
        session(s, access, ticket.sessionId, ticket.revision);
        if (
          (pending.behaviorRevision ?? 0) !== behaviorRevision(s) ||
          !behaviorPermissions(
            s,
            access,
            ticket.npcId,
            ticket.sessionId,
            ticket.eventId,
            behaviorOperator,
          ).speak
        )
          return fail("stale");
        if (pending.output) {
          if (!equal(pending.output, output)) fail("conflict");
          return pending.output;
        }
        eventValid(s, access, output);
        if (
          output.sessionId !== ticket.sessionId ||
          output.revision !== ticket.revision ||
          output.senderId !== ticket.npcId ||
          output.channelId !==
            s.events.find((e) => e.eventId === ticket.eventId)?.channelId ||
          !equal(output.recipientIds, ticket.recipientIds) ||
          !equal(output.observerIds, ticket.observerIds)
        )
          fail("unauthorized");
        if (s.events.some((e) => e.eventId === output.eventId))
          fail("conflict");
        if (s.events.length >= 2048) fail("limit");
        s.events.push(structuredClone(output));
        pending.output = structuredClone(output);
        return output;
      });
    },
  };
}
