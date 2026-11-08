# IfSoul Core contributor and agent rules

Core is the public protocol/runtime/memory/permissions/provider library. The
owner approved independent public Core, SDK, App and three example repositories,
and private Website/Cloud repositories on 2026-11-06. See
[ADR 0014](docs/decisions/0014-repository-product-split.md). Public repository
creation and reviewed commits/pushes are authorized; npm publication, settings
changes, automatic remote execution and deployment are separate actions.

Read `docs/architecture.md`, `docs/boundaries.md`, the affected component README
and relevant specification before implementation. Active contracts live under
`specs/current` for IfSoul 0.3.0. Preserve frozen historical v0.1/v0.2 and
ModelProvider schema/example bytes. Current ModelProvider contracts share the
coordinated release while retaining a distinct family. Do not update historical
checksum inventories to hide drift.

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
by this split. The dated public-CI exception below permits check workflows only;
schedules, provider builds, automatic publishing and other remote execution remain
unapproved. Keep `docs/deployment.md` synchronized.

Use CodeGraph first only if `.codegraph/` exists; do not initialize it. Browser
checks belong to consumer repositories and use headless owned sessions with
300000 ms idle timeout and explicit cleanup; never close user browsers.

## Project skills and validation

Use the relevant local skills under `.agents/skills`: clean-implementation,
architecture-review, public-api-review, documentation-sync. Follow
`docs/development.md`, `docs/compatibility.md`, and `docs/versioning.md`.
Coordinator reviews integration; assigned implementation agents own their files.

## Authorized release on 2026-11-06

The owner authorized preparation, reviewed Git commits/pushes, and manual production
publication through private Cloud after coordinator review and local gates. This
supersedes the split-only deployment restriction for this release. Checks and builds
remain local; no npm publication, automatic remote execution, settings changes,
secret operation or data migration is authorized. A Git push does not deploy.

## Working roles and roadmap discipline

The originating project chat defines a task brief with agreed scope, acceptance
criteria, file ownership and report recipient. Sol proposes the technical plan
within that brief and owns code, tests and documentation; changing product scope
requires a new owner decision. Luna independently reviews, tests and reports
actual evidence. Sol and Luna coordinate routine work directly; development smoke
does not replace independent acceptance.

Use a shared scope label for each group: `Sol work <scope>` and
`Luna test <scope>`; on demand, `Astra review <scope>` or `Astra debug <scope>`.
Tool task IDs use lowercase underscores, for example `sol_work_sdk_java` and
`luna_test_sdk_java`, with the same scope stem in the task brief and report. Apply
this naming to future groups; do not spawn duplicates merely to rename agents.

After the second failed test attempt, stop blind retries and activate Astra with
the exact command/error, hypotheses, changes tried and results. Resume from her
diagnosis; Astra then returns to idle. Astra may also review completed work when
explicitly assigned; she is not a routine active planner or coordinator.

Once all assigned work and checks are complete, return a consolidated report of
changes, commands/results, evidence layers, gaps and cleanup to the originating
chat by default, or to an explicitly designated Astra reviewer. The owner/project
lead decides what to publish and when. Completion, passing tests and final review
do not authorize a commit, push or deployment; each release action requires
separate explicit authorization. Involve the lead earlier only for genuine
external-data, authorization, licensing or major-scope blockers.

Before work, read the current public roadmap at
https://github.com/openifsoul/core/blob/main/docs/roadmap.md (in Core, `docs/roadmap.md`).
Keep affected roadmap and owning documentation synchronized in the same task.
Distinguish implemented source, deterministic local checks, real-model service
checks, browser acceptance and production evidence; never promote one to another.
Current sequence: finish product acceptance, then research SDK connectors for
Minecraft + Mineflayer and Skyrim + Mantella. These are planned targets, not
verified integrations. Games retain all NPC controllers and mechanics. Historical
release authorization does not authorize a new commit, push or deploy in a later
task; follow that task's explicit scope.

## Public CI authorization on 2026-11-08

The owner authorized GitHub Actions checks on `push` and `pull_request` in this
public repository. This narrowly supersedes earlier no-CI/remote-execution rules;
release builds and release validation remain local. See [execution policy](docs/deployment.md).
Use GitHub-hosted Linux runners, Node 22.18.0 (within the manifest engine range)
and manifest-pinned pnpm 10.15.0 with frozen-lockfile installation. No secrets,
private checkout, paid model, production environment or self-hosted runner is used.
No deployment, npm publication, schedules, provider builds or settings changes are
authorized. Private Website and Cloud are excluded. Preparing a workflow does not
prove a GitHub run passed; activation awaits a separately authorized commit/push.

## Task-cycle reporting

At the end of every assigned task cycle, agents MUST immediately send a direct
`send_message` to the originating coordinator/root and then provide a final
response. Include the consolidated report path, status (`completed`, `partial`
or `blocked`), changes, checks and failures, remaining work, cleanup, and release
actions taken (explicitly `none` when none). Do not wait for the user to request
status or assume that final response text alone reaches the coordinator.

If a source freeze or another dependency prevents completion, send a `partial`
handoff immediately, identify the dependency and who must resume the next cycle,
and avoid claiming completion. Independent Luna acceptance is required for
applicable implementation work; self-checked research may complete when the user
has waived independent review. Report any unassigned review as remaining work
instead of waiting indefinitely without a handoff.

A completion report enters the coordinator's acceptance queue; it does not
authorize a commit, push, deployment or new scope. If direct delivery tools are
unavailable, record that delivery limitation in the final response. This policy
does not guarantee that the platform wakes the coordinator and does not create a
runner, cron job, scheduled automation or remote execution.

## Coordinated current version — 2026-11-09

IfSoul uses one current release **0.3.0** across all eight repositories and current
format families, superseding earlier independent SDK/provider release numbering.
Preserve frozen legacy contracts as historical inputs with explicit compatibility
readers; never relabel stored data or rewrite historical evidence. While 0.x,
patch means compatible fixes and minor may break contracts; 1.0 requires an
explicit stable-contract decision. Alpha/beta require an explicit channel choice.
`release.json` and `pnpm check:version` own local release consistency. Publication
remains subject to the current task's separate release authority.
