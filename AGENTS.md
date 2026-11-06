# IfSoul Core contributor and agent rules

Core is the public protocol/runtime/memory/permissions/provider library. The
owner approved independent public Core, SDK, App and three example repositories,
and private Website/Cloud repositories on 2026-11-06. See
[ADR 0014](docs/decisions/0014-repository-product-split.md). Public repository
creation and reviewed commits/pushes are authorized; npm publication, settings
changes, automatic remote execution and deployment are separate actions.

Read `docs/architecture.md`, `docs/boundaries.md`, the affected component README
and relevant specification before implementation. Active contracts live under
`specs/v0.2`; preserve frozen v0.1/v0.2 schema/example bytes. ModelProvider remains
independently versioned v0.1. Do not update checksum inventories to hide drift.

Core must not import SDK, App, games, React, Clerk, Website or managed Cloud.
Runtime imports storage/provider ports; composition roots inject implementations.
Protocol has no platform IO or dependency on runtime/vendors/games. Public
components install/build/test without a private repository, account or sibling
checkout. Use explicit built exports; do not invent unpublished registry packages.

Host games own NPC life state, movement, combat and pathfinding. IfSoul proposes
bounded plans/dialogue and records authorized host reports. Live conversation and
planning cadence are distinct; a model connection confers no execution authority.
Public files are English and use original synthetic fixtures. Never commit keys,
private conversations, memories, production data, ignored configs or logs.

## Execution policy

Checks/builds run locally: `pnpm install --frozen-lockfile`, `pnpm check`,
`pnpm build`, `pnpm pack:core`. Core has no deployment command. Private Cloud owns
manual Wrangler deployment; no production deployment/data operation is authorized
by this split. No Actions, schedules, provider builds, automatic publishing or
remote execution. Keep `docs/deployment.md` synchronized.

Use CodeGraph first only if `.codegraph/` exists; do not initialize it. Browser
checks belong to consumer repositories and use headless owned sessions with
300000 ms idle timeout and explicit cleanup; never close user browsers.

## Project skills and validation

Use the relevant local skills under `.agents/skills`: clean-implementation,
architecture-review, public-api-review, documentation-sync. Follow
`docs/development.md`, `docs/compatibility.md`, and `docs/versioning.md`.
Coordinator reviews integration; assigned implementation agents own their files.
