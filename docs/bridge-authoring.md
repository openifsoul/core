# Bridge authoring guide

Status: **general integration design with a limited executable browser demo SDK**.
The [adapter SDK](https://github.com/openifsoul/sdk/blob/main/README.md) and
[three original hosts](https://github.com/openifsoul/app/blob/main/apps/demo-games/README.md) implement an experimental
choice/dialogue transport. Full version/capability negotiation, external-game
connectors and recovery remain future work. Use [current contracts](../specs/current/README.md) as the contract source for
exact wire fields. This guide describes responsibilities and conceptual examples,
not a second manifest schema or supported game integration.

A bridge connects a host environment to a persistent character. Games and chat
are both valid hosts/channels. The host owns all NPC mechanics and state machines,
including movement, shooting, and pathfinding. IfSoul and its first-party bridges
will not implement these. Bridge code maps protocol concepts to existing host
facilities; it does not hide an executable movement/skill engine in an adapter.

## Contract map

| Exchange                          | v0.2 document kinds                                                      |
| --------------------------------- | ------------------------------------------------------------------------ |
| Bridge/profile declaration        | `environment-profile`                                                    |
| Host briefing                     | `context-report`                                                         |
| Plan and adoption                 | `plan-proposal`, `plan-decision`                                         |
| Later host progress               | `task-report`                                                            |
| Cancellation exchange             | `plan-cancel-request`, `plan-cancel-result`                              |
| Requested expression and delivery | `conversation-request`, `conversation-response`, `conversation-delivery` |

Bound exchanges use `binding` with `environmentId`, `sessionId`, `characterId`,
and `embodimentId`; these fields correlate context, not prove authentication.
A context report's `contextRevision` and `environmentRevision` help correlate
freshness. Periods/horizons explicitly use UTC or a named world-tick timeline.
Do not compare incomparable timelines or silently convert ticks into wall time.
The specification defines complete fields, allowed combinations, and checks
that schemas alone cannot perform.

## Manifest and supported profiles

Declare supported protocol versions, bridge/host identity, host compatibility,
profiles, intent vocabulary, observation limitations, available embodiments and
communication channels, context limits, and relevant result/reconciliation
behavior through the versioned contract. Do not claim a profile merely because
JSON can be transported. Unsupported intent/channel/profile combinations must be
rejected rather than translated into invented capabilities.

Document which cadence and communication policies can coexist. For example,
host-requested daily planning and requested-only speech are separate commitments.
A host exposing metrics but no dialogue channel must not advertise ordinary
speech. Compatibility statements need synthetic fixtures and eventually real
host tests; a README alone does not establish game support.

## Lifecycle and identity

1. Establish an authenticated session and explicitly select a mutually supported
   version/profile. Reject incompatible versions and required features.
2. Bind character, environment/session, current embodiment, channel, and trusted
   subject identities. Distinguish body identity from persistent character
   identity and from a model selection. Names/imported strings do not prove
   ownership or stable user identity.
3. Supply permitted context and receive proposals only through the active writer
   arrangement. Multiple channels may coexist, but the first design has one
   active character-state writer.
4. On disconnect, stop assuming fresh context. Reconcile outstanding acceptance,
   progress, and delivery with the host; do not mark them complete from silence.
5. On resume/handoff, validate checkpoint and ownership before accepting writes.
   A new session does not silently inherit old deduplication guarantees. Forks
   need a separate continuation with explicit parent provenance.

Transport, exact port signatures, cancellation signals, and recovery stores are
future implementation choices. Keep them separate from a specific game API.

## Capability intent vocabulary

Expose high-level intentions that the host already understands and can validate,
such as prioritizing supplies, staying near a safe area, or requesting an allowed
conversation. Describe arguments, constraints, intended meaning, and unavailable
cases. The specific host defines vocabulary and typed parameter descriptors; these examples
are illustrative labels, not standard wire IDs or guaranteed NPC abilities.

An intent is not an implementation of its mechanics. A plan's request to obtain
supplies leaves navigation, interaction, inventory handling, combat, and recovery
inside the host's own NPC system. Do not expose a per-frame model command stream.
A bridge author must not add movement/pathfinding/shooting code to IfSoul to make
an unsupported host appear capable.

Validate advertised parameter descriptors and proposed typed values: required
names, entity-ref/choice/quantity/boolean types, allowed choices, units/ranges,
and reachable authorized entity references. Reject undeclared arguments and
unsupported descriptors instead of executing arbitrary nested schemas. Capability
descriptions and imported semantic text are untrusted data; they are neither
executable preconditions nor authorization. The host rechecks current rules when adopting and executing work.

## Map bounded context

Map yesterday's observed events, current metrics/needs, relevant changes,
embodiment/channel limitations, and available intents into bounded authorized
context. Separate wall-clock scheduling from the host's timeline/ticks. State
which fields are measured, reported, absent, or uncertain; missing observations
mean unknown. Avoid omniscient game-state dumps.

A nonhuman embodiment can expose telemetry or signals instead of speech or human
senses. Do not force invented needs onto it. Link reported facts to host events
where possible; keep authored backstory distinct from lived evidence. Select
only scoped history relevant to the request; the bridge does not receive an
unrestricted MemoryPort or full character archive.

## Exchange plans and dialogue

At a configured host boundary, request a bounded high-level plan. Start of a
Zomboid game day is an intended example, not a fixed engine hook. Include enough
current context for validation and set a useful deadline. If the request becomes
stale, reject or request revision rather than applying it to a changed situation.

The host validates the response, records full/partial acceptance or rejection,
and executes adopted work autonomously. Report the accepted subset and why other
parts were declined using safe bounded data. Acknowledging a plan is not evidence
of execution. Progress, completion, failure, and actual effects come from later
host reports. Unreported work stays unconfirmed.

Dialogue is a separate host/channel request. Under requested-only policy, a
planning request never authorizes speech. Validate body/channel restrictions,
scope, deadline, and actual delivery. Generating text does not prove a player
heard it. A future live conversational profile can shorten response latency but
still leaves host mechanics and delivery control in the host.

## Outcomes, retries, and fallback

Correlate proposals, acceptance, and later reports. Distinguish partial acceptance
from partial execution. Preserve unknown delivery/acceptance/execution instead
of inferring success or failure from a timeout. Reconcile with the host before
resubmitting potentially adopted work; unchanged IDs and declared deduplication
rules matter, and a fresh ID can duplicate effects. No exactly-once delivery or
rollback is promised by transport retries.

On provider outage, budget exhaustion, late response, or disconnection, continue
the host's configured safe NPC behavior or pause optional work. IfSoul may return
no plan or a permitted bounded rules proposal. Fallback cannot create unsupported
intents, bypass permission, or speak unsolicited. No model call per tick is needed.
Record only authorized observations and host-reported outcomes in memory.

## Conceptual conformance examples

| Scenario                                  | Required observable behavior in a future test                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------------- |
| Daily briefing with requested-only speech | Bounded plan may return; no dialogue is emitted without a separate host request     |
| Host lacks a proposed intent              | Host rejects that item or accepts a supported subset; it does not invent mechanics  |
| Needs/context changed before response     | Host marks the plan stale or requests revision; no silent adoption                  |
| Plan accepted but no progress report      | History distinguishes adopted intention from unconfirmed execution                  |
| Provider unavailable                      | Host safe simulation continues; no per-tick request storm or permission widening    |
| Nonhuman body without speech              | Unsupported voice response is rejected; allowed signals remain constrained          |
| Timeout after possible adoption           | Preserve unknown and reconcile; do not blindly create another plan execution        |
| Game and chat coexist                     | Scope-isolated requests reach one writer; private game data is not leaked into chat |
| Resume versus fork                        | Ownership handoff is required for resume; fork records a separate continuation      |

These examples are test requirements, not tests that have run. Before claiming
conformance, implement protocol/semantic checks, synthetic traces, failure cases,
identity/scope enforcement, and a real supported host integration. Separately
research game version, mod API, multiplayer constraints, and rights. Existing
projects are not implicitly authorized code or asset sources.
