---
name: architecture-review
description: Review IfSoul changes to component dependencies, trust boundaries, composition or state ownership; produce actionable findings without editing by default.
---

# architecture-review

Read [architecture](../../../docs/architecture.md),
[boundaries](../../../docs/boundaries.md) and the affected component's README.
Review the actual diff and its callers; if no Git base exists, state the scope of
the source snapshot being reviewed instead of claiming a diff review.

Trace the changed input through validation, authority, state mutation and output.
Identify who owns the state, who constructs implementations, and which data or
credentials cross each boundary. Compare imports to the current enforced matrix;
check transitive paths as well as the immediate import. Use `pnpm check:boundaries`
for mechanical checks; inspect semantics that an import graph cannot establish.

Report only actionable findings with file/line, trigger, consequence and the
smallest correction. Distinguish an actual violation from a proposed future
architecture. If there are no findings, say what was inspected and what remains
unverified. Do not edit code or update accepted architecture unless requested.
