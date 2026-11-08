# Product model

Status: **product design with an experimental runtime and IfSoul App**.
The TypeScript runtime, SQLite event memory, CLI and React laboratory exercise
planning and memory-backed conversation. Workers AI, OpenAI BYOK and Ollama
clients are implemented. Cloud source verifies Clerk identity and isolates each
user workspace in a Durable Object; local loopback mode needs no Clerk or owner
password prompt. Real game bridges, packaged applications and commercial billing
remain deferred. A development Clerk instance and one real owner sign-in were verified locally. The revised contract direction is [current contracts](../specs/current/README.md);
the original v0.1 documents remain historical design material.

IfSoul is intended to make a persistent character independent of the particular
model, game, or chat surface currently expressing it. A character could be
authored with Gemini, continued with OpenAI, met in chat, and embodied in another
game while retaining authorized history and relationships. These are intended
journeys, not tested integrations or promises of identical behavior across models.

## Character, embodiment, and model

| Concept    | Meaning                                                                                            | Changes without replacing the others        |
| ---------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| Character  | Portable authored identity, acquired history, preferences/goals, and relationships with provenance | Can continue across models and environments |
| Embodiment | A character's current body/actor and available senses, expression channels, and host capabilities  | Can change when entering a different world  |
| Model      | An interchangeable generation/inference implementation used by a strategy                          | Can change without creating a new character |

A nonhuman character need not have a humanoid body, voice, or locomotion. A
stationary machine might receive telemetry and emit text; an animal embodiment
might expose signals without ordinary speech. The host declares the actual
channels and supported intents. IfSoul must not invent hands, vision, speech,
hunger, or movement from a generic character description.

Authored backstory is authored material, not proof that an event occurred in a
connected world. It must remain distinguishable from lived, host-reported events
and from uncertain derived interpretations. Changes in body/model can change how
a preference is expressed. Data portability preserves supported state and
provenance, not a measurable percentage of psychological identity.

## Games and chat

Games and chat are first-class environments. A chat session can be the only
environment, or a communication channel alongside a game embodiment. A user may
speak with a character while a host game continues its simulation. Channel
coexistence does not authorize omniscient sharing: each channel has its own
identity binding, access scope, consent, and communication policy.

A persistent user relationship needs a trusted stable user/subject mapping across
sessions. Equal display names or imported IDs do not establish that mapping.
Only authorized history follows the character, and a private game observation
must not leak into an unrelated chat. Simultaneous channels initially share one
active character-state writer; see [execution modes](execution-modes.md).

## Planning and conversation

One intended batch planning profile is a host-driven briefing. The host supplies
yesterday's permitted events, current metrics/needs, and relevant changes; IfSoul
returns a bounded high-level plan. Start of the game day is an illustrative
trigger, configurable by the host. The host validates the plan, accepts all or
part of it, and executes its own NPC logic autonomously. Host reports establish
progress and outcomes. Speech is generated only when the host explicitly requests
it under the requested-only communication policy.

All NPC mechanics, state machines, movement, shooting, and pathfinding remain in
the host game/mod. Neither IfSoul nor its first-party bridges implement those
systems. A plan can express a supported intent such as prioritizing supplies;
it does not drive a character each tick or implement an executable movement skill.

A separate future live online conversational profile can support lower-latency
dialogue when requested by the host/channel. It still does not turn IfSoul into
a low-level game controller. Planning cadence and communication policy are
independent settings, described in [runtime profiles](runtime-profiles.md).

## Memory and continuity

Raw records preserve the authorized host report or conversation content actually
received. Summaries support recall but cannot replace those records silently.
An export that omits source content must report filtering rather than claim
complete history. This does not imply recording every unobserved game event.

- **Working memory** is bounded context for the current request or interaction,
  not a second complete archive or a reason to bypass scopes.
- **Episode memory** records the permitted history of an encounter, chat, or
  period in a world, with original event provenance and chronology.
- **Long-term memory** includes retained history and derived summaries,
  relationships, preferences, and claims with source/derivation provenance.
  Derived material can be corrected, recomputed, or deleted.

These conceptual retention/retrieval layers are represented by the v0.2 memory
envelopes, including working-context, episode, event, fact, relationship, and
intent-checkpoint records. Core supplies event/exchange storage, bounded recall and trusted atomic retention.
App implements bounded extractive episodes, revisable reported claims and portable
character-to-player relationships; see the
[App memory architecture](https://github.com/openifsoul/app/blob/main/docs/memory.md).
These App-derived views are not a general archive or a Core facts engine.
Model context windows are replaceable working
views; the character's durable history must not depend on one vendor's chat ID.
No hidden model reasoning is required or stored.

Export/import must distinguish **resume** from **fork**. Resume continues one
lineage after an explicit ownership handoff and prevents two active writers;
loading a second copy does not silently acquire that right. Fork creates a
separate continuation with recorded parent provenance. Neither mode silently
merges divergent histories. App currently implements a bounded filtered-fork JSON archive with fresh destination
identities, eligible retained evidence and explicit losses. It is not complete
backup, same-identity resume or the frozen Core v0.2 archive contract. General
ownership handoff, merge and multi-writer conflict resolution remain deferred.

## Planned ways to run

The open runtime is intended to support a local model, a local runtime using a
network BYOK provider, or a managed hosted runtime with a local game connector.
Location and billing are separate axes. Self-hosting remains a public path;
private account/billing orchestration does not become a core dependency. See
[execution modes](execution-modes.md). The App implements local and per-user Workers placement; commercial billing
and real game connectors remain planned. Main chat uses neutral context; local
`/lab` keeps synthetic planning and trace debugging separate. The shared `/app`
sidebar shell is implemented and locally browser-checked. The 2026-11-06 managed
release also passed public HTTP/security smoke and headless sign-in/demo rendering;
authenticated production persistence, archives and BYOK remain unverified. See
[current status and acceptance sequence](roadmap.md).
