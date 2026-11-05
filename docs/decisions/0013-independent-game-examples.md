# ADR 0013: Independent game examples and an installable experimental SDK

Status: **accepted by the owner on 2026-11-06; implemented; manual source release authorized**.
The initial extraction was local-only. On 2026-11-06 the owner subsequently
explicitly authorized final verification, GitHub publication and the manual
production release. npm publication and automatic remote builds remain excluded.

## Decision

Core owns the versioned protocol/specifications, runtime, generic adapter SDK,
server composition and App. The three original games move to independent
repositories, each owning its game mechanics, its narrow host-to-SDK adapter,
standalone developer shell, tests, assets and release version. Their public mount
and simulation entrypoints are package exports. Third-party authors own their
repositories and release cadence; Core must not grow a central implementation
repository for every game or require authors to register private game code.

`@ifsoul/adapter-sdk@0.1.0-alpha.1` is an experimental ESM package with TypeScript
declarations, built using the existing TypeScript compiler and packed using pnpm.
Its root export exposes bounded browser decisions/dialogue, transport and mount
contracts. It is not the full normative EnvironmentBridge, and does not widen the
three-temperament demo profile into a promised universal character API. Normative
v0.2 schemas and examples remain byte-for-byte unchanged.

The first external packages are `@ifsoul/example-garden`,
`@ifsoul/example-friendly-21` and `@ifsoul/example-dungeon`, initially version
`0.1.0-alpha.1`. They use the SDK package name, never relative imports into Core.
Core's curated Playground imports their package exports and supplies its existing
same-origin authenticated bridge. Character-scoped session history, reset,
abort/pause/destroy and paid budget ownership remain in the existing owners.

## Local distribution before registry publication

No package is claimed to be published. For this bootstrap, examples include a
relative vendored SDK archive and bundle that SDK in their packed output. This
makes a clean standalone installation independent of Core or an unpublished npm
version. Core consumes explicitly versioned game and SDK archives from its small
reviewed `vendor/` allowlist. These redistributable artifacts include licenses,
checksums and source repository/version provenance. They are not machine-local
absolute links, a private registry, a publication service or the future home of
thousands of adapters.

Archive validation rejects unapproved artifacts, unsafe paths, symlinks, private
files and secret patterns. Only distribution files, manifests, README/license
notices and the explicitly bundled SDK are admitted. A clean Core consumer copy
without sibling repositories must pass frozen installation, type checks, game
consumer tests and a web build before inline game source is removed.

After separately authorized public package releases, normal versioned package
dependencies can replace this local archive distribution. Future examples belong
in their own repositories; Core may curate links and selected package consumers.
Do not add each external game's implementation or custom backend to Core.

## Standalone and cloud trust

Standalone shells default to scenario mode and need no account, key or server.
An optional Vite development proxy may target only an explicitly configured
loopback IfSoul runtime and rewrite its Host/Origin server-side. It is trusted
local development configuration, not a public CORS bypass. Production standalone
cloud composition is not implemented by that proxy. No token-entry UI or copied
Clerk application is required.

The Core Playground remains same-origin with Clerk; existing signature, issuer,
`azp`, per-user store and global paid-budget checks are preserved. External game
modules receive only their injected bounded bridge. They cannot select providers,
read keys/memory archives, bypass host rules or grant themselves authority through
browser reports.

## Scoped repository policy changes

The SDK package manifest/build configuration and exact reviewed distribution
archives are now authorized exceptions to the earlier source-only/no-child-package
bootstrap rules. The private root package remains unpublished. Other Core
packages do not gain package manifests or public entrypoints automatically.
Remote CI, scheduled execution and publishing remain prohibited without their own
owner decision. All checks and builds run locally with existing pnpm/TypeScript/
Vite tooling; no new package manager, deployment tool or rendering framework is
introduced for extraction.

## Measured local validation

The SDK and each example were installed/built independently using supplied local
archives. A strict isolated NodeNext consumer checked every game package root,
simulation and adapter export without Vite ambient types or skipLibCheck. Core
then passed offline frozen installation, its full check suite, the web/Worker
build dry-run and the explicit real local Worker isolation test in an isolated
copy without sibling repositories. A temporary public Git-index scan checked
staged archive bytes and source without changing the real index.

Game-rule tests now run only in their owning example repositories. Core retains
SDK/runtime tests and minimal public package/lifecycle integration coverage.
Inline implementations were moved to an ignored reversible local backup after
consumer proof; they are not retained as a second maintained implementation.
The three example sources are now public repositories; their reviewed commits
and archive/source fingerprints are recorded in `vendor/distributions.json`.
This extraction did not itself verify live production login or deployment.
