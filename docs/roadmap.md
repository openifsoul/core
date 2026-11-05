# Roadmap

IfSoul has an experimental runtime and IfSoul App. These phases have no
release dates and do not promise game support. See [product](product.md),
[architecture](architecture.md) and [execution policy](deployment.md).

## Implemented: contracts and laboratory

The frozen v0.1 and v0.2 schemas/examples remain regression evidence, not a stable
SDK or migration implementation. Runtime and SQLite preserve scoped event history;
the CLI uses a deterministic synthetic host. The React laboratory supports a local
owner server and Workers, with Workers AI, OpenAI BYOK and local Ollama clients.
Model changes within one runtime retain character history; local/cloud databases
are separate. Provider latency and output quality remain variable.

## Current slice: profile authoring and selectable memory

The laboratory creates manual, generated or imported fictional profiles and selects
between them. Each receives a fresh identity and participant, empty initial history,
and its own plans, conversation records and scoped recall. Profiles and histories
survive restart. The original Lumen demo remains available. Creation retries use
an explicit request ID; conflicting profiles are rejected. The owner catalog is
bounded to 50 characters including the demo.

The laboratory also supports model-assisted generation with review, an original
starter library, external-agent prompts and profile-only template import/export.
Profile and connected local memory are independently selectable. See the
[implemented authoring flow](web-laboratory.md#own-characters).
Profile editing/deletion and full history archive transfer remain deferred.

## Implemented locally: browser hosts and experimental SDK

Three original browser hosts now exercise an engine-independent adapter: PixiJS
Garden, DOM Friendly 21 and Phaser Dungeon. A standalone Node test host also uses
the SDK. The public scenario playground shares bounded browser history across
worlds/chat; authenticated model requests pass through the core runtime and server quotas.
See [scope, limits and validation](browser-demo.md). This is a demonstration transport,
not a general authenticated game negotiation/recovery system or a production release.

## Next: continuity evaluation

Evaluate character expression and accurate memory use across providers, including
explicit cross-profile memory selection. Model quality and fidelity to fictional
references require evaluation; successful schema validation does not prove them.

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
- Commercial cloud operations and billing; Clerk identity and per-user Workers storage are implemented in source.
- An independently maintained original/authorized character catalog and marketplace.
- Additional researched bridges, richer retrieval and performance work.
- Package publication and remote CI/deployment after an explicit execution decision.

The [character examples](../examples/characters/README.md) are the beginning of a
planned catalog inside `core`, not a catalog service. Split out a `characters`
repository when independent publication and maintenance justify it. Public local
functionality must remain usable without private website or managed-cloud code.

## Current App integration

The accepted application direction is a shared shadcn sidebar-07 shell at `/app`,
with neutral chat, character management, settings and demo worlds. `/lab` remains
local debugging only. Local access requires no Clerk/password prompt; cloud
access verifies Clerk sessions and routes users to isolated Durable Object stores.
Owner-paid Workers AI shares persisted per-user/global reservations across App
and demo. Browser integration and a real Clerk instance verification remain
acceptance work; implementation does not establish production release.
