---
name: public-api-review
description: Review changes to IfSoul schemas, ports, exported source interfaces and client HTTP contracts for compatibility and honest stability claims.
---

# public-api-review

Read [compatibility](../../../docs/compatibility.md),
[versioning](../../../docs/versioning.md), and the relevant specification.
Identify the consumer and classify the surface: frozen wire/data contract,
experimental source API, laboratory HTTP interface, or implementation detail.
Do not classify every exported helper as a stable published SDK.

Compare accepted inputs, emitted outputs, errors, defaults, ordering, scope,
idempotence and cancellation semantics before and after the change. A compatible
TypeScript signature alone does not establish behavioral compatibility. Inspect
unknown-field/extension handling and persisted data when relevant.

Use existing contract/runtime/server tests for evidence. A baseline checksum is
an integrity gate, not permission to alter a contract; never regenerate it merely
to clear a failure. For incompatible changes identify the version/ADR decision,
fixtures and compatibility notes required by existing policy. Do not invent a
migration or claim data portability from schema validation alone.

Return the affected surfaces, compatibility conclusion, concrete findings and
missing evidence. Review only unless implementation is explicitly requested.
