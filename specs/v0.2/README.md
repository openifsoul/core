# Character and host contracts: draft-0.2.0

This revision describes portable characters in games and chat, including hosts
that already control NPC behavior. It is **documentation, JSON Schema, and
synthetic examples only**. There is no character controller, model client, game
bridge, locomotion executor, storage engine, archive importer, or migration.
The words MUST, MUST NOT, SHOULD, and MAY describe future conformance.

The historical [draft-0.1.0](../README.md) schemas and example bytes remain unchanged. This revision is an
explicit new contract, not an automatic upgrade, replacement of every independent
contract, or promise that old documents can be imported. In particular,
[ModelProvider](../model-provider/README.md) retains `schemaVersion: "draft-0.1.0"`
and its existing `urn:ifsoul:protocol:draft-0.1.0:model-provider` ID. A v0.2
controller may use that independent provider boundary after explicit composition;
a v0.2 character or plan is not a v0.1 model request. No v0.2 provider schema or
implicit version coercion is introduced. Historical v0.1 permission-policy
messages are also not embedded into these new envelopes; current trusted
policy and host restrictions still require explicit evaluation.

## Registry and shared conventions

All schema files are in
[`packages/protocol/schemas/v0.2/`](../../packages/protocol/schemas/v0.2/).
The `$id` prefix is `urn:ifsoul:protocol:draft-0.2.0:` plus the listed suffix.
Register all eight local files by `$id`, then compile with Ajv 2020,
`strict: true`, and `ajv-formats` for `date-time`. URNs are identifiers, not
hosted endpoints; no network resolution, type coercion, default insertion,
unknown-field removal, or union-type relaxation is needed.

| File / ID suffix                                                                                           | Root `kind` values                                                                                             |
| ---------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| [common.schema.json](../../packages/protocol/schemas/v0.2/common.schema.json) / `common`                   | Definitions only; deliberately rejects exchange documents                                                      |
| [character.schema.json](../../packages/protocol/schemas/v0.2/character.schema.json) / `character`          | `character-template`, `character-instance`                                                                     |
| [environment.schema.json](../../packages/protocol/schemas/v0.2/environment.schema.json) / `environment`    | `environment-profile`                                                                                          |
| [context.schema.json](../../packages/protocol/schemas/v0.2/context.schema.json) / `context`                | `context-report`                                                                                               |
| [planning.schema.json](../../packages/protocol/schemas/v0.2/planning.schema.json) / `planning`             | `plan-proposal`, `plan-decision`, `task-report`, `plan-cancel-request`, `plan-cancel-result`                   |
| [conversation.schema.json](../../packages/protocol/schemas/v0.2/conversation.schema.json) / `conversation` | `conversation-request`, `conversation-response`, `conversation-delivery`                                       |
| [memory.schema.json](../../packages/protocol/schemas/v0.2/memory.schema.json) / `memory`                   | `memory-event`, `working-context`, `memory-episode`, `memory-fact`, `memory-relationship`, `intent-checkpoint` |
| [archive.schema.json](../../packages/protocol/schemas/v0.2/archive.schema.json) / `archive`                | `archive-manifest`                                                                                             |

Every envelope requires `schemaVersion: "draft-0.2.0"` and `kind`. Objects are
closed unless explicitly designated as a trait/argument map or extension object.
Optional fields are omitted; `null` is not a substitute. JSON is UTF-8 and field
names are case-sensitive camelCase. IDs match
`[A-Za-z0-9][A-Za-z0-9._:-]{0,127}`: opaque, case-sensitive names rather than
credentials, paths, proof of identity, or executable instructions. Counters use
nonnegative integers no larger than `9007199254740991`.

Bound host envelopes require `binding: { environmentId, sessionId, characterId,
embodimentId }`. The trusted composition root verifies that binding against the
current host. Model identity is absent from it. UTC timestamps require RFC 3339
`Z` form with seconds, a four-digit year, and optional 1–9 digit fractional
seconds. `worldTime`, where present, is `{ timelineId, tick }`, with no assumed
UTC conversion or fixed tick rate. A reset or incomparable timeline needs a new
ID. Chat does not require a world clock.

