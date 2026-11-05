import assert from "node:assert/strict";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  existsSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { openSQLiteMemory } from "../../packages/memory/src/sqlite.js";
import type { MemoryPort, Result } from "../../packages/memory/src/port.js";
import {
  createRuntime,
  exchangeKey,
} from "../../packages/runtime/src/index.js";
import type {
  AgentController,
  TrustedSession,
} from "../../packages/runtime/src/index.js";
import { validateDocument } from "../../packages/protocol/src/index.js";
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
} from "../../packages/protocol/src/index.js";

const fixture = <T>(name: string): T =>
  JSON.parse(
    readFileSync(
      new URL(`../../specs/v0.2/examples/${name}.json`, import.meta.url),
      "utf8",
    ),
  ) as T;
const unwrap = <T>(result: Result<T>): T => {
  assert.equal(result.ok, true, JSON.stringify(result));
  if (!result.ok) throw new Error("test assertion");
  return result.value;
};
const rejects = <T>(result: Result<T>, code: string) => {
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.error.code, code);
};
const initialTime = Date.parse("2026-01-01T08:00:00Z");
function session(): TrustedSession {
  return {
    character: fixture<CharacterInstance>("character-instance"),
    profile: fixture<EnvironmentProfile>("environment-game"),
    context: fixture<ContextReport>("context-daily"),
    access: {
      hostId: "synthetic-garden-host",
      characterParticipantId: "participant-mira",
      verifiedParticipantIds: ["participant-mira", "participant-visitor"],
      authorizedChannelIds: ["garden-nearby"],
      recallEnvironmentIds: ["garden"],
      memoryScope: {
        audience: "participants",
        participantIds: ["participant-mira", "participant-visitor"],
        export: "allowed",
      },
      visibleEntityIds: ["herb-area", "plot-1"],
    },
  };
}
function setup(
  controller: AgentController = async (input) =>
    input.operation === "plan"
      ? fixture("plan-daily")
      : fixture("conversation-requested-response"),
  filename = ":memory:",
  timeout = 100,
) {
  const memory = unwrap(openSQLiteMemory(filename));
  let timestamp = initialTime;
  const runtime = createRuntime({
    memory,
    controller,
    now: () => new Date(timestamp),
    limits: { controllerTimeoutMs: timeout },
  });
  const s = session();
  unwrap(runtime.setSession(s));
  return {
    memory,
    runtime,
    s,
    advance: (ms: number) => {
      timestamp = initialTime + ms;
    },
  };
}
function chatSession(s: TrustedSession): TrustedSession {
  const next = structuredClone(s);
  next.context.reportId = "briefing-chat";
  next.context.contextRevision = "context-102";
  return next;
}

test("schema validation is non-mutating and rejects unknown fields and versions", () => {
  const plan = fixture<PlanProposal>("plan-daily");
  const before = structuredClone(plan);
  assert.equal(validateDocument(plan, "plan-proposal"), true);
  assert.deepEqual(plan, before);
  assert.equal(validateDocument({ ...plan, command: "forbidden" }), false);
  assert.equal(
    validateDocument({ ...plan, schemaVersion: "draft-0.1.0" }),
    false,
  );
});

