# Architecture

Status: **experimental local runtime slice within a broader design**. Runtime,
SQLite event memory, CLI/web laboratory and real provider clients are implemented.
A private owner server can run in Workers; real game bridges and a multi-tenant
managed service remain future work. See the
[runtime API](runtime-api.md) and [laboratory](laboratory.md) for implemented scope. The revised product
and contracts are described in [product](product.md) and
[v0.2](../specs/v0.2/README.md). The original v0.1 action-centric contracts remain
historical; their presence does not add low-level control to the revised design.

A persistent character is independent of its current embodiment and inference
model. Games and chat are environments; chat can also be a simultaneous channel.
Supported data/history follows a character across models and worlds without
promising identical behavior or psychological identity.

## Permitted import graph

`A → B` means A imports B. This is the revised permitted dependency graph, not
published package entrypoints. The runtime host contains the source-run CLI and shared web service.
For this development laboratory only, it imports `apps/simulator` to compose the
synthetic host; future production hosting must not depend on simulator behavior.

<!-- BOUNDARY_MATRIX_START -->

| Component                  | Allowed IfSoul dependencies                                                                                                                                |
| -------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/laboratory`          | `apps/runtime-host`, `packages/model-providers`, `packages/protocol`                                                                                       |
| `apps/runtime-host`        | `packages/protocol`, `packages/runtime`, `packages/memory`, `packages/permissions`, `packages/model-providers`, `packages/adapter-sdk`, `apps/simulator`   |
| `apps/server`              | `packages/protocol`, `packages/memory`, `packages/model-providers`, `apps/runtime-host`                                                                    |
| `apps/simulator`           | `packages/protocol`, `packages/runtime`, `packages/memory`, `packages/permissions`, `packages/model-providers`, `packages/adapter-sdk`, `packages/testing` |
| `packages/memory`          | `packages/protocol`                                                                                                                                        |
| `packages/model-providers` | `packages/protocol`                                                                                                                                        |
| `packages/protocol`        | None                                                                                                                                                       |
| `packages/runtime`         | `packages/protocol`, `packages/memory`, `packages/permissions`, `packages/model-providers`, `packages/adapter-sdk`                                         |
| `packages/testing`         | `packages/protocol`, `packages/adapter-sdk`, `packages/model-providers`                                                                                    |

<!-- BOUNDARY_MATRIX_END -->

This current implementation matrix is checked against
[scripts/boundary-rules.json](../scripts/boundary-rules.json). Runtime dependencies
on memory, providers and future adapter SDK are restricted to their ports; UI
cross-component imports are type-only. The laboratory composition explicitly
allows runtime-host to use the simulator. Planned components are not automatically
authorized by this matrix; adding an implementation requires updating the agreed
boundary and its checks. Future game/chat bridges may depend on protocol and
adapter-sdk; private managed hosting may compose public core, never the reverse.

The previous memory-only restriction on cloud is superseded: managed hosting can
run/import the public runtime and its ports. Private accounts, billing, and
provisioning may orchestrate it, but the open runtime never imports those private
services. Public self-hosting must remain possible without them.

No cycles, production imports from `testing`, public-to-private dependencies, or
relative imports across repositories are permitted. Protocol has no runtime,
game, provider, Node API, or cloud dependency. Game-specific APIs stay outside
public core; host mechanics stay in the game/mod even for first-party bridges.

## Composition roots and ports

Simulator and runtime-host (and, in future, Character Manager) construct
implementations, establish trusted identities/policies, configure budgets and
profiles, and inject ports into runtime. Runtime does not open SQLite, choose a
secret store, read keys, or construct vendor clients.

- **MemoryPort** belongs to `memory`: scoped history and working context,
  episodes, facts, relationships, intent checkpoints, export, and deletion.
  Separate the interface from concrete storage entrypoints. The first engine implements event/exchange persistence in SQLite; richer
  derived memory, export and deletion APIs remain future work.
- **ModelProvider** belongs to `model-providers`: bounded inference requests,
  capability declarations, responses/errors, and usage. Vendor/local clients and
  credentials stay behind separate implementation and secret boundaries.
- **EnvironmentBridge** (formerly WorldAdapter in the earlier design) is the
  planned `adapter-sdk` port for environment/bridge
  negotiation, bounded context, high-level plans/dialogue, and host reports.
  Its name does not imply a universal action executor or low-level game control.
- **Permissions** evaluates trusted policy and scope/consent context; decisions
  are evidence about a revision, not bearer tokens.
- **AgentController** is a separate experimental interface owned by runtime:
  a full external decision agent receives bounded authorized character/context
  input and returns plan/dialogue proposals. It may manage its own decision
  process, but receives no unrestricted memory, keys, execution authority, or
  right to bypass profiles. The root injects it. No new package is required.

ModelProvider wraps inference; AgentController replaces or supplies the full
decision strategy. They must not be conflated. Rules, model-assisted, hybrid,
and external-controller strategies all pass the same validation and permission
boundary. The [runtime API](runtime-api.md) documents the first callable interfaces.
Transports remain deferred; schemas specify envelopes, not implementations.

Host-triggered planning may run as an embedded library or on-demand worker; live
conversation may use a persistent service. Shared contracts do not require a
permanent daemon or model session for daily planning. The public headless runtime
host is an optional composition application, not the only runtime lifecycle.

## Host-driven cycle

1. **Report context.** The authenticated host sends bounded permitted events,
   metrics/needs, and changes under the selected environment profile and binding.
   Context identifies the current embodiment/channels and advertised intents.
   Missing observations remain unknown; authored backstory is not lived evidence.
2. **Select memory.** The active writer selects authorized working context and
   relevant episode/long-term records with provenance. No full archive is passed
   to the bridge, provider, or external controller.
3. **Propose.** At a host-requested boundary, a strategy produces a bounded
   high-level plan and/or requested dialogue. There is no model call per tick.
   Planning cadence does not authorize speech.
4. **Validate and authorize.** Runtime checks contract/semantic validity,
   supported intent/channel, identity/scope, current policy, context/deadline,
   dependencies, and budgets. Untrusted text cannot grant permission.
5. **Host adoption.** The host validates against fresh state and accepts all,
   accepts a specified subset, rejects, or continues safe default behavior.
   Plan acceptance is not execution or success.
6. **Host execution and reports.** Existing host NPC logic executes autonomously
   and reports progress, actual effects, failure, cancellation, or uncertainty.
   IfSoul and its first-party bridges implement no movement, shooting,
   pathfinding, or NPC state machines. Dialogue generation is separate from
   confirmed channel delivery.
7. **Remember.** Record only authorized host-reported evidence, adoption status,
   and unresolved outcomes, preserving correlation and chronology. Derived facts
   and relationships cite sources/derivations and remain revisable.

For the intended Zomboid daily briefing, the host can send yesterday's events,
current metrics/needs, and changes at the start of a game day. That trigger is
configurable. IfSoul proposes priorities; the host owns all mechanics. Under
requested-only communication no speech occurs without an explicit host request.
A future live conversational mode is separate and still not low-level control.

## State ownership and deployment

One active character-state writer is the initial design. Game/chat channels may
coexist and submit scoped input through that owner. Host simulation authority is
separate from ownership of portable character state. A model switch does not
create a new character or writer. Resume requires explicit handoff/fencing;
fork creates a separate continuation with parent provenance. Automatic merge and
multi-writer sync are deferred.

The same open runtime is intended for local models, local BYOK runtime, managed
hosting with a local game connector, and public self-hosting. BYOK billing and
placement are independent axes. See [execution modes](execution-modes.md).

## Limits and uncertainty

Roots set bounded context/output, request/retry counts, deadlines, and session
usage budgets. Unknown usage is not zero. A late or stale proposal cannot be
silently applied to changed context. Partial acceptance and partial execution are
different states; a missing progress report does not prove success or failure.
Cancellation can stop a wait without proving that host work stopped.

On provider/controller failure the host continues its configured safe autonomous
behavior or pauses optional work. Runtime can return no plan or an allowed
bounded rules proposal. Fallback never widens permission, invents mechanics, or
speaks unsolicited. Reconcile potentially adopted work before retrying; retain
unknown when the host cannot confirm it. A fresh ID or repeated delivery is not
an exactly-once guarantee. Provider retries can incur more usage and different
output.

Trace only permitted context/memory references, strategy/profile, proposal,
validation/adoption/report status, safe limits/usage, and a brief explanation.
Hidden model reasoning is not required or stored. See
[runtime profiles](runtime-profiles.md), [bridge authoring](bridge-authoring.md),
and [security](security.md) for detailed requirements.

## Web/server composition

`apps/laboratory` is React/TypeScript/shadcn UI and imports backend types only.
`apps/server` composes runtime-host service, provider clients and memory. Local
Node SQLite and Workers Durable Object SQLite share storage semantics through a
synchronous SQL driver. Protocol validators are generated ahead of time from
normative schemas, avoiding dynamic compilation inside Workers. The generic
server and adapters remain open self-hostable code. See
[public/private boundary](public-private-boundary.md) for owner infrastructure.
