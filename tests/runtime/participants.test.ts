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
function store(): ParticipantStore {
  const states = new Map<string, ParticipantState>();
  return {
    transact(id, work) {
      const draft = structuredClone(states.get(id) ?? emptyParticipantState());
      const value = work(draft);
      states.set(id, draft);
      return value;
    },
  };
}
test("six player/NPC configurations share one domain; no player or mode is required", () => {
  for (const npcs of [1, 2])
    for (const players of [0, 1, 2]) {
      const runtime = createParticipantRuntime(store());
      const access = { principalId: "owner", hostId: "host" };
      const members = [
        ...Array.from({ length: npcs }, (_, i) => ({
          participantId: `npc-${i}`,
          role: "npc" as const,
        })),
        ...Array.from({ length: players }, (_, i) => ({
          participantId: `player-${i}`,
          role: "player" as const,
        })),
      ];
      for (const p of members)
        runtime.register(access, {
          participantId: p.participantId,
          subjectId: `verified-${p.participantId}`,
          kind: p.role,
        });
      const session = {
        sessionId: "session",
        revision: 1,
        worldId: "world",
        recallWorldIds: ["world"],
        hostId: "host",
        members,
        groups: [],
        channels: [
          {
            channelId: "chat",
            participantIds: members.map((m) => m.participantId),
          },
        ],
      };
      assert.deepEqual(
        runtime.transition(access, "create", 0, session),
        session,
      );
      assert.deepEqual(
        runtime.transition(access, "create", 0, session),
        session,
      );
      assert.throws(
        () =>
          runtime.transition(access, "world-relabel", 1, {
            ...session,
            revision: 2,
            worldId: "foreign-world",
            recallWorldIds: ["foreign-world"],
          }),
        /conflict/,
      );
      assert.throws(
        () =>
          runtime.register(access, {
            participantId: "npc-0",
            subjectId: "forged",
            kind: "npc",
          }),
        /conflict/,
      );
      assert.throws(
        () => runtime.transition(access, "stale", 0, session),
        /stale/,
      );
      assert.throws(
        () =>
          runtime.transition({ ...access, hostId: "foreign" }, "foreign", 1, {
            ...session,
            revision: 2,
          }),
        /unauthorized/,
      );
    }
});

test("completion pins trigger channel, cancellation retains replay fence and releases writer", () => {
  const runtime = createParticipantRuntime(store());
  const access = { principalId: "owner", hostId: "host" };
  runtime.register(access, {
    participantId: "npc",
    subjectId: "verified-npc",
    kind: "npc",
  });
  runtime.register(access, {
    participantId: "player",
    subjectId: "verified-player",
    kind: "player",
  });
  runtime.transition(access, "join", 0, {
    sessionId: "s",
    revision: 1,
    hostId: "host",
    worldId: "w",
    recallWorldIds: ["w"],
    members: [
      { participantId: "npc", role: "npc" },
      { participantId: "player", role: "player" },
    ],
    groups: [],
    channels: ["private", "other"].map((channelId) => ({
      channelId,
      participantIds: ["npc", "player"],
    })),
  });
  runtime.append(access, {
    eventId: "e",
    sessionId: "s",
    revision: 1,
    channelId: "private",
    senderId: "player",
    recipientIds: ["npc"],
    observerIds: [],
    text: "Private question",
  });
  const ticket = {
    turnId: "t",
    sessionId: "s",
    revision: 1,
    npcId: "npc",
    eventId: "e",
    recipientIds: ["player"],
    observerIds: [],
  };
  runtime.begin(access, ticket);
  const output = {
    eventId: "reply",
    sessionId: "s",
    revision: 1,
    channelId: "other",
    senderId: "npc",
    recipientIds: ["player"],
    observerIds: [],
    text: "Reply",
  };
  assert.throws(() => runtime.complete(access, ticket, output), /unauthorized/);
  assert.equal(runtime.history(access, "s", "npc").length, 1);
  runtime.cancel(access, ticket);
  runtime.cancel(access, ticket);
  assert.throws(
    () => runtime.complete(access, ticket, { ...output, channelId: "private" }),
    /unauthorized/,
  );
  assert.throws(() => runtime.begin(access, ticket), /conflict/);
  runtime.begin(access, { ...ticket, turnId: "next" });
});
