# v0.2 local contract coverage

Run `node --test tests/contracts/v02.test.mjs` from the repository root, or use
`pnpm check:contracts` to include the unchanged v0.1 regression suite.
The v0.2 test helper compiles eight schemas with strict Ajv2020 and formats,
resolves references only from local registered v0.2 URNs, and disables mutation,
default insertion, coercion and removal of unknown fields. ModelProvider stays
independently versioned at v0.1 and is not added to the v0.2 registry.

Every JSON document and every nonempty JSONL record under
`specs/v0.2/examples` is discovered and validated.
Every document kind must have an example; the resume/fork archive modes and
scenario examples used for correlation checks are required, never silently
skipped. Negative fixtures are deliberately modified clones created in the test
file. Rejections require the expected Ajv keyword and document path, and input
preservation is asserted for valid and invalid schema validation.

Structural checks cover the host-requested communication guard and trigger,
open embodiment forms, chat without world ticks, tagged host-intent parameters,
bounded request snapshots, biography/instance separation, required original
received payloads with optional summary annotations, provenance, portable
checkpoints, and archive resume/fork shapes. Closed fields exclude explicit
raw commands, movement paths, shooting loops, NPC state-machine payloads,
credentials/configuration and execution handles in those positions. These checks
cannot establish that arbitrary text or extension data contains no secrets or
instructions; imported text remains untrusted data.

Separate static-example assertions inspect only the authored daily briefing,
plan/adoption/progress/outcome, conversation/delivery, memory provenance and
archive identities. Structurally valid but deliberately mismatched copies must
fail these assertions: unsupported intentions, wrong correlation or binding,
stale revisions, expired plans, out-of-range host quantities, speech without a
speech modality, forged delivery references, and a fork retaining the source
identity. Static archive checks also compare the declared byte counts, hashes,
record counts, and retained original host/chat payloads against the known source
examples; arbitrary manifest paths are never resolved or extracted. Replacing a
raw payload with its summary must fail the static content check. These are
fixture checks, not an implementation of semantic validation,
authorization, host descriptor interpretation or ownership fencing.

The suite executes no rules strategy, model, controller, host NPC mechanics,
conversation loop, importer, storage, scheduler or bridge. Plan adoption does not
establish execution; a generated utterance does not establish delivery. First-party
bridges retain the same boundary: all locomotion, combat, pathfinding and state
machines belong to the game/mod. A live chat connection adds no host intentions
or control rights. Persistent participant links in fixtures are declared claims,
not tested authentication or cross-channel consent.

Snapshot arrays have per-envelope limits. Character history references are
checked with a larger synthetic list to guard against confusing bounded working
context with a lifetime history cap. This test does not establish storage scale,
retention, retrieval quality or performance. Static authored/proposed/observed
records stay distinct; source truth is not inferred from successful validation.

Future implementations still require tested policy/scope/consent enforcement,
reference closure, trusted identity mapping, safe import/export and limits,
secret exclusion, resume handoff and writer fencing, fork lineage creation,
clock handling, cancellation/reconciliation, retention/deletion, and actual
host/controller/provider behavior. Fixed-input rules execution, replayed output,
and live model inference have different reproducibility guarantees; this suite
runs none of them.
