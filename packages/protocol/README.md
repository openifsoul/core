# Protocol — IfSoul 0.3.0

Current schemas and examples are documented in [current contracts](../../specs/current/README.md).
`validateDocument` dispatches exact current/legacy v0.2 envelopes; `upgradeDocument`
validates and copies reviewed shape-preserving documents without mutating evidence.
General archive conversion is explicitly unsupported by that helper. The separate
current ModelProvider structural validator does not implement a wire transport.
See [compatibility](../../docs/compatibility.md).

## Historical contract guide

# Protocol

Current design: [draft-0.2.0 contracts](../../specs/v0.2/README.md), with schemas
under `schemas/v0.2/`. They describe portable characters, environment/embodiment
bindings, host-requested plans and dialogue, memory and archives. Host games own
all NPC execution; an online model connection does not grant gameplay control.
See [compatibility](../../docs/compatibility.md).

The v0.1 files below remain unchanged as historical regression evidence.
ModelProvider continues to use its independent v0.1 schema; the new character/world
design does not require renaming provider messages. Neither version is a published
SDK. Each version registry resolves only its local URNs.

## Local v0.2 validator

[`src/index.ts`](src/index.ts) statically registers the eight frozen v0.2 JSON
Schemas using Ajv 2020 and formats, without Node IO or remote schema loading.
`validateDocument(unknown, expectedKind?)` returns a structural boolean without
coercion, defaults, unknown-field removal or document mutation. TypeScript views
in `src/types.ts` help the runtime slice; they are not replacement validators or
a generated SDK. Unknown optional JSON extensions survive recording. Runtime
rejects required extensions it cannot implement.

Semantic authorization, freshness, dependency and scope checks belong to the
[local runtime](../runtime/README.md). A schema pass does not authenticate,
execute tasks, authorize speech or validate archive import. The historical
v0.1 schema bytes and tests remain unchanged.

## Retained v0.1 registry

Status: **draft-0.1.0 schemas and specifications only**. There is no published
package, generated type package or v0.1 runtime/transport implementation.
JSON Schema 2020-12 is the normative structural source; the [specification](../../specs/README.md)
defines the semantic requirements that schemas cannot express.

This directory has no dependency on another IfSoul package, provider, game,
platform API, private repository, or account. Future consumers supply their own
validator and implementations. Applications must validate untrusted documents,
then apply the semantic and authorization checks before using them.

## Schema registry

All filenames are under `schemas/`. Every `$id` starts with
`urn:ifsoul:protocol:draft-0.1.0:` followed by the name in this table. These are
identifiers, not hosted endpoints. Register all local schema objects by `$id`
before compiling; resolving a reference never requires network access.

| File                                                                     | `$id` suffix         | Root document kinds                                                       |
| ------------------------------------------------------------------------ | -------------------- | ------------------------------------------------------------------------- |
| [common.schema.json](schemas/common.schema.json)                         | `common`             | Definitions only; rejects exchange documents                              |
| [character-template.schema.json](schemas/character-template.schema.json) | `character-template` | `character-template`                                                      |
| [character-instance.schema.json](schemas/character-instance.schema.json) | `character-instance` | `character-instance`                                                      |
| [archive-manifest.schema.json](schemas/archive-manifest.schema.json)     | `archive-manifest`   | `archive-manifest`                                                        |
| [memory-event.schema.json](schemas/memory-event.schema.json)             | `memory-event`       | `memory-event`                                                            |
| [derived-memory.schema.json](schemas/derived-memory.schema.json)         | `derived-memory`     | `derived-memory`                                                          |
| [capability.schema.json](schemas/capability.schema.json)                 | `capability`         | `capability-set`                                                          |
| [perception.schema.json](schemas/perception.schema.json)                 | `perception`         | `perception`                                                              |
| [action.schema.json](schemas/action.schema.json)                         | `action`             | `action`                                                                  |
| [action-result.schema.json](schemas/action-result.schema.json)           | `action-result`      | `action-result`                                                           |
| [world-event.schema.json](schemas/world-event.schema.json)               | `world-event`        | `world-event`                                                             |
| [permission-policy.schema.json](schemas/permission-policy.schema.json)   | `permission-policy`  | `permission-policy`, `permission-decision`                                |
| [model-provider.schema.json](schemas/model-provider.schema.json)         | `model-provider`     | `provider-capabilities`, `model-request`, `model-response`, `model-error` |

Compile with Ajv's 2020 entrypoint, `strict: true`, and `ajv-formats` for
`date-time`. No union-type relaxation, remote schema loader, mutation, coercion,
or removal of additional properties is required or permitted by the baseline.
Other conforming validators may be used. A future generated type distribution
must derive from these schemas rather than become a second contract source.

Inputs are JSON documents and schemas remain normative. The local v0.2 runtime
implements its documented semantic subset. V0.1 capability execution, archive
checksums/reference closure and an importer remain unimplemented. See
[compatibility](../../docs/compatibility.md).
