import assert from "node:assert/strict";
import test from "node:test";
import {
  assertDocument,
  json,
  registry,
  validateUnchanged,
  visit,
} from "./helpers.mjs";

const { ajv } = await registry();
const trace = await json("examples/minimal-world/trace.json");

// Exact assertions for the one authored fixture. This is not an identity mapper,
// rules evaluator, policy engine, scope enforcer, adapter, or semantic validator.
function assertTraceLinks(fixture) {
  const { documents: d, rulesDecision: rule, bindings: binding } = fixture;
  const actor = binding.actorId;
  for (const document of Object.values(d)) {
    if ("worldId" in document) assert.equal(document.worldId, binding.worldId);
    if ("sessionId" in document)
      assert.equal(document.sessionId, binding.sessionId);
  }
  assert.equal(d.capabilities.actorId, actor);
  assert.equal(d.observation.observerId, actor);
  assert.equal(d.permissionDecision.subjectId, actor);
  assert.equal(d.action.actorId, actor);
  assert.equal(d.result.actorId, actor);
  assert.equal(d.memory.observerId, actor);
  assert.equal(d.memory.characterId, binding.characterId);
  assert.equal(d.derivedMemory.characterId, binding.characterId);
  assert.equal(d.capabilities.adapterId, d.observation.adapterId);
  assert.equal(d.result.adapterId, d.capabilities.adapterId);

  assert.equal(rule.strategy, "rules");
  assert.equal(rule.strategyId, "garden-rules");
  assert.equal(rule.strategyVersion, "1");
  assert.equal(rule.ruleId, "water-visible-dry-plant");
  assert.equal(rule.observationId, d.observation.observationId);
  assert.equal(rule.capabilityRevision, d.capabilities.capabilityRevision);
  assert.equal(rule.proposedActionId, d.action.actionId);
  assert.equal(rule.permissionDecisionId, d.permissionDecision.decisionId);
  assert.equal(rule.policyId, d.policy.policyId);
  assert.equal(rule.policyRevision, d.policy.revision);
  const observation = d.observation.observations.find(
    (item) => item.subjectId === rule.matchedCondition.subjectId,
  );
  assert.ok(
    observation,
    "the authored condition must reference an observed subject",
  );
  assert.equal(observation.payload.visible, true);
  assert.equal(observation.payload.soil, "dry");
  assert.deepEqual(rule.matchedCondition, {
    subjectId: observation.subjectId,
    visible: observation.payload.visible,
    soil: observation.payload.soil,
  });

  assert.equal(d.permissionDecision.policyId, d.policy.policyId);
  assert.equal(d.permissionDecision.policyRevision, d.policy.revision);
  assert.equal(d.permissionDecision.decision, "allow");
  // Assert the exact authored grant, without implementing general grant/revoke logic.
  assert.deepEqual(d.policy.rules, [
    {
      ruleId: "grant-water",
      subjectId: actor,
      resource: observation.subjectId,
      action: "water",
      effect: "grant",
    },
  ]);
  assert.equal(d.permissionDecision.resource, observation.subjectId);
  assert.equal(d.permissionDecision.action, "water");
  assert.equal(d.action.arguments.plantId, observation.subjectId);
  assert.equal(d.action.capabilityRevision, d.capabilities.capabilityRevision);
  assert.ok(
    d.observation.availableCapabilityIds.includes(d.action.capabilityId),
  );
  assert.equal(d.action.observedWorldRevision, d.observation.worldRevision);
  const selected = d.capabilities.capabilities.find(
    (capability) => capability.capabilityId === d.action.capabilityId,
  );
  assert.ok(selected);
  assert.deepEqual(selected.requiredPermissions, [
    {
      resource: d.permissionDecision.resource,
      action: d.permissionDecision.action,
    },
  ]);
  assert.equal(selected.idempotency, "none");
  assert.equal(d.result.actionId, d.action.actionId);
  assert.equal(d.result.status, "success");
  assert.equal(d.result.events.length, 1);
  const [event] = d.result.events;
  for (const field of ["worldId", "sessionId", "adapterId", "actionId"]) {
    assert.equal(event[field], d.result[field]);
  }
  assert.deepEqual(event.payload, d.action.arguments);
  assert.deepEqual(d.memory.provenance.worldEventIds, [event.eventId]);
  assert.deepEqual(d.memory.provenance.eventIds, []);
  assert.equal(d.memory.payload.data.actionId, d.action.actionId);
  assert.equal(d.memory.payload.data.status, d.result.status);
  assert.deepEqual(d.derivedMemory.sourceEventIds, [d.memory.eventId]);
  assert.deepEqual(d.derivedMemory.derivation, {
    algorithmId: "synthetic-summary",
    algorithmVersion: "1",
  });
  for (const scoped of [observation, event, d.memory, d.derivedMemory]) {
    assert.deepEqual(scoped.scope, {
      audience: "private",
      subjectIds: [actor],
      export: "allowed",
    });
  }
  assert.equal(
    d.observation.worldTime.timelineId,
    d.result.worldTime.timelineId,
  );
  assert.equal(d.memory.worldTime.timelineId, d.result.worldTime.timelineId);
  assert.equal(d.observation.worldTime.tick, 19);
  assert.equal(d.result.worldTime.tick, 20);
  assert.equal(d.memory.worldTime.tick, 20);
  assert.ok(Date.parse(d.action.requestedAt) < Date.parse(d.action.deadlineAt));
}

