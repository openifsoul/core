import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import {
  accepts,
  check,
  createRegistry,
  jsonPaths,
  kinds,
  prefix,
  readBytes,
  rejects,
} from "./current-helpers.mjs";

const ajv = await createRegistry();
const paths = await jsonPaths("specs/current/examples", [".json", ".jsonl"]);
const examples = new Map();
const exampleBytes = new Map();
for (const path of paths) {
  const bytes = await readBytes(path);
  exampleBytes.set(path, bytes);
  if (path.endsWith(".jsonl")) {
    const lines = bytes
      .toString("utf8")
      .split(/\r?\n/)
      .filter((line) => line.trim());
    assert.ok(lines.length, `empty normative stream: ${path}`);
    for (const [index, line] of lines.entries())
      examples.set(`${path}:${index + 1}`, JSON.parse(line));
  } else examples.set(path, JSON.parse(bytes.toString("utf8")));
}
function example(name) {
  const path = `specs/current/examples/${name}.json`;
  assert.ok(
    examples.has(path),
    `required normative example is absent: ${path}`,
  );
  return structuredClone(examples.get(path));
}

test("current local strict registry compiles independently of the separate ModelProvider family", () => {
  assert.equal(typeof ajv.getSchema(`${prefix}model-provider`), "function");
  assert.equal(check(ajv, {}, "common").valid, false);
  assert.deepEqual(
    [
      ...new Set([...examples.values()].map((document) => document.kind)),
    ].sort(),
    Object.keys(kinds).sort(),
    "the normative examples must cover every current document kind; absence is never skipped",
  );
});

for (const [path, document] of examples) {
  test(`current normative structure: ${path}`, () => accepts(ajv, document));
}

test("current rejects v0.1 versions without coercing or deleting fields", () => {
  const document = example("character-instance");
  document.schemaVersion = "draft-0.1.0";
  rejects(ajv, document, "const", "/schemaVersion");
  const template = example("character-template");
  template.revision = "1";
  rejects(ajv, template, "type", "/revision");
});

test("authored biography remains fiction and cannot carry personal instance history", () => {
  const template = example("character-template");
  template.profile.authoredBiography.fictional = false;
  rejects(ajv, template, "const", "/profile/authoredBiography/fictional");
  template.profile.authoredBiography.fictional = true;
  template.memoryRecordIds = ["event-inspection"];
  rejects(ajv, template, "additionalProperties", "");
});

test("requested-only communication forbids unsolicited messages regardless of planning cadence", () => {
  const environment = example("environment-game");
  assert.equal(environment.communication.mode, "host-requested");
  assert.equal(environment.planning.cadence, "daily");
  environment.communication.allowUnrequestedMessages = true;
  rejects(ajv, environment, "const", "/communication/allowUnrequestedMessages");
});

test("host-requested dialogue rejects an incoming-message trigger", () => {
  const request = example("conversation-requested-request");
  request.trigger = "incoming-message";
  rejects(ajv, request, "const", "/trigger");
});

test("chat requires neither game ticks nor humanoid embodiment nor game intentions", () => {
  const environment = example("environment-chat");
  assert.equal(environment.medium, "chat");
  assert.equal("worldTime" in environment, false);
  assert.deepEqual(environment.hostIntents, []);
  environment.embodiment.form = "distributed-moss-network";
  environment.embodiment.modalities = [];
  accepts(ajv, environment);
  const request = example("conversation-live-request");
  assert.equal("worldTime" in request, false);
  accepts(ajv, request);
});

test("conversation output is a proposal, while delivery is a separately correlated report", () => {
  const response = example("conversation-requested-response");
  response.deliveryStatus = "delivered";
  rejects(ajv, response, "additionalProperties", "");
  const delivery = example("conversation-delivery");
  delete delivery.responseId;
  rejects(ajv, delivery, "required", "");
});

test("plan tasks cannot contain a raw command, movement path or shooting-loop field", () => {
  for (const field of [
    "command",
    "movementPath",
    "shootingLoop",
    "npcStateMachine",
  ]) {
    const plan = example("plan-daily");
    plan.tasks[0][field] = "synthetic forbidden controller payload";
    rejects(ajv, plan, "additionalProperties", "/tasks/0");
  }
});

