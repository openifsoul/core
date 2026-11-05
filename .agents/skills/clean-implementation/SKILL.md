---
name: clean-implementation
description: Implement focused IfSoul Core changes using existing mechanisms and verify the changed behavior without expanding scope.
---

# clean-implementation

Read the applicable [agent rules](../../../AGENTS.md) and the affected component's
README. Use [development](../../../docs/development.md) for validation commands.

Before editing, locate the existing owner of the behavior and its callers/tests.
Prefer extending that mechanism over adding a parallel abstraction or framework.
Identify the observable change and one failure case that could invalidate it.
Keep the diff scoped; preserve unrelated work and do not rewrite interfaces merely
to simplify an implementation. Review cleanup, cancellation and error propagation
where the change acquires resources or crosses an asynchronous boundary.

Test the behavior at the boundary being changed, including the relevant failure
case. Do not add tests that just repeat implementation expressions. Run the
applicable existing checks; do not weaken them to make a change pass.
If the change needs a new contract or architecture decision, surface that specific
choice using the existing compatibility/ADR process rather than silently widening scope.

Report what changed, why, checks actually run, and remaining limitations. Do not
invoke every review skill for a routine local fix.
