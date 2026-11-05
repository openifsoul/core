# Historical minimal synthetic world

[trace.json](trace.json) is an original synthetic **v0.1 static regression trace**.
Its bytes are retained unchanged alongside the old schemas and normative examples.
It is not an executable agent, game, policy engine or recommendation for new
bridges. It contains no real player data, personal memory, game asset, credential
or live model response.

The active [v0.2 design](../../specs/v0.2/README.md) uses bounded context,
high-level planning, conversation and host-reported outcomes. Host games/mods
own NPC life state machines, movement, combat and pathfinding. First-party
bridges do not implement game skill executors. Read
[bridge authoring](../../docs/bridge-authoring.md) for that boundary.

## Reading the retained trace

1. `bindings` explicitly associates portable `character-mira` with world actor
   `actor-mira` in `garden` / `session-1`. This authored mapping is not proof of
   authentication and is not inferred from names.
2. `documents.capabilities` advertises `water-plant` and an argument schema.
   `documents.observation` reports a dry visible plant at tick 19.
3. `rulesDecision` is explanatory metadata, not executable rules, a protocol
   envelope, model output or authority source.
4. `documents.policy` and `documents.permissionDecision` describe a synthetic
   grant and recorded allow decision. No policy evaluation happens here.
5. `documents.action` requests watering with a deadline and observed revision.
   Tests separately check arguments against this fixture's capability schema.
6. `documents.result` reports completed success and a `plant-watered` event at
   tick 20. The fixture declares no idempotency; its old contract requires
   reconciliation of ambiguous execution before retry.
7. `documents.memory` references the reported event; `documents.derivedMemory`
   is an authored summary referencing its source. Neither broadens source access.

Wall-clock timestamps and world ticks are separate; this single authored timeline
implies no global clock or tick duration. The initial archive snapshot is separate
and has no history references.

## What current checks establish

[Contract checks](../../tests/contracts/README.md) validate v0.1 envelopes and
selected authored identity/context, scope, correlation and provenance links.
Changed copies must fail fixture-specific assertions. The one known argument
schema is separately checked with a local reference guard. These checks do not
execute watering, authorize a real actor, persist memory or import an archive.

New examples must follow the v0.2 host-owned planning boundary instead of adding
gameplay skills to this trace. The planned
[simulator](../../apps/simulator/README.md) must distinguish deterministic host
fixtures, recorded replay and fresh model responses, and independently test
planning cadence and conversation modes. No end-to-end behavior is proven here.