test("durable complete cycle separates proposal, acceptance, execution and delivery", async () => {
  const directory = mkdtempSync(join(tmpdir(), "ifsoul-runtime-"));
  const filename = join(directory, "memory.sqlite");
  let memory: MemoryPort | undefined;
  try {
    let calls = 0;
    const first = setup(async () => {
      calls++;
      return fixture("plan-daily");
    }, filename);
    memory = first.memory;
    unwrap(await first.runtime.plan());
    const replay = await first.runtime.plan();
    assert.equal(replay.ok && replay.reused, true);
    assert.equal(calls, 1);
    unwrap(
      first.runtime.recordDecision(
        fixture<PlanDecision>("plan-partial-decision"),
      ),
    );
    const preOutcome = unwrap(first.runtime.history());
    assert.equal(
      preOutcome.some((e) => e.recordedPayload.kind === "task-report"),
      false,
    );
    first.advance(60_000);
    const report = fixture<TaskReport>("task-outcome");
    unwrap(first.runtime.recordReport(report));
    assert.equal(first.runtime.recordReport(report).ok, true);
    rejects(
      first.runtime.recordReport({ ...report, summary: "conflicting content" }),
      "conflict",
    );
    rejects(
      first.runtime.recordReport({
        ...report,
        reportId: "unaccepted-report",
        taskId: "task-tend",
      }),
      "correlation",
    );
    const beforeClose = unwrap(first.runtime.history());
    assert.equal(
      beforeClose.filter((e) => e.recordedPayload.kind === "task-report")
        .length,
      1,
    );
    assert.deepEqual(
      beforeClose.find((e) => e.recordedPayload.kind === "task-report")
        ?.recordedPayload,
      report,
    );
    unwrap(memory.close());
    memory = undefined;
    assert.equal(existsSync(`${filename}.lock`), false);
    let selected: MemoryEvent[] = [];
    const second = setup(async (input) => {
      selected = input.memories;
      return fixture<ConversationResponse>("conversation-requested-response");
    }, filename);
    memory = second.memory;
    second.advance(121_000);
    unwrap(second.runtime.setSession(chatSession(second.s)));
    const response = unwrap(
      await second.runtime.conversation(
        fixture<ConversationRequest>("conversation-requested-request"),
      ),
    );
    assert.equal(response.output.type, "utterance");
    assert.equal(
      selected.some(
        (e) =>
          e.recordedPayload.kind === "task-report" &&
          e.recordedPayload.status === "succeeded",
      ),
      true,
    );
    const delivery: ConversationDelivery = {
      schemaVersion: "draft-0.2.0",
      kind: "conversation-delivery",
      binding: response.binding,
      requestId: response.requestId,
      responseId: response.responseId,
      correlationId: response.correlationId,
      channelId: response.channelId,
      deliveryId: "delivery-1",
      recordedAt: response.createdAt,
      status: "delivered",
    };
    unwrap(second.runtime.recordDelivery(delivery));
    unwrap(memory.close());
    memory = undefined;
    const third = setup(async () => {
      throw new Error("must not be called on replay");
    }, filename);
    memory = third.memory;
    const restored = await third.runtime.plan();
    assert.equal(restored.ok && restored.reused, true);
    const events = unwrap(third.runtime.history());
    assert.equal(
      events.some(
        (e) =>
          e.recordedPayload.kind === "conversation-delivery" &&
          e.recordedPayload.status === "delivered",
      ),
      true,
    );
  } finally {
    memory?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("same request ID with changed context is a conflict and never calls controller twice", async () => {
  let calls = 0;
  const h = setup(async () => {
    calls++;
    return fixture("plan-daily");
  });
  try {
    unwrap(await h.runtime.plan());
    const changed = structuredClone(h.s);
    changed.context.reportId = "new-context-report";
    changed.context.contextRevision = "new-context-revision";
    unwrap(h.runtime.setSession(changed));
    rejects(await h.runtime.plan(), "conflict");
    assert.equal(calls, 1);
  } finally {
    h.memory.close();
  }
});

test("colon-bearing character/request IDs cannot alias another character's exchange", async () => {
  assert.notEqual(
    exchangeKey("a", "plan-request", "b:plan-request:c"),
    exchangeKey("a:plan-request:b", "plan-request", "c"),
  );
  const memory = unwrap(openSQLiteMemory(":memory:"));
  let calls = 0;
  const runtime = createRuntime({
    memory,
    now: () => new Date(initialTime),
    controller: async (input) => {
      calls++;
      const p = fixture<PlanProposal>("plan-daily");
      p.binding = input.profile.binding;
      p.requestId = input.context.planningRequest!.requestId;
      return p;
    },
  });
  try {
    for (const [characterId, requestId] of [
      ["a", "b:plan-request:c"],
      ["a:plan-request:b", "c"],
    ]) {
      const s = session();
      s.character.characterId = characterId;
      s.profile.binding.characterId = characterId;
      s.context.binding.characterId = characterId;
      s.context.planningRequest!.requestId = requestId;
      unwrap(runtime.setSession(s));
      const plan = unwrap(await runtime.plan());
      assert.equal(plan.binding.characterId, characterId);
    }
    assert.equal(calls, 2);
  } finally {
    memory.close();
  }
});

test("parallel identical requests share one controller operation", async () => {
  let calls = 0;
  const h = setup(async () => {
    calls++;
    await new Promise((resolve) => setTimeout(resolve, 10));
    return fixture("plan-daily");
  });
  try {
    const results = await Promise.all([h.runtime.plan(), h.runtime.plan()]);
    results.forEach(unwrap);
    assert.equal(calls, 1);
  } finally {
    h.memory.close();
  }
});

test("unfinished durable claim prevents another runtime from repeating controller work", async () => {
  let finish: ((value: unknown) => void) | undefined;
  let calls = 0;
  const h = setup(
    async () =>
      await new Promise((resolve) => {
        finish = resolve;
      }),
  );
  try {
    const pending = h.runtime.plan();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const second = createRuntime({
      memory: h.memory,
      now: () => new Date(initialTime),
      controller: async () => {
        calls++;
        return fixture("plan-daily");
      },
    });
    unwrap(second.setSession(h.s));
    rejects(await second.plan(), "conflict");
    assert.equal(calls, 0);
    finish!(fixture("plan-daily"));
    unwrap(await pending);
    assert.equal((await second.plan()).ok, true);
  } finally {
    h.memory.close();
  }
});

test("timeout bounds ignored cancellation and late output cannot write a proposal", async () => {
  let calls = 0,
    aborted = false;
  const h = setup(
    async (_input, signal) => {
      calls++;
      signal.addEventListener("abort", () => {
        aborted = true;
      });
      await new Promise((resolve) => setTimeout(resolve, 60));
      return fixture("plan-daily");
    },
    ":memory:",
    10,
  );
  try {
    const started = Date.now();
    rejects(await h.runtime.plan(), "timeout");
    assert.ok(Date.now() - started < 100);
    assert.equal(aborted, true);
    rejects(await h.runtime.plan(), "timeout");
    assert.equal(calls, 1);
    await new Promise((resolve) => setTimeout(resolve, 75));
    assert.equal(
      unwrap(h.runtime.history()).some((e) => e.eventType === "plan-proposal"),
      false,
    );
  } finally {
    h.memory.close();
  }
});

test("controller errors are safe and do not echo upstream secrets", async () => {
  const h = setup(async () => {
    throw new Error("secret-provider-key-private-prompt");
  });
  try {
    const result = await h.runtime.plan();
    rejects(result, "controller-failed");
    assert.equal(JSON.stringify(result).includes("secret-provider-key"), false);
  } finally {
    h.memory.close();
  }
});

test("session updates during controller work reject stale output", async () => {
  let finish: ((value: unknown) => void) | undefined;
  const h = setup(
    async () =>
      await new Promise((resolve) => {
        finish = resolve;
      }),
  );
  try {
    const pending = h.runtime.plan();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const changed = structuredClone(h.s);
    changed.context.reportId = "changed-report";
    changed.context.contextRevision = "changed-revision";
    unwrap(h.runtime.setSession(changed));
    finish!(fixture("plan-daily"));
    rejects(await pending, "stale-context");
    assert.equal(
      unwrap(h.runtime.history()).some((e) => e.eventType === "plan-proposal"),
      false,
    );
  } finally {
    h.memory.close();
  }
});

test("clock deadline is rechecked after controller completion", async () => {
  let advance: (ms: number) => void = () => {};
  const h = setup(async () => {
    advance(360_000);
    return fixture("plan-daily");
  });
  advance = h.advance;
  try {
    rejects(await h.runtime.plan(), "expired");
  } finally {
    h.memory.close();
  }
});

test("expired cached proposal is refused without new controller work", async () => {
  let calls = 0;
  const h = setup(async () => {
    calls++;
    return fixture("plan-daily");
  });
  try {
    unwrap(await h.runtime.plan());
    h.advance(360_000);
    rejects(await h.runtime.plan(), "expired");
    assert.equal(calls, 1);
  } finally {
    h.memory.close();
  }
});

test("plan semantic checks reject unsupported intents, exact argument errors and non-DAG dependencies", async (t) => {
  const mutations: Record<string, (p: PlanProposal) => void> = {
    "unsupported-intent": (p) => {
      p.tasks[0].intentId = "remote-shell";
    },
    "unknown-parameter": (p) => {
      p.tasks[0].arguments.extra = { type: "boolean", value: true };
    },
    "missing-parameter": (p) => {
      delete p.tasks[0].arguments.area;
    },
    "hidden-entity": (p) => {
      p.tasks[0].arguments.area = {
        type: "entity-ref",
        entityId: "secret-room",
      };
    },
    "wrong-type": (p) => {
      p.tasks[0].arguments.area = { type: "boolean", value: true };
    },
    "wrong-unit": (p) => {
      p.tasks[1].arguments.amount = {
        type: "quantity",
        value: 100,
        unit: "liters",
      };
    },
    "above-maximum": (p) => {
      p.tasks[1].arguments.amount = {
        type: "quantity",
        value: 101,
        unit: "ml",
      };
    },
    "below-minimum": (p) => {
      p.tasks[1].arguments.amount = { type: "quantity", value: 0, unit: "ml" };
    },
    "duplicate-task": (p) => {
      p.tasks[1].taskId = p.tasks[0].taskId;
    },
    cycle: (p) => {
      p.tasks[0].dependsOnTaskIds = [p.tasks[1].taskId];
    },
    "missing-dependency": (p) => {
      p.tasks[0].dependsOnTaskIds = ["not-present"];
    },
    "changed-horizon": (p) => {
      if (p.horizon.basis === "world-ticks") p.horizon.toTick++;
    },
    "wrong-request": (p) => {
      p.requestId = "different-request";
    },
    "stale-revision": (p) => {
      p.environmentRevision = "old";
    },
    "required-extension": (p) => {
      p.requiredExtensions = ["example.unknown"];
    },
  };
  for (const [name, mutate] of Object.entries(mutations))
    await t.test(name, async () => {
      const h = setup(async () => {
        const p = fixture<PlanProposal>("plan-daily");
        mutate(p);
        return p;
      });
      try {
        assert.equal((await h.runtime.plan()).ok, false);
        assert.equal(
          unwrap(h.runtime.history()).some(
            (e) => e.eventType === "plan-proposal",
          ),
          false,
        );
      } finally {
        h.memory.close();
      }
    });
});

test("profile/request limits and choice descriptors constrain plans", async () => {
  const s = session();
  s.context.planningRequest!.maxTasks = 1;
  const h = setup(async () => ({
    ...fixture<PlanProposal>("plan-daily"),
    contextReportId: "bounded-context",
  }));
  try {
    s.context.reportId = "bounded-context";
    unwrap(h.runtime.setSession(s));
    rejects(await h.runtime.plan(), "invalid-plan");
  } finally {
    h.memory.close();
  }
  const memory = unwrap(openSQLiteMemory(":memory:"));
  try {
    const p = fixture<PlanProposal>("plan-daily");
    const s2 = session();
    s2.profile.hostIntents[0].parameters = [
      { name: "area", type: "choice", required: true, choices: ["herbs"] },
    ];
    p.tasks[0].arguments.area = { type: "choice", value: "vegetables" };
    const runtime = createRuntime({
      memory,
      controller: async () => p,
      now: () => new Date(initialTime),
    });
    unwrap(runtime.setSession(s2));
    rejects(await runtime.plan(), "invalid-plan");
  } finally {
    memory.close();
  }
});

test("malformed, oversized output and requests cannot enter recorded proposals", async () => {
  for (const output of [
    { kind: "plan-proposal" },
    { huge: "x".repeat(70_000) },
  ]) {
    const h = setup(async () => output);
    try {
      assert.equal((await h.runtime.plan()).ok, false);
      assert.equal(
        unwrap(h.runtime.history()).some(
          (e) => e.eventType === "plan-proposal",
        ),
        false,
      );
    } finally {
      h.memory.close();
    }
  }
  let calls = 0;
  const h = setup(async () => {
    calls++;
    return {};
  });
  try {
    rejects(
      await h.runtime.conversation({ content: "x".repeat(70_000) }),
      "budget-exceeded",
    );
    assert.equal(calls, 0);
  } finally {
    h.memory.close();
  }
});

test("conversation requires a trusted trigger, modality, participants and channel before controller work", async (t) => {
  const changes: Record<string, (r: ConversationRequest) => void> = {
    "forced-presence": (r) => {
      r.mode = "live-channel";
      r.trigger = "presence-event";
    },
    "unsupported-text": (r) => {
      r.requestedModality = "text";
    },
    "wrong-channel": (r) => {
      r.channelId = "not-authorized";
    },
    "unverified-recipient": (r) => {
      r.recipientParticipantIds = ["outsider"];
    },
    "wrong-speaker": (r) => {
      r.speakerParticipantId = "participant-visitor";
    },
    "unverified-message": (r) => {
      r.messages[0].participantId = "outsider";
    },
  };
  for (const [name, mutate] of Object.entries(changes))
    await t.test(name, async () => {
      let calls = 0;
      const h = setup(async () => {
        calls++;
        return fixture("conversation-requested-response");
      });
      try {
        h.advance(121_000);
        unwrap(h.runtime.setSession(chatSession(h.s)));
        const r = fixture<ConversationRequest>(
          "conversation-requested-request",
        );
        mutate(r);
        assert.equal((await h.runtime.conversation(r)).ok, false);
        assert.equal(calls, 0);
      } finally {
        h.memory.close();
      }
    });
});

test("conversation output cannot change requested recipients, correlation or modality", async () => {
  const h = setup(async () => ({
    ...fixture<ConversationResponse>("conversation-requested-response"),
    recipientParticipantIds: ["participant-mira"],
  }));
  try {
    h.advance(121_000);
    unwrap(h.runtime.setSession(chatSession(h.s)));
    rejects(
      await h.runtime.conversation(fixture("conversation-requested-request")),
      "correlation",
    );
  } finally {
    h.memory.close();
  }
});

test("cached conversation response expiry is checked independently of request deadline", async () => {
  let calls = 0;
  const h = setup(async () => {
    calls++;
    return {
      ...fixture<ConversationResponse>("conversation-requested-response"),
      expiresAt: "2026-01-01T08:02:02Z",
    };
  });
  try {
    h.advance(121_000);
    unwrap(h.runtime.setSession(chatSession(h.s)));
    unwrap(
      await h.runtime.conversation(fixture("conversation-requested-request")),
    );
    h.advance(123_000);
    rejects(
      await h.runtime.conversation(fixture("conversation-requested-request")),
      "expired",
    );
    assert.equal(calls, 1);
  } finally {
    h.memory.close();
  }
});

test("host decisions cover every task, aggregate correctly and preserve accepted dependencies", async () => {
  const h = setup();
  try {
    unwrap(await h.runtime.plan());
    const decision = fixture<PlanDecision>("plan-partial-decision");
    rejects(
      h.runtime.recordDecision({ ...decision, taskDecisions: [] }),
      "invalid-plan",
    );
    rejects(
      h.runtime.recordDecision({ ...decision, status: "accepted" }),
      "invalid-plan",
    );
    rejects(
      h.runtime.recordDecision({
        ...decision,
        taskDecisions: [
          { taskId: "task-inspect", decision: "rejected" },
          { taskId: "task-tend", decision: "accepted" },
        ],
      }),
      "invalid-plan",
    );
    rejects(h.runtime.recordReport(fixture("task-outcome")), "correlation");
    unwrap(h.runtime.recordDecision(decision));
    rejects(
      h.runtime.recordDecision({ ...decision, decisionId: "another-decision" }),
      "conflict",
    );
  } finally {
    h.memory.close();
  }
});

test("scope recall requires every intended recipient and authorized character/source", () => {
  const h = setup();
  try {
    const base = fixture<MemoryEvent>("memory-event-observed");
    const publicEvent = {
      ...base,
      memoryId: "public-event",
      scope: {
        audience: "public" as const,
        participantIds: [],
        export: "forbidden" as const,
      },
    };
    const privateEvent = { ...base, memoryId: "private-event" };
    const otherEnvironment = {
      ...publicEvent,
      memoryId: "other-source",
      environmentId: "other-world",
    };
    const other = {
      ...h.s.character,
      characterId: "other-character",
      participantId: "other-participant",
    };
    unwrap(h.memory.putCharacter(other));
    const otherCharacter = {
      ...publicEvent,
      memoryId: "other-character-event",
      characterId: "other-character",
    };
    unwrap(
      h.memory.commit({
        events: [publicEvent, privateEvent, otherEnvironment, otherCharacter],
        exchanges: [],
      }),
    );
    const self = unwrap(h.runtime.history());
    assert.equal(
      self.some((e) => e.memoryId === "private-event"),
      true,
    );
    const shared = unwrap(
      h.runtime.history({
        audienceParticipantIds: ["participant-mira", "participant-visitor"],
      }),
    );
    assert.equal(
      shared.some((e) => e.memoryId === "private-event"),
      false,
    );
    assert.equal(
      shared.some((e) => e.memoryId === "public-event"),
      true,
    );
    assert.equal(
      shared.some(
        (e) =>
          e.memoryId === "other-source" ||
          e.memoryId === "other-character-event",
      ),
      false,
    );
    rejects(
      h.runtime.history({ audienceParticipantIds: ["outsider"] }),
      "unauthorized",
    );
    assert.equal(unwrap(h.runtime.history({ maxBytes: 1 })).length, 0);
    rejects(h.runtime.history({ limit: 1000 }), "budget-exceeded");
  } finally {
    h.memory.close();
  }
});

test("planning and public recording never broaden selected memory scope", async () => {
  let selected: MemoryEvent[] = [];
  const h = setup(async (input) => {
    selected = input.memories;
    return fixture("plan-daily");
  });
  try {
    const base = fixture<MemoryEvent>("memory-event-observed");
    unwrap(h.memory.commit({ events: [base], exchanges: [] }));
    unwrap(await h.runtime.plan());
    assert.equal(
      selected.some((e) => e.memoryId === base.memoryId),
      false,
    );
    const publicSession = structuredClone(h.s);
    publicSession.access.memoryScope = {
      audience: "public",
      participantIds: [],
      export: "forbidden",
    };
    publicSession.context.reportId = "public-context";
    publicSession.context.planningRequest!.requestId = "public-plan-request";
    unwrap(h.runtime.setSession(publicSession));
    // This controller's unchanged plan fails correlation; its selected evidence is still observable.
    rejects(await h.runtime.plan(), "correlation");
    assert.equal(
      selected.every((e) => e.scope.audience === "public"),
      true,
    );
  } finally {
    h.memory.close();
  }
});

test("atomic memory conflicts roll back other records and enforce valid scopes", () => {
  const h = setup();
  try {
    const base = fixture<MemoryEvent>("memory-event-observed");
    unwrap(h.memory.commit({ events: [base], exchanges: [] }));
    rejects(
      h.memory.commit({
        events: [
          { ...base, summary: "conflict" },
          { ...base, memoryId: "must-not-exist" },
        ],
        exchanges: [
          {
            id: "must-not-exist",
            characterId: h.s.character.characterId,
            category: "test",
            input: {},
            result: {},
          },
        ],
      }),
      "conflict",
    );
    assert.equal(unwrap(h.memory.getExchange("must-not-exist")), undefined);
    assert.equal(
      unwrap(h.runtime.history()).some((e) => e.memoryId === "must-not-exist"),
      false,
    );
    rejects(
      h.memory.commit({
        events: [
          {
            ...base,
            memoryId: "invalid-scope",
            scope: {
              audience: "public",
              participantIds: ["participant-mira"],
              export: "allowed",
            },
          },
        ],
        exchanges: [],
      }),
      "invalid-document",
    );
    const extraCharacter = {
      ...h.s.character,
      characterId: "rolled-back-character",
    };
    rejects(
      h.memory.commit({
        characters: [extraCharacter],
        events: [{ ...base, summary: "conflict" }],
        exchanges: [],
      }),
      "conflict",
    );
    assert.equal(
      unwrap(h.memory.getCharacter(extraCharacter.characterId)),
      undefined,
    );
  } finally {
    h.memory.close();
  }
});

test("file database ownership is exclusive, retained stale locks require manual recovery, close is idempotent", () => {
  const directory = mkdtempSync(join(tmpdir(), "ifsoul-ownership-"));
  const filename = join(directory, "memory.sqlite");
  let memory: MemoryPort | undefined;
  try {
    memory = unwrap(openSQLiteMemory(filename));
    rejects(openSQLiteMemory(filename), "database-owned");
    unwrap(memory.close());
    unwrap(memory.close());
    rejects(memory.getCharacter("anything"), "closed");
    memory = unwrap(openSQLiteMemory(filename));
    unwrap(memory.close());
    memory = undefined;
    writeFileSync(`${filename}.lock`, "synthetic possibly-live owner");
    rejects(openSQLiteMemory(filename), "database-owned");
    assert.equal(
      readFileSync(`${filename}.lock`, "utf8"),
      "synthetic possibly-live owner",
    );
  } finally {
    memory?.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test("database open failure cleans owned lock and safe errors disclose no path", () => {
  const directory = mkdtempSync(join(tmpdir(), "ifsoul-invalid-db-"));
  const filename = join(directory, "private-database.sqlite");
  try {
    writeFileSync(filename, "not sqlite");
    const result = openSQLiteMemory(filename);
    rejects(result, "storage");
    assert.equal(existsSync(`${filename}.lock`), false);
    assert.equal(JSON.stringify(result).includes(filename), false);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("call budgets, no-session and closed storage produce typed safe failures", async () => {
  const memory = unwrap(openSQLiteMemory(":memory:"));
  try {
    const runtime = createRuntime({
      memory,
      controller: async () => fixture("plan-daily"),
      now: () => new Date(initialTime),
      limits: { maxCalls: 1 },
    });
    rejects(await runtime.plan(), "no-session");
    const s = session();
    unwrap(runtime.setSession(s));
    unwrap(await runtime.plan());
    const next = structuredClone(s);
    next.context.reportId = "another-report";
    next.context.planningRequest!.requestId = "another-request";
    unwrap(runtime.setSession(next));
    rejects(await runtime.plan(), "budget-exceeded");
    unwrap(memory.close());
    rejects(runtime.history(), "closed");
  } finally {
    memory.close();
  }
});

test("conversation selection covers the broader recording audience and public scope", async () => {
  let selected: MemoryEvent[] = [];
  const h = setup(async (input) => {
    selected = input.memories;
    return fixture("conversation-requested-response");
  });
  try {
    const base = fixture<MemoryEvent>("memory-event-observed");
    base.scope = {
      audience: "participants",
      participantIds: ["participant-mira", "participant-visitor"],
      export: "forbidden",
    };
    unwrap(h.memory.commit({ exchanges: [], events: [base] }));
    const wider = chatSession(h.s);
    wider.access.verifiedParticipantIds.push("participant-observer");
    wider.access.memoryScope.participantIds.push("participant-observer");
    h.advance(121_000);
    unwrap(h.runtime.setSession(wider));
    unwrap(
      await h.runtime.conversation(fixture("conversation-requested-request")),
    );
    assert.equal(
      selected.some((event) => event.memoryId === base.memoryId),
      false,
    );
    const publicSession = structuredClone(wider);
    publicSession.context.reportId = "conversation-public-context";
    publicSession.access.memoryScope = {
      audience: "public",
      participantIds: [],
      export: "forbidden",
    };
    unwrap(h.runtime.setSession(publicSession));
    const request = fixture<ConversationRequest>(
      "conversation-requested-request",
    );
    request.requestId = "public-conversation-request";
    // The scenario output has a different request ID, but selection must still be public-only.
    rejects(await h.runtime.conversation(request), "correlation");
    assert.equal(
      selected.every((event) => event.scope.audience === "public"),
      true,
    );
  } finally {
    h.memory.close();
  }
});
