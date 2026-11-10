import test from "node:test";
import assert from "node:assert/strict";
import {
  createParticipantRuntime,
  emptyParticipantState,
} from "../../packages/runtime/src/participants.js";
import {
  createBehaviorRuntime,
  DEFAULT_BEHAVIOR_OPERATOR,
  behaviorPermissions,
  behaviorEvidenceVisible,
} from "../../packages/runtime/src/behavior.js";
import type {
  ParticipantState,
  ParticipantStore,
} from "../../packages/runtime/src/participants.js";
import type {
  BehaviorProposal,
  BehaviorOperatorPolicy,
} from "../../packages/runtime/src/behavior-types.js";
function fixture(
  operator: BehaviorOperatorPolicy = {
    ...DEFAULT_BEHAVIOR_OPERATOR,
    canEditConfig: true,
  },
) {
  let state: ParticipantState = emptyParticipantState();
  const store: ParticipantStore = {
    transact(_id, work) {
      const draft = structuredClone(state);
      const result = work(draft);
      state = draft;
      return result;
    },
  };
  const access = { principalId: "owner", hostId: "host" },
    participants = createParticipantRuntime(store, {
      behaviorOperator: operator,
    }),
    behavior = createBehaviorRuntime(store, { operator });
  for (const [id, kind] of [
    ["guard-a", "npc"],
    ["guard-b", "npc"],
    ["player", "player"],
    ["other", "player"],
  ] as const)
    participants.register(access, {
      participantId: id,
      subjectId: `verified-${id}`,
      kind,
    });
  participants.transition(access, "join", 0, {
    sessionId: "s",
    revision: 1,
    hostId: "host",
    worldId: "garden",
    recallWorldIds: ["garden"],
    members: [
      { participantId: "guard-a", role: "npc" },
      { participantId: "guard-b", role: "npc" },
      { participantId: "player", role: "player" },
    ],
    groups: [{ groupId: "guards", participantIds: ["guard-a", "guard-b"] }],
    channels: [
      { channelId: "chat", participantIds: ["guard-a", "guard-b", "player"] },
    ],
  });
  return {
    store,
    access,
    participants,
    behavior,
    state: () => structuredClone(state),
  };
}
const proposal = (
  eventId: string,
  configRevision = 0,
  stateRevision = 0,
): BehaviorProposal => ({
  proposalId: `proposal-${eventId}`,
  npcId: "guard-a",
  sessionId: "s",
  configRevision,
  expectedStateRevision: stateRevision,
  changes: [
    {
      parameterId: "trust",
      targetParticipantId: "player",
      delta: -2,
      confidence: 0.8,
      evidenceEventIds: [eventId],
      reason: "Observed evidence",
    },
  ],
});
test("config precedence/operator locks and optimistic edits preserve referenced state/history", () => {
  const f = fixture({
    ...DEFAULT_BEHAVIOR_OPERATOR,
    canEditConfig: true,
    lockedParameterIds: ["trust"],
    deniedPermissions: ["requestAction"],
  });
  const config = f.behavior.read(f.access).config;
  config.revision = 1;
  config.overrides = [
    {
      scope: { kind: "world", id: "garden" },
      policy: { general: { speak: false } },
    },
    {
      scope: { kind: "group", id: "guards" },
      policy: { general: { speak: true } },
    },
    {
      scope: { kind: "npc", id: "guard-a" },
      policy: { general: { requestAction: true, speak: false } },
    },
  ];
  assert.throws(() => f.behavior.update(f.access, 0, config), /unauthorized/);
  config.overrides[2].policy!.general!.requestAction = false;
  f.behavior.update(f.access, 0, config);
  assert.equal(
    f.behavior.inspect(f.access, "s", "guard-a").effective.policy.general.speak,
    false,
  );
  assert.equal(
    f.behavior.inspect(f.access, "s", "guard-b").effective.policy.general.speak,
    true,
  );
  assert.equal(
    f.behavior.inspect(f.access, "s", "guard-b").effective.policy.general
      .requestAction,
    false,
  );
  const before = f.state();
  assert.throws(
    () => f.behavior.update(f.access, 0, config),
    /invalid|conflict/,
  );
  assert.deepEqual(f.state(), before);
  const locked = structuredClone(config);
  locked.revision = 2;
  locked.parameters[0].initial = 10;
  assert.throws(() => f.behavior.update(f.access, 1, locked), /unauthorized/);
  assert.deepEqual(f.state(), before);
});
test("provocation is remembered and updates directed relation while speech/actions remain denied; helpful evidence revises it", () => {
  const f = fixture();
  f.participants.append(f.access, {
    eventId: "insult",
    sessionId: "s",
    revision: 1,
    channelId: "chat",
    senderId: "player",
    recipientIds: ["guard-a"],
    observerIds: [],
    text: "A provocation",
  });
  f.behavior.observe(f.access, "s", "guard-a", "insult", "provocation");
  const state = f.behavior.apply(f.access, proposal("insult"), 1000);
  assert.equal(state.values[0].value, 48);
  assert.equal(state.values[0].confidence, 0.8);
  assert.equal(f.participants.history(f.access, "s", "guard-a").length, 1);
  assert.throws(
    () =>
      f.participants.begin(f.access, {
        turnId: "reply",
        sessionId: "s",
        revision: 1,
        npcId: "guard-a",
        eventId: "insult",
        recipientIds: ["player"],
        observerIds: [],
      }),
    /unauthorized/,
  );
  assert.equal(f.behavior.inspect(f.access, "s", "guard-b").values.length, 0);
  f.participants.append(f.access, {
    eventId: "help",
    sessionId: "s",
    revision: 1,
    channelId: "chat",
    senderId: "player",
    recipientIds: ["guard-a"],
    observerIds: [],
    text: "Helped repair a gate",
  });
  f.behavior.observe(f.access, "s", "guard-a", "help", "helpful");
  const helpful = proposal("help", 0, 1);
  helpful.changes[0].delta = 3;
  const updated = f.behavior.apply(f.access, helpful, 2000);
  assert.equal(updated.values[0].value, 51);
  assert.equal(updated.history.length, 2);
  const before = f.state();
  f.behavior.apply(f.access, helpful, 3000);
  assert.deepEqual(f.state(), before);
  assert.throws(
    () =>
      f.behavior.apply(
        f.access,
        { ...helpful, proposalId: "duplicate", expectedStateRevision: 2 },
        3000,
      ),
    /conflict/,
  );
});
test("host/evidence/config fences reject private sharing, forged targets and late outputs atomically", () => {
  const f = fixture();
  f.participants.append(f.access, {
    eventId: "secret",
    sessionId: "s",
    revision: 1,
    channelId: "chat",
    senderId: "player",
    recipientIds: ["guard-a"],
    observerIds: [],
    text: "private silver iris",
  });
  f.behavior.observe(f.access, "s", "guard-a", "secret", "observation");
  assert.throws(
    () => f.behavior.observe(f.access, "s", "guard-b", "secret", "observation"),
    /unauthorized/,
  );
  assert.equal(
    behaviorEvidenceVisible(f.state(), f.access, "guard-b", "s", "secret"),
    false,
  );
  assert.throws(
    () =>
      behaviorPermissions(
        f.state(),
        { ...f.access, hostId: "foreign" },
        "guard-a",
        "s",
      ),
    /unauthorized/,
  );
  const forged = proposal("secret");
  forged.changes[0].targetParticipantId = "other";
  assert.throws(() => f.behavior.apply(f.access, forged, 100), /unauthorized/);
  const config = f.behavior.read(f.access).config;
  config.revision = 1;
  f.behavior.update(f.access, 0, config);
  assert.throws(
    () => f.behavior.apply(f.access, proposal("secret"), 100),
    /stale/,
  );
  const valid = proposal("secret", 1);
  f.behavior.apply(f.access, valid, 100);
  const before = f.state();
  const removed = structuredClone(config);
  removed.revision = 2;
  removed.parameters = removed.parameters.filter(
    (p) => p.parameterId !== "trust",
  );
  assert.throws(() => f.behavior.update(f.access, 1, removed), /invalid/);
  assert.deepEqual(f.state(), before);
  assert.throws(
    () =>
      f.participants.transition(
        { ...f.access, hostId: "foreign" },
        "collision",
        1,
        { ...before.sessions[0], revision: 2, hostId: "foreign" },
      ),
    /unauthorized/,
  );
});
test("remember and relation updates are independent; explicit decay is bounded and traits cannot be model-mutated", () => {
  const f = fixture();
  const config = f.behavior.read(f.access).config;
  config.revision = 1;
  config.defaults.policy.general.remember = false;
  config.parameters.push(
    {
      parameterId: "discipline",
      label: "Discipline",
      kind: "trait",
      scope: "portable",
      initial: 80,
      min: 0,
      max: 100,
      maxDelta: 1,
    },
    {
      parameterId: "agitation",
      label: "Agitation",
      kind: "state",
      scope: "world",
      initial: 0,
      min: 0,
      max: 100,
      maxDelta: 5,
      decay: { perHour: 2, toward: 0 },
    },
  );
  f.behavior.update(f.access, 0, config);
  f.participants.append(f.access, {
    eventId: "e",
    sessionId: "s",
    revision: 1,
    channelId: "chat",
    senderId: "player",
    recipientIds: ["guard-a"],
    observerIds: [],
    text: "Current event",
  });
  f.behavior.observe(f.access, "s", "guard-a", "e", "helpful");
  const p = proposal("e", 1);
  p.changes.push({
    parameterId: "agitation",
    delta: 4,
    confidence: 1,
    evidenceEventIds: ["e"],
    reason: "Transient state",
  });
  f.behavior.apply(f.access, p, 1000);
  assert.equal(f.participants.history(f.access, "s", "guard-a").length, 0);
  assert.equal(f.behavior.inspect(f.access, "s", "guard-a").values.length, 2);
  const ticket = {
    turnId: "current",
    sessionId: "s",
    revision: 1,
    npcId: "guard-a",
    eventId: "e",
    recipientIds: ["player"],
    observerIds: [],
  };
  const input = f.participants.begin(f.access, ticket);
  assert.equal(input.memories.length, 0);
  const next = structuredClone(config);
  next.revision = 2;
  f.behavior.update(f.access, 1, next);
  assert.throws(
    () =>
      f.participants.complete(f.access, ticket, {
        eventId: "late",
        sessionId: "s",
        revision: 1,
        channelId: "chat",
        senderId: "guard-a",
        recipientIds: ["player"],
        observerIds: [],
        text: "Late reply",
      }),
    /stale/,
  );
  assert.equal(
    f.behavior
      .decay(f.access, "s", "guard-a", 3601000)
      .values.find((v) => v.parameterId === "agitation")!.value,
    2,
  );
  const before = f.state();
  const trait = {
    ...proposal("e", 2, 2),
    proposalId: "trait",
    changes: [{ ...p.changes[0], parameterId: "discipline" }],
  };
  assert.throws(() => f.behavior.apply(f.access, trait, 3601001), /invalid/);
  assert.deepEqual(f.state(), before);
});