`period` and `horizon` are tagged unions:

- `{ basis: "utc", startAt, endAt }`, using UTC timestamps.
- `{ basis: "world-ticks", timelineId, fromTick, toTick }`.

Consumers MUST check ordering, available clocks, and agreement with the current
environment. A host's daily cadence may mean an arbitrary configured game day;
it is not hardcoded to 24 wall-clock hours or a built-in scheduler.

Optional `extensions` uses lowercase dotted namespaces such as
`org.example.notes`, preserving arbitrary JSON values. Every optional
`requiredExtensions` key MUST exist and be understood before processing.
Unknown optional extensions MUST survive a claimed lossless transfer; inability
to preserve them requires rejection or a disclosed filtered operation. Unknown
required extensions reject processing. None can grant authority. Schemas cannot
verify implementation support or dynamic key membership.

Numeric array/string bounds on profiles, reports, plans, and utterances limit
one supported exchange or snapshot; they are not lifetime memory quotas. Exceeding
a bound MUST produce an explicit rejection or a separately agreed filtered
operation, never silent truncation. Instance memory references are selected
snapshot/index roots, not an exhaustive enumeration of lifetime history. Archive
memory streams may be sharded across files; the schema imposes no fixed maximum
file count or lifetime event count. Implementations still apply explicit resource
budgets and fail transparently when exceeded.

## Character, model, and embodiment

A **character** is portable authored identity plus permitted lived experience.
A **model** is a replaceable inference facility, not the character. An
**embodiment** is the host's present representation and available modalities, not
a portable inventory, health record, or behavior engine.

| `kind`               | Required fields beyond the envelope fields                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------- |
| `character-template` | `templateId`, `revision`, `profile`, `authorship`                                                  |
| `character-instance` | `characterId`, `participantId`, `createdAt`, `profile`, `memoryRecordIds`, `relationshipMemoryIds` |

One shared `$defs/profile` supplies both documents. It requires `name`,
`description`, `traits`, `preferences`, `speechStyle`, `goals`, and
`authoredBiography`. Empty collections and a style description that language is
unavailable are valid. `speechStyle` contains description, language labels, and
habits: preferences for expression **when supported**, never an ability or a
requirement to speak. The same character may be a human, horse, computer, or
another form; the active embodiment restricts actual output.

Preferences identify a subject, stance (`like`, `dislike`, `avoid`, `seek`),
description, and optional strength. Goals have IDs, descriptions, priority, and
status; they are intentions, not host tasks or achieved facts. Authored biography
is explicitly marked `fictional: true`; it describes this baseline's original
fictional characters and MUST NOT be presented as lived memory. Templates have
positive integer revisions, authorship/license claims, and no individual memory.
Instances may reference an exact template revision and record import/fork lineage;
template changes do not silently overwrite an instance. Memory and relationship
references must resolve consistently, subject to declared export filtering.

The [template](examples/character-template.json) defines reusable authored data;
the [instance](examples/character-instance.json) includes selected references
into the recorded synthetic trace. Model settings, authentication, host state,
and host execution bindings do not belong in the portable character document.

## Environment and stable participants

An Environment Profile requires `binding`, `hostId`, `revision`, `medium`,
`embodiment`, `participantLinks`, `planning`, `communication`, and `hostIntents`.
`medium` is `game` or `chat`. `embodiment.form` is an open opaque ID; the examples
`human`, `horse`, and `computer` are not a closed species catalog. Modalities are
an explicit subset of `speech`, `text`, `vocalization`, `gesture`, and `status`,
and may be empty. No language-capable form is compulsory.

`participantId` is a stable participant reference across sessions. Each
`participantLinks` entry is an issuer's **claim** connecting that reference to an
`environmentSubjectId` in this bound session. An entry has a `claimId` and
`issuerId`; no self-asserted verification flag exists. Trusted identity proof,
revocation checks, access checks, and the host binding are required before using
the claim. A display name, repeated ID string, imported relationship, or prior
session claim proves no identity or consent in a new session.

