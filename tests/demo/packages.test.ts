import assert from "node:assert/strict";
import test from "node:test";
import { GardenSimulation } from "@ifsoul/example-garden/simulation";
import { handValue } from "@ifsoul/example-friendly-21/simulation";
import { createDungeon } from "@ifsoul/example-dungeon/simulation";
import { createExampleSession as gardenSession } from "@ifsoul/example-garden/adapter";
import { createExampleSession as cardsSession } from "@ifsoul/example-friendly-21/adapter";
import { createExampleSession as dungeonSession } from "@ifsoul/example-dungeon/adapter";
import {
  scenarioResponse,
  type BridgeHistory,
  type BridgeResponse,
} from "@ifsoul/adapter-sdk";

test("curated package simulation exports load without a browser or sibling source", () => {
  assert.equal(typeof new GardenSimulation().step, "function");
  assert.equal(typeof handValue([]), "number");
  assert.equal(typeof createDungeon().phase, "string");
});
for (const [name, createSession] of [
  ["garden", gardenSession],
  ["cards", cardsSession],
  ["dungeon", dungeonSession],
] as const) {
  test(`${name} package adapter keeps host/chat history in one bounded lifecycle`, async () => {
    const lifetime = new AbortController();
    const observations: BridgeHistory[] = [];
    let paused = 0,
      resumed = 0,
      destroyed = 0;
    const session = await createSession(
      {} as HTMLElement,
      {
        signal: lifetime.signal,
        onObservation: (event) => observations.push(event),
        transport: async (request) => {
          if (request.operation === "chat")
            assert.ok(
              request.history.some(
                (event) => event.summary === "A synthetic host outcome.",
              ),
            );
          return scenarioResponse(request);
        },
      },
      async (_container, options) => {
        options.bridge.report({
          id: "host-outcome",
          summary: "A synthetic host outcome.",
          kind: "outcome",
        });
        return {
          pause() {
            paused++;
          },
          resume() {
            resumed++;
          },
          destroy() {
            destroyed++;
          },
        };
      },
    );
    assert.equal(observations.length, 1);
    const response = await session.chat("What happened?");
    assert.equal(response.source, "scenario");
    session.pause();
    session.resume();
    assert.equal(paused, 1);
    assert.equal(resumed, 1);
    lifetime.abort();
    session.destroy();
    assert.equal(destroyed, 1);
    await assert.rejects(session.chat("Are you still there?"), /disconnected/);
  });
  test(`${name} package adapter suppresses late chat after disconnect`, async () => {
    let resolveReply: ((reply: BridgeResponse) => void) | undefined;
    let spoken = 0;
    const lifetime = new AbortController();
    const session = await createSession(
      {} as HTMLElement,
      {
        signal: lifetime.signal,
        onSpeech() {
          spoken++;
        },
        transport: () =>
          new Promise((resolve) => {
            resolveReply = resolve;
          }),
      },
      async () => ({ pause() {}, resume() {}, destroy() {} }),
    );
    const pending = session.chat("A pending question.");
    const rejected = assert.rejects(pending, /disconnected|cancelled|aborted/i);
    lifetime.abort();
    resolveReply?.({ choiceId: "", speech: "Too late.", source: "llm" });
    await rejected;
    assert.equal(spoken, 0);
  });
}