function compileFixtureArguments(fixture) {
  const { action, capabilities } = fixture.documents;
  // Scoped selection prevents this test from accidentally using a capability in
  // another fixture context. This is not an implementation of negotiation.
  for (const field of [
    "worldId",
    "sessionId",
    "actorId",
    "capabilityRevision",
  ]) {
    assert.equal(action[field], capabilities[field]);
  }
  const matches = capabilities.capabilities.filter(
    (item) => item.capabilityId === action.capabilityId,
  );
  assert.equal(matches.length, 1);
  const schema = matches[0].argumentsSchema;
  // The known fixture needs no references or schema identity. Reject them before
  // compilation; this guard is not a complete sandbox for untrusted schemas.
  visit(schema, (node) => {
    for (const key of [
      "$ref",
      "$dynamicRef",
      "$id",
      "$anchor",
      "$dynamicAnchor",
    ]) {
      assert.ok(
        !(key in node),
        `fixture argument schemas must not contain ${key}`,
      );
    }
  });
  assert.equal(ajv.validateSchema(schema), true, JSON.stringify(ajv.errors));
  return ajv.compile(schema);
}

test("static trace envelopes validate; authored links and declared scope agree", () => {
  for (const [name, document] of Object.entries(trace.documents)) {
    assertDocument(ajv, document, name);
  }
  assertTraceLinks(trace);
});

for (const [name, change] of [
  ["another world", (t) => (t.documents.action.worldId = "another-garden")],
  ["another actor", (t) => (t.documents.action.actorId = "actor-other")],
  [
    "stale policy revision",
    (t) => (t.documents.permissionDecision.policyRevision = 2),
  ],
  ["missing permission evidence", (t) => (t.documents.policy.rules = [])],
  [
    "hidden condition subject",
    (t) => (t.rulesDecision.matchedCondition.subjectId = "plant-hidden"),
  ],
  [
    "changed raw provenance",
    (t) => (t.documents.memory.provenance.worldEventIds = ["unrelated-event"]),
  ],
  [
    "changed derived provenance",
    (t) => (t.documents.derivedMemory.sourceEventIds = ["unrelated-memory"]),
  ],
  [
    "broadened derived audience",
    (t) =>
      (t.documents.derivedMemory.scope = {
        audience: "public",
        subjectIds: [],
        export: "allowed",
      }),
  ],
  [
    "event from another action",
    (t) => (t.documents.result.events[0].actionId = "action-other"),
  ],
  [
    "incomparable world timeline",
    (t) => (t.documents.memory.worldTime.timelineId = "garden-branch-2"),
  ],
]) {
  test(`static fixture linkage detects ${name}`, () => {
    const changed = structuredClone(trace);
    change(changed);
    assert.throws(() => assertTraceLinks(changed), assert.AssertionError);
  });
}

