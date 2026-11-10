import test from "node:test";
import assert from "node:assert/strict";
import {
  createParticipantRuntime,
  emptyParticipantState,
} from "../../packages/runtime/src/participants.js";
import type {
  ParticipantState,
  ParticipantStore,
} from "../../packages/runtime/src/participants.js";
import {
  createGroupSchedulerRuntime,
  validGroupPlan,
} from "../../packages/runtime/src/group-scheduler.js";
import type {
  PlanSchedule,
  PlanningInput,
} from "../../packages/runtime/src/group-scheduler.js";
function fixture() {
  let state: ParticipantState = emptyParticipantState();
  const store: ParticipantStore = {
    transact(_principal, work) {
      const copy = structuredClone(state);
      const output = work(copy);
      state = copy;
      return output;
    },
  };
  const access = { principalId: "owner", hostId: "host" },
    participants = createParticipantRuntime(store);
  for (const npcId of ["a", "b"])
    participants.register(access, {
      participantId: npcId,
      subjectId: `verified-${npcId}`,
      kind: "npc",
    });
  participants.transition(access, "join", 0, {
    sessionId: "s",
    revision: 1,
    worldId: "world",
    hostId: "host",
    recallWorldIds: ["world"],
    members: [
      { participantId: "a", role: "npc" },
      { participantId: "b", role: "npc" },
    ],
    groups: [{ groupId: "party", participantIds: ["a", "b"] }],
    channels: [{ channelId: "chat", participantIds: ["a", "b"] }],
  });
  participants.append(access, {
    eventId: "shared",
    sessionId: "s",
    revision: 1,
    channelId: "chat",
    senderId: "a",
    recipientIds: ["b"],
    observerIds: [],
    text: "The orchard gate is open.",
  });
  participants.append(access, {
    eventId: "secret",
    sessionId: "s",
    revision: 1,
    channelId: "chat",
    senderId: "a",
    recipientIds: [],
    observerIds: [],
    text: "private silver iris",
  });
  const config: PlanSchedule = {
    scheduleId: "morning",
    revision: 1,
    state: "running",
    clock: "world",
    interval: 10,
    nextDue: 10,
    maxRuns: 3,
    spec: {
      sessionId: "s",
      sessionRevision: 1,
      groupId: "party",
      actors: [
        { participantId: "a", roleId: "grower", capabilities: ["observe"] },
        { participantId: "b", roleId: "grower", capabilities: ["observe"] },
      ],
      intents: [
        {
          intentId: "survey",
          roleIds: ["grower"],
          requiredCapabilities: ["observe"],
        },
      ],
      objective: "Inspect the orchard",
      channelId: "chat",
      sharedEventIds: ["shared"],
    },
  };
  return {
    access,
    participants,
    runtime: createGroupSchedulerRuntime(store),
    config,
    state: () => structuredClone(state),
    transact: <T>(work: (s: ParticipantState) => T): T =>
      store.transact("owner", work),
  };
}
const clock = { wallTimeMs: 100, worldTicks: { world: 10 } };
const plan = {
  objective: "Inspect the orchard",
  assignments: [
    { assignmentId: "look-a", actorId: "a", intentId: "survey", dependsOn: [] },
    {
      assignmentId: "look-b",
      actorId: "b",
      intentId: "survey",
      dependsOn: ["look-a"],
    },
  ],
};
test("shared group context rejects private fields/events atomically and validates complete assignment DAG/capabilities", () => {
  const f = fixture(),
    before = f.state();
  for (const badSpec of [
    { ...f.config.spec, history: "private injected history" },
    {
      ...f.config.spec,
      actors: [
        { ...f.config.spec.actors[0], privateNotes: "private" },
        f.config.spec.actors[1],
      ],
    },
    {
      ...f.config.spec,
      intents: [{ ...f.config.spec.intents[0], privateNotes: "private" }],
    },
    { ...f.config.spec, sharedEventIds: ["secret"] },
  ]) {
    assert.throws(
      () => f.runtime.configure(f.access, 0, { ...f.config, spec: badSpec }),
      /invalid|unauthorized/,
    );
    assert.deepEqual(f.state(), before);
  }
  assert.throws(
    () =>
      f.runtime.configure(f.access, 0, {
        ...f.config,
        privateData: "unbounded extension",
      } as PlanSchedule),
    /invalid/,
  );
  assert.deepEqual(f.state(), before);
  f.runtime.configure(f.access, 0, f.config);
  const configured = f.state();
  assert.throws(
    () =>
      f.runtime.configure(f.access, 1, {
        ...f.config,
        revision: 2,
        clock: "wall",
      }),
    /conflict/,
  );
  assert.deepEqual(f.state(), configured);

  const input = f.runtime.claim(
    f.access,
    "morning",
    { kind: "due" },
    clock,
    "worker",
    100,
    true,
  ) as PlanningInput;
  assert(!JSON.stringify(input).includes("silver iris"));
  assert.deepEqual(
    input.sharedEvents.map((e) => e.eventId),
    ["shared"],
  );
  assert(validGroupPlan(plan, input.spec));
  assert(!validGroupPlan({ ...plan, speech: "unsolicited" }, input.spec));
  assert(
    !validGroupPlan(
      {
        ...plan,
        assignments: [
          ...plan.assignments,
          {
            assignmentId: "evil",
            actorId: "player",
            intentId: "survey",
            dependsOn: [],
          },
        ],
      },
      input.spec,
    ),
  );
  assert(
    !validGroupPlan(
      {
        ...plan,
        assignments: plan.assignments.map((a) => ({
          ...a,
          dependsOn: [a.assignmentId === "look-a" ? "look-b" : "look-a"],
        })),
      },
      input.spec,
    ),
  );
  assert.equal(
    validGroupPlan(plan, {
      ...input.spec,
      actors: input.spec.actors.map((a) => ({ ...a, capabilities: [] })),
    }),
    false,
  );
  assert.throws(
    () =>
      f.runtime.complete(
        f.access,
        input.claim,
        { ...plan, speech: "hello" },
        clock,
      ),
    /invalid/,
  );
  assert.equal(
    f.runtime.inspect(f.access, "morning").claims[0].plan,
    undefined,
  );
  const proposal = f.runtime.complete(f.access, input.claim, plan, clock);
  assert.equal(proposal.status, "proposed");
  const beforeReport = f.state();
  assert.throws(
    () =>
      f.runtime.report(f.access, {
        reportId: "extension",
        claimId: proposal.claimId,
        status: "adopted",
        assignmentIds: ["look-a"],
        summary: "Host report",
        privateData: "extension",
      } as Parameters<typeof f.runtime.report>[1]),
    /invalid/,
  );
  assert.deepEqual(f.state(), beforeReport);

  assert.throws(
    () =>
      f.runtime.report(f.access, {
        reportId: "bad-adoption",
        claimId: proposal.claimId,
        status: "adopted",
        assignmentIds: ["look-b"],
        summary: "Dependency omitted",
      }),
    /invalid/,
  );
  assert.throws(
    () =>
      f.runtime.report(f.access, {
        reportId: "fake-success",
        claimId: proposal.claimId,
        status: "completed",
        assignmentIds: ["look-a", "look-b"],
        summary: "No adoption",
      }),
    /conflict/,
  );
  assert.equal(f.state().events.length, 2);
});
test("atomic NPC locks, leases, clock domains and durable unknown claims bound retried work", () => {
  const f = fixture();
  f.runtime.configure(f.access, 0, f.config);
  assert.deepEqual(
    f.runtime.claim(
      f.access,
      "morning",
      { kind: "due" },
      { wallTimeMs: 10000, worldTicks: { world: 9 } },
      "worker",
      100,
      true,
    ),
    { status: "not-due" },
  );
  assert.deepEqual(
    f.runtime.claim(
      f.access,
      "morning",
      { kind: "due" },
      { wallTimeMs: 10000, worldTicks: { world: 10 } },
      "worker",
      100,
      false,
    ),
    { status: "host-unavailable" },
  );
  assert.equal(f.runtime.inspect(f.access, "morning").calls, 0);
  const input = f.runtime.claim(
    f.access,
    "morning",
    { kind: "due" },
    { wallTimeMs: 10000, worldTicks: { world: 100 } },
    "worker",
    100,
    true,
  ) as PlanningInput;
  assert.equal(f.runtime.inspect(f.access, "morning").config.nextDue, 110);
  assert.deepEqual(
    f.runtime.claim(
      f.access,
      "morning",
      { kind: "manual", triggerId: "repeat" },
      { wallTimeMs: 10001, worldTicks: { world: 100 } },
      "other-worker",
      100,
      true,
    ),
    { status: "busy" },
  );
  assert.throws(
    () =>
      f.participants.begin(f.access, {
        turnId: "chat",
        sessionId: "s",
        revision: 1,
        npcId: "a",
        eventId: "secret",
        recipientIds: [],
        observerIds: [],
      }),
    /busy/,
  );
  assert.deepEqual(
    f.runtime.claim(
      f.access,
      "morning",
      { kind: "due" },
      { wallTimeMs: 10100, worldTicks: { world: 110 } },
      "other-worker",
      100,
      true,
    ),
    { status: "unknown" },
  );
  assert.throws(
    () =>
      f.runtime.complete(f.access, input.claim, plan, {
        wallTimeMs: 10100,
        worldTicks: { world: 110 },
      }),
    /stale/,
  );
  assert.equal(f.runtime.inspect(f.access, "morning").calls, 1);
  f.runtime.control(f.access, "morning", 1, "pause");
  f.runtime.control(f.access, "morning", 2, "resume");
  assert.deepEqual(
    f.runtime.claim(
      f.access,
      "morning",
      { kind: "manual", triggerId: "cannot-clear-unknown" },
      { wallTimeMs: 10100, worldTicks: { world: 110 } },
      "other-worker",
      100,
      true,
    ),
    { status: "unknown" },
  );
  f.runtime.reconcile(f.access, input.claim.claimId);
  const next = f.runtime.claim(
    f.access,
    "morning",
    { kind: "manual", triggerId: "fresh" },
    { wallTimeMs: 10101, worldTicks: { world: 110 } },
    "other-worker",
    100,
    true,
  ) as PlanningInput;
  assert.equal(next.claim.fence, 2);
  f.runtime.control(f.access, "morning", 3, "pause");
  assert.throws(
    () =>
      f.runtime.complete(f.access, next.claim, plan, {
        wallTimeMs: 10102,
        worldTicks: { world: 110 },
      }),
    /stale/,
  );
  assert.equal(f.state().events.length, 2);
});