test("host vocabulary arguments are tagged values, never executable strings or coerced numbers", () => {
  const plan = example("plan-daily");
  plan.tasks[0].arguments.area = "walk-to herb-area";
  rejects(ajv, plan, "type", "/tasks/0/arguments/area");
  plan.tasks[0].arguments.area = { type: "entity-ref", entityId: "herb-area" };
  plan.tasks[1].arguments.amount.value = "100";
  rejects(ajv, plan, "type", "/tasks/1/arguments/amount/value");
});

test("all four host descriptor/tag variants are structurally available", () => {
  const environment = example("environment-game");
  environment.hostIntents[0].parameters.push(
    {
      name: "careMode",
      type: "choice",
      required: false,
      choices: ["gentle", "ordinary"],
    },
    { name: "reportOnly", type: "boolean", required: false },
  );
  accepts(ajv, environment);
  const plan = example("plan-daily");
  plan.tasks[0].arguments.careMode = { type: "choice", value: "gentle" };
  plan.tasks[0].arguments.reportOnly = { type: "boolean", value: true };
  accepts(ajv, plan);
});

test("one proposal is bounded without imposing a lifetime history cap", () => {
  const plan = example("plan-daily");
  plan.tasks = Array.from({ length: 17 }, (_, index) => ({
    ...plan.tasks[0],
    taskId: `task-${index}`,
  }));
  rejects(ajv, plan, "maxItems", "/tasks");
  const character = example("character-instance");
  character.memoryRecordIds = Array.from(
    { length: 2048 },
    (_, index) => `retained-event-${index}`,
  );
  accepts(ajv, character);
  const working = example("memory-working-context");
  working.relevantMemoryIds = Array.from(
    { length: 65 },
    (_, index) => `selected-event-${index}`,
  );
  rejects(ajv, working, "maxItems", "/relevantMemoryIds");
});

test("a portable intent checkpoint cannot carry execution handles or provider secrets", () => {
  for (const field of [
    "hostTaskId",
    "executionToken",
    "apiKey",
    "providerConfig",
  ]) {
    const checkpoint = example("intent-checkpoint");
    checkpoint.intents[0][field] = "synthetic-disallowed-value";
    rejects(ajv, checkpoint, "additionalProperties", "/intents/0");
  }
});

test("working and long-term memory retain provenance and distinct required fields", () => {
  const fact = example("memory-fact");
  fact.sourceMemoryIds = [];
  rejects(ajv, fact, "minItems", "/sourceMemoryIds");
  const working = example("memory-working-context");
  delete working.expiresAt;
  rejects(ajv, working, "required", "");
  const observed = example("memory-event-observed");
  observed.provenance.sources[0].sourceType = "universal-truth";
  rejects(ajv, observed, "enum", "/provenance/sources/0/sourceType");
});

// The following checks inspect these authored fixtures only. They implement no
// scheduler, policy engine, general semantic validator, bridge or host controller.
function assertDailyFixture(environment, context, plan) {
  assert.deepEqual(context.binding, environment.binding);
  assert.deepEqual(plan.binding, environment.binding);
  assert.equal(context.environmentRevision, environment.revision);
  assert.equal(plan.environmentRevision, environment.revision);
  assert.equal(plan.contextRevision, context.contextRevision);
  assert.equal(plan.contextReportId, context.reportId);
  assert.equal(plan.correlationId, context.correlationId);
  assert.equal(plan.requestId, context.planningRequest.requestId);
  assert.deepEqual(plan.horizon, context.planningRequest.horizon);
  assert.ok(plan.tasks.length <= context.planningRequest.maxTasks);
  assert.ok(plan.tasks.length <= environment.planning.maxTasks);
  assert.ok(Date.parse(plan.expiresAt) > Date.parse(plan.createdAt));
  assert.ok(Date.parse(plan.expiresAt) > Date.parse(context.recordedAt));
  for (const task of plan.tasks) {
    assert.ok(context.planningRequest.allowedIntentIds.includes(task.intentId));
    assert.ok(
      environment.hostIntents.some(
        (intent) => intent.intentId === task.intentId,
      ),
    );
  }
  // Exact fixture-specific vocabulary/parameter checks, not a descriptor interpreter.
  assert.equal(plan.tasks[0].intentId, "inspect-area");
  assert.deepEqual(plan.tasks[0].arguments, {
    area: { type: "entity-ref", entityId: "herb-area" },
  });
  assert.equal(plan.tasks[1].intentId, "tend-plot");
  assert.deepEqual(plan.tasks[1].arguments.plot, {
    type: "entity-ref",
    entityId: "plot-1",
  });
  const amount = plan.tasks[1].arguments.amount;
  const descriptor = environment.hostIntents
    .find((intent) => intent.intentId === "tend-plot")
    .parameters.find((parameter) => parameter.name === "amount");
  assert.equal(amount.type, descriptor.type);
  assert.equal(amount.unit, descriptor.unit);
  assert.ok(
    amount.value >= descriptor.minimum && amount.value <= descriptor.maximum,
  );
}

