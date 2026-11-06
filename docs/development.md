# Local development

Core owns protocol/runtime/memory/provider primitives and permission semantics.
The public SDK and App are independent repositories; private Website/Cloud are
not required for ordinary development. See [ADR 0014](decisions/0014-repository-product-split.md).

Use Node.js in the manifest engine range and pinned pnpm 10.15.0. Install with
`pnpm install --frozen-lockfile`; run `pnpm check` and `pnpm build` locally.
`pnpm pack:core` writes a compiled prerelease to ignored `.local/packages/`.
No npm publication or automatic remote execution is configured.

`pnpm check` runs formatting, strict types, frozen contract checks, runtime/SQLite
and provider tests, generated validator verification, boundary/parser/security
checks, isolated packed-consumer proof, documentation links and the ESM build.
Checks require no account, private checkout, game or inference key. Registry
access may be needed for installation; isolated package tests use cached pinned
public dependencies. Test failures must not be silenced by regenerating frozen
contract inventory.

Run the full check for source/dependency/boundary changes. For documentation-only
changes format edited files and run `pnpm check:docs`. Browser tests belong to
App/Website; keep them headless with task-owned sessions and explicit cleanup.
No deployment is part of validation. Test success does not establish real model
behavior, game interoperability or production readiness.

See [architecture](architecture.md), [compatibility](compatibility.md),
[versioning](versioning.md), and [deployment policy](deployment.md).