Planning and communication are independent:

- `planning` declares `cadence: host-requested | daily | event-driven` and a
  `maxTasks` bound. The host chooses when to issue a planning request; the schema
  does not schedule it or authorize unsolicited execution.
- `communication` declares `mode: host-requested | live-channel`,
  `availability: on-demand | persistent`, `allowUnrequestedMessages`, and known
  `channelIds`. Persistent availability does not authorize unrequested speech.
  Host-requested mode structurally requires `allowUnrequestedMessages: false`.
  Live mode may also forbid unrequested messages while allowing replies.

[Game](examples/environment-game.json), [live chat](examples/environment-chat.json),
and [non-speaking horse](examples/environment-no-speech.json) profiles illustrate
independent host cadence, online availability, and output capabilities.

## Host briefing and bounded planning

The host owns NPC state machines, locomotion, steering, pathfinding, combat,
shooting, interactions, inventory, health, scheduling, and authoritative outcomes.
The bridge conveys context, a bounded plan proposal, dialogue, and status to
existing host facilities. It MUST NOT grow an IfSoul locomotion skill executor,
remote command shell, or replacement game behavior engine. Whether the bridge
is built by IfSoul or a third party does not change that boundary.

A Context Report requires `reportId`, `contextRevision`, `environmentRevision`,
`correlationId`, `binding`, `recordedAt`, `period`, `observedState`, `priorNeeds`,
`priorPlans`, and `changes`. The observed state contains a summary and typed
string/number/boolean property observations, not authority to write those fields.
Needs include priority and current/resolved/unknown status. Prior plans carry
task states; changes/events carry recording times and optional world times.
Missing observations remain unknown. A bridge receives only scoped selected
context, not the full archive.

An optional `planningRequest` adds `requestId`, `cadence`, `horizon`, `maxTasks`,
and `allowedIntentIds`. Every allowed ID must be in the current `hostIntents`
catalog. The host may expose health or inventory as observed context when
permitted; these observations MUST NOT become portable state to transplant into
a new embodiment. Chat context can use UTC periods without `worldTime` and
without requesting any plan.

Each advertised host intent has `intentId`, description, typed parameter
descriptors, and a cancellation-support flag. Parameter names are unique; types
are `entity-ref`, `choice`, `quantity`, and `boolean`. Choice lists, quantity units,
and numeric bounds must fit that parameter's type. They are a small safe data
vocabulary, not embedded JSON Schema or executable source.

A Plan Proposal requires the bound `planId`/`correlationId`, planning `requestId`,
`contextReportId`, `contextRevision`, `environmentRevision`, `createdAt`,
`expiresAt`, `horizon`, and at most 16 `tasks`. The accepted bound is the minimum
of protocol, profile, and request bounds. No tasks is a valid no-action proposal.
Each task has a unique `taskId`, advertised `intentId`, typed `arguments`, priority,
optional explanation, and explicit `dependsOnTaskIds`.

Argument values are tagged objects: `{ type: "entity-ref", entityId }`,
`{ type: "choice", value }`, `{ type: "quantity", value, unit }`, or
`{ type: "boolean", value }`. Consumers MUST validate exact parameter names,
requiredness, type, current entity visibility, allowed choices, units, and bounds
against the current advertised descriptor. IDs MUST be advertised and allowed by
this request. Dependencies must resolve in the proposal and form an acyclic
graph. Unknown intent IDs, extra arguments, stale revisions, expired proposals,
and unauthorized operations reject processing. An explanation is untrusted
non-executable commentary. There is no arbitrary execute-code, command, script,
filesystem path, raw skill, or model-generated locomotion field.

