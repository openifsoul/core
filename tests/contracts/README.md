# Local contract checks

Run `pnpm check:contracts` or `node --test tests/contracts/*.test.mjs` from the
repository root. The existing checks use Node's test runner, Ajv 2020 with
`strict: true` and `ajv-formats`, with local schema registration. They require no
model, network inference, game, account or key. Validation does not coerce values,
apply defaults or remove unknown properties; tests check input preservation.

## Retained v0.1 regression suite

The v0.1 schemas and normative example bytes are preserved. Existing tests compile
that registry, validate its examples and original catalog templates, and apply
[fixture recipes](fixtures/cases.json). Recipes create fresh synthetic inputs
through named `set`/`remove` operations; negatives identify the expected Ajv
failure keyword/path. The pointer syntax is test-local. A structural pass does
not establish semantic validity. The ModelProvider contract remains independently
at v0.1; its retention does not grant game-control authority.

Catalog discovery prevents JSON examples from escaping validation by renaming.
Inventory assertions are scoped to the legacy baseline and must remain distinct
from additional version registries. Preserve old JSON/example bytes rather than
rewriting them to make v0.2 checks pass.

The static legacy manifest check verifies the exact bytes, hashes and role/schema
pairs of known sibling files. It neither extracts archives nor tests arbitrary
paths. The [garden trace](../../examples/minimal-world/README.md) has fixture-only
checks for bindings/context, scope, rules metadata, policy evidence, capability
selection, result correlation and raw/derived provenance. Its one argument schema
is separately checked and compiled with a local reference guard. Changed copies
must fail the relevant assertions. No rule, permission engine, world action,
storage or importer executes.

Structural-limit tests demonstrate that an ungranted actor, expired deadline,
dangling source, missing scope subject or unsupported required extension can
pass envelope schemas. Consumers need separate semantic checks. The historical
action trace is not a recommendation for new game skill executors.

## v0.2 coverage

The [v0.2 suite](v0.2/README.md) uses an independent local schema registry and
validates every normative JSON document and JSONL memory record. Focused positive
and negative checks cover typed host intentions, requested-only communication,
non-speaking embodiments, chat without game ticks, original recorded payloads,
portable checkpoints and explicit resume/fork intent. Static examples additionally
check request/revision correlation, host intent membership, accepted versus
executed tasks, original source content and exact archive bytes/hashes.

These are structure and fixture-consistency checks, not a policy engine, live
host, importer or general semantic validator. The v0.1 regressions remain separate.

Future implementation tests must demonstrate that the host owns NPC life state
machines, movement, combat and pathfinding. Plans and dialogue are proposals;
bridges relay host outcomes rather than implement gameplay controllers. Verify
planning cadence independently from host-requested or live conversation, and
ensure a live connection never widens authority. See
[execution modes](../../docs/execution-modes.md).

## Future acceptance beyond schemas

Test trusted identity/embodiment binding, context limits, host validation and
refusal, stale plans, outcome correlation, consent/revocation, cancellation,
usage budgets, duplicate delivery and safe fallback. Test model switching without
silent identity/history replacement and discussion of only permitted host events.
Recorded replay does not prove fresh-model equivalence.

An actual importer/memory implementation must test safe paths and extraction,
resource limits, checksums, reference closure, migrations on copies, extension
preservation, loss reports, export/restore, deletion and backup retention.
Local/BYOK/managed provider disclosure, credentials, local service authentication
and origin/session protection also require implementation tests. None of those
is established by the current static checks of either version. See
[testing](../../packages/testing/README.md) and [security](../../docs/security.md).
