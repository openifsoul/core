# Local runtime API

Status: first local experimental runtime/SQLite/synthetic-host slice. The
[v0.2 JSON Schemas](../specs/v0.2/README.md) remain normative and unchanged.
TypeScript views do not replace structural validation. No package is published;
imports are relative within core, run through `tsx` without a release build.

## Composition and trust

`packages/memory/src/sqlite.ts` exports
`openSQLiteMemory(path: string): Result<MemoryPort>`. `:memory:` is supported.
The local root handles open failures and closes the store in `finally`.
[Memory](../packages/memory/README.md) documents file locks and crash recovery.

`packages/runtime/src/index.ts` exports:

```ts
createRuntime({ memory, controller, now?, limits?, trace? }): Runtime
exchangeKey(characterId: string, category: string, id: string): string
```

`now` is `() => Date`, defaulting to the local clock. Before calling runtime,
the composition root establishes a trusted session with schema-valid
`character`, `profile`, `context`, and these local `access` assertions:

```ts
interface TrustedAccess {
  hostId: string;
  characterParticipantId: string;
  verifiedParticipantIds: string[];
  authorizedChannelIds: string[];
  recallEnvironmentIds: string[];
  visibleEntityIds: string[];
  memoryScope: Scope;
  allowPresenceTrigger?: boolean;
}
```

These are trusted local policy assertions, not authenticated wire claims. Equal
imported IDs or participant links do not establish identity/consent. The root
must supply authorized original content, current mappings and disclosure scope,
and exclude credentials or unrelated private data. Required unknown extensions
reject; optional JSON extensions survive recording. Controllers are injected
executable code, not sandboxed untrusted plugins.

`AgentController(input, signal): Promise<unknown>` receives copied selected input:
`operation: 'plan' | 'conversation'`, `character`, `profile`, `context`, `request`,
and bounded `memories: MemoryEvent[]`. Request is the planning request or a
conversation-request document. Output is untrusted and must pass the normative
schema and semantic checks. No provider keys, unrestricted store, or executor
are passed. The CLI injects an explicitly deterministic scenario controller.

## Operations

All operations return safe discriminated results:

```ts
type Result<T> =
  | { ok: true; value: T; reused?: boolean }
  | { ok: false; error: { code: ErrorCode; message: string } };
```

| Method                                                       | Result                                  | Implemented behavior                                                                                                                                                                                                             |
| ------------------------------------------------------------ | --------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `setSession(unknown)`                                        | `Result<void>`                          | Validate local mapping/profile/context; atomically create or restore immutable character and record original context. Explicit reselection may revisit an older revision; opaque revisions have no inferred order.               |
| `plan()`                                                     | `Promise<Result<PlanProposal>>`         | Use the explicit context planning request; bounded recall/controller invocation; validate request/binding/revisions, horizon/expiry, task count, advertised intents, exact typed arguments, visible entities and dependency DAG. |
| `conversation(unknown)`                                      | `Promise<Result<ConversationResponse>>` | Validate trigger/channel/participants/mode/deadline/modality before controller; validate correlated response and expiry afterward. Unsupported modality safely rejects.                                                          |
| `recordDecision(unknown)`                                    | `Result<void>`                          | Require a current valid proposal, exact unique task coverage, consistent aggregate status and accepted dependencies. Adoption is not execution.                                                                                  |
| `recordReport(unknown)`                                      | `Result<void>`                          | Correlate binding/plan/task/cycle with recorded acceptance; retain original reported status/effects/revision. Unaccepted task reports reject.                                                                                    |
| `recordDelivery(unknown)`                                    | `Result<void>`                          | Correlate response/request/channel/binding and timestamps. Accepted, delivered, rejected and unknown remain distinct. No-output cannot be accepted/delivered as speech.                                                          |
| `history({audienceParticipantIds?, limit?, maxBytes?} = {})` | `Result<MemoryEvent[]>`                 | Bounded authorized raw events; default audience is the character. This is trusted local inspection, not a public history endpoint.                                                                                               |