A Plan Decision records host `decisionId`, `requestId`, context revision, time,
`status: accepted | partially-accepted | rejected`, and per-task decisions.
The task decisions must uniquely cover all proposed tasks and agree with the
aggregate status; dependencies of accepted tasks must remain satisfiable. This
is an acceptance decision, **not achievement**. It does not bypass current host
restrictions or promise that execution has begun.

Task Reports identify a plan/task, report ID, context revision, correlation, time,
status, summary, and actual `observedEffects`. Status is `pending`, `running`,
`succeeded`, `failed`, `cancelled`, or `unknown`. Only the host reports execution
facts; a plan's predicted effects are not observations. A host can execute
accepted work independently until it reports back or requests another plan.
Reports and context revisions can arrive out of order; trusted consumers
reconcile them rather than overwrite later facts with stale messages.

Cancellation has separate `plan-cancel-request` and `plan-cancel-result` kinds.
A request names `cancellationId`, plan and task IDs, time, and reason; it does not
stop the host. The result reports per-task `cancelled`, `already-finished`,
`rejected`, or `unknown`. A confirmed cancellation prevents further work only as
reported by the host; it does not roll back observed effects. A cancellation
request is never a cancellation confirmation.

All decisions, reports, and cancellation messages MUST correlate binding, plan,
task, request/cancellation IDs, and trusted sender identity. Duplicate delivery
is not new work. This draft promises no idempotent execution or exactly-once
transport. Unknown acceptance, execution, cancellation, or delivery requires
host reconciliation; do not send a replacement plan/task or blindly retry under
new IDs. If the host cannot reconcile, preserve unknown and request an explicit
recovery decision. No transport or reconciliation method is implemented here.

The [daily context](examples/context-daily.json), [proposal](examples/plan-daily.json),
[partial acceptance](examples/plan-partial-decision.json),
[progress](examples/task-progress.json), [outcome](examples/task-outcome.json),
[cancel request](examples/plan-cancel-request.json), and
[cancel result](examples/plan-cancel-result.json) are a synthetic host-owned trace.
Watering was proposed and rejected; it never becomes an accomplished memory.

## Conversation is a separate exchange

Requests and responses require `binding`, `requestId`, `correlationId`,
`channelId`, `speakerParticipantId`, and `recipientParticipantIds`.
A Conversation Request additionally carries the environment/context revisions,
mode, trigger, requested modality, receipt/deadline timestamps, and bounded
input messages. Messages identify their author participant, message ID, recording
time, modality, and content. The requested speaker must be the character's
verified bound participant; sender/channel identity and recipients require
trusted verification and current authorization.

`host-requested` mode structurally requires `trigger: "host-request"`. Live mode
may use `host-request`, `incoming-message`, or `presence-event`. A trusted host
or authorized runtime issues every correlated request; an always-online character
cannot manufacture a request to bypass profile policy. Reactive live replies
can be allowed while unrequested speech is forbidden. Proactive output from a
presence trigger additionally requires `allowUnrequestedMessages: true`,
authorized scheduling, and channel permission. If any condition is missing,
produce no output. The flag alone is not a scheduler or permission grant.

Responses add `responseId`, `createdAt`, `expiresAt`, and an output union:
`{ type: "utterance", modality, content }` or
`{ type: "no-output", reason }`. Output is a proposal for host/channel delivery,
not proof anyone heard it. The host must validate the current modality, binding,
channel, recipients, request correlation, and expiry before delivery. A missing
speech modality never causes synthesized spoken language; `unsupported-modality`
is a valid no-output reason. Style preference cannot override embodiment limits.

Conversation Delivery reports identify the response and channel with a unique
`deliveryId`, timestamp, and `accepted | delivered | rejected | unknown` status.
Accepted is not delivered; unknown must be reconciled before retrying to avoid
duplicate speech. Host delivery controls remain authoritative in both modes.
Model output is not directly broadcast or treated as a world action.

