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

## Implemented locally: profile authoring and selectable memory

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
Profile editing/deletion and complete history backup/same-identity restore remain deferred.
App now implements a separate bounded filtered-fork memory archive; see below.

## Implemented locally: browser hosts and experimental SDK

Three original browser hosts now exercise an engine-independent adapter: PixiJS
Garden, DOM Friendly 21 and Phaser Dungeon. A standalone Node test host also uses
the SDK. The public scenario playground shares bounded browser history across
worlds/chat; authenticated model requests pass through the core runtime and server quotas.
See [scope, limits and validation](browser-demo.md). This is a demonstration transport,
not a general authenticated game negotiation/recovery system. A deployed
demonstration does not establish external-game support.

## Implemented locally: bounded memory continuity

App persists attributed reports, retains bounded extractive episodes, selects
scoped recall and validates optional model-proposed claims/relationship revisions.
One directed character-to-player relationship spans worlds and App chat inside an
owner store; roles and source provenance remain world-specific. Profiles and
memory selection remain independent; reset removes selected bridge evidence and
derived state. Core supplies generic storage/retention ports; SDK remains transport.

This bounded storage slice has local deterministic and isolated real-model
service evidence; model reassessment quality remains a separate acceptance criterion. See [App memory architecture](https://github.com/openifsoul/app/blob/main/docs/memory.md)
for its diagram, acceptance evidence, limits and implementation owners. A controlled
Dungeon scenario, arbitrary fourth-host transport, App chat and SQLite reopen
were exercised; this does not establish full browser E2E or production behavior.

## Released composition: 2026-11-06 evidence

The manually published managed composition was read back at version
`1f13e066-5a8f-4230-98f5-1fa2084515d7` at 100% on 2026-11-06.
Public route/security HTTP checks and asset byte comparisons passed. Headless
production browsers rendered real Clerk sign-in and the free scenario demo.
No paid production model call or authenticated user operation was attempted.
Authenticated persistence, personal archive transfer and BYOK decryption therefore
remain unverified against production; their compatibility evidence is local
synthetic workerd testing. This dated receipt is not continuous monitoring or a
claim about today's deployment. Publication does not prove product acceptance.

## Implemented locally: bounded filtered-fork archives

App's current `ifsoul-app-memory/0.3.0` JSON archive exports only
eligible retained evidence, with checksums, profile origins and explicit losses.
Validated import atomically creates fresh profiles and a new memory fork; local
SQLite tests exercise reopen and continued chat. Existing restricted history is
not made exportable. This is neither the frozen Core v0.2 archive contract nor a
complete backup, same-identity resume, ownership handoff or merge implementation.
See [App memory architecture](https://github.com/openifsoul/app/blob/main/docs/memory.md).
Complete backup/restore, migrations, deletion propagation, semantic retrieval and
general multiplayer identity negotiation remain future work.

## Next: product acceptance

Independently evaluate actual App/browser flows, provider changes, profile/memory
selection and permitted continuity across chat and the original hosts. Exercise
bounded archive preview/import and continued chat while preserving explicit
losses, historical provenance and privacy. Include negative permission/isolation
cases, restart behavior, cancellation/errors and accessible UI feedback. Use a
separate original character and an explicitly selected real model, with zero silent
scenario/deterministic fallback. Check actor attribution, requested language and
explicit uncertainty about unobserved facts. Separate
deterministic checks, real-model service behavior, browser acceptance and production
checks in reports. Local/model successes do not establish browser or real-user
production behavior. Character expression and reliable evidence use require
provider-quality evaluation; successful schema validation does not prove either.

App implements the shared `/app` shell, character management, chat, memory and
settings. Website separately owns the Playground and original demo-world
composition; App does not itself mount those games. A local acceptance host can
compose the public SDK and original game packages with an App-authored profile
and selected memory; that test composition is distinct from the shipped Playground.
`/lab` is local debugging only. Local access requires no Clerk
prompt; managed access verifies Clerk and partitions user stores. Production
sign-in rendering is proven; authenticated real-user flows remain acceptance
work. Packaged installation without source editing remains future work.

An isolated headless acceptance run on 2026-11-08 exercised App-authored original
profile selection, actual Garden and Friendly 21 host observations, local Ollama
`qwen3:8b` chat, server restart and a UI archive preview/import fork. The games ran
in a local test composition, not inside public App or the shipped Playground.
A first model reply misattributed a companion action despite correct retained
report fields; attribution prompting was strengthened and deterministic packed
prompt coverage added. Exactly one neutral English follow-up on the imported fork
then passed attribution, language and continued-chat checks. That sample does not
establish reliable model expression across providers; relationship/reflection
quality remains open. This local evidence does not establish production or
external-game support.
See [App memory architecture](https://github.com/openifsoul/app/blob/main/docs/memory.md).

A 2026-11-09 isolated App run accepted a real model-proposed portable trust belief
with citations from two original hosts. The same identity and revision survived
SQLite/server restart and appeared in the Memory UI. A later contrary report
produced citation churn with an unchanged explanation, so it did not establish
substantive reassessment. A regression now prevents identical interpretations from
acquiring revisions solely through changed citations; this does not guarantee
semantic reasoning quality or require trust to decrease. A final bounded real-model
probe again copied the old explanation; the guard retained the existing revision.
Substantive reassessment remains unproven for this sample, with no further retries.

A subsequent local implementation separates operator-configurable transport,
provider, prompt, runtime and browser budgets while preserving legacy defaults.
Trusted capabilities are discovered for explicitly increased SDK HTTP limits;
actual token usage remains distinct from estimates and byte counts. The current
implementation is bounded buffered JSON, with explicit unsupported handling above
its 64 MiB support boundary; no 1 GiB streaming or powerful-server end-to-end proof
is claimed. See [resource budgets](resource-budgets.md).

## Then: SDK connector research and acceptance

Research **Minecraft + Mineflayer** and **Skyrim + Mantella** as target ecosystems.
These names describe planned research, not verified compatibility, available
extension APIs or supported game integrations. Check exact versions, licensing,
distribution, extension boundaries, NPC capabilities and group coordination before
selecting designs. Do not infer support from another project's implementation.

Design and validate these independent axes:

- One NPC and groups of NPCs, with explicit per-NPC identity, scoped observations,
  private communication, group membership and authorized recipients.
- A persistent live channel carrying bounded asynchronous requests, and explicit
  on-demand batch envelopes with per-item identities, results and deadlines.
  Neither mode implies per-tick LLM control or an inference-provider Batch API.
  Planning cadence remains independent of requested speech.
- Local models, self-hosted App, network BYOK and managed hosting. Placement,
  credentials, payment and host control authority remain separate choices.

Before claiming a reusable connector, prove capability negotiation and explicit
unsupported-action rejection; authenticated principal and host/NPC identity binding;
reconnect/session recovery; request idempotency and duplicate outcome handling;
bounded queues/backpressure and fairness across NPCs; cancellation/deadlines;
per-NPC privacy and consent; request/token/cost/concurrency budgets. Test these
against declared external host versions, including failures and partial results.

The host retains NPC life state machines, movement, combat, pathfinding and all
low-level controllers. IfSoul supplies bounded high-level plans/dialogue and
receives authorized host reports. If suitable host-owned mechanics or an extension
boundary is unavailable, narrow or defer the connector. Do not build first-party
NPC gameplay controllers to fill the gap. Continue permitted character history
between chat and tested hosts without inventing unseen events, equivalent skills
or authority from imported identities. See [bridge authoring](bridge-authoring.md).

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
