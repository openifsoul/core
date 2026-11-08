# Runtime profiles

Status: **design profiles with a limited local runtime implementation**. The
[laboratory](laboratory.md) exercises host requests and scripted conversation;
there is no autonomous scheduler, persistent live-model loop or game integration.
This guide explains policy choices for the revised
[current contracts](../specs/current/README.md); the specification owns exact fields.
Profiles are negotiated behavior and local policy, not claims that every bridge
supports every mode.

## Independent policy axes

| Axis                 | Examples                                                               | Responsibility                                                           |
| -------------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Planning cadence     | Host-requested daily briefing, encounter/event trigger, manual refresh | Host requests context at useful boundaries; runtime bounds each response |
| Communication policy | Requested-only, explicitly enabled conversational interaction          | Host/channel determines when expression is permitted                     |
| Decision strategy    | Rules, model-assisted, hybrid, external full controller                | Root selects an implementation within the same limits and permissions    |
| Placement            | Local runtime or hosted runtime with a local connector                 | Composition root and operator                                            |

Cadence does not grant permission to speak. A daily planning request can return
a silent plan. A request for dialogue need not request a new daily plan. All
profiles retain scope checks, deadlines, supported intent/channel checks, and
host authority. There is no model request per simulation tick.

## Runtime lifecycle

Different runtime implementations may share these contracts: an embedded library
or on-demand planning worker can serve host-triggered requests, while a persistent
conversation service can serve live mode. Daily planning requires neither a
permanently running daemon nor a persistent model session. The public headless
runtime-host application is an optional composition root, not a required process
for every embedding. Each implementation still enforces scopes, one-writer
ownership, limits, and host authority.

## Intended Zomboid daily briefing

1. At a configured boundary, the host collects a bounded authorized briefing:
   yesterday's events, current metrics/needs, changes, embodiment restrictions,
   and available high-level intents. Start of the game day is an example, not a
   hardcoded time or researched game API requirement.
2. Runtime selects permitted memory and forms a bounded decision request. Missing
   observations remain unknown; backstory is not fabricated lived evidence.
3. A strategy proposes a high-level plan fitting the available intent vocabulary,
   horizon, budget, and deadline. No movement path, shooting loop, or NPC state
   machine is supplied by IfSoul.
4. The host validates the plan against fresh context and its own rules. It can
   accept the whole plan, accept a subset, reject unsupported/stale items, or
   continue its safe default behavior. The accepted subset must be explicit.
5. The host's existing NPC logic executes autonomously. Progress and terminal
   outcomes are later host reports, not inferred from plan delivery/acceptance.
6. Runtime records authorized reports and uncertainty in the character history.
   A later briefing can revise future priorities using those reports.

Acceptance means the host adopted an intention; it is not completion of that
intention. Partial plan acceptance is also distinct from partially executed work.
A transport timeout can leave acceptance or execution unknown; reconcile with the
host before resubmission. Never silently claim success to close a trace.

Under **requested-only communication**, neither the planning trigger, a change in
needs, nor a model's desire to speak can cause unsolicited speech. Dialogue needs
an explicit host request identifying the permitted channel and relevant context.
The host controls actual delivery, interruption, and embodiment constraints.

## Future live conversational mode

A separate future online conversational profile can process requested chat turns
or host-provided dialogue events with a shorter deadline and bounded response.
The environment can be chat itself, or chat can coexist with a game. Explicit
policy controls which incoming events are requests and whether any initiated
speech is permitted; enabling live mode alone is not such permission. Requested-only
remains silent without a request.

This mode changes interaction latency and communication opportunities, not game
mechanics ownership. Host movement/pathfinding/shooting remain autonomous. No
low-level control loop is added to IfSoul or its first-party bridges.

## Deadlines, context, and fallback

A request describes a bounded context snapshot. Before adoption, the host checks
whether the relevant context/revision/horizon is still usable. An old plan is not
silently reinterpreted for new circumstances. Late or cancelled model output is
not automatically adopted; a fresh request may be needed. Waiting cancellation
does not establish that a host did not receive a previous plan.

The root sets context/output limits, request/retry counts, per-request deadlines,
and session usage budgets. Missing usage is unknown. A provider failure or an
external AgentController failure does not stop the host's safe NPC simulation.
The host can continue its own default behavior or pause optional work; runtime
can return no plan or use an explicitly permitted bounded rules proposal.
Fallback cannot invent capabilities, enlarge permissions, or emit unsolicited
speech. Repeated attempts may cost more and produce different answers.

Rules tests may be reproducible under fixed inputs. Replaying a recorded response
reproduces that recording, not a live provider's future output. None of these
policies is an implemented guarantee in bootstrap.
