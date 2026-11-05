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
  and local Ollama. No fake package entrypoints or actual game integration.
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

## Agent work

The coordinator owns package.json, pnpm-lock.yaml, shared scripts and ADRs.
Agents must respect assigned paths and report required shared-file changes.
The owner authorized public `openifsoul/core` creation and initial Git setup on
2026-11-05. This does not authorize other repositories, visibility changes, remote
CI/deployment or importing another project's code.

If `.codegraph/` exists, use CodeGraph first to understand/locate code; otherwise
do not initialize it. Browser checks must be headless by default, use uniquely
named owned sessions with a 300000 ms idle timeout where supported, and close
those sessions explicitly. Never terminate user browsers or other tasks' sessions.

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