test("static daily fixture links the briefing to only host-supported bounded intentions", () => {
  assertDailyFixture(
    example("environment-game"),
    example("context-daily"),
    example("plan-daily"),
  );
});

test("static fixture checks reject stale correlation, revisions, expiry and unsupported vocabulary", () => {
  for (const change of [
    (plan) => (plan.binding.sessionId = "other-session"),
    (plan) => (plan.correlationId = "other-cycle"),
    (plan) => (plan.requestId = "unsolicited-request"),
    (plan) => (plan.contextRevision = "obsolete-context"),
    (plan) => (plan.environmentRevision = "obsolete-profile"),
    (plan) => (plan.expiresAt = "2025-01-01T00:00:00Z"),
    (plan) => (plan.tasks[0].intentId = "raw-pathfinding"),
    (plan) => (plan.tasks[1].arguments.amount.value = 101),
    (plan) => (plan.tasks[1].arguments.amount.unit = "litres"),
  ]) {
    const plan = example("plan-daily");
    change(plan);
    accepts(ajv, plan); // Cross-document validity is deliberately not a schema claim.
    assert.throws(
      () =>
        assertDailyFixture(
          example("environment-game"),
          example("context-daily"),
          plan,
        ),
      assert.AssertionError,
    );
  }
});

function assertAdoptionFixture(plan, decision, progress, outcome) {
  for (const report of [decision, progress, outcome]) {
    assert.deepEqual(report.binding, plan.binding);
    assert.equal(report.planId, plan.planId);
    assert.equal(report.correlationId, plan.correlationId);
  }
  assert.equal(decision.requestId, plan.requestId);
  assert.equal(decision.contextRevision, plan.contextRevision);
  assert.equal(decision.status, "partially-accepted");
  assert.deepEqual(
    decision.taskDecisions.map(({ taskId, decision: status }) => [
      taskId,
      status,
    ]),
    [
      ["task-inspect", "accepted"],
      ["task-tend", "rejected"],
    ],
  );
  assert.equal(progress.taskId, "task-inspect");
  assert.equal(progress.status, "running");
  assert.deepEqual(progress.observedEffects, []);
  assert.equal(outcome.taskId, "task-inspect");
  assert.equal(outcome.status, "succeeded");
  assert.ok(outcome.observedEffects.length > 0);
  assert.ok(Date.parse(decision.recordedAt) < Date.parse(progress.recordedAt));
  assert.ok(Date.parse(progress.recordedAt) < Date.parse(outcome.recordedAt));
}

test("static host adoption is separate from progress and terminal execution evidence", () => {
  assertAdoptionFixture(
    example("plan-daily"),
    example("plan-partial-decision"),
    example("task-progress"),
    example("task-outcome"),
  );
  const rejectedTaskOutcome = example("task-outcome");
  rejectedTaskOutcome.taskId = "task-tend";
  accepts(ajv, rejectedTaskOutcome);
  assert.throws(
    () =>
      assertAdoptionFixture(
        example("plan-daily"),
        example("plan-partial-decision"),
        example("task-progress"),
        rejectedTaskOutcome,
      ),
    assert.AssertionError,
  );
});

