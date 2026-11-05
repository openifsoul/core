# Original browser demo games

This directory is the **thin curated catalog** for the Core Playground. Game
implementations, adapters, standalone React/TypeScript/shadcn shells and game-rule
tests belong to three independent local repositories: `ifsoul-example-garden`,
`ifsoul-example-friendly-21` and `ifsoul-example-dungeon`. Their public sources are
[Garden](https://github.com/openifsoul/example-garden),
[Friendly 21](https://github.com/openifsoul/example-friendly-21) and
[Dungeon](https://github.com/openifsoul/example-dungeon). npm packages remain unpublished. Core consumes their versioned package
exports from reviewed local prerelease archives; it imports no sibling source.
See [ADR 0013](../../docs/decisions/0013-independent-game-examples.md) and
[distribution provenance](../../vendor/README.md).

| Game                                          | Engine                 | Interaction and target duration                                                                                                  | Agent boundary                                                                            |
| --------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Little orchard · `@ifsoul/example-garden`     | PixiJS                 | Watch an autonomous companion fill a can, water eight plants and gather fruit; pointer/keyboard Pause/Resume; 2–4 active minutes | Two bounded ordering decisions: near-first or far-first                                   |
| Friendly 21 · `@ifsoul/example-friendly-21`   | DOM / CSS / TypeScript | Hit/Stand buttons, H/S with table focus, Tab/Enter; five player-paced rounds, usually 2–4 minutes                                | At most two legal hit/stand decisions per companion turn, plus a requested round reaction |
| The Hollow Warden · `@ifsoul/example-dungeon` | Phaser                 | Choose Tank/Healer; WASD/arrows or touch movement, Space/Attack, Shift/Ability; three rooms plus boss, 2–4 minute target         | Four speech-only chamber remarks; no model-controlled combat                              |

The [catalog](src/catalog.ts) declares lazy imports of the public package modules and original companions
Mira, Rook and Pip. The shell owns identity selection, provider mode, chat and the
last 48 combined history entries per character in this browser tab. Only the
last eight entries are sent through the SDK for inference. This is not a permanent
memory archive, cross-device save or trusted record of game execution.

## Source contract and ownership

Each module exports async `mount(container, options): Promise<MountedGame>` using
[the SDK host contract](../../packages/adapter-sdk/src/game-host.ts). `options`
contains a bounded bridge, character and abort signal. The module owns its DOM
and renderer; the host simulation/rules own state, legal choices, progression,
NPC decisions, movement and combat. Models return proposals or requested speech,
never executable gameplay skills. Renderers remain disposable view state.

The shell keeps mounted games through tab switches, calls `pause()` on inactive
games and `resume()` on the selected one. Just chat pauses every game. Character
change, reset or shell unmount aborts lifetimes, destroys owned resources and
disposes bridges; late setup/replies must not revive a destroyed game. A game
restart is separate from the server's per-user/global daily budget and cannot replenish it.

Use scenario mode without a model or sign-in. Cloud LLM mode requires Clerk
sign-in; trusted local mode requires no Clerk/password prompt. Model mode uses the
same host boundaries, with labeled fallback when inference is unavailable.
Scenario speech is deterministic and must not be presented as model-generated.
Reports describe actual host observations/outcomes locally, but a server must
still treat browser-submitted text as unverified data.

## Run and validate

Follow [browser demo setup](../../docs/browser-demo.md) for the local server,
Clerk/local authentication, provider configuration, memory behavior and persistent
quotas. The HTTP envelope `ifsoul-bridge/0.1` is an application experiment separate
from the unchanged frozen v0.2 schemas.

`pnpm test:demo` exercises each game's rules/simulation, SDK bounds and the demo's
request-local runtime mapping. Keyboard/touch, themes, narrow layouts, tab pause
and async cleanup also require integrated browser QA. The
[standalone Node host](../test-host/README.md) demonstrates consumption without
importing any game renderer. Checks/builds are local; deployment remains manual
under the [execution policy](../../docs/deployment.md), with no automatic remote
build, deployment or publication introduced here.

Owner-paid Workers AI in demo and App shares one global reservation coordinator,
with separate per-user counters. Failed requests retain reservations. Demo replay
protection is scoped to one UTC day; an old request ID can spend again after UTC
rollover. Browser resets do not replenish server quotas.