Examples: [host request](examples/conversation-requested-request.json) and
[utterance](examples/conversation-requested-response.json),
[live incoming message](examples/conversation-live-request.json) and
[text reply](examples/conversation-live-response.json),
[unsupported speech request](examples/conversation-no-speech-request.json) and
[non-speaking response](examples/conversation-no-speech-response.json).
The chat profile is persistent but explicitly disallows autonomous unrequested
messages. No conversation or game connection is actually running.

## Portable memory and intent checkpoints

All memory variants require `memoryId`, `characterId`, `recordedAt`, `scope`, and
`provenance`. Scope uses stable `participantIds`, audience, and export policy.
Private means exactly one participant; participants means a nonempty explicit
list; public means an empty list. These cardinalities and identity verification
are semantic checks. Public world visibility does not grant public publication
or export consent. `export` is allowed, consent-required, or forbidden; actual
access/consent must still be checked. Derived records cannot broaden their
sources' scope or export rights.

Provenance sources have explicit `sourceType` and `sourceId`. Types distinguish
authored material, host reports, conversations, memory, derivation, import,
plan proposals, and plan decisions. References preserve their original meaning:

- A `plan-proposal` proves only that an intention was proposed.
- A `plan-decision` proves only what the host accepted or rejected.
- A trusted `host-report` can support a claim about observed execution, subject
  to its actual reported status and access scope.
- Authored biography remains authored material, never generated lived history.

| Memory `kind`         | Additional content                                                                                              |
| --------------------- | --------------------------------------------------------------------------------------------------------------- |
| `memory-event`        | `eventType`, required original `recordedPayload`, participants; optional summary/environment/session/world time |
| `working-context`     | Summary, active topics, selected relevant memory IDs, expiry                                                    |
| `memory-episode`      | Summary, nonempty source memory IDs, period                                                                     |
| `memory-fact`         | Claim, nonempty source memory IDs, optional uncalibrated confidence                                             |
| `memory-relationship` | Stable subject/object participants, relation, description, source memory IDs                                    |
| `intent-checkpoint`   | Bounded portable intents, optional next review time                                                             |

Working context is a bounded current selection, not the full archive. Episodes,
facts, and relationships are interpretations with provenance; they do not replace
raw event records or become trusted instructions. Every raw Memory Event requires
`recordedPayload`, an open JSON object preserving the original authorized content
that IfSoul actually received, including unknown fields. Its optional `summary`
is an index annotation and MUST NOT replace the received content. Raw means the
received observation or message, not omniscient world history. When privacy or
consent requires redaction, the filtered export must explicitly disclose the
omission; it MUST NOT claim the remaining summary is the original record. Confidence is a source score,
not a calibrated probability. Missing or deleted source data requires explicit
reference/filter handling and deletion or recomputation of affected derivatives.
No store, retention engine, summarizer, or deletion propagation is implemented.

Each checkpoint intent contains a portable ID, description, desired outcome,
status, and source memory references. It contains **no host plan/task execution
handle**, environment binding, inventory, health, combat state, path, skill
executor continuation, or running game state machine. Text and extensions MUST
NOT smuggle executable commands or host continuation credentials. Restoring an
active intention means re-evaluating a desire under a freshly verified profile
and context, not restarting a host operation. A new host request/decision is
required before any execution. Portable status cannot prove current host state.

The [proposal memory](examples/memory-event-plan-proposal.json),
[decision memory](examples/memory-event-proposed.json), and
[observed outcome memory](examples/memory-event-observed.json) deliberately
separate intentions, acceptance, and reported facts. The
[initial checkpoint](examples/intent-checkpoint.json) contains a general learning
intention, not the daily plan's host task handles.

## Archive: resume or fork explicitly

An Archive Manifest requires `archiveVersion`, `archiveId`, `characterId`,
`createdAt`, `transferIntent`, `schemaInventory`, `files`, `filter`, `provenance`,
and `portableCheckpointIds`, in addition to the envelope fields. The archive
version is independent from wire and provider versions even though its current
value is also `draft-0.2.0`.

`transferIntent` is exactly one of:

- `{ mode: "resume", expectedCharacterId }`: continue the same portable identity
  after trusted authorization; the expected ID must equal the snapshot identity.