test("cancellation is a correlated request/result, including already-finished and unknown outcomes", () => {
  const request = example("plan-cancel-request");
  const result = example("plan-cancel-result");
  for (const field of [
    "binding",
    "correlationId",
    "planId",
    "cancellationId",
  ]) {
    assert.deepEqual(result[field], request[field]);
  }
  assert.equal(result.taskResults[0].status, "already-finished");
  assert.ok(request.taskIds.includes(result.taskResults[0].taskId));
  result.taskResults[0].status = "unknown";
  accepts(ajv, result);
  request.status = "cancelled";
  rejects(ajv, request, "additionalProperties", "");
});

function assertConversationFixture(environment, request, response, delivery) {
  assert.deepEqual(request.binding, environment.binding);
  assert.deepEqual(response.binding, request.binding);
  assert.equal(request.environmentRevision, environment.revision);
  assert.equal(request.mode, environment.communication.mode);
  assert.ok(environment.communication.channelIds.includes(request.channelId));
  for (const field of [
    "requestId",
    "correlationId",
    "channelId",
    "speakerParticipantId",
    "recipientParticipantIds",
  ]) {
    assert.deepEqual(response[field], request[field]);
  }
  assert.ok(Date.parse(response.createdAt) >= Date.parse(request.receivedAt));
  assert.ok(Date.parse(response.createdAt) < Date.parse(request.deadlineAt));
  assert.ok(Date.parse(response.expiresAt) <= Date.parse(request.deadlineAt));
  if (response.output.type === "utterance") {
    assert.equal(response.output.modality, request.requestedModality);
    assert.ok(
      environment.embodiment.modalities.includes(response.output.modality),
    );
  } else {
    assert.equal(response.output.reason, "unsupported-modality");
    assert.equal(
      environment.embodiment.modalities.includes(request.requestedModality),
      false,
    );
  }
  if (delivery) {
    for (const field of [
      "binding",
      "requestId",
      "correlationId",
      "channelId",
      "responseId",
    ]) {
      assert.deepEqual(delivery[field], response[field]);
    }
    assert.equal(delivery.status, "delivered");
    assert.ok(
      Date.parse(delivery.recordedAt) >= Date.parse(response.createdAt),
    );
  }
}

test("static requested, live chat and speechless embodiment examples remain separate modes", () => {
  assertConversationFixture(
    example("environment-game"),
    example("conversation-requested-request"),
    example("conversation-requested-response"),
    example("conversation-delivery"),
  );
  assertConversationFixture(
    example("environment-chat"),
    example("conversation-live-request"),
    example("conversation-live-response"),
  );
  assertConversationFixture(
    example("environment-no-speech"),
    example("conversation-no-speech-request"),
    example("conversation-no-speech-response"),
  );
  assert.equal(
    example("environment-chat").communication.allowUnrequestedMessages,
    false,
  );
  assert.deepEqual(example("environment-chat").hostIntents, []);
});

test("static conversation checks reject forged speech, mismatched response correlation and delivery", () => {
  const horseSpeech = example("conversation-no-speech-response");
  horseSpeech.output = {
    type: "utterance",
    modality: "speech",
    content: "Synthetic unsupported speech.",
  };
  accepts(ajv, horseSpeech);
  assert.throws(
    () =>
      assertConversationFixture(
        example("environment-no-speech"),
        example("conversation-no-speech-request"),
        horseSpeech,
      ),
    assert.AssertionError,
  );
  for (const field of ["requestId", "correlationId", "channelId"]) {
    const response = example("conversation-requested-response");
    response[field] = "unrelated-id";
    accepts(ajv, response);
    assert.throws(
      () =>
        assertConversationFixture(
          example("environment-game"),
          example("conversation-requested-request"),
          response,
        ),
      assert.AssertionError,
    );
  }
  const delivery = example("conversation-delivery");
  delivery.responseId = "different-response";
  accepts(ajv, delivery);
  assert.throws(
    () =>
      assertConversationFixture(
        example("environment-game"),
        example("conversation-requested-request"),
        example("conversation-requested-response"),
        delivery,
      ),
    assert.AssertionError,
  );
});

