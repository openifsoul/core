# Execution and deployment policy

Accepted by the owner on **2026-11-05**. The same policy is recorded in the
repository [AGENTS.md](../AGENTS.md); the local parent workspace also records it.

| Operation                | Execution location    | Command / trigger                                                           |
| ------------------------ | --------------------- | --------------------------------------------------------------------------- |
| Install tooling          | Local machine         | `pnpm install --frozen-lockfile`                                            |
| Validate local prototype | Local machine         | `pnpm check` (format, types, contracts, runtime/lab tests, docs/boundaries) |
| Run local lab            | Local machine         | `pnpm lab demo`, `pnpm lab inspect`, `pnpm lab chat --message "..."`        |
| Format files             | Local machine         | `pnpm format`                                                               |
| Web / Worker build       | Local machine         | `pnpm build:web`, `pnpm build:cloud`                                        |
| Deploy                   | Local machine, manual | `pnpm deploy:cloud` after checks                                            |
| Production monitoring    | No scheduled monitor  | Manual inspection of the owner laboratory                                   |
| Publish packages         | Not present           | No registry credentials or automatic publication                            |

The repository's existence on GitHub does not authorize remote execution.
Do not add GitHub Actions, scheduled jobs, duplicate hosting-provider builds,
automatic publishing, or automatic deployment without an explicit owner decision.
There are no platform exceptions in this bootstrap.

On 2026-11-05 the owner authorized the runtime/SQLite and synthetic host/CLI
laboratory implementation. These local development commands replace the earlier
documentation-only check scope. No API credentials or live model calls are needed
for the default lab and tests. The source-run CLI is not a packaged production
release. Runtime data defaults to ignored `.local/`; close owned SQLite handles
and remove only task-owned temporary test directories.

The authorized web/server commands, credentials boundary and rollback limits are
recorded below. Evaluate monitoring separately from builds.

Remote repository creation, settings changes and initial push are a separate
approval stage. Do not change the visibility of existing repositories automatically.

## Authorized web/server slice (2026-11-05)

The owner explicitly approved Cloudflare Workers hosting, local checks/builds,
and manual Wrangler deployment. No GitHub Actions or hosting-provider build is
introduced. `pnpm build:web` builds React/TypeScript/shadcn assets locally;
`pnpm build:cloud` builds assets and dry-runs Wrangler; `pnpm deploy:cloud`
builds assets and deploys manually. Run `pnpm check` first. `pnpm lab:web`
starts the loopback-only local server on 127.0.0.1:8788; `pnpm dev:cloud` runs
local Workers simulation. Workers AI calls still require the actual AI service.

The public `wrangler.jsonc` is a reproducible self-hosting template, containing no
account ID, secrets or custom domain. The owner instance uses manual credentials
outside source control: Wrangler secrets `LAB_PASSWORD` and `ENCRYPTION_KEY`.
Do not log or place their values in shell arguments. The first protects owner
access and signs cookies; the second encrypts BYOK credentials at rest. Configure
secrets before live access; missing secrets fail closed. Use Wrangler dashboard
or `wrangler secret put` through stdin. The local server generates private owner
credentials in ignored `.local/server/owner.json` (0600); never publish that file.

The Worker owns one private owner laboratory Durable Object with SQLite. It is
not a multi-tenant service. Cloud and local stores are separate; switching the
panel's location does not migrate or merge state. Server-side changes to auth,
identity or tenant routing require security tests before expanding access.

An initial Durable Object migration creates the server store. No destructive
migration is part of this slice. Worker rollback can restore compatible code;
it does not roll back persisted character state or inference costs. Keep data
schema changes backward compatible until a tested migration/backup path exists.
