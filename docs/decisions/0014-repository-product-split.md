# ADR 0014: independent public libraries and product compositions

Status: accepted by the owner on 2026-11-06. Supersedes the monorepository
composition and SDK distribution ownership in ADRs 0011–0013; their historical
contract and authority decisions remain in force.

## Ownership

| Repository                     | Visibility | Owns                                                                                                        |
| ------------------------------ | ---------- | ----------------------------------------------------------------------------------------------------------- |
| openifsoul/core                | Public     | Protocol schemas/validators, runtime, memory ports/storage, permission semantics and provider ports/clients |
| openifsoul/sdk                 | Public     | Experimental bounded bridge, transport, synthetic test host and conformance tests                           |
| openifsoul/app                 | Public     | Self-hostable local server, character/service composition, React/TypeScript/shadcn App and local laboratory |
| openifsoul/website             | Private    | Public-facing website, branding, Clerk-facing Playground and curated game catalog composition               |
| openifsoul/cloud               | Private    | Managed Workers deployment/authentication/quota/provisioning and production configuration                   |
| openifsoul/example-garden      | Public     | Original Garden mechanics, adapter and standalone UI                                                        |
| openifsoul/example-friendly-21 | Public     | Original card-game mechanics, adapter and standalone UI                                                     |
| openifsoul/example-dungeon     | Public     | Original Dungeon mechanics, adapter and standalone UI                                                       |

No public repository depends on private source, credentials, accounts, sibling
checkouts or production services for ordinary installation, build or tests.
Private compositions may consume public packages; the reverse is prohibited.
Core has no SDK, game, React, Clerk, website or managed cloud dependency. SDK has
no Core dependency: its existing `ifsoul-bridge/0.1` experimental transport types
remain independently owned and unchanged. App adapts those types at composition
boundaries. Host games retain NPC life state, movement, combat and pathfinding.

## Package boundary and compatibility

`@ifsoul/core@0.2.0-alpha.1` provides built ESM and declarations through explicit
exports: `protocol`, `runtime`, `memory/port`, `memory/sql`, `memory/sqlite`,
`model-providers`, and `model-providers/types`. `package.json` exposes metadata.
Provider constructors are exported from `model-providers`. Unlisted internal
paths are not public APIs. Permissions currently live in runtime semantics;
there is no invented permissions package entrypoint. Runtime never opens SQLite
or constructs vendor clients on behalf of its caller.

`@ifsoul/adapter-sdk@0.1.0-alpha.1` retains its package-root API and browser-safe
build. Existing example archives embed the previous byte-compatible SDK build;
they need not be repacked solely to change repository ownership. Their mechanics
and standalone behavior remain unchanged.

These are experimental source/package APIs, not a stable 1.0 promise. Normative
v0.1/v0.2 schemas and fixtures remain byte-for-byte frozen; package versions do
not relabel schema or archive versions.

## Reproducible distribution

No npm publication is authorized. Public consumers vendor reviewed, pinned
compiled tarballs with SHA-256 and provenance receipts. Archives contain no
private composition or deployment data. Consumer manifests reference repository
local `file:vendor/...tgz` paths, never sibling paths or an invented registry
release. Rebuilding Core requires local TypeScript and validator tooling; using
its archive requires the pinned public Ajv runtime dependencies.

Each repository keeps its own lockfile and local install/check/build scripts.
Checks and builds run locally. Deployment remains a manually invoked private
Cloud command; this split authorizes no production deployment, migration, secret
operation, npm publication, GitHub Actions, schedules or hosting-provider builds.
The owner authorized creation and reviewed commit/push of the public Core, SDK,
App and three examples, and private Website/Cloud repositories. Repository
settings and remote execution require separate authorization.

## Extraction gate

Copy consumers before deleting originals, prove external built-package imports
and standalone checks, preserve an ignored reversible source archive, then
remove obsolete Core composition roots and dependencies. Production Worker
identity, Durable Object migration/data and quota semantics must be preserved by
the private owner; source extraction is not production verification.