test("static stable identity crosses environments while observed history retains host provenance", () => {
  const character = example("character-instance");
  const game = example("environment-game");
  const chat = example("environment-chat");
  assert.equal(game.binding.characterId, character.characterId);
  assert.equal(chat.binding.characterId, character.characterId);
  assert.notEqual(game.binding.embodimentId, chat.binding.embodimentId);
  assert.ok(
    game.participantLinks.some(
      (link) => link.participantId === character.participantId,
    ),
  );
  assert.ok(
    chat.participantLinks.some(
      (link) => link.participantId === character.participantId,
    ),
  );
  const observed = example("memory-event-observed");
  const authored = example("intent-checkpoint");
  assert.equal(character.profile.authoredBiography.fictional, true);
  assert.deepEqual(observed.provenance.sources, [
    { sourceType: "host-report", sourceId: example("task-outcome").reportId },
  ]);
  assert.equal(authored.provenance.sources[0].sourceType, "authored");
  assert.ok(
    Date.parse(observed.recordedAt) >=
      Date.parse(example("task-outcome").recordedAt),
  );
  for (const name of [
    "memory-working-context",
    "memory-episode",
    "memory-fact",
  ]) {
    const memory = example(name);
    assert.equal(memory.characterId, character.characterId);
    assert.ok(
      memory.provenance.sources.some(
        (source) => source.sourceType === "memory",
      ),
    );
    assert.deepEqual(memory.scope, observed.scope);
  }
  const relationship = example("memory-relationship");
  const conversation = example("memory-event-conversation");
  assert.equal(relationship.subjectParticipantId, character.participantId);
  assert.deepEqual(relationship.sourceMemoryIds, [conversation.memoryId]);
  assert.deepEqual(
    relationship.provenance.sources,
    conversation.provenance.sources,
  );
  assert.equal(conversation.provenance.sources[0].sourceType, "conversation");
});

function archive(mode) {
  const matches = [...examples.values()].filter(
    (document) =>
      document.kind === "archive-manifest" &&
      document.transferIntent.mode === mode,
  );
  assert.equal(
    matches.length,
    1,
    `expected one normative ${mode} archive; absence is never skipped`,
  );
  return structuredClone(matches[0]);
}

test("resume and fork are disjoint archive requests rather than imported execution rights", () => {
  const resume = archive("resume");
  const fork = archive("fork");
  accepts(ajv, resume);
  accepts(ajv, fork);
  resume.transferIntent.newCharacterId = "character-copy";
  rejects(ajv, resume, "additionalProperties", "/transferIntent");
  for (const field of ["newCharacterId", "newParticipantId"]) {
    const missingIdentity = structuredClone(fork);
    delete missingIdentity.transferIntent[field];
    rejects(ajv, missingIdentity, "required", "/transferIntent");
  }
});

test("archive envelopes exclude credential configuration and active host execution handles", () => {
  for (const field of [
    "apiKey",
    "providerConfig",
    "executionToken",
    "hostTaskId",
    "writerLease",
  ]) {
    const document = archive("resume");
    document[field] = "synthetic-disallowed-value";
    rejects(ajv, document, "additionalProperties", "");
  }
  const document = archive("resume");
  document.files[0].path = "../escape.json";
  rejects(ajv, document, "pattern", "/files/0/path");
});

function assertArchiveFixture(resume, fork, checkpoint, character) {
  assert.equal(resume.characterId, character.characterId);
  assert.equal(
    resume.transferIntent.expectedCharacterId,
    character.characterId,
  );
  assert.equal(fork.characterId, character.characterId);
  assert.notEqual(fork.transferIntent.newCharacterId, character.characterId);
  assert.notEqual(
    fork.transferIntent.newParticipantId,
    character.participantId,
  );
  assert.equal(checkpoint.characterId, character.characterId);
  assert.ok(resume.portableCheckpointIds.includes(checkpoint.memoryId));
  assert.ok(fork.portableCheckpointIds.includes(checkpoint.memoryId));
  assert.ok(character.memoryRecordIds.includes(checkpoint.memoryId));
  assert.equal(checkpoint.intents[0].portableIntentId, "learn-herb-care");
  assert.equal(checkpoint.provenance.sources[0].sourceType, "authored");
  for (const document of [resume, fork]) {
    assert.ok(
      document.schemaInventory.every((entry) =>
        ["character", "memory"].some(
          (stem) => entry.schemaId === `${prefix}${stem}`,
        ),
      ),
    );
    assert.ok(
      document.files.every((entry) =>
        ["character-template", "character-instance", "memory"].includes(
          entry.role,
        ),
      ),
    );
  }
}