- `{ mode: "fork", newCharacterId, newParticipantId }`: request a distinct branch
  with newly allocated, different character and participant IDs. Preserve source
  lineage and provenance; the new identity inherits no access rights or consent.

A transfer intent is not itself authorization. Neither mode resumes host
execution. Existing world bindings, sessions, execution handles, inventory,
health, provider keys/settings, account credentials, or other secrets MUST NOT
be exported as portable state. Resume requires fresh host mapping and
reconciliation. Fork needs an explicit identity/provenance mapping; original
source authors and participants are not silently relabelled as the new identity.
No fork implementation or conflict-merge policy is claimed.

`schemaInventory` explicitly lists supported character/memory schema IDs and
versions. `files` entries have safe relative path, role, schema ID, record count,
SHA-256 over exact uncompressed bytes, and byte count. Character files contain
one UTF-8 JSON document; memory files contain UTF-8 JSONL with one complete record
per nonempty line, and can be sharded. Roles must match the actual tagged kind;
all referenced schemas must appear in the inventory. Only v0.2 character/memory
files are admitted. Direct host execution/profile files and model/provider
configuration are excluded. Authorized original reports and conversation content
are retained inside memory-event recordedPayload as historical evidence, not
imported as live execution messages. Historical plan/task/report IDs support
provenance; they are not active execution handles. A recorded health or inventory
observation may be remembered, but MUST NOT initialize or overwrite the next
host embodiment's health or inventory. Secrets remain excluded even from raw
payloads; any required redaction is explicit filtered export.

A future importer MUST verify unique confined normalized paths, reject traversal,
symlinks, unlisted entries and platform collisions, enforce decompression/size
budgets, verify counts/checksums, validate records and versions, check reference
closure/identity/scope/consent, and operate safely before mutating a destination.
These checks exceed JSON Schema and are not an implemented import pipeline.
Checksums prove byte equality, not a trusted author. Missing data is not invented.
Portable reference closure covers the declared character/memory records and
their provenance sources, which may retain an original source object inside
recordedPayload. Historical world/session/entity/revision identifiers inside that
original content are evidence, not promises to include or reconnect the entire
host world. They MUST NOT be resolved into live host authority during import.

`filter` explicitly declares complete-authorized or filtered mode, omitted
categories, reasons, and whether external references remain. Complete-authorized
means all authorized portable data in the declared source snapshot, including
original received memory events rather than summaries alone, with empty
omissions/reasons and no unresolved external references; it does not bypass consent. A filtered export
records actual exclusions and nonempty reasons without revealing withheld
content or private IDs. Unknown optional extensions must be preserved or their
loss disclosed. Unsupported required extensions or versions reject import.
There is no automatic v0.1-to-v0.2 migration, behavioral equivalence guarantee,
round-trip implementation, or silent down-conversion.

[Resume](examples/archive-resume.json) and [fork](examples/archive-fork.json)
manifests describe the same synthetic snapshot after the interaction trace. Their
hashes cover the two sibling character files and the nine-record
[memory stream](examples/portable-memory.jsonl), including original host-report,
plan/decision and chat content, derived selections, relationships, and the
portable checkpoint. The other envelope examples are not claimed as executable
archive contents.

## Structural versus semantic validation

Schemas enforce exact versions, tags, closed shapes, typed values, bounded
exchanges, and the two requested-only communication constraints. A schema pass
cannot prove identity, authorization, truthful provenance, scope/consent,
reference closure, intent-catalog membership, argument-descriptor agreement,
unique selected IDs, acyclic dependencies, valid period ordering, fresh revisions,
clock accuracy, plan-decision aggregation, actual task effects, checkpoint safety,
or archive integrity. Future consumers MUST perform the applicable checks before
acting. Unknown outcomes stay unknown until authoritative reconciliation.

All examples are original synthetic fixtures under the project's normative
example license. No real conversations, credentials, installed game content,
third-party characters, or private project code are included.
