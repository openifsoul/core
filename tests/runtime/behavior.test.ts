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
  helpful.changes[0] = {
    ...helpful.changes[0],
    delta: 3,
    confidence: 0.6,
    evidenceEventIds: ["insult", "help"],
    reason:
      "The later repair is helpful, but the earlier provocation remains relevant.",
  };
  const originals = f.state().events;
  const updated = f.behavior.apply(f.access, helpful, 2000);
  assert.equal(updated.values[0].value, 51);
  assert.equal(updated.values[0].confidence, 0.6);
  assert.equal(updated.history.length, 2);
  assert.deepEqual(updated.history[1].evidenceEventIds, ["insult", "help"]);
  assert.equal(updated.history[1].reason, helpful.changes[0].reason);
  assert.deepEqual(f.state().events, originals);
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

test("linked authority is checked per external event for recall and directed relationship revisions", () => {
  const f = fixture();
  const remote = { ...f.access, hostId: "external-host" };
  const local = f.state().sessions[0]!;
  f.participants.transition(f.access, "link-world-scope", local.revision, {
    ...local,
    revision: local.revision + 1,
    recallWorldIds: ["garden", "external-world"],
  });
  f.participants.transition(remote, "remote-session", 0, {
    sessionId: "remote",
    revision: 1,
    hostId: remote.hostId,
    worldId: "external-world",
    recallWorldIds: ["external-world"],
    members: [
      { participantId: "guard-a", role: "npc" },
      { participantId: "player", role: "player" },
      { participantId: "other", role: "player" },
    ],
    groups: [],
    channels: [
      {
        channelId: "remote-chat",
        participantIds: ["guard-a", "player", "other"],
      },
    ],
  });
  const source = {
    eventId: "approved-remote",
    sessionId: "remote",
    revision: 1,
    channelId: "remote-chat",
    senderId: "player",
    recipientIds: ["guard-a"],
    observerIds: [],
    text: "Original authorized account",
  };
  const unrelated = {
    ...source,
    eventId: "other-private",
    senderId: "other",
    text: "Never project this other player's private account",
  };
  const bystander = {
    ...unrelated,
    eventId: "other-spoke-in-shared-audience",
    recipientIds: ["guard-a", "player"],
  };
  for (const entry of [source, unrelated, bystander]) {
    f.participants.append(remote, entry);
    f.behavior.observe(
      remote,
      "remote",
      "guard-a",
      entry.eventId,
      "observation",
    );
  }
  f.participants.transition(f.access, "same-host-sibling-session", 0, {
    ...local,
    sessionId: "same-host-sibling",
    revision: 1,
  });
  const sibling = {
    ...source,
    eventId: "same-host-sibling-event",
    sessionId: "same-host-sibling",
    channelId: "chat",
    text: "Same host does not grant this source to the linked conversation.",
  };
  f.participants.append(f.access, sibling);
  f.behavior.observe(
    f.access,
    sibling.sessionId,
    "guard-a",
    sibling.eventId,
    "observation",
  );
  const trigger = {
    ...source,
    eventId: "linked-app-message",
    sessionId: "s",
    revision: 2,
    channelId: "chat",
    text: "I am adding a new account from the linked conversation.",
  };
  f.participants.append(f.access, trigger);
  f.behavior.observe(f.access, "s", "guard-a", trigger.eventId, "observation");
  const ticket = {
    turnId: "linked-turn",
    npcId: "guard-a",
    eventId: trigger.eventId,
    sessionId: "s",
    revision: 2,
    recipientIds: ["player"],
    observerIds: [],
  };
  const initial = f.state();
  const ordinary = f.participants.begin(f.access, {
    ...ticket,
    turnId: "ordinary-turn",
  });
  assert.deepEqual(
    ordinary.memories.map((event) => event.eventId),
    [sibling.eventId, trigger.eventId],
  );
  f.participants.cancel(f.access, { ...ticket, turnId: "ordinary-turn" });

  let grant = true;
  const queries: string[] = [];
  const authorizeEvidence: import("../../packages/runtime/src/participants.js").AuthorizeSessionEvidence =
    (query) => {
      assert.equal(query.access.hostId, f.access.hostId);
      if (query.sourceSession.hostId === f.access.hostId)
        return query.sourceSession.sessionId === "s";
      assert.equal(query.sourceSession.hostId, remote.hostId);
      assert.equal(query.sourceSession.worldId, "external-world");
      assert.equal(query.session.sessionId, "s");
      assert.equal(query.targetParticipantId, "player");
      assert.deepEqual(query.audienceParticipantIds, ["player"]);
      queries.push(query.purpose + ":" + query.event.eventId);
      query.event.text = "Detached callback mutation";
      if (query.event.eventId === bystander.eventId)
        return query.purpose === "relationship-evidence";
      return grant && query.event.eventId === source.eventId;
    };
  const linkedParticipants = createParticipantRuntime(f.store, {
    authorizeEvidence,
  });
  const linkedBehavior = createBehaviorRuntime(f.store, { authorizeEvidence });
  assert.deepEqual(
    linkedParticipants
      .begin(f.access, ticket)
      .memories.map((event) => event.eventId),
    [source.eventId, trigger.eventId],
  );
  linkedParticipants.cancel(f.access, ticket);
  assert(queries.includes("recall:" + source.eventId));
  assert(!queries.some((query) => query.includes(unrelated.eventId)));
  assert(
    linkedParticipants
      .relationshipEvidence(f.access, "s", "guard-a", "player")
      .events.some((event) => event.eventId === source.eventId),
  );
  assert.throws(
    () =>
      linkedParticipants.append(f.access, {
        ...source,
        eventId: "attempted-foreign-write",
      }),
    /unauthorized/,
  );

  const revise = proposal(trigger.eventId);
  revise.changes[0].evidenceEventIds = [source.eventId, trigger.eventId];
  assert.throws(() => f.behavior.apply(f.access, revise, 1000), /unauthorized/);
  const siblingClaim = structuredClone(revise);
  siblingClaim.changes[0].evidenceEventIds = [sibling.eventId, trigger.eventId];
  assert.throws(
    () => linkedBehavior.apply(f.access, siblingClaim, 1000),
    /unauthorized/,
  );
  const otherClaim = structuredClone(revise);
  otherClaim.changes[0].evidenceEventIds = [bystander.eventId, trigger.eventId];
  assert.throws(
    () => linkedBehavior.apply(f.access, otherClaim, 1000),
    /unauthorized/,
  );
  const beforeRevokedApply = f.state();
  grant = false;
  assert.throws(
    () => linkedBehavior.apply(f.access, revise, 1000),
    /unauthorized/,
  );
  assert.deepEqual(f.state(), beforeRevokedApply);
  const throwing = createBehaviorRuntime(f.store, {
    authorizeEvidence: () => {
      throw Error("expired");
    },
  });
  assert.throws(() => throwing.apply(f.access, revise, 1000), /unauthorized/);
  assert.deepEqual(f.state(), beforeRevokedApply);
  grant = true;

  const config = f.behavior.read(f.access).config;
  config.revision = 1;
  config.overrides = [
    {
      scope: { kind: "world", id: "external-world" },
      policy: { general: { remember: false } },
    },
  ];
  f.behavior.update(f.access, 0, config);
  revise.configRevision = 1;
  assert.throws(
    () => linkedBehavior.apply(f.access, revise, 1000),
    /unauthorized/,
  );
  assert(
    !linkedParticipants
      .relationshipEvidence(f.access, "s", "guard-a", "player")
      .events.some((event) => event.eventId === source.eventId),
  );
  const restored = structuredClone(config);
  restored.revision = 2;
  restored.overrides = [];
  f.behavior.update(f.access, 1, restored);
  revise.configRevision = 2;
  const updated = linkedBehavior.apply(f.access, revise, 1000);
  assert.equal(updated.values[0]?.targetParticipantId, "player");
  assert.deepEqual(updated.history[0]?.evidenceEventIds, [
    source.eventId,
    trigger.eventId,
  ]);
  assert.deepEqual(f.state().events, initial.events);

  const deniedHistory = createParticipantRuntime(f.store, {
    authorizeEvidence() {
      throw Error("Revoked scope");
    },
  });
  assert.deepEqual(f.participants.history(f.access, "s", "guard-a"), [trigger]);
  assert.deepEqual(deniedHistory.history(f.access, "s", "guard-a"), []);
  assert.deepEqual(deniedHistory.history(f.access, "s", "player"), []);
  assert.deepEqual(linkedParticipants.history(f.access, "s", "guard-a"), [
    trigger,
  ]);
  assert.deepEqual(
    linkedParticipants.history(f.access, "same-host-sibling", "guard-a"),
    [],
  );

  grant = false;
  const revoked = linkedBehavior.inspect(f.access, "s", "guard-a");
  assert.deepEqual(revoked.values, []);
  assert.deepEqual(revoked.history, []);
  assert.deepEqual(linkedBehavior.apply(f.access, revise, 1000).history, []);
  const next = {
    ...trigger,
    eventId: "new-local-evidence",
    text: "New linked input after source revocation",
  };
  f.participants.append(f.access, next);
  f.behavior.observe(f.access, "s", "guard-a", next.eventId, "observation");
  const dependent = linkedBehavior.apply(
    f.access,
    proposal(next.eventId, 2, 1),
    2000,
  );
  assert.deepEqual(dependent.values, []);
  assert.deepEqual(dependent.history, []);
  const ownerView = f.behavior.inspect(f.access, "s", "guard-a");
  assert.equal(ownerView.values[0]?.value, 46);
  assert.deepEqual(
    ownerView.history.map((item) => item.evidenceEventIds),
    [[source.eventId, trigger.eventId], [next.eventId]],
  );
  assert.deepEqual(f.state().events, [...initial.events, next]);
  grant = true;
  assert.deepEqual(
    linkedBehavior.inspect(f.access, "s", "guard-a").history,
    ownerView.history,
  );
});