test("static archive identities/checkpoints distinguish continuity intent from host task resumption", () => {
  assertArchiveFixture(
    archive("resume"),
    archive("fork"),
    example("intent-checkpoint"),
    example("character-instance"),
  );
  const fork = archive("fork");
  fork.transferIntent.newCharacterId = fork.characterId;
  accepts(ajv, fork); // Identity freshness and ownership fencing are future consumer checks.
  assert.throws(
    () =>
      assertArchiveFixture(
        archive("resume"),
        fork,
        example("intent-checkpoint"),
        example("character-instance"),
      ),
    assert.AssertionError,
  );
});

test("raw memory requires the original recorded payload while summaries remain optional annotations", () => {
  const observed = example("memory-event-observed");
  delete observed.recordedPayload;
  rejects(ajv, observed, "required", "");
  const withUnknownContent = example("memory-event-observed");
  delete withUnknownContent.summary;
  withUnknownContent.recordedPayload.unknownHostObservation = {
    label: "Original synthetic field retained without interpretation.",
    values: [1, false, "untrusted text"],
  };
  accepts(ajv, withUnknownContent);
});

function assertOriginalPayloads(records) {
  const originals = new Map([
    ["event-inspection", example("task-outcome")],
    ["event-plan-proposal", example("plan-daily")],
    ["event-plan-proposed", example("plan-partial-decision")],
    [
      "event-visitor-question",
      example("conversation-requested-request").messages[0],
    ],
  ]);
  for (const [id, original] of originals) {
    const event = records.find((record) => record.memoryId === id);
    assert.ok(event, `missing original event ${id}`);
    assert.equal(event.kind, "memory-event");
    assert.deepEqual(
      event.recordedPayload,
      original,
      `${id} must retain received original content`,
    );
  }
}

test("static archive bytes/counts and original host/chat payloads match their declared synthetic sources", () => {
  const allowedPaths = [
    "character-template.json",
    "character-instance.json",
    "portable-memory.jsonl",
  ];
  const streamPath = "specs/current/examples/portable-memory.jsonl";
  assert.ok(
    exampleBytes.has(streamPath),
    "the declared normative memory stream must exist",
  );
  const records = [...examples.entries()]
    .filter(([path]) => path.startsWith(`${streamPath}:`))
    .map(([, record]) => record);
  assert.equal(records.length, 9);
  assertOriginalPayloads(records);
  for (const mode of ["resume", "fork"]) {
    const document = archive(mode);
    assert.deepEqual(
      document.files.map((entry) => entry.path).sort(),
      allowedPaths.toSorted(),
    );
    for (const entry of document.files) {
      // Read only bytes already discovered under the static example directory;
      // arbitrary manifest paths are never resolved or extracted by this test.
      assert.ok(allowedPaths.includes(entry.path));
      const path = `specs/current/examples/${entry.path}`;
      const bytes = exampleBytes.get(path);
      assert.ok(bytes, `missing static bytes ${path}`);
      assert.equal(entry.sizeBytes, bytes.length);
      assert.equal(
        entry.sha256,
        createHash("sha256").update(bytes).digest("hex"),
      );
      assert.equal(
        entry.recordCount,
        entry.role === "memory" ? records.length : 1,
      );
      assert.equal(
        entry.schemaId,
        `${prefix}${entry.role === "memory" ? "memory" : "character"}`,
      );
    }
  }
  const summaryOnly = structuredClone(records);
  const rawEvent = summaryOnly.find(
    (record) => record.memoryId === "event-inspection",
  );
  rawEvent.recordedPayload = { summary: rawEvent.summary };
  accepts(ajv, rawEvent); // Structure cannot prove the original observation was preserved.
  assert.throws(
    () => assertOriginalPayloads(summaryOnly),
    assert.AssertionError,
  );
});
