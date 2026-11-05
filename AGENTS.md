# IfSoul core contributor and agent rules

This repository is an early experimental project. On 2026-11-05 the owner
authorized a first local runtime/SQLite/synthetic-host/CLI laboratory slice.
The public scope is recorded in `docs/decisions/0010-local-runtime-slice.md`
and `docs/runtime-api.md`; the parent workspace also keeps coordination notes.

- Read `docs/architecture.md`, `docs/boundaries.md`, and the relevant spec before
  implementation. The owner approved the v0.2 design revision on 2026-11-05.
  Active contract documentation lives in `specs/v0.2/`; schemas live in
  `packages/protocol/schemas/v0.2/`. Preserve v0.1 schemas and examples as legacy
  regression evidence. ModelProvider remains independently versioned at v0.1.
- Runtime, memory, protocol validation, synthetic host, scenario controllers and
  CLI code are authorized. The owner extended scope to React + TypeScript +
  shadcn web panels, server mode on Cloudflare Workers, Workers AI, OpenAI BYOK
  and local Ollama. No fake package entrypoints. The owner additionally authorized an experimental
  bridge SDK, standalone test host and three original browser demo games (PixiJS
  garden, DOM cards, Phaser dungeon). External commercial-game integrations remain
  outside this slice. Public scenario mode is free; cloud LLM demo uses Clerk authentication
  with persistent per-user and global quotas independent of browser resets.
- The owner authorized IfSoul App with Clerk (Google/email only) and separate
  cloud user stores. Local mode requires no Clerk/account; Laboratory debug UI
  and operations are local-only. Use the shadcn sidebar-07 shared application
  layout. The owner subsequently authorized final verification, manual GitHub
  publication and production deployment on 2026-11-06; see the release scope below.
  See `docs/decisions/0012-app-auth-and-local-laboratory.md`.
- Public files are English. Use synthetic, original fixtures only.
- `protocol` must not depend on runtime, games, providers, Node APIs, or cloud.
- No public component may require a private repository or IfSoul account.
- Keep contract changes explicit and update fixtures and compatibility notes.
- The host game/mod owns NPC state machines, movement, combat, and pathfinding.
  IfSoul proposes bounded high-level plans and dialogue; first-party bridges do
  not implement low-level gameplay controllers. Planning cadence and live versus
  host-requested conversation are separate policies.
- No secrets, personal conversations, or real character instances in Git.

## Local execution policy

The owner approved local checks and local future builds on 2026-11-05.
Run `pnpm install --frozen-lockfile` and `pnpm check` locally (formatting,
contract checks, typecheck, runtime/lab tests). `pnpm lab` runs the local CLI.
Web builds/checks run locally. Cloudflare Workers deployment is authorized only
through a manually invoked Wrangler command. No production monitor or automated
publishing is introduced.
Do not add GitHub Actions, schedules, provider builds, or remote execution
without a separate owner decision. Hosting is Cloudflare Workers; trigger is manual Wrangler after local checks.
See `docs/deployment.md` for the full policy.

## Independent example distribution — accepted 2026-11-06

The owner authorized separate local Garden, Friendly 21 and Dungeon repositories,
an installable experimental `@ifsoul/adapter-sdk@0.1.0-alpha.1` package and Core
Playground imports through the game packages' public exports. Sol owns this
implementation and integration; the coordinating agent reviews. SDK packaging
may add the one SDK child manifest/build configuration and the four explicitly
reviewed archives under `vendor/`; see ADR 0013. No other child package or generic
archive exception is implied. External games own mechanics, adapters, standalone
shells and tests. Core curates selected consumers, not a central collection of
third-party implementations. The owner subsequently authorized verified commits,
pushes and public GitHub repositories for Core and these three examples, plus a
manual production deployment after auth/DNS readiness. npm publication, remote CI,
schedules and automatic deployment remain unauthorized. Independent package and
isolated Core consumer proof passed before inline hosts were removed.

## Agent work

The coordinator owns package.json, pnpm-lock.yaml, shared scripts and ADRs.
Agents must respect assigned paths and report required shared-file changes.
The owner authorized public `openifsoul/core` creation and initial Git setup on
2026-11-05. The later release authorization also covers public `openifsoul/example-garden`,
`example-friendly-21` and `example-dungeon`. It adds no remote CI or unrelated
repositories and does not authorize importing another project's code.

If `.codegraph/` exists, use CodeGraph first to understand/locate code; otherwise
do not initialize it. Browser checks must be headless by default, use uniquely
named owned sessions with a 300000 ms idle timeout where supported, and close
those sessions explicitly. Never terminate user browsers or other tasks' sessions.

## Web UI and UX

Follow [the UI/UX approach](docs/ui-ux.md) for every web UI change. Reuse the
local React/TypeScript/shadcn primitives and Cuelark components, preserve the
shared Notion theme, and verify relevant states, accessibility and mobile layout.
The braces-and-eyes logo and the IfSoul text name remain separate.

## Project skills

Use only the skill relevant to the change; skills link to the existing policies
rather than replacing them. They do not authorize deployment, publication or
contract changes outside the requested task.

- [clean-implementation](.agents/skills/clean-implementation/SKILL.md): focused code changes.
- [architecture-review](.agents/skills/architecture-review/SKILL.md): dependency, state and trust boundaries.
- [public-api-review](.agents/skills/public-api-review/SKILL.md): compatibility of consumer-facing surfaces.
- [documentation-sync](.agents/skills/documentation-sync/SKILL.md): changed behavior, commands and diagrams.

See [validation by change](docs/development.md#required-validation-by-change)
and [versioning](docs/versioning.md). Do not update the accepted contract checksum
inventory to silence a failure; use the existing compatibility decision process.

## Manual release authorization — 2026-11-06

The owner requested all final checks, staged/archive/history secret review, public
GitHub publication of the reviewed Core/example scope and manual production
publication. Sol implements and releases; the coordinator reviews. Preserve the
existing Worker identity, Durable Object migration/data, encryption key and shared
quota coordinator. Deploy only the reviewed ignored production configuration after
Clerk/DNS prerequisites are verified; then verify trusted HTTPS and real sign-in.
Production Google Audience publication follows reachable privacy/terms pages.
Do not add CI, remote builds, scheduled monitors or npm publication. Never stage
ignored deployment proposals, secrets, databases, screenshots or private logs.
