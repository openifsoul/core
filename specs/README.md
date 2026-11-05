# Protocol specifications

Start with the [current v0.2 design](v0.2/README.md). It separates persistent
characters, embodiments and providers, supports game/chat environments and
host-owned planning/dialogue. The sections below document the retained v0.1
baseline; they do not recommend implementing direct NPC control in a bridge.
ModelProvider v0.1 remains the current independent provider contract.

## Historical v0.1 baseline

The frozen local bootstrap baseline is **draft-0.1.0**. It specifies data
contracts, not a functioning agent system. The words MUST, MUST NOT, SHOULD,
and MAY express requirements for a future conforming implementation. Structural
requirements are in the [schema registry](../packages/protocol/README.md).
Additional semantic requirements below remain necessary even after validation.

| Area                           | Specification                             | Positive examples                                                                                                                                                    |
| ------------------------------ | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Character and archive          | [Character](character/README.md)          | [Template](character/examples/character-template.json), [instance](character/examples/character-instance.json), [manifest](character/examples/archive-manifest.json) |
| Event history and derived data | [Memory](memory/README.md)                | [Event](memory/examples/memory-event.json), [summary](memory/examples/derived-memory.json)                                                                           |
| World and authorization        | [WorldAdapter](world-adapter/README.md)   | [Perception](world-adapter/examples/perception.json), [action](world-adapter/examples/action.json), [result](world-adapter/examples/action-result.json)              |
| Model boundary                 | [ModelProvider](model-provider/README.md) | [Request](model-provider/examples/request.json), [response](model-provider/examples/response.json), [error](model-provider/examples/error.json)                      |

These examples are normative positive structural examples using original,
synthetic data. They do not claim that an adapter, provider, archive importer, or
memory engine exists. The initial character archive predates the separate
watering trace; its instance therefore has empty history references.

## Frozen field conventions

- JSON uses UTF-8, case-sensitive camelCase property names, and a `kind`
  discriminator. Every exchange envelope has `schemaVersion: "draft-0.1.0"`.
  Absence and `null` differ; optional values are omitted, never `null`.
- IDs are opaque, case-sensitive ASCII strings matching
  `[A-Za-z0-9][A-Za-z0-9._:-]{0,127}`. They are not paths, display names, emails,
  URLs, credentials, or implied authorities. Allocation and collision detection
  belong to the producer/importer. A referenced ID MUST resolve in its stated
  namespace; equal IDs in unrelated worlds do not identify the same actor.
- A `characterId` identifies a portable instance. `actorId`, `observerId`, and
  scope `subjectIds` identify world subjects within `worldId` + `sessionId`.
  A trusted composition root maintains their mapping; it is not inferred from
  names. A template ID and revision identify reusable authored content.
- Revisions are positive integers for template/policy content; capability/world
  revisions are opaque IDs. No lexicographic revision ordering is implied.
- `recordedAt`, `createdAt`, `observedAt`, `requestedAt`, `deadlineAt`, and
  `evaluatedAt` are RFC 3339 date-time strings restricted to UTC `Z`, four-digit
  years, seconds, and optional 1–9 digit fractional seconds. They describe wall
  clock recording or scheduling, not world chronology. Deadline comparisons
  require a trusted local clock and explicit transport clock handling.
- `worldTime` is `{ "timelineId": <id>, "tick": <nonnegative integer> }`.
  Ticks have no implied duration or UTC conversion. Worlds document their tick
  rate separately. A reset, branch, or incomparable clock uses a new timeline
  ID. Integers in common counters are bounded by `9007199254740991` for portable
  exact representation. No global event ordering is promised.
- Ordinary contract objects reject additional properties. Open JSON payloads,
  argument-schema objects, and extensions are explicit exceptions. Unknown
  properties MUST NOT be silently removed to make a document pass validation.
- `extensions` is an optional object keyed by lowercase dotted namespaces such
  as `org.example.notes`. Values are arbitrary JSON. `requiredExtensions` is an
  optional unique array of those keys. Every required key MUST exist in
  `extensions` and be understood before processing. Schema validation alone
  cannot check that relationship or an implementation's support.
- Unknown optional extensions MUST be preserved as JSON values by a lossless
  import/export path. An implementation unable to preserve them MUST reject
  that operation or obtain an explicitly filtered export with recorded losses.
  Unknown required extensions MUST cause rejection. Neither grants authority.
- Human-readable text, memory, model output, imported payloads, and semantic
  descriptions are untrusted data; they cannot grant permissions or override
  trusted policy. Validators MUST NOT fetch external schema references found in
  untrusted argument/tool schemas. Limits and allowed local references must be
  applied before compiling those nested schemas.

## Schema limits and semantic validation

JSON Schema checks fields, types, supported versions, tagged variants, and some
status relationships. It cannot prove uniqueness of selected IDs across records,
referential integrity, provenance truth, licenses, consent, authorization, UTC
clock accuracy, time ordering, checksums, archive completeness, action effects,
model capability support, or psychological identity. Future consumers MUST
check the requirements relevant to their operation, with bounded document,
array, string, archive, and model sizes. This draft intentionally does not pick
universal resource budgets or implement a semantic validator.

The schema of a capability's arguments or model tool is itself JSON data here.
A consumer MUST separately validate it as JSON Schema 2020-12, enforce its local
reference/complexity policy, and validate arguments against it. Merely passing
the enclosing schema does not validate the arguments.
