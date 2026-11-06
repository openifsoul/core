# ADR 0011: Experimental browser demo and source bridge SDK

Status: accepted implementation scope on 2026-11-05. The owner requested three
original games with one Sol agent per game, a reusable adapter experiment and a
separate test host. This records a source-level experiment, not a stable package
release or production deployment. The current slice is not yet pushed.

## Decision

Implement PixiJS garden, DOM card and Phaser dungeon hosts in the public core
source tree. Keep their simulations/rules separate from rendering and use a
shared mount/pause/resume/destroy port. The React/TypeScript/shadcn shell owns
character selection, chat, lazy loading and tab-level lifecycle. Every host owns
its mechanics, NPC decisions, movement, combat and actual outcomes; adapters do
not add model-driven skill executors. Dungeon inference is speech-only.

Implement a narrow source SDK and HTTP envelope named `ifsoul-bridge/0.1` for
bounded choices, requested speech/chat and unverified browser history. Validate
choice membership and message sizes; use explicit scenario/fallback provenance,
local abort/deadline fencing and bounded response reads. This is an application
transport, **not a change to the frozen v0.2 protocol**. Normative schema and
example bytes remain unchanged. Full EnvironmentBridge negotiation and external
game connectors remain unimplemented.

Map invited requests into the existing core runtime with a request-local memory
port. Incoming browser reports/history remain unverified context, not trusted
execution receipts, identity mappings or a permanent character archive. Clear
request-local memory after completion. The shell retains only the last 48
combined entries per character in tab session storage; inference receives the
last eight bounded entries.

Keep scenario mode free of LLM inference and invitation requirements. Model mode
requires an owner-issued seven-day invitation. Admin controls live in the owner
laboratory. A separate narrow 12-hour demo cookie does not grant owner API
access. Local inference uses Ollama; Worker inference uses the first allowlisted
Workers AI model. Owner laboratory provider selection remains separate.

Reserve allowance durably before inference, retaining claims on failure/timeouts
and preventing a repeated request ID from triggering another inference. The
current exported server limits reserve 24,000 units per request against 360,000
per invitation and 1,200,000 globally per UTC day: effective maxima are 15 and 50
requests, below the separate 30/200 call ceilings. Bound provider output to 384
tokens and the serialized provider request to 22,000 bytes. Browser reset cannot
clear server counters or claims. Reservations are not reconciled billing usage
and do not guarantee a dollar hard cap.

## Consequences and validation

Consumers can exercise the SDK without a renderer through the standalone Node
host; its default transport is deterministic scenario mode. Invited HTTP mode
uses private environment configuration, never committed invitation credentials.
There is no npm publication, automatic deployment, remote build or workflow.
Local checks/builds and manual Wrangler hosting follow the existing execution
policy; source implementation alone proves no production rollout.

Tests cover SDK request/reply bounds and cancellation, allowed-intent validation
through the core runtime, host rules/simulations, invitation isolation, origin and
cookie checks, persistent reservations, replay rejection and quota exhaustion.
Integrated browser QA must separately exercise controls, tab pauses, themes,
mobile layout and cleanup. These tests establish neither external commercial-game
compatibility nor permanent-memory portability.

See [browser demo](../browser-demo.md), [SDK](https://github.com/openifsoul/sdk/blob/main/README.md),
[games](https://github.com/openifsoul/app/blob/main/apps/demo-games/README.md), [standalone host](https://github.com/openifsoul/sdk/blob/main/apps/test-host/README.md)
and [execution policy](../deployment.md).

The invitation access decision is superseded by [ADR 0012](0012-app-auth-and-local-laboratory.md); keep this decision as historical rationale.
