# Component and ownership boundaries

Status: **design boundaries with a limited local implementation**. The
[runtime API](runtime-api.md) documents implemented validation and trusted-local
assumptions; these responsibilities do not imply complete security or isolation. [Architecture](architecture.md) owns the revised import graph;
[v0.2](../specs/v0.2/README.md) owns revised wire contracts. Original v0.1 remains
historical material rather than an additional implementation commitment.

## State and authority

| Owner                        | Owns                                                                                                 | Does not own                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `protocol`                   | Versioned structural/semantic contracts                                                              | Runtime logic, IO, vendor types, credentials                                    |
| `memory`                     | Scoped portable history, working/episode/long-term views, provenance, export/deletion via MemoryPort | World truth, proof of identity from imported IDs, provider keys                 |
| `permissions`                | Trusted policy/scope/consent evaluation                                                              | Rights from text, host mechanics                                                |
| `runtime`                    | Bounded planning/dialogue orchestration and proposal validation                                      | NPC state machines, movement, shooting, pathfinding, SQLite/vendor construction |
| `model-providers`            | Inference capability/request/response boundary                                                       | Full-agent lifecycle, host execution, policy authority                          |
| External AgentController     | Bounded full decision strategy behind runtime's planned interface                                    | Unrestricted memory/keys, direct execution, policy overrides                    |
| `adapter-sdk` and bridges    | Environment/context/intent/dialogue/report translation                                               | NPC mechanics, full archive access, provider selection                          |
| Host game/mod                | All NPC mechanics/state machines and authoritative adoption/execution/progress                       | Unchecked mutation of unrelated portable history                                |
| Application composition root | Wiring, trusted mappings, one-writer ownership, profiles/limits, secret provisioning                 | Bypassing host restrictions or silently changing versions                       |

All movement/shooting/pathfinding remains in host code, including when IfSoul
authors the first-party bridge. Exposing a high-level intent is not implementing
an executable skill. A bridge must not quietly absorb missing host AI mechanics.

The host owns whether a plan is adopted and what occurs afterward. A delivered
proposal is not accepted work; accepted work is not completed work. Only host
reports establish actual progress/effects. Dialogue text generation is separate
from host-confirmed delivery. Preserve unknown outcomes without optimistic facts.

## Character and environment identities

The persistent character is separate from the current body/embodiment and model.
Games/chat can be environments; chat can simultaneously be a channel into a
character embodied elsewhere. The root binds identities and stable user relations
through a trusted process. Names and equal imported IDs do not establish consent
or cross-environment ownership. Nonhuman bodies can have constrained senses and
expression; generic character traits do not add missing capabilities.

Authored backstory, lived host reports, and derived interpretations retain
different provenance. World ticks are comparable only within their timeline;
there is no invented global event order. One active character-state writer
initially sequences scoped updates from coexisting channels. Resume requires
ownership handoff; fork starts a separate continuation. Multi-writer merge is
not part of the first design.

## Interfaces and implementations

MemoryPort has an experimental source interface; ModelProvider and
EnvironmentBridge retain planned narrow entrypoints separate from
storage/vendor/transport implementations. Runtime can import only those ports
from their packages. AgentController is a runtime-owned interface for an external
full decision agent, not another
ModelProvider or new package. MemoryPort, SQLite and AgentController now have
experimental source interfaces; provider clients are implemented; real game bridge implementations remain deferred.

Composition roots inject implementations. Runtime does not read keys, open SQLite,
or construct vendor clients. Bridges receive bounded authorized host/character
context, not unrestricted MemoryPort or an archive. Providers/controllers receive
selected authorized context; neither gains filesystem, game, or policy authority.
Credentials remain in a separate trusted secret boundary, outside memory,
messages, diagnostics, and archives.

Game/chat bridges import only protocol and adapter-sdk among IfSoul packages.
Production code cannot import testing or reach into another repository through
relative paths. The simulator is a conformance exercise/root, not a hidden
production dependency. Game APIs, mod internals, and third-party assets are not
included in public core.

## Open runtime and private operations

The public path must work without private code, an IfSoul account, or managed
cloud. Local rules/local-model use remains intended; remote BYOK services have
their own requirements. Private Last Call code or any other project is not an
implicit source/dependency.

The public runtime host is a composition root for local and hosted
placement. Managed cloud **may host/import the public runtime and public ports**;
the earlier memory-only cloud restriction is superseded. Private billing,
accounts, provisioning, and managed operations may wrap it. The open runtime
cannot import or require those private services, and public self-hosting must
remain possible. Website consumes public docs/metadata only, with no runtime or
private character-state dependency. An authenticated single-owner server exists; a multi-tenant managed product remains deferred.

Runtime location and model payment are separate: BYOK can be local or hosted if
explicitly supported. Hosting does not authorize full archive/key disclosure.
See [execution modes](execution-modes.md) for connector and writer boundaries.

## Crossing a boundary

Validate structure/version, then semantics, identity/references, limits, scopes,
consent, and authorization for the operation. Required unknown features reject
processing; unknown optional extensions survive a lossless path or are explicitly
filtered. Schema success does not prove any runtime security or actual effect.

Cadence and communication are independent. A daily planning trigger does not
permit speech under requested-only policy. Late/stale plans require host review;
provider/controller failure leaves host safe behavior in charge, never a per-tick
model dependency. See [runtime profiles](runtime-profiles.md).

Access does not imply export, backup, remote inference, or cross-channel sharing
permission. Filtered archives declare losses safely; private backups include only
all authorized data. Deletion/revocation propagates to derived data and controlled
copies, with a documented backup policy. See [security](security.md).
