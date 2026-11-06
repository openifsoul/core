# Changelog

## 0.2.0-alpha.1 — 2026-11-06

- Extract SDK/App/Website/Cloud ownership; Core now builds explicit ESM and declaration exports.
- Preserve frozen normative contracts and existing runtime/provider behavior.
- Remove web, game, Clerk and deployment dependencies from public Core.

Changes to the source project are recorded here. Protocol versions are separate;
see [versioning](docs/versioning.md). No stable SDK release is implied.

## Playground refresh — 2026-11-06 (source release)

- Refresh companion portraits, game-owned sprites and animated dialogue; align
  game scenes with chat/memory, use Cuelark controls, and explain the independent
  bridges with linked example repositories and engine labels.
- Prerender public landing, policies and game descriptions with canonical metadata;
  add robots, sitemap and agent-readable project/source information. Public
  discovery requires neither a game renderer nor an authenticated model call.
  Private App shells remain noindex and server-authorized.

## Earlier experimental source changes

- Garden paths and beds blend into grass with soft irregular edges; companion
  name and basket labels are removed from the playfield.

- Garden uses generated grass and earth tiles, removes extra vector scenery and
  cast shadows, and keeps the gardener visible in front of the well.

- Demo model mode opens Clerk sign-in in a modal, rechecks connection and allowance,
  and preserves drafts when sessions expire. Local readiness verifies the installed
  Ollama model instead of assuming a configured provider is online.

- Add optional game-owned dialogue presentation through `MountedGame.say?` without
  changing the bridge wire format or host control authority. Scenario/fallback
  speech no longer quotes raw host reports, and model plan explanations stay
  separate from character dialogue. Demo reset uses a Cuelark alert dialog.

- Package the experimental adapter SDK as installable ESM/declarations and move
  the three original hosts/adapters/standalone shells into independent local
  repositories. Core's Playground consumes reviewed versioned package archives
  through public exports, preserving its same-origin auth and companion history.
- Add strict distribution/member/checksum/provenance and shared Clerk-secret
  scanning, plus isolated package consumer/type checks. No npm/GitHub publication,
  remote build or deployment is part of this extraction.

- Add IfSoul App with a shared shadcn sidebar-07 shell for characters,
  conversation, memory and settings; Laboratory debugging is local-only.
- Replace mandatory local password entry with guarded loopback access. Cloud
  requests use verified Clerk sessions and isolated per-user Durable Objects;
  legacy owner state is not automatically migrated into Clerk accounts.
- Retire invitation/login administration in the demo API. Cloud demo and App
  Workers AI share persistent per-user/global reservations; local demos need
  no Clerk account. Ordinary App chat uses a neutral conversation context.
- Add real local Worker isolation tests. A development Clerk instance and one
  real owner sign-in were verified locally; production configuration is pending.

- Add an experimental bridge SDK, standalone test host and three original browser
  games with independent host-owned mechanics (PixiJS garden, DOM 21, Phaser dungeon).
- Add a public scenario playground with shared bounded chat/history and
  Clerk-authenticated cloud inference protected by persistent per-user/global quotas.

- Add reviewed model-assisted character profiles, external-agent prompts, original
  starter templates and profile-only JSON import/export with preserved attribution.
- Allow explicit profile/memory pairing without rewriting prior history or scopes;
  record the selected profile on new cross-profile laboratory runs.

- Add manual character creation and selection to the owner laboratory, with
  separate histories/drafts and persistent identities across server restarts.
- Add optional character selection to lab runs/snapshots; legacy requests retain
  Lumen. Creation retries are idempotent and cannot import history or authority.
- Extend the experimental MemoryPort with bounded owner-only character listing;
  custom implementations need the new method. Frozen protocol contracts unchanged.

## 0.1.0-alpha.1 — initial source baseline (unreleased)

- Draft v0.2 character/environment/planning/conversation contracts with retained
  v0.1 regressions and independently versioned ModelProvider contracts.
- Runtime, scoped SQLite event memory and a deterministic synthetic host/CLI.
- React/TypeScript/shadcn owner laboratory, local server and Workers composition.
- Workers AI, OpenAI BYOK and local Ollama clients with bounded requests.
- Owner authentication, encrypted credential storage and separate private data.
- Local checks for contracts, behavior, architecture, indexed secrets and builds;
  project skills for focused implementation, API/architecture review and docs.

Real external game bridges, archive import/export, managed billing and stable
SDK packages remain deferred. Local/cloud histories are separate. Model output
quality and latency are not guaranteed; local Qwen planning timed out in live QA.
