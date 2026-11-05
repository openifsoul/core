# ADR 0002: Protocol format and versioning

Status: Accepted for draft bootstrap, 2026-11-05.

The v0.1 baseline below is retained. [ADR 0008](0008-portable-character-environments.md)
introduces v0.2 without rewriting old schemas/examples; the provider boundary
remains independently versioned.

## Context

A transferable character cannot depend on one programming language, game or model.
Duplicated handwritten schemas and TypeScript types would drift.

## Decision

Use JSON and JSON Schema 2020-12 as the machine-readable source of truth, located
in `packages/protocol/schemas/`. Specs prose defines semantics beyond validation.
The baseline is `draft-0.1.0`; URN schema identifiers do not claim a hosted service.
Separate public templates from private instances, raw history from derived memory,
and schema versions from future package and archive versions.

First tooling and future runtime development use TypeScript/Node.js where useful;
game adapters may use other languages. The current validation harness is small
JavaScript tooling, not a runtime or a published TypeScript SDK.

## Consequences

Draft changes must update examples, tests and compatibility notes. Incompatible
imports fail explicitly rather than silently losing fields. Migration runs on a
copy and preserves the input archive when implemented. Namespaced extensions do
not grant permissions. No package is published during bootstrap.

See [compatibility](../compatibility.md) for the precise baseline policy.
