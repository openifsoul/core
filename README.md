# IfSoul Core

Experimental public protocol, runtime, memory and provider primitives for
persistent characters. Games own mechanics and execution; IfSoul supplies bounded
high-level plans/dialogue and records authorized host-reported evidence.

This repository contains no game, website, React UI, Clerk authentication or
managed deployment. The public [SDK](https://github.com/openifsoul/sdk) owns
bounded host bridges; public [App](https://github.com/openifsoul/app) owns
self-hostable composition and the local laboratory. Private Website and Cloud
compose these public artifacts. See [repository ownership](docs/decisions/0014-repository-product-split.md).

## Build and check locally

Use Node.js within the manifest's engine range and pnpm 10.15.0:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm build
pnpm pack:core
```

`@ifsoul/core@0.3.0` builds ESM and TypeScript declarations. It has not
been published to npm. Consumers install a reviewed pinned local tarball; no
sibling/private repository or account is needed. [Development](docs/development.md)
describes validation; [deployment policy](docs/deployment.md) prohibits automatic
remote execution.

```ts
import { validateDocument } from "@ifsoul/core/protocol";
import { createRuntime } from "@ifsoul/core/runtime";
import { openSQLiteMemory } from "@ifsoul/core/memory/sqlite";
import { createOpenAIProvider } from "@ifsoul/core/model-providers";
```

Explicit package subpaths additionally expose `memory/port`, `memory/sql`, and
`model-providers/types`. Other internal source paths are unsupported. Callers own
trusted identities/policies, storage and provider credential injection; model
connections confer no control authority.

## Contracts and limits

The [v0.2 design](specs/v0.2/README.md) is active. Frozen v0.1 schemas/examples
remain regression evidence; ModelProvider retains its independent v0.1 contract.
Package version changes do not change protocol versions. See
[compatibility](docs/compatibility.md), [runtime API](docs/runtime-api.md),
[architecture](docs/architecture.md), [security](docs/security.md),
[contribution](CONTRIBUTING.md), and [versioning](docs/versioning.md).

This remains experimental: tests do not prove production readiness, universal
game interoperability, permanent memory portability or model equivalence.

Trusted configurable provider/runtime budgets preserve legacy defaults and remain separate from model token context, permission and host authority. See [resource budgets](https://github.com/openifsoul/core/blob/main/docs/resource-budgets.md).

## Current release and compatibility

The current coordinated release is **IfSoul 0.3.0**. Package, current-format and
artifact identifiers share this release. Historical formats remain explicit
compatibility inputs; matching release numbers do not make different format
families interchangeable. See [compatibility](docs/compatibility.md).
Registry publication and deployment are separate authorized release actions.
