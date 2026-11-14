# IfSoul Core

Experimental public protocol, runtime, memory and provider primitives for
persistent characters. Games own mechanics and execution; IfSoul supplies bounded
high-level plans/dialogue and records authorized host-reported evidence.

This repository contains no game, website, React UI, Clerk authentication or
managed deployment. The public [SDK](https://github.com/openifsoul/sdk) owns
bounded host bridges; public [App](https://github.com/openifsoul/app) owns
self-hostable composition and the local laboratory. Private Website and Cloud
compose these public artifacts. See [repository ownership](https://github.com/openifsoul/core/blob/main/docs/architecture.md).

## Install

Use Node.js 22.18–24 and an ESM project:

```sh
npm install @ifsoul/core@0.6.0
```

The package includes compiled JavaScript and TypeScript declarations. Import the
explicit module you need:

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

The [current contracts](specs/current/README.md) use IfSoul 0.4.0. See
[compatibility](https://github.com/openifsoul/core/blob/main/docs/compatibility.md)
for identifiers and validation, and the
[runtime API](https://github.com/openifsoul/core/blob/main/docs/runtime-api.md)
for integration details. Matching release identifiers do not make different
format families interchangeable.

Trusted configurable provider/runtime budgets are separate from model token
context, permissions and host authority. See
[resource budgets](https://github.com/openifsoul/core/blob/main/docs/resource-budgets.md)
and [security](https://github.com/openifsoul/core/blob/main/docs/security.md).
Relationship interpretation and revision are model-dependent. Current validation
and persistence checks do not establish reliable semantic reassessment.

## Develop locally

Clone this repository and use pnpm 10.15.0:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm build
```

See [development](https://github.com/openifsoul/core/blob/main/docs/development.md),
[architecture](https://github.com/openifsoul/core/blob/main/docs/architecture.md)
and [contribution](https://github.com/openifsoul/core/blob/main/CONTRIBUTING.md).

See [behavior configuration and dynamic parameters](docs/behavior.md) for shared goals,
reaction policy and evidence-linked state.
