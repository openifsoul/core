# Reviewed local prerelease distributions

These four exact archives are a temporary local distribution for
[ADR 0013](../docs/decisions/0013-independent-game-examples.md). The example sources are public GitHub repositories; no npm publication is claimed. They let a clean Core copy install without sibling
repositories or a private registry. They are selected package consumers, not a
central source repository for future third-party games.

`distributions.json` records package/version, compressed archive SHA256, logical
source repository, relative source location and source-tree fingerprint. The example source entries record their actual public repository URLs and
verified release commits. The SDK source fingerprint belongs to Core history;
this does not imply an npm release. Source hashes use sorted
relative path, NUL, file bytes, NUL, excluding generated files, vendored artifacts,
lockfiles and Git metadata. They are recorded bootstrap provenance rather than
cryptographic upstream signatures.

The SDK's source fingerprint is verified against this checkout. External game
source fingerprints are provenance supplied by their separate repositories; Core
verifies the packed archive checksum/member policy and exact bundled SDK bytes,
not an adjacent working tree. Public exports, runtime callbacks and TypeScript
declarations are tested through installations in isolated temporary consumers.

The normal frozen lockfile uses only relative `file:vendor/...` paths for these
packages. The archives contain compiled ESM/declarations/CSS, package manifests,
README/licenses and the explicitly bundled matching SDK. They contain no source
checkout, credentials, configuration, sourcemaps or machine-local paths. Engine
and shadcn license notices accompany the relevant example packages.

`pnpm check:boundaries` validates the exact four-path allowlist, gzip/tar member
safety, file policies, checksums, source provenance and known secret patterns,
including Clerk keys. The Git-index scan checks the staged archive bytes and
staged inventory; changing a working copy cannot hide an unsafe staged file.
Unknown archives and child packages still reject.

A game update is an explicit consumer dependency update: review its independent
source/change/tests and licenses, build/pack it there, verify a clean consumer,
then replace the reviewed archive/checksums and refresh the frozen lockfile in
Core. Do not copy its implementation back into Core. After separately authorized
registry releases, replace these bootstrap artifacts with normal versioned
published dependencies. No new registry, remote build, scheduler or deployment
tool is introduced here.