test("principal, NPC and group budgets reserve calls even when a proposal fails", () => {
  for (const budgets of [
    { principalCalls: 1 },
    { npcCalls: 1 },
    { groupCalls: 1 },
  ]) {
    const f = fixture();
    // Reuse the same principal state while constructing an independently bounded runtime.
    const store: ParticipantStore = {
      transact(_principal, work) {
        return f.transact(work);
      },
    };
    const runtime = createGroupSchedulerRuntime(store, budgets);
    runtime.configure(f.access, 0, f.config);
    const input = runtime.claim(
      f.access,
      "morning",
      { kind: "due" },
      clock,
      "worker",
      100,
      true,
    ) as PlanningInput;
    runtime.fail(f.access, input.claim, false);
    assert.deepEqual(
      runtime.claim(
        f.access,
        "morning",
        { kind: "manual", triggerId: "new" },
        { wallTimeMs: 110, worldTicks: { world: 20 } },
        "worker",
        100,
        true,
      ),
      { status: "budget" },
    );
    assert.equal(runtime.inspect(f.access, "morning").calls, 1);
  }
});

test("trusted ceilings permit larger budgets/concurrency while request/model overrides never grant capacity", () => {
  const f = fixture(),
    before = f.state();
  const store: ParticipantStore = {
    transact(_principal, work) {
      return f.transact(work);
    },
  };
  assert.throws(
    () => createGroupSchedulerRuntime(store, { principalCalls: 65 }),
    /Unsupported planning budget/,
  );
  assert.throws(
    () => createGroupSchedulerRuntime(store, { concurrentPlans: 2 }),
    /Unsupported planning budget/,
  );
  assert.deepEqual(f.state(), before);
  const runtime = createGroupSchedulerRuntime(
    store,
    { principalCalls: 65, concurrentPlans: 2 },
    { principalCalls: 65, concurrentPlans: 2 },
  );
  for (const actor of f.config.spec.actors) {
    const solo = {
      ...f.config,
      scheduleId: `solo-${actor.participantId}`,
      spec: { ...f.config.spec, actors: [actor], sharedEventIds: [] },
    };
    delete solo.spec.groupId;
    runtime.configure(f.access, 0, solo);
  }
  const a = runtime.claim(
    f.access,
    "solo-a",
    { kind: "due" },
    clock,
    "worker-a",
    100,
    true,
  ) as PlanningInput;
  const b = runtime.claim(
    f.access,
    "solo-b",
    { kind: "due" },
    clock,
    "worker-b",
    100,
    true,
  ) as PlanningInput;
  assert.equal(a.claim.status, "active");
  assert.equal(b.claim.status, "active");
  assert.equal(f.state().turns.filter((t) => !t.cancelled).length, 2);
  assert.deepEqual(
    runtime.claim(
      f.access,
      "solo-a",
      { kind: "manual", triggerId: "competing" },
      { wallTimeMs: 101, worldTicks: { world: 20 } },
      "other",
      100,
      true,
    ),
    { status: "busy" },
  );
  assert.throws(
    () =>
      runtime.configure(f.access, 1, {
        ...f.config,
        scheduleId: "solo-a",
        revision: 2,
        budgets: { principalCalls: 1000 },
      } as PlanSchedule),
    /invalid/,
  );
  const soloPlan = {
    objective: a.spec.objective,
    assignments: [plan.assignments[0]],
  };
  assert.equal(
    validGroupPlan({ ...soloPlan, budgets: { principalCalls: 1000 } }, a.spec),
    false,
  );
});
