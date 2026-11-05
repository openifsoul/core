# ADR 0010: First executable local runtime slice

Status: accepted implementation scope on 2026-11-05. The owner requested a Sol
agent for the first runtime step and a second for a synthetic host/debugging lab.
This records implementation choices within that scope, not a production release.

## Decision

Implement source-run TypeScript under one private root package, with strict
`tsc --noEmit` validation and `tsx` execution. Keep the existing JSON Schemas
normative and unchanged. Package publication and release builds remain deferred.

Runtime owns an injectable AgentController and uses only MemoryPort from the
memory component. A separate SQLite implementation uses Node's built-in
`node:sqlite`; the local composition root constructs and closes it. The API is
experimental in the tested Node version and synchronous. No performance or broad
Node-version compatibility claim follows from this selection.

Persist authorized original event payloads and exchange/correlation state.
Transactions keep related records together. Separate proposal, adoption, task
outcome and dialogue delivery; do not derive success from a generated plan.
Use bounded recall filtered by character, authorized environment and all intended
audience participants. Rich derived memories and archive import/export remain
future implementation work.

The lab uses an explicitly deterministic scenario controller, fixed synthetic
world time and an abstract host. It does not call a model or implement locomotion,
combat, pathfinding or game NPC logic. The development CLI may import simulator
code to compose the demo; this is not a production hosting dependency.

Use a single local database owner with an exclusive lock, released on normal
close. Crash recovery requires verified manual recovery; no automatic lock
stealing, distributed fencing, multi-writer synchronization or live-file transfer.
The CLI trusts its local composition and data. It exposes no network server and
provides no hostile-code sandbox.

## Validation and consequences

Contract regressions, runtime/storage tests, CLI integration tests, formatting,
type checking and documentation/import checks run locally through `pnpm check`.
No remote CI, deployment, account, provider key or game is required. The next
integration should reuse these interfaces and add measured model behavior rather
than treating the scripted controller as evidence of AI capability.

See [runtime API](../runtime-api.md), [laboratory](../laboratory.md),
[development](../development.md) and [execution policy](../deployment.md).
