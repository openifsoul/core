# Local development

The repository contains draft contracts and an experimental TypeScript runtime,
SQLite event memory, synthetic host, providers and CLI/web laboratory. It is source-run tooling,
not a published SDK or packaged end-user application. See the
[runtime API](runtime-api.md) and [laboratory](laboratory.md).

The active design is [v0.2](../specs/v0.2/README.md). v0.1 schemas/examples remain
historical regression fixtures; ModelProvider retains its independently versioned
v0.1 contract. The JSON Schemas remain normative; TypeScript views support the
implementation without replacing schema validation.

## Tooling and commands

Use Node.js 22.18 or later within the manifest's engine range and pnpm 10.15.0.
Node.js 22.18.0 is the locally checked version. The engine range is not a tested
compatibility matrix. Dependencies and package-manager version are pinned.

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm lab demo
pnpm lab inspect
pnpm lab chat --message "What happened in the garden?"
```

Installation may require registry access. Checks and the deterministic laboratory
need no model key, game, network inference or IfSoul service. `tsx` runs TypeScript
source; `tsc --noEmit` checks types. The web panel and owner server have local
builds and optional manual Workers deployment.

| Command                 | Purpose                                                              |
| ----------------------- | -------------------------------------------------------------------- |
| `pnpm format:check`     | Source and documentation formatting                                  |
| `pnpm typecheck`        | Strict TypeScript checking                                           |
| `pnpm check:contracts`  | v0.1/v0.2 structural and static semantic fixtures                    |
| `pnpm test:runtime`     | Runtime and SQLite behavior                                          |
| `pnpm test:lab`         | Synthetic host and CLI integration                                   |
| `pnpm check:docs`       | Required documentation and local Markdown targets                    |
| `pnpm check:boundaries` | Authorized source roots, selected imports and narrow secret patterns |
| `pnpm lab --help`       | Local laboratory options                                             |
| `pnpm format`           | Reformat editable files                                              |

The link checker does not fetch external URLs. Import checks are static guardrails,
not a complete dependency graph or security audit. Tests do not establish real
game compatibility, provider behavior, archive round-trip safety or production readiness.

## Required validation by change

| Change                                      | Local checks                                           |
| ------------------------------------------- | ------------------------------------------------------ |
| Documentation only                          | Format changed files; `pnpm check:docs`                |
| Code, contracts, dependencies or guardrails | `pnpm check`                                           |
| Browser code or browser/server boundary     | Also `pnpm build:web` (includes bundle boundary check) |
| Worker or server composition/configuration  | Also `pnpm build:cloud` (local Wrangler dry-run)       |
| User-facing interaction                     | Targeted headless scenario; close owned sessions       |

`pnpm check` includes server, providers/service, tooling tests and generated
validator verification in addition to the commands above. Real inference is
separate and is not required for ordinary contributions. No account or provider
key is required for deterministic checks. Do not deploy as part of validation.

The boundary checker reuses Prettier's pinned TypeScript parser. It resolves the
configured aliases and relative source imports, checks component cycles and port
entrypoints, and rejects computed module loads. It is not a hostile-code sandbox.
Git index checks additionally reject private artifacts and known secret patterns
in staged bytes; ignored local credentials are not read. Source archives without
Git can run source checks but cannot prove index safety. Review any changes to
these checks and the contract baseline against an accepted revision.

## Local storage

The initial engine uses Node's built-in `node:sqlite`. In the tested Node 22.18.0
version this API emits an experimental warning; its synchronous operations are
appropriate for this bounded CLI experiment, not a measured scalable server.
See the [Node documentation](https://nodejs.org/download/release/v22.18.0/docs/api/sqlite.html).
The lab stores data under ignored `.local/` by default; use `--db` for a separate
experiment. Do not commit databases, transcripts, credentials or personal histories.

One process owns a database through an exclusive lock. Normal shutdown releases
it. After a crash, verify the owner has stopped before manual lock recovery;
there is no automatic stale-lock takeover or distributed fencing. Do not share a
live database over a network filesystem. See laboratory documentation for recovery.

## Package boundaries

Only the private root has a package manifest. Components use source imports inside
`core` while interfaces evolve; there are no package exports, workspace releases
or cross-repository imports. Runtime imports MemoryPort, never the SQLite engine.
The local CLI explicitly composes simulator code as development tooling.

When publishing real packages, design their entrypoints and use workspaces inside
core. Sibling repositories remain independent. Test distributed packages with a
packed tarball or uncommitted override, then use explicit published versions.
Public code must not depend on private siblings.

## Agent collaboration

Freeze schema baselines before parallel work. The coordinator owns shared
manifests, lockfiles, scripts and ADRs; agents own disjoint paths. Escalate contract
changes rather than silently changing schemas to match code. Run all checks after
integration. Read the [execution policy](deployment.md) before changing builds,
CI, release or deployment.