test("tenant-owner configuration is explicit, while host inspection and source-event authority remain scoped", () => {
  const f = fixture();
  const foreign = { ...f.access, hostId: "other-host" };
  f.participants.transition(foreign, "foreign-bind", 0, {
    sessionId: "foreign-session",
    revision: 1,
    hostId: foreign.hostId,
    worldId: "other-world",
    recallWorldIds: ["other-world"],
    members: [{ participantId: "guard-b", role: "npc" }],
    groups: [{ groupId: "other-group", participantIds: ["guard-b"] }],
    channels: [{ channelId: "chat", participantIds: ["guard-b"] }],
  });
  const host = createBehaviorRuntime(f.store);
  assert.throws(() => host.read(f.access), /unauthorized/);
  assert.throws(
    () =>
      host.update(f.access, 0, {
        ...f.behavior.read(f.access).config,
        revision: 1,
      }),
    /unauthorized/,
  );
  const cfg = f.behavior.read(f.access).config;
  cfg.revision = 1;
  cfg.overrides = [
    {
      scope: { kind: "world", id: "other-world" },
      policy: { general: { speak: false } },
    },
    {
      scope: { kind: "group", id: "other-group" },
      goals: [
        {
          goalId: "watch",
          objective: "Watch quietly",
          priority: 50,
          enabled: true,
        },
      ],
    },
  ];
  f.behavior.update(f.access, 0, cfg);
  assert(f.behavior.read(f.access).catalog.worlds.includes("other-world"));
  assert.throws(
    () => f.behavior.inspect(f.access, "foreign-session", "guard-b"),
    /unauthorized/,
  );
  assert.equal(
    f.behavior.adminInspect(f.access, "foreign-session", "guard-b").effective
      .policy.general.speak,
    false,
  );
});
