# ADR 0007: Host-owned behavior and independent conversation modes

Status: Accepted, 2026-11-05. Supersedes the action-first interpretation of
[ADR 0004](0004-bridges.md), not its trust or transport boundaries.

## Context

The intended Zomboid integration already has NPC life logic and state machines
inside the game mod. The AI receives a periodic briefing and proposes a new plan;
the game executes it autonomously. Speech is generated only when the mod requests
it. Another integration may maintain an online conversation without handing
movement or combat to the model. These are owner requirements, not verified
capabilities of an existing released game integration.

## Decision

Game/mod code owns NPC state, movement, combat, pathfinding, immediate reactions
and execution of accepted plans. Neither IfSoul nor its first-party bridges
implement low-level gameplay controllers. Bridges describe existing host intent
vocabularies and relay context, proposals, dialogue and authoritative outcomes.
Models propose bounded intentions; they cannot inject arbitrary command scripts.

Separate planning cadence from communication policy. A host may request one plan
at the beginning of a game day or on a significant event, while speaking only in
response to an explicit request. A live conversation channel can remain available
independently of planning. Online availability does not authorize unsolicited
speech, automatic world changes or a model call on every game tick.

Context reports identify their period/revision, prior activity, current metrics,
unmet needs and changes. Plans are correlated, bounded and expire. The host checks
current context, permissions and supported intentions before accepting all, some
or none of a proposal. Acceptance does not mean completion. Progress and outcomes
come from the host; cancellation requests do not prove cancellation. A late reply
must not silently supersede a newer accepted plan. During model/network failure,
the host chooses its safe continuation, default behavior or explicit replan.

## Consequences

The old generic action trace remains historical structural evidence. New examples
exercise a daily planning exchange, a requested utterance and a live conversation.
No locomotion, shooting, general skill executor, NPC state machine, runnable game
bridge or real-time inference loop is implemented in this design revision.
See [runtime profiles](../runtime-profiles.md) and [v0.2 contracts](../../specs/v0.2/README.md).