test("the known capability argument schema is separately checked and accepts the fixture", () => {
  const validate = compileFixtureArguments(trace);
  const argumentsCopy = structuredClone(trace.documents.action.arguments);
  assert.equal(validate(argumentsCopy), true, JSON.stringify(validate.errors));
  assert.deepEqual(argumentsCopy, trace.documents.action.arguments);
});
for (const [name, args, keyword] of [
  ["excessive amount", { plantId: "plant-1", amountMl: 101 }, "maximum"],
  ["zero amount", { plantId: "plant-1", amountMl: 0 }, "minimum"],
  ["coerced amount", { plantId: "plant-1", amountMl: "100" }, "type"],
  ["missing plant", { amountMl: 100 }, "required"],
  [
    "extra argument",
    { plantId: "plant-1", amountMl: 100, force: true },
    "additionalProperties",
  ],
]) {
  test(`separate fixture argument validation rejects ${name}`, () => {
    const action = structuredClone(trace.documents.action);
    action.arguments = args;
    assert.equal(validateUnchanged(ajv, "action", action).valid, true);
    const before = structuredClone(args);
    const validate = compileFixtureArguments(trace);
    assert.equal(validate(args), false);
    assert.ok(validate.errors.some((error) => error.keyword === keyword));
    assert.deepEqual(args, before);
  });
}

test("fixture-only argument guard refuses an external schema reference before compilation", () => {
  const changed = structuredClone(trace);
  changed.documents.capabilities.capabilities[0].argumentsSchema = {
    $ref: "https://example.invalid/untrusted.schema.json",
  };
  // The outer capability envelope treats nested schemas as data. No URL is fetched.
  assertDocument(
    ajv,
    changed.documents.capabilities,
    "outer capability envelope",
  );
  assert.throws(
    () => compileFixtureArguments(changed),
    /must not contain \$ref/,
  );
});

test("fixture-only argument selection refuses another session", () => {
  const changed = structuredClone(trace);
  changed.documents.action.sessionId = "another-session";
  assert.throws(() => compileFixtureArguments(changed), assert.AssertionError);
});

// These tests document intentional structural limits. Passing here must never
// be reported as semantic validity, authorization, or permission to execute.
for (const [name, schema, makeDocument] of [
  [
    "private audience cardinality needs semantic enforcement",
    "memory-event",
    () => {
      const document = structuredClone(trace.documents.memory);
      document.scope.subjectIds = [];
      return document;
    },
  ],
  [
    "scope does not authorize an action",
    "action",
    () => {
      const document = structuredClone(trace.documents.action);
      document.actorId = "actor-without-grant";
      return document;
    },
  ],
  [
    "deadline ordering needs a trusted clock check",
    "action",
    () => {
      const document = structuredClone(trace.documents.action);
      document.deadlineAt = "2025-01-01T00:00:00Z";
      return document;
    },
  ],
  [
    "a dangling source ID still has valid structure",
    "derived-memory",
    () => {
      const document = structuredClone(trace.documents.derivedMemory);
      document.sourceEventIds = ["nonexistent-source"];
      return document;
    },
  ],
  [
    "required extension support needs consumer checks",
    "action",
    () => {
      const document = structuredClone(trace.documents.action);
      document.requiredExtensions = ["org.example.unknown"];
      return document;
    },
  ],
]) {
  test(`structural limitation: ${name}`, () => {
    const result = validateUnchanged(ajv, schema, makeDocument());
    assert.equal(result.valid, true, JSON.stringify(result.errors));
  });
}
