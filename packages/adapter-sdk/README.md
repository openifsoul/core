# @ifsoul/adapter-sdk

Experimental installable prerelease **0.1.0-alpha.1**. This package builds ESM
JavaScript and TypeScript declarations and supports browser hosts and Node 22+
test hosts without a game engine, account, provider or adjacent Core checkout.
It has **not been published to npm**. Install a supplied local archive:

```sh
pnpm add ./ifsoul-adapter-sdk-0.1.0-alpha.1.tgz
```

```ts
import { createGameBridge, scenarioResponse } from "@ifsoul/adapter-sdk";
import type { GameMountOptions, MountedGame } from "@ifsoul/adapter-sdk";
```

The package root exposes `createGameBridge`, `createHTTPTransport`,
`scenarioResponse`, request/response validators and the bridge/game host types.
`@ifsoul/adapter-sdk/package.json` exposes version metadata. Internal source files
are not supported package subpaths. The archive contains compiled distribution
files, this README, the manifest and Apache-2.0 license; no provider implementation,
server, application configuration or credential is included.

## The bounded bridge

An application supplies a transport, bounded history callbacks, a character and
an AbortSignal. The SDK binds decide/speak/chat requests to that character,
validates replies and reports their `scenario`, `llm` or `fallback` source.
The current character shape supports only the experimental `careful`, `bold` and
`curious` temperaments. It is not a universal character model.

The application envelope is `ifsoul-bridge/0.1`, distinct from the frozen
normative v0.2 protocol and not an archive format or full EnvironmentBridge
handshake. Public declarations describe its exact current shape.

- A decision advertises at most eight unique host-owned choices and one allowed
  fallback. A response cannot introduce another choice. Speak/chat have no action
  choices. The caller must check current legality and freshness before adoption.
- Requests have at most 8,000 serialized UTF-8 bytes. The validator accepts at
  most twelve history entries; `createGameBridge` sends the last eight with
  summaries capped at 240 characters. Responses allow at most 600 speech
  characters; HTTP reads stop above 8,192 bytes.
- Each connection namespaces request identities. A game's local request label is
  not an HTTP idempotency key or a guarantee of exactly-once execution.
- The bridge has an eighteen-second local deadline. Invalid replies, transport
  failures and timeouts produce explicitly labeled fallback. Abort/dispose
  rejects pending work and suppresses late delivery instead. Local cancellation
  does not prove remote inference or host execution stopped.
- `report` deduplicates IDs within a connection and forwards at most 128 bounded
  observations. Reports/history are untrusted browser text, not authoritative
  v0.2 execution receipts. `onSpeech` means callback receipt, not confirmed
  display, adoption or human reading.

```ts
const bridge = createGameBridge({
  hostId: "original-example",
  character: { id: "companion", name: "Companion", temperament: "curious" },
  transport: async (request) => scenarioResponse(request),
  history: () => [],
  onObservation: (event) => console.log(event.kind),
  onSpeech: (reply) => console.log(reply.source),
  signal: lifetime.signal,
});
```

Here `lifetime` is an application-owned AbortController. A connected host replaces
the scenario transport with its authenticated composition. `createHTTPTransport`
uses same-origin requests; it does not implement cross-origin authentication,
CORS exceptions, provider selection or secret storage.

## Game modules and host authority

A game package exports `mount(container, options): Promise<MountedGame>`.
Options contain the injected `bridge`, `character` and mount AbortSignal.
`pause()` retains state and stops active input/simulation; `resume()` continues
that state. `destroy()` releases owned DOM, renderers, listeners and local work.
Hosts fence pending proposals against paused, replaced or destroyed state. A
late-loading module must clean up after abort. The application owns connection
and mount lifetimes, not this package.

All host life state machines, movement, combat, pathfinding, decks, rules and
scoring remain in the game. The SDK supplies bounded proposals/dialogue and
relays reports; it never executes game skills or grants control authority. Live
conversation and planning frequency are independent. The SDK receives neither
provider credentials nor an unrestricted memory archive.

The separate original Garden, Friendly 21 and Dungeon example repositories each
own their mechanics, narrow adapter and standalone shell. Standalone scenario
play needs no account. The Core Playground imports their package interfaces and
injects its existing same-origin authenticated connection. An optional trusted
loopback development proxy is not a standalone cloud login solution.

## Build, distribution and limits

From the Core checkout, `pnpm build:sdk` compiles declarations/ESM and
`pnpm pack:sdk` writes a local archive. From an independent SDK source checkout,
install its declared development tool and run `pnpm build`, then `pnpm pack`.
These commands do not publish. Package consumers install compiled files and need
no TypeScript compiler at runtime.

Before a registry release, the three local example distributions explicitly
bundle this SDK and Core consumes reviewed versioned archives. Those artifacts
are a small local bootstrap mechanism, not central hosting for third-party game
implementations. Publication, registry availability and stable API compatibility
are not implied by a local archive or successful build.

Full profile/identity negotiation, general intents, authoritative host adoption
and reconciliation, confirmed remote cancellation, permanent-memory transport
and commercial-game connectors remain outside this package. Server authentication,
provider selection, per-user/global quotas and storage belong to the composition
root. The generic SDK cannot bypass those boundaries.
