# Roadmap

IfSoul has an experimental local runtime slice. These are intended phases without
release dates or a promise of game support. The current implementation scope is
runtime, SQLite event memory and a synthetic CLI laboratory; broader phases need
their own scope and owner. See [product](product.md), [architecture](architecture.md) and the
[execution policy](deployment.md).

## Current: versioned design and regression evidence

The active [v0.2 design](../specs/v0.2/README.md) separates portable characters
from environment-specific embodiments, bounded context, high-level plans,
conversation, memory and archives. The v0.1 schemas/examples are retained without
byte changes as historical regressions, including the old garden action trace.
The v0.1 ModelProvider contract remains independently versioned. Local checks are
not a runtime, migration implementation or stable interoperability commitment.

No installable application, real model client, game bridge, chat UI or archive
importer/exporter exists. The local runtime and SQLite event engine are experimental. The host owns all NPC life state
machines, movement, combat and pathfinding. First-party bridges exchange context,
plans, dialogue and host outcomes; gameplay controllers stay in the host.

## Current implementation: chat and a synthetic planning host

The [local laboratory](laboratory.md) binds one persistent character to chat
and a synthetic host using a deterministic scenario controller. Exercise scoped context, bounded high-level plans,
host validation and host-reported outcomes. The synthetic host owns its own
state machine and execution; IfSoul does not add movement or combat skills.
Use deterministic fixtures or bounded rules where useful, then evaluate a local
model or BYOK implementation without requiring an IfSoul account.

Test planning cadence independently of host-requested speech and live chat.
A daily briefing is one configurable host policy, not a universal real-time
agent loop. Verify denial, stale context, cancellation, usage limits and safe
fallback. See [execution modes](execution-modes.md) and the planned
[runtime host](../apps/runtime-host/README.md).

## Next: continue with another model

Create or author a character using one model and continue using a second model
without silently replacing its identity, permitted history or provenance.
Test model selection across the [runtime profiles](runtime-profiles.md): local
models, BYOK services and optional managed cloud have distinct operational and
disclosure requirements. Compare observable differences; do not promise identical
behavior or a numerical percentage of preserved personality.

Extend the implemented SQLite event store behind MemoryPort with measured
retrieval and derived-memory needs. SQLite is not the sole exchange format. Local rules/model functionality must work without private cloud code.

## Then: one researched host integration and shared experience

Project Zomboid is a candidate. Research exact game/mod versions, available
host-owned NPC AI, mod APIs, multiplayer restrictions, licensing and distribution
rules before selecting an integration. A possible flow is a briefing at a
configurable game-day start, an AI high-level plan, and validation/execution by
the mod's own systems. Speech occurs when the mod requests it. If suitable host
AI is unavailable, narrow or defer the integration rather than add a first-party
gameplay controller. See [bridge authoring](bridge-authoring.md).

Record permitted host-reported events with provenance, then discuss those events
with the same character in chat. Do not invent unseen events or treat summaries
as authoritative game state. Test against declared game/mod versions before
claiming support. Other projects' integrations are not an automatic code source.

## Prove export, restore and a usable local application

Implement bounded import/export, version rejection, migrations on copies,
checksums, safe paths, reference integrity, explicit losses, extension
preservation and deletion propagation. Demonstrate export, clean restore and
continued chat with permitted history intact and secrets excluded. Backup and
filtered transfer have different disclosure requirements.

Acceptance includes an installable application that a user can start, configure,
use for chat and connect to the supported host without editing source code.
That application is future work. A local web Character Manager is the accepted
first UI direction, with implementation validation deferred; packaging follows
measured needs. Authenticate local services and test origin/session protections.
A README or schema pass does not satisfy application acceptance.

## Demonstrate a second game

After the first verified integration and restore path, add a separately
researched second game. Carry the same character and permitted history between
chat and both hosts, including nonhuman embodiments where actually supported.
Test identity binding, provenance, filtering, missing mechanics and explicit
rejection of unsupported proposals. Each host retains its controllers; a new
body does not imply equivalent skills or game state.

## Later, subject to evidence

- Branching/merging histories, synchronization and conflict resolution.
- Managed cloud, accounts, billing and a possible open self-hosted server.
- An independently maintained original/authorized character catalog and marketplace.
- Additional researched bridges, richer retrieval and performance work.
- Package publication and remote CI/deployment after an explicit execution decision.

The [character examples](../examples/characters/README.md) are the beginning of a
planned catalog inside `core`, not a catalog service. Split out a `characters`
repository when independent publication and maintenance justify it. Public local
functionality must remain usable without private website or managed-cloud code.