`MemoryPort` also exposes `putCharacter`, `getCharacter`, `getExchange`, atomic
`commit`, scoped `recall`, and `close`. The root can reconcile an exact known
report using `getExchange(exchangeKey(characterId, 'task-report', reportId))`.
A bounded history window cannot prove that an older task was never reported.
Keys encode a JSON tuple, so colon-bearing IDs cannot alias another character.
Internal exchange rows are not wire contracts or execution credentials.

## Scope and evidence

Recall filters character and authorized source environments. Every intended
recipient must be admitted by source scope. Conversation selection includes the
character, every direct recipient and eventual recorded-output participants.
Planning conservatively selects for all locally verified participants who may
receive host output. Public recording scope restricts controller recall to
public events. Source scope is never widened by controller selection. Source
environment authorization is explicit even across sessions. Export rights are
retained unchanged; there is no exporter or derived-export implementation.

Original context, proposal, decision, report, conversation request/response and
delivery are separate raw events with explicit provenance. Proposal proves
intention, adoption proves acceptance, and a trusted host report describes actual
execution. Runtime cannot independently verify host-reported truth. World ticks
in different timelines and opaque revisions are not globally sorted. Out-of-order
reports remain individual observations; no last-write-wins projection is created.
A response is a delivery proposal, not proof someone heard it.

Generated events reference their original plan/conversation source ID. Exact
selected memory IDs are transient safe trace metadata, not durable derivation
lineage. No derived fact/episode or export system is implemented; recording an
output event does not establish permission to export memory-derived content.

## Bounds and recovery

Defaults are 1,000 ms controller wait, 20 calls per runtime instance, 65,536 bytes
per input/output document, 64 selected records, 65,536 selected memory bytes and
24 hours of context age. Values must be positive integers. Hard ceilings are
60 seconds wait, 10,000 calls, 1,000,000 document/memory bytes and 1,000 selected
records. Selection bounds are applied in SQLite; bytes count serialized UTF-8,
not model tokens. No persistent token/cost budget or provider retry exists.

Waits race a timer/AbortSignal; ignored asynchronous cancellation does not keep
runtime waiting. Timers clear in `finally`. Late results cannot record proposals.
Synchronous code can block the JavaScript event loop; no process isolation exists.
Session generation, freshness and expiry are checked again after controller work.
Cached results also require current validity.

A durable immutable request claim precedes controller invocation. Completed
identical requests reuse results without another call; changed trusted input
under an existing ID rejects. Concurrent identical requests in one runtime share
a pending promise. A claim without a completed result returns `conflict` requiring
explicit reconciliation; the runtime does not retry it after a crash. This also
prevents a second runtime sharing the port from repeating an unfinished call.
Host decisions/reports/deliveries reject conflicting IDs. Linked storage records
commit atomically. These rules do not promise exactly-once host effects/delivery.
Keep one active runtime writer per composed local store.

Safe errors distinguish invalid documents/plans/conversation, unauthorized,
stale-context, expired, unsupported, correlation, conflict, timeout,
controller-failed, budget-exceeded, storage, database-owned, closed and no-session.
Upstream exception text is not echoed. Traces contain stage, operation, request
ID, safe status and selected memory IDs; no payloads, prompts or hidden reasoning.

## Measured and deferred

Local tests cover restart persistence, scope/source/character isolation,
transaction rollback, bounded selection, duplicate/conflicting IDs, unfinished
claims, malformed/oversized/late output, ignored cancellation, stale context,
argument/dependency checks, requested-only speech, host correlation, database
ownership and closure. CLI tests separately use fresh processes.

The separate [web laboratory](web-laboratory.md) adds real model providers and
authenticated local/Workers servers around this runtime. There is no real game
integration, NPC controller, scheduler, multi-tenant cloud service, archive
importer/exporter, general migration system, cancellation exchange, full
crash-recovery engine, checkpoint resume/fork, deletion propagation,
RAG/embeddings or derived facts/episodes engine. The SQLite schema is an internal
development format. See [deployment policy](deployment.md) for local commands.
