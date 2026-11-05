# WorldAdapter and authorization contracts

Historical v0.1 contract. The [v0.2 design](../v0.2/README.md) uses host-owned
planning/dialogue profiles. Do not interpret this legacy action vocabulary as
authorization to implement NPC locomotion, combat or pathfinding in IfSoul bridges.

WorldAdapter is a planned transport-independent boundary: negotiate versions,
obtain capabilities, perceive an actor's available world, submit an action, and
receive authoritative results/events. No adapter methods, transport, engine,
network endpoint, or game integration are implemented by these schemas.

| Envelope            | Required fields beyond `schemaVersion`, `kind`                                                                                     |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Capability set      | `adapterId`, `worldId`, `sessionId`, `actorId`, `capabilityRevision`, `supportedSchemaVersions`, `capabilities`                    |
| Perception          | `observationId`, `adapterId`, `worldId`, `sessionId`, `observerId`, `observedAt`, `worldTime`, `observations`                      |
| Action              | `actionId`, `worldId`, `sessionId`, `actorId`, `capabilityId`, `capabilityRevision`, `arguments`, `requestedAt`, `deadlineAt`      |
| Action Result       | `resultId`, `actionId`, `adapterId`, `worldId`, `sessionId`, `actorId`, `recordedAt`, `worldTime`, `status`, `execution`, `events` |
| World Event         | `eventId`, `adapterId`, `worldId`, `sessionId`, `sourceSequence`, `recordedAt`, `worldTime`, `scope`, `type`, `payload`            |
| Permission Policy   | `policyId`, `revision`, `worldId`, `sessionId`, `rules`                                                                            |
| Permission Decision | `decisionId`, `policyId`, `policyRevision`, `worldId`, `sessionId`, `subjectId`, `resource`, `action`, `decision`, `evaluatedAt`   |

## Capabilities, observations, and permission

A capability describes what an adapter can attempt, not what a particular actor
may do. Each entry contains `capabilityId`, `description`, `argumentsSchema`,
`requiredPermissions`, `semantics`, and `idempotency`. `semantics.preconditions`
and `semantics.possibleEffects` are human-readable descriptions, not executable
code or proof that effects occurred. Capability IDs MUST be unique in a set.
`capabilityRevision` identifies the exact set; a request using an obsolete or
unsupported revision is rejected rather than reinterpreted.

The consumer and adapter MUST select an explicitly shared schema version before
exchanging actions. The bootstrap supports only `draft-0.1.0`; the supported
version list is not a range parser or an implemented handshake. Identities MUST
match the bound world, session, and actor; matching IDs from another context do
not confer access.

Perception is an explicitly limited observation: `observations` contains
`subjectId`, `scope`, and open `payload` objects. Missing observations mean
unknown, not false. Optional `availableCapabilityIds` is an advisory subset, not
an authorization grant. Optional `worldRevision` can be carried back as the
action's `observedWorldRevision`; the game decides whether it is still usable.
World state can change after observation. An adapter MAY reject stale or newly
invalid actions even when runtime previously allowed them.

A Permission Policy is a synthetic declarative baseline. Rules match exact
`subjectId`, `resource`, and `action` in the policy's world/session; no wildcard,
inheritance, or free-text matching is defined. Each has a unique `ruleId` and
`effect: "grant" | "revoke"`. Any matching revoke denies; otherwise a matching
grant allows; no match denies. Revocation is represented in a new policy revision,
not deletion of audit history. `resource` and `action` are opaque IDs resolved by
trusted policy; a resource named in a payload cannot create authority.

`requiredPermissions` lists prerequisites to check, not grants. Runtime MUST
check authorization for the proposed operation, including current policy and
scope; the adapter MUST independently check current game restrictions. An empty
prerequisite list never bypasses those checks. A Permission Decision records an
`allow` or `deny` for a policy revision at `evaluatedAt`; it is evidence, not a
bearer token, and may already be stale. Neither an instance, model tool call,
capability advertisement, observation, nor memory event can grant permissions.

## Execution, deadlines, and retries

Action arguments MUST validate against the selected capability's separately
validated JSON Schema. The adapter checks deadline and current preconditions
before starting; expiry before starting yields rejection. Once execution might
have started, a timeout or cancellation MUST NOT be treated as proof of failure.
`deadlineAt` requests a bound on starting/waiting; it does not roll back the world.
This draft has no cancellation message; a future transport must distinguish
cancelling a wait from confirmed prevention of execution.

| `status`   | `execution`                | Meaning                                                                                      |
| ---------- | -------------------------- | -------------------------------------------------------------------------------------------- |
| `success`  | `completed`                | The requested operation completed; no `error`                                                |
| `rejected` | `not-started`              | Validation, authorization, deadline, or current-world rejection; requires `error`, no events |
| `failed`   | `not-started` or `partial` | Authoritative execution failure; requires `error`; no events when not started                |
| `unknown`  | `unknown`                  | Execution cannot be determined; requires `error.retry: "reconcile-first"`                    |

`events` contains only actual reported effects of this action, never predicted
or unrelated events. Empty events do not prove no effect. Correlation across all
nested events MUST match the result's world/session/adapter/action; unique event
IDs, source-local `sourceSequence`, and optional `worldRevision` need semantic
checks. Only the adapter/game is authoritative about execution. A `resultId`
identifies one reported result; the same action can later have a distinct
reconciled result. Consumers deduplicate facts by event ID and retain provenance.

Errors contain `code`, safe human-readable `message`, and `retry`, plus optional
`retryAfterMs`. Retry values mean `never`, `after-correction`, `same-request`, or
`reconcile-first`; they are guidance subject to current authorization and
idempotency. A not-started operation can be retried when the cause is corrected.
A failed partial operation requires reconciliation before another attempt,
regardless of a generic retry hint.

For `idempotency: "none"`, automatic resubmission after possible execution is
forbidden. For `action-id`, the adapter promises duplicate submissions with the
same action ID and identical arguments/context will not execute again for the
**bound session**; it MUST retain reconciliation information throughout that
session and reject changed input under that ID. No guarantee survives an
unnegotiated session change. The baseline has no persistent deduplication store.
Retrying an unknown result requires querying/reconciling with the authoritative
adapter first; if that is unavailable, preserve unknown and require an explicit
recovery decision. Neither a fresh action ID nor repeated transport delivery
guarantees exactly-once execution.

World events are source facts with access scope; an observer's Memory Event
records only what that observer was allowed to receive. Tick order applies only
to one timeline, and event sequence only to one adapter/world/session stream.

Positive examples: [capabilities](examples/capability.json),
[perception](examples/perception.json), [policy](examples/permission-policy.json),
[decision](examples/permission-decision.json), [action](examples/action.json),
[success](examples/action-result.json), [unknown result](examples/action-result-unknown.json),
[world event](examples/world-event.json). The unknown result is an alternative
transport outcome for the example action, not a second execution.
